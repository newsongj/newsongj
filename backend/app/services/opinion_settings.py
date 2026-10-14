"""소견서 설정 비즈니스 로직 — §1 설정 조회/저장 · 임원단 매핑 조회.

api 계층은 이 파일의 svc_* 함수만 호출한다 (crud 직접 import 금지).
"""
import json
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, OpinionSettingsClosedError
from app.crud.leaders import get_leader_map
from app.crud.query_builders import get_leader_id
from app.crud.opinion_settings import (
    create_opinion_custom as crud_create_opinion_custom,
    get_mappings_by_year as crud_get_mappings_by_year,
    replace_mappings as crud_replace_mappings,
    get_members_as_of_year as crud_get_members_as_of_year,
)
from app.crud.team_assignment import get_opinion_custom as crud_get_opinion_custom
from app.models import Member, MemberProfile
from app.services.members import resolve_leader_names
from app.services.opinion import EXECUTIVE_LEADER_NAME, REPORT_CONTENT_FIELDS, _leader_id_set
from app.schemas.opinion_settings import (
    OpinionMappingGroup, OpinionMappingMember,
    OpinionSettingsResponse, OpinionSettingsSaveRequest,
)

# §1-1 허용 키 — 이 순서가 저장·소비 화면의 고정 순서다 (프론트 MEMBER_FIELD_ORDER / INPUT_FIELD_ORDER)
MEMBER_FIELD_ORDER = [
    "name", "gender", "generation", "birthdate", "phone_number",
    "gyogu", "team", "group_no", "member_type", "leader_names",
    "attendance_grade", "attendance_rate", "plt_status",
    "school_work", "major",
]
INPUT_FIELD_ORDER = REPORT_CONTENT_FIELDS

# 출석률은 member_profile 에 실제 값이 거의 없어 기본에서 뺀다 (프론트 DEFAULT_MEMBER_FIELDS 와 동일)
DEFAULT_MEMBER_FIELDS = [
    "name", "gender", "generation", "gyogu", "team", "group_no",
    "member_type", "leader_names", "attendance_grade",
]
DEFAULT_INPUT_FIELDS = INPUT_FIELD_ORDER

# 기타설명란은 부모 항목 없이 켤 수 없다
INPUT_FIELD_PARENT = {
    "current_status_etc": "current_status",
    "next_year_plan_etc": "next_year_plan",
}

THEME_MAX_LENGTH = 200       # opinion_report_custom.theme VARCHAR(200)
GUIDE_TEXT_MAX_LENGTH = 500  # opinion_report_custom.guide_text VARCHAR(500)


def _parse_field_list(raw: Optional[str], default: List[str]) -> List[str]:
    """member_fields / input_fields TEXT(JSON 문자열 배열) 파싱. 비었거나 깨졌으면 기본값."""
    if not raw:
        return list(default)
    try:
        value = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return list(default)
    if not isinstance(value, list):
        return list(default)
    return [str(v) for v in value]


def _normalize_fields(keys: List[str], order: List[str], label: str) -> List[str]:
    """허용 키 검증 후 고정 순서로 정렬·중복 제거."""
    unknown = sorted(set(keys) - set(order))
    if unknown:
        raise ConflictError(f"{label}에 허용되지 않은 항목이 있습니다: {unknown}")
    selected = set(keys)
    return [k for k in order if k in selected]


