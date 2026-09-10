"""소견서 CRUD — 순수 DB 조작만 담당"""
import json
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models import Member, MemberOpinionReport, MemberProfile, OpinionReportCustom, OpinionReportMapping
from app.schemas.opinion import OpinionReportCreate, OpinionReportSaveBody, OpinionReportUpdate
from app.core.exceptions import ConflictError, NotFoundError
from app.core.timezone import now_kst


# ── 교적 자동기입 항목 화이트리스트 ──────────────────────────────────────────────
# Member/MemberProfile 테이블 컬럼에서 자동 추출 — 컬럼이 추가/삭제되면 자동 반영됨.

_MEMBER_FIELD_EXCLUDE = {"member_id", "v8pid", "phone_number", "deleted_at", "deleted_reason", "profile_id", "updated_at", "leader_ids"}

_MEMBER_FIELD_LABELS = {
    "name": "이름", "gender": "성별", "generation": "기수",
    "birthdate": "생년월일", "enrolled_at": "등록일",
    "school_work": "학교/직장", "major": "전공",
    "member_type": "구분", "attendance_rate": "출석률", "attendance_grade": "출석등급",
    "gyogu": "교구", "team": "팀", "group_no": "그룹", "plt_status": "새가족반 수료여부",
}


def get_allowed_member_fields() -> List[dict]:
    """교적 자동기입 항목으로 노출 가능한 컬럼 목록 (key, label)."""
    seen: set[str] = set()
    result: List[dict] = []
    for model in (Member, MemberProfile):
        for key in model.__table__.columns.keys():
            if key in _MEMBER_FIELD_EXCLUDE or key in seen:
                continue
            seen.add(key)
            result.append({"key": key, "label": _MEMBER_FIELD_LABELS.get(key, key)})
    return result


# ── 소견서 회차 설정 ────────────────────────────────────────────────────────────

def get_active_opinion_custom(db: Session) -> Optional[OpinionReportCustom]:
    return (
        db.query(OpinionReportCustom)
        .filter(OpinionReportCustom.is_active == 1)
        .order_by(OpinionReportCustom.opinion_custom_id.desc())
        .first()
    )


def get_opinion_custom(db: Session, opinion_custom_id: int) -> Optional[OpinionReportCustom]:
    return (
        db.query(OpinionReportCustom)
        .filter(OpinionReportCustom.opinion_custom_id == opinion_custom_id)
        .first()
    )


def create_opinion_custom(db: Session, data: OpinionReportCreate) -> OpinionReportCustom:
    existing = (
        db.query(OpinionReportCustom)
        .filter(OpinionReportCustom.report_year == data.report_year)
        .first()
    )
    if existing:
        raise ConflictError("해당 연도의 소견서가 이미 존재합니다.")
    custom = OpinionReportCustom(
        report_year=data.report_year,
        start_date=data.start_date,
        end_date=data.end_date,
        guide_text=data.guide_text,
        member_fields=json.dumps(data.member_fields, ensure_ascii=False),
        input_fields=json.dumps(data.input_fields, ensure_ascii=False),
        status_options=json.dumps(data.status_options, ensure_ascii=False),
        plan_options=json.dumps(data.plan_options, ensure_ascii=False),
    )
    db.add(custom)
    db.commit()
    db.refresh(custom)
    return custom


def update_opinion_custom(db: Session, opinion_custom_id: int, data: OpinionReportUpdate) -> OpinionReportCustom:
    custom = get_opinion_custom(db, opinion_custom_id)
    if not custom:
        raise NotFoundError("소견서 회차를 찾을 수 없습니다.")
    custom.start_date = data.start_date
    custom.end_date = data.end_date
    custom.guide_text = data.guide_text
    custom.member_fields = json.dumps(data.member_fields, ensure_ascii=False)
    custom.input_fields = json.dumps(data.input_fields, ensure_ascii=False)
    custom.status_options = json.dumps(data.status_options, ensure_ascii=False)
    custom.plan_options = json.dumps(data.plan_options, ensure_ascii=False)
    db.commit()
    db.refresh(custom)
    return custom


def complete_opinion_custom(db: Session, opinion_custom_id: int) -> None:
    custom = get_opinion_custom(db, opinion_custom_id)
    if not custom:
        raise NotFoundError("소견서 회차를 찾을 수 없습니다.")
    custom.is_active = 0
    db.commit()


# ── 작성자 배정 ────────────────────────────────────────────────────────────────

