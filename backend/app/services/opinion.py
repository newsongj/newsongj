"""소견서 비즈니스 로직 — DB 조회 결과를 응답 스키마로 변환.

api 계층은 이 파일의 build_* / svc_* 함수만 호출한다 (crud 직접 import 금지).
"""
import json
from typing import Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, MemberNotFoundError, OpinionReportConflictError
from app.core.timezone import now_kst
from app.crud.leaders import get_leader_map
from app.crud.query_builders import get_leader_id
from app.crud.opinion import (
    get_report_year_snapshot as crud_get_report_year_snapshot,
    get_opinion_reports_by_year as crud_get_opinion_reports_by_year,
    get_writer_ids_by_report as crud_get_writer_ids_by_report,
    get_mapping_by_target as crud_get_mapping_by_target,
    get_companion_ids_by_member as crud_get_companion_ids_by_member,
    get_member_profile_as_of_year as crud_get_member_profile_as_of_year,
    get_report_by_member_year as crud_get_report_by_member_year,
    get_last_writer as crud_get_last_writer,
    create_report as crud_create_report,
    update_report_conditional as crud_update_report_conditional,
)
from app.services.members import resolve_leader_names
from app.models import Member, MemberProfile, MemberOpinionReport
from app.schemas.opinion import (
    OpinionCompanion, OpinionListResponse, OpinionReportRow,
    OpinionReportUpdateRequest, OpinionReportUpdateResponse,
    OpinionWriter, OpinionWriterRole,
)

EXECUTIVE_LEADER_NAME = "임원단"
TEAM_LEADER_NAME = "팀장"
GROUP_LEADER_NAME = "그룹장"


def _leader_id_set(profile: MemberProfile) -> set:
    """profile.leader_ids JSON 문자열을 문자열 id 집합으로 파싱.

    LIKE 부분일치는 "13"/"30" 등을 오검출하므로 반드시 JSON 파싱 후 비교해야 한다.
    """
    if not profile.leader_ids:
        return set()
    try:
        ids = json.loads(profile.leader_ids)
    except (json.JSONDecodeError, TypeError):
        return set()
    if not isinstance(ids, list):
        ids = [ids]
    return {str(x) for x in ids}


class _ExpectedWriterEntry:
    __slots__ = ("member", "profile", "role")

    def __init__(self, member: Member, profile: MemberProfile, role: OpinionWriterRole):
        self.member = member
        self.profile = profile
        self.role = role


def _build_expected_writer_resolver(
    snapshot_rows: List[Tuple[Member, MemberProfile]],
    member_index: Dict[int, Tuple[Member, MemberProfile]],
    mapping_by_target: Dict[int, List[int]],
    exec_lid: Optional[int],
    team_lid: Optional[int],
    group_lid: Optional[int],
):
    exec_lid_s = str(exec_lid) if exec_lid is not None else None
    team_lid_s = str(team_lid) if team_lid is not None else None
    group_lid_s = str(group_lid) if group_lid is not None else None

    def is_exec(profile: MemberProfile) -> bool:
        return exec_lid_s is not None and exec_lid_s in _leader_id_set(profile)

    def is_team_leader(profile: MemberProfile) -> bool:
        return team_lid_s is not None and team_lid_s in _leader_id_set(profile)

    def is_group_leader(profile: MemberProfile) -> bool:
        return group_lid_s is not None and group_lid_s in _leader_id_set(profile)

    def is_any_leader(profile: MemberProfile) -> bool:
        return len(_leader_id_set(profile)) > 0

    # 임원단 매핑에 **작성자로 등록된** 사람. 판정 기준은 직분이 아니라 매핑 유무다 —
    # 임원단 직분이어도 매핑이 없으면 일반 리더처럼 소속 기준으로 동작한다.
    mapped_writers: set = {w for ws in mapping_by_target.values() for w in ws}

    # 팀 안의 모든 리더는 팀장이 쓴다 — 단, 매핑된 작성자는 배타이므로 후보에서 제외한다.
    team_leaders: Dict[Tuple[Optional[int], Optional[int]], List[int]] = {}
    group_leaders: Dict[Tuple[Optional[int], Optional[int], Optional[int]], List[int]] = {}
    for m, p in snapshot_rows:
        if is_team_leader(p) and m.member_id not in mapped_writers:
            team_leaders.setdefault((p.gyogu, p.team), []).append(m.member_id)
        if is_group_leader(p) and m.member_id not in mapped_writers:
            group_leaders.setdefault((p.gyogu, p.team, p.group_no), []).append(m.member_id)

    def expected_writers_for(member: Member, profile: MemberProfile) -> List[_ExpectedWriterEntry]:
        out: List[_ExpectedWriterEntry] = []
        seen: set = set()

        def push(writer_id: int, role: OpinionWriterRole) -> None:
            if writer_id == member.member_id:
                return
            if writer_id in seen:
                return
            wm_wp = member_index.get(writer_id)
            if not wm_wp:
                return
            seen.add(writer_id)
            out.append(_ExpectedWriterEntry(wm_wp[0], wm_wp[1], role))

        # ① 매핑이 걸려 있으면 그것이 유일한 경로 — 소속으로는 작성자를 붙이지 않는다.
        #    직분이 아니라 **매핑 유무**가 기준이다. 임원단 직분이어도 매핑이 없으면
        #    아래 소속 경로를 탄다 (빈 화면을 만들지 않기 위해서다).
        mapped = mapping_by_target.get(member.member_id, [])
        if mapped:
            for writer_id in mapped:
                push(writer_id, '임원단')
            return out

        # ② 같은 팀의 팀장
        for tl_id in team_leaders.get((profile.gyogu, profile.team), []):
            push(tl_id, '팀장')

        # ③ 같은 그룹의 그룹장 — 직분 없는 팀원에게만 열린다.
        if not is_any_leader(profile):
            for gl_id in group_leaders.get((profile.gyogu, profile.team, profile.group_no), []):
                push(gl_id, '그룹장')

        return out

    def role_for_writer(
        writer_id: int, expected: List[_ExpectedWriterEntry], writer_profile: Optional[MemberProfile]
    ) -> OpinionWriterRole:
        for entry in expected:
            if entry.member.member_id == writer_id:
                return entry.role
        if writer_profile is not None:
            if is_exec(writer_profile):
                return '임원단'
            if is_team_leader(writer_profile):
                return '팀장'
            if is_group_leader(writer_profile):
                return '그룹장'
        return '팀장'

    return expected_writers_for, role_for_writer