def _blank_to_none(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    value = value.strip()
    return value or None


# ── 설정 조회 (§1-1) ───────────────────────────────────────────────────────────

def svc_get_opinion_settings(db: Session, report_year: int) -> OpinionSettingsResponse:
    custom = crud_get_opinion_custom(db, report_year)
    if custom is None:
        return OpinionSettingsResponse(
            report_year=report_year,
            exists=False,
            is_active=True,
            is_open=True,
            member_fields=list(DEFAULT_MEMBER_FIELDS),
            input_fields=list(DEFAULT_INPUT_FIELDS),
        )
    return OpinionSettingsResponse(
        report_year=report_year,
        exists=True,
        is_active=bool(custom.is_active),
        is_open=bool(custom.is_open),
        theme=custom.theme or None,
        start_date=custom.start_date,
        end_date=custom.end_date,
        guide_text=custom.guide_text or None,
        member_fields=_parse_field_list(custom.member_fields, DEFAULT_MEMBER_FIELDS),
        input_fields=_parse_field_list(custom.input_fields, DEFAULT_INPUT_FIELDS),
    )


# ── 설정 저장 (§1-2) ───────────────────────────────────────────────────────────

def _validate_mappings(
    db: Session, report_year: int, body: OpinionSettingsSaveRequest,
) -> List[Tuple[int, int]]:
    """자기 매핑 금지 + 작성자·대상자 모두 report_year 시점 임원단 직분 보유자. 중복 쌍은 하나로 합친다."""
    pairs: List[Tuple[int, int]] = []
    seen = set()
    for m in body.mappings:
        if m.writer_member_id == m.target_member_id:
            raise ConflictError("자기 소견서를 자기가 작성하도록 매핑할 수 없습니다.")
        key = (m.writer_member_id, m.target_member_id)
        if key not in seen:
            seen.add(key)
            pairs.append(key)
    if not pairs:
        return pairs

    member_ids = {mid for pair in pairs for mid in pair}
    members = crud_get_members_as_of_year(db, member_ids, report_year)
    exec_lid = get_leader_id(db, EXECUTIVE_LEADER_NAME)
    exec_lid_s = str(exec_lid) if exec_lid is not None else None

    invalid = sorted(
        mid for mid in member_ids
        if mid not in members
        or members[mid][0].deleted_at is not None
        or exec_lid_s is None
        or exec_lid_s not in _leader_id_set(members[mid][1])
    )
    if invalid:
        raise ConflictError(f"임원단 직분 보유자만 매핑할 수 있습니다: {invalid}")
    return pairs


def svc_save_opinion_settings(db: Session, body: OpinionSettingsSaveRequest) -> None:
    report_year = body.report_year
    custom = crud_get_opinion_custom(db, report_year)

    # 완료 전환은 팀배치 commit 의 몫 — 설정 화면은 완료된 회차를 건드리지 못한다 (§0-0 7번)
    if custom is not None and not custom.is_active:
        raise OpinionSettingsClosedError()

    theme = _blank_to_none(body.theme)
    guide_text = _blank_to_none(body.guide_text)
    if theme is not None and len(theme) > THEME_MAX_LENGTH:
        raise ConflictError(f"주제는 {THEME_MAX_LENGTH}자를 넘을 수 없습니다.")
    if guide_text is not None and len(guide_text) > GUIDE_TEXT_MAX_LENGTH:
        raise ConflictError(f"안내 문구는 {GUIDE_TEXT_MAX_LENGTH}자를 넘을 수 없습니다.")
    if body.start_date and body.end_date and body.start_date > body.end_date:
        raise ConflictError("작성 마감일은 시작일보다 빠를 수 없습니다.")

    member_fields = _normalize_fields(body.member_fields, MEMBER_FIELD_ORDER, "교적 항목")
    input_fields = _normalize_fields(body.input_fields, INPUT_FIELD_ORDER, "입력 항목")
    if not input_fields:
        raise ConflictError("작성자 직접 입력 항목을 1개 이상 선택해야 합니다.")
    for child, parent in INPUT_FIELD_PARENT.items():
        if child in input_fields and parent not in input_fields:
            raise ConflictError(f"{child}는 {parent} 없이 선택할 수 없습니다.")

    pairs = _validate_mappings(db, report_year, body)

    if custom is None:
        custom = crud_create_opinion_custom(db, report_year)
    custom.theme = theme
    custom.start_date = body.start_date
    custom.end_date = body.end_date
    custom.guide_text = guide_text
    custom.is_open = 1 if body.is_open else 0
    custom.member_fields = json.dumps(member_fields)
    custom.input_fields = json.dumps(input_fields)

    crud_replace_mappings(db, report_year, pairs)
    db.commit()


# ── 임원단 매핑 조회 (§1-3) ────────────────────────────────────────────────────

def _to_mapping_member(member: Member, profile: MemberProfile, leader_map: Dict) -> OpinionMappingMember:
    return OpinionMappingMember(
        member_id=member.member_id,
        name=member.name,
        gyogu=profile.gyogu,
        team=profile.team,
        group_no=profile.group_no,
        generation=member.generation,
        phone_number=member.phone_number,
        leader_names=resolve_leader_names(profile.leader_ids, leader_map),
    )


def svc_get_opinion_mappings(db: Session, report_year: int) -> List[OpinionMappingGroup]:
    """저장은 (작성자, 대상자) 평면 쌍이지만 조회는 작성자 기준으로 묶는다. 순서는 등록 순."""
    rows = crud_get_mappings_by_year(db, report_year)
    if not rows:
        return []

    member_ids = {r.writer_member_id for r in rows} | {r.target_member_id for r in rows}
    members = crud_get_members_as_of_year(db, member_ids, report_year)
    leader_map = get_leader_map(db)

    targets_by_writer: Dict[int, List[int]] = {}
    for r in rows:
        targets_by_writer.setdefault(r.writer_member_id, []).append(r.target_member_id)

    groups: List[OpinionMappingGroup] = []
    for writer_id, target_ids in targets_by_writer.items():
        if writer_id not in members:
            continue
        targets = [
            _to_mapping_member(*members[tid], leader_map)
            for tid in target_ids if tid in members
        ]
        groups.append(OpinionMappingGroup(
            writer=_to_mapping_member(*members[writer_id], leader_map),
            targets=targets,
        ))
    return groups