def bulk_create_mapping(db: Session, report_year: int, mappings: List[Tuple[int, int]]) -> None:
    """(writer_member_id, target_member_id) 쌍을 배정. 이미 있는 조합은 스킵."""
    for writer_id, target_id in mappings:
        exists = (
            db.query(OpinionReportMapping)
            .filter(
                OpinionReportMapping.report_year == report_year,
                OpinionReportMapping.writer_member_id == writer_id,
                OpinionReportMapping.target_member_id == target_id,
            )
            .first()
        )
        if not exists:
            db.add(OpinionReportMapping(
                report_year=report_year,
                writer_member_id=writer_id,
                target_member_id=target_id,
            ))
    db.commit()


def get_mapping_list(db: Session, report_year: int) -> List[Tuple]:
    from sqlalchemy.orm import aliased
    Writer = aliased(Member)
    Target = aliased(Member)
    rows = (
        db.query(OpinionReportMapping, Writer, Target)
        .join(Writer, Writer.member_id == OpinionReportMapping.writer_member_id)
        .join(Target, Target.member_id == OpinionReportMapping.target_member_id)
        .filter(OpinionReportMapping.report_year == report_year)
        .order_by(Writer.name, Target.name)
        .all()
    )
    return rows


def delete_mapping(db: Session, mapping_id: int) -> None:
    mapping = db.query(OpinionReportMapping).filter(OpinionReportMapping.mapping_id == mapping_id).first()
    if not mapping:
        raise NotFoundError("배정 내역을 찾을 수 없습니다.")
    db.delete(mapping)
    db.commit()


def is_writer_assigned(db: Session, report_year: int, writer_member_id: int, target_member_id: int) -> bool:
    return (
        db.query(OpinionReportMapping)
        .filter(
            OpinionReportMapping.report_year == report_year,
            OpinionReportMapping.writer_member_id == writer_member_id,
            OpinionReportMapping.target_member_id == target_member_id,
        )
        .first()
        is not None
    )


def get_my_target_mappings(db: Session, report_year: int, writer_member_id: int) -> List[OpinionReportMapping]:
    return (
        db.query(OpinionReportMapping)
        .filter(
            OpinionReportMapping.report_year == report_year,
            OpinionReportMapping.writer_member_id == writer_member_id,
        )
        .all()
    )


# ── 교적 정보 조회 ─────────────────────────────────────────────────────────────

def get_member_with_profile(db: Session, member_id: int) -> Tuple[Optional[Member], Optional[MemberProfile]]:
    from sqlalchemy import func
    latest_sq = (
        db.query(MemberProfile.member_id, func.max(MemberProfile.profile_id).label("max_id"))
        .group_by(MemberProfile.member_id)
        .subquery()
    )
    row = (
        db.query(Member, MemberProfile)
        .join(latest_sq, Member.member_id == latest_sq.c.member_id)
        .join(MemberProfile, MemberProfile.profile_id == latest_sq.c.max_id)
        .filter(Member.member_id == member_id)
        .first()
    )
    if row:
        return row[0], row[1]
    member = db.query(Member).filter(Member.member_id == member_id).first()
    return member, None


# ── 소견서 본문 ────────────────────────────────────────────────────────────────

def get_opinion_report(db: Session, report_year: int, target_member_id: int) -> Optional[MemberOpinionReport]:
    return (
        db.query(MemberOpinionReport)
        .filter(
            MemberOpinionReport.report_year == report_year,
            MemberOpinionReport.member_id == target_member_id,
        )
        .first()
    )


def upsert_opinion_report(
    db: Session, report_year: int, target_member_id: int, body: OpinionReportSaveBody
) -> MemberOpinionReport:
    report = get_opinion_report(db, report_year, target_member_id)
    if report:
        report.current_status = body.current_status
        report.current_status_etc = body.current_status_etc
        report.group_meeting_attendance_status = body.group_meeting_attendance_status
        report.sunday_morning_attendance_status = body.sunday_morning_attendance_status
        report.sunday_evening_attendance_status = body.sunday_evening_attendance_status
        report.next_year_plan = body.next_year_plan
        report.next_year_plan_etc = body.next_year_plan_etc
        report.general_opinion = body.general_opinion
        report.special_opinion = body.special_opinion
    else:
        report = MemberOpinionReport(
            member_id=target_member_id,
            report_year=report_year,
            current_status=body.current_status,
            current_status_etc=body.current_status_etc,
            group_meeting_attendance_status=body.group_meeting_attendance_status,
            sunday_morning_attendance_status=body.sunday_morning_attendance_status,
            sunday_evening_attendance_status=body.sunday_evening_attendance_status,
            next_year_plan=body.next_year_plan,
            next_year_plan_etc=body.next_year_plan_etc,
            general_opinion=body.general_opinion,
            special_opinion=body.special_opinion,
        )
        db.add(report)
    db.commit()
    db.refresh(report)
    return report