def _to_writer(member: Member, profile: Optional[MemberProfile], role: OpinionWriterRole) -> OpinionWriter:
    return OpinionWriter(
        member_id=member.member_id,
        name=member.name,
        gyogu=profile.gyogu if profile else None,
        team=profile.team if profile else None,
        group_no=profile.group_no if profile else None,
        phone_number=member.phone_number,
        role=role,
    )


def svc_get_opinion_reports(
    db: Session,
    report_year: int,
    gyogu: Optional[int],
    team: Optional[int],
    group_no: Optional[int],
    status: Optional[str],
) -> OpinionListResponse:
    snapshot_rows = crud_get_report_year_snapshot(db, report_year)
    if not snapshot_rows:
        return OpinionListResponse(enrolled=0, written_total=0, target=0, written=0, items=[])

    member_index: Dict[int, Tuple[Member, MemberProfile]] = {
        m.member_id: (m, p) for m, p in snapshot_rows
    }
    leader_map = get_leader_map(db)
    exec_lid = get_leader_id(db, EXECUTIVE_LEADER_NAME)
    team_lid = get_leader_id(db, TEAM_LEADER_NAME)
    group_lid = get_leader_id(db, GROUP_LEADER_NAME)

    reports_by_member = crud_get_opinion_reports_by_year(db, report_year)
    report_ids = [r.opinion_report_id for r in reports_by_member.values()]
    writer_ids_by_report = crud_get_writer_ids_by_report(db, report_ids)
    mapping_by_target = crud_get_mapping_by_target(db, report_year)
    companion_ids_by_member = crud_get_companion_ids_by_member(db, report_year)

    expected_writers_for, role_for_writer = _build_expected_writer_resolver(
        snapshot_rows, member_index, mapping_by_target, exec_lid, team_lid, group_lid,
    )

    rows: List[dict] = []
    for member, profile in snapshot_rows:
        report: Optional[MemberOpinionReport] = reports_by_member.get(member.member_id)
        is_written = report is not None

        expected_entries = [] if is_written else expected_writers_for(member, profile)
        expected_writers = [_to_writer(e.member, e.profile, e.role) for e in expected_entries]

        writers: List[OpinionWriter] = []
        if report is not None:
            for writer_id in writer_ids_by_report.get(report.opinion_report_id, []):
                wm_wp = member_index.get(writer_id)
                if wm_wp:
                    wm, wp = wm_wp
                else:
                    wm = db.query(Member).filter(Member.member_id == writer_id).first()
                    wp = None
                    if wm is None:
                        continue
                role = role_for_writer(writer_id, expected_entries, wp)
                writers.append(_to_writer(wm, wp, role))

        companions = []
        for cid in companion_ids_by_member.get(member.member_id, []):
            cm_cp = member_index.get(cid)
            if cm_cp:
                cm, cp = cm_cp
                companions.append(OpinionCompanion(
                    member_id=cm.member_id, name=cm.name,
                    gyogu=cp.gyogu, team=cp.team, group_no=cp.group_no,
                ))

        rows.append({
            "is_deleted": member.deleted_at is not None,
            "is_written": is_written,
            "gyogu": profile.gyogu,
            "team": profile.team,
            "group_no": profile.group_no,
            "row": OpinionReportRow(
                opinion_report_id=report.opinion_report_id if report else None,
                member_id=member.member_id,
                report_year=report_year,
                is_deleted=member.deleted_at is not None,

                name=member.name,
                gender=member.gender,
                generation=member.generation,
                birthdate=str(member.birthdate) if member.birthdate is not None else None,
                phone_number=member.phone_number,
                gyogu=profile.gyogu,
                team=profile.team,
                group_no=profile.group_no,
                member_type=profile.member_type,
                attendance_grade=profile.attendance_grade,
                attendance_rate=float(profile.attendance_rate) if profile.attendance_rate is not None else None,
                plt_status=profile.plt_status,
                leader_names=resolve_leader_names(profile.leader_ids, leader_map),
                school_work=member.school_work,
                major=member.major,

                is_written=is_written,
                writers=writers,
                expected_writers=expected_writers,
                companions=companions,
                updated_at=report.updated_at if report else None,

                current_status=report.current_status if report else None,
                current_status_etc=report.current_status_etc if report else None,
                group_meeting_attendance_status=report.group_meeting_attendance_status if report else None,
                sunday_morning_attendance_status=report.sunday_morning_attendance_status if report else None,
                sunday_evening_attendance_status=report.sunday_evening_attendance_status if report else None,
                next_year_plan=report.next_year_plan if report else None,
                next_year_plan_etc=report.next_year_plan_etc if report else None,
                general_opinion=report.general_opinion if report else None,
                special_opinion=report.special_opinion if report else None,
            ),
        })

    # KPI: enrolled/written_total은 필터와 무관하게 삭제되지 않은 재적 전체 기준
    non_deleted = [r for r in rows if not r["is_deleted"]]
    enrolled = len(non_deleted)
    written_total = sum(1 for r in non_deleted if r["is_written"])

    # target/written: 교구·팀·그룹 필터는 적용하되 status 필터는 적용 전 기준
    scoped = [
        r for r in rows
        if (gyogu is None or r["gyogu"] == gyogu)
        and (team is None or r["team"] == team)
        and (group_no is None or r["group_no"] == group_no)
    ]
    scoped_non_deleted = [r for r in scoped if not r["is_deleted"]]
    target = len(scoped_non_deleted)
    written = sum(1 for r in scoped_non_deleted if r["is_written"])

    # items: 삭제된 멤버는 소견서 기록이 남아있을 때만 노출, status 필터까지 모두 적용
    items = [r for r in scoped if not r["is_deleted"] or r["is_written"]]
    if status == "written":
        items = [r for r in items if r["is_written"]]
    elif status == "not_written":
        items = [r for r in items if not r["is_written"]]

    items.sort(key=lambda r: (
        r["gyogu"] if r["gyogu"] is not None else 0,
        r["team"] if r["team"] is not None else 0,
        r["group_no"] if r["group_no"] is not None else 0,
        r["row"].name,
    ))

    return OpinionListResponse(
        enrolled=enrolled,
        written_total=written_total,
        target=target,
        written=written,
        items=[r["row"] for r in items],
    )


