"""출석 비즈니스 로직 — DB 조회 결과를 응답 스키마로 변환.

api 계층은 이 파일의 build_* / save_* 함수만 호출한다 (crud 직접 import 금지).
"""
import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.schemas.attendance import (
    AttendanceMemberItem, AttendanceListResponse,
    AttendanceBatchRequest, AttendanceBatchResponse,
)
from app.schemas.common import PageMeta
from app.crud.leaders import get_leader_map
from app.crud.attendance import (
    get_attendance_records as crud_get_attendance_records,
    upsert_attendance_batch as crud_upsert_attendance_batch,
)
from app.services.members import resolve_leader_names


def build_attendance_list(rows: list, total: int, page: int, page_size: int, db: Session) -> AttendanceListResponse:
    """(Member, MemberProfile, AttendanceRecord|None) 튜플 목록 → AttendanceListResponse 변환"""
    leader_map = get_leader_map(db)
    items = [_to_item(member, profile, record, leader_map) for member, profile, record in rows]
    return AttendanceListResponse(
        items=items,
        meta=PageMeta(current_page=page, page_size=page_size, total_items=total),
    )


def _to_item(member, profile, record, leader_map) -> AttendanceMemberItem:
    return AttendanceMemberItem(
        member_id=member.member_id,
        name=member.name,
        generation=member.generation,
        leader_names=resolve_leader_names(profile.leader_ids, leader_map),
        status=record.status if record else "ABSENT",
        absent_reason=record.absent_reason if record else None,
    )


# ── api 계층 진입점 (오케스트레이션) ──────────────────────
def build_attendance_list_response(
    db: Session,
    worship_date: datetime.date,
    gyogu_no: int,
    team_no: Optional[int],
    group_no: Optional[int],
    is_imwondan: bool,
    page: int,
    page_size: int,
) -> AttendanceListResponse:
    """출석 목록 조회 + 응답 조립."""
    rows, total = crud_get_attendance_records(
        db, worship_date, gyogu_no, team_no, group_no, is_imwondan, page, page_size,
    )
    return build_attendance_list(rows, total, page, page_size, db)


def save_attendance_batch(db: Session, body: AttendanceBatchRequest) -> AttendanceBatchResponse:
    """출석 일괄 upsert. 잘못된 member_id / enrolled_at은 예외로 전파."""
    saved = crud_upsert_attendance_batch(db, body)
    return AttendanceBatchResponse(saved_count=saved)
