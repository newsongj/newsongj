"""출석 비즈니스 로직 — DB 조회 결과를 응답 스키마로 변환"""
from sqlalchemy.orm import Session
from app.schemas.attendance import AttendanceMemberItem, AttendanceListResponse
from app.schemas.common import PageMeta
from app.crud.leaders import get_leader_map
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
    names = resolve_leader_names(profile.leader_ids, leader_map)
    return AttendanceMemberItem(
        member_id=member.member_id,
        name=member.name,
        generation=member.generation,
        leader_names=', '.join(names) or None,
        gyogu=profile.gyogu,
        team=profile.team,
        group_no=profile.group_no,
        status=record.status if record else None,
        absent_reason=record.absent_reason if record else None,
    )