# ── 소견서 수정 (관리자) — §2-2 ────────────────────────────────────────────────

SHORT_INPUT_MAX_LENGTH = 20   # PDF 좌측 단 한 줄 분량 — DB VARCHAR(100)/(255)보다 좁게 막는다
LONG_INPUT_MAX_LENGTH = 20000  # TEXT 65,535바이트 ÷ 한글 3바이트, 여유 포함

SHORT_INPUT_FIELDS = [
    "current_status", "current_status_etc",
    "group_meeting_attendance_status",
    "sunday_morning_attendance_status",
    "sunday_evening_attendance_status",
    "next_year_plan", "next_year_plan_etc",
]
LONG_INPUT_FIELDS = ["general_opinion", "special_opinion"]
REPORT_CONTENT_FIELDS = SHORT_INPUT_FIELDS + LONG_INPUT_FIELDS


def _validate_report_fields(fields: Dict[str, Optional[str]]) -> None:
    for key in SHORT_INPUT_FIELDS:
        value = fields.get(key)
        if value is not None and len(value) > SHORT_INPUT_MAX_LENGTH:
            raise ConflictError(f"{key}는 {SHORT_INPUT_MAX_LENGTH}자를 넘을 수 없습니다.")
    for key in LONG_INPUT_FIELDS:
        value = fields.get(key)
        if value is not None and len(value) > LONG_INPUT_MAX_LENGTH:
            raise ConflictError(f"{key}는 {LONG_INPUT_MAX_LENGTH}자를 넘을 수 없습니다.")


def _resolve_writer_role(db: Session, profile: Optional[MemberProfile]) -> OpinionWriterRole:
    if profile is None:
        return TEAM_LEADER_NAME
    ids = _leader_id_set(profile)
    exec_lid = get_leader_id(db, EXECUTIVE_LEADER_NAME)
    if exec_lid is not None and str(exec_lid) in ids:
        return EXECUTIVE_LEADER_NAME
    team_lid = get_leader_id(db, TEAM_LEADER_NAME)
    if team_lid is not None and str(team_lid) in ids:
        return TEAM_LEADER_NAME
    group_lid = get_leader_id(db, GROUP_LEADER_NAME)
    if group_lid is not None and str(group_lid) in ids:
        return GROUP_LEADER_NAME
    return TEAM_LEADER_NAME


def _build_conflict_error(
    db: Session, report: Optional[MemberOpinionReport], login_member_id: Optional[int],
) -> OpinionReportConflictError:
    """§0-4-3 — 조회 이후 이미 다른 저장이 반영됐을 때의 409 페이로드를 만든다."""
    last_writer = None
    is_self = False
    if report is not None:
        writer_row = crud_get_last_writer(db, report.opinion_report_id)
        if writer_row is not None:
            writer_member = db.query(Member).filter(Member.member_id == writer_row.writer_member_id).first()
            writer_profile = crud_get_member_profile_as_of_year(db, writer_row.writer_member_id, report.report_year)
            last_writer = {
                "member_id": writer_row.writer_member_id,
                "name": writer_member.name if writer_member else None,
                "role": _resolve_writer_role(db, writer_profile),
            }
            is_self = login_member_id is not None and login_member_id == writer_row.writer_member_id

    current_updated_at = report.updated_at.isoformat(timespec="milliseconds") if report else None
    return OpinionReportConflictError(current_updated_at, last_writer, is_self)


def svc_update_opinion_report(
    db: Session,
    member_id: int,
    report_year: int,
    body: OpinionReportUpdateRequest,
    login_member_id: Optional[int] = None,
) -> OpinionReportUpdateResponse:
    """PUT /api/opinion/reports/:memberId — 관리자 대리 수정.

    §0-4-6: 낙관적 잠금은 사용자 페이지와 동일하게 적용하되,
    member_opinion_report_writer는 건드리지 않는다 (대리 수정이지 작성이 아니다).
    """
    member = db.query(Member).filter(Member.member_id == member_id).first()
    if member is None:
        raise MemberNotFoundError()

    fields = body.model_dump(exclude={"base_updated_at"}, exclude_unset=True)
    _validate_report_fields(fields)

    # 클라이언트가 타임존 포함 ISO 문자열을 보내도 DB의 naive datetime과 비교 가능하게 맞춘다
    base_updated_at = body.base_updated_at
    if base_updated_at is not None and base_updated_at.tzinfo is not None:
        base_updated_at = base_updated_at.astimezone(ZoneInfo("Asia/Seoul")).replace(tzinfo=None)

    existing = crud_get_report_by_member_year(db, member_id, report_year)

    if existing is not None:
        if base_updated_at != existing.updated_at:
            raise _build_conflict_error(db, existing, login_member_id)

        new_updated_at = now_kst()
        affected = crud_update_report_conditional(
            db, existing.opinion_report_id, existing.updated_at, fields, new_updated_at,
        )
        if affected == 0:
            db.rollback()
            raise _build_conflict_error(
                db, crud_get_report_by_member_year(db, member_id, report_year), login_member_id,
            )
        db.commit()

        final_values = {k: getattr(existing, k) for k in REPORT_CONTENT_FIELDS}
        final_values.update(fields)
        return OpinionReportUpdateResponse(
            opinion_report_id=existing.opinion_report_id,
            member_id=member_id,
            report_year=report_year,
            updated_at=new_updated_at,
            **final_values,
        )

    try:
        report = crud_create_report(db, member_id, report_year, fields)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise _build_conflict_error(
            db, crud_get_report_by_member_year(db, member_id, report_year), login_member_id,
        )

    return OpinionReportUpdateResponse(
        opinion_report_id=report.opinion_report_id,
        member_id=member_id,
        report_year=report_year,
        updated_at=report.updated_at,
        **{k: getattr(report, k) for k in REPORT_CONTENT_FIELDS},
    )
