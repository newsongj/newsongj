"""gyojeok 멤버 비즈니스 로직 — DB 조회 결과를 응답 스키마로 변환"""
from sqlalchemy.orm import Session
from app.schemas.members import MemberResponse, DeletedMember, PageMeta, MemberListResponse, DeletedMemberListResponse
from app.crud.leaders import get_leader_map
import json


def resolve_leader_names(leader_ids_json: str | None, leader_map: dict) -> str | None:
    """JSON 배열 문자열 (예: '["1", "3"]')을 '팀장, 그룹장' 형태로 변환"""
    if not leader_ids_json:
        return None
    try:
        ids = json.loads(leader_ids_json)  # JSON 파싱 (["1", "3"] → list)
    except (json.JSONDecodeError, TypeError):
        return None
    names = [leader_map[str(id)] for id in ids if str(id) in leader_map]
    return ', '.join(names) if names else None


def _to_member_response(member, profile, leader_map) -> MemberResponse:
    """Member + MemberProfile ORM 객체 → MemberResponse 스키마 변환"""
    return MemberResponse(
        member_id=member.member_id,
        name=member.name,
        gender=member.gender,
        generation=member.generation,
        gyogu=profile.gyogu if profile else None,
        team=profile.team if profile else None,
        group_no=profile.group_no if profile else None,
        phone_number=member.phone_number,
        birthdate=member.birthdate,
        member_type=profile.member_type if profile else None,
        attendance_grade=profile.attendance_grade if profile else None,
        plt_status=profile.plt_status if profile else None,
        leader_ids=resolve_leader_names(profile.leader_ids, leader_map) if profile else None,
        v8pid=member.v8pid,
        school_work=member.school_work,
        major=member.major,
        year=profile.year if profile else None,
        enrolled_at=member.enrolled_at,
    )


def _to_deleted_member(member, profile, leader_map) -> DeletedMember:
    """Member + MemberProfile → DeletedMember 스키마 변환 (공용)"""
    row = _to_member_response(member, profile, leader_map)
    return DeletedMember(
        **row.model_dump(),
        deleted_at=member.deleted_at,
        deleted_reason=member.deleted_reason,
    )


def build_member_response(member, profile, db: Session) -> MemberResponse:
    """단건 변환 (CUD 응답용)"""
    leader_map = get_leader_map(db)
    return _to_member_response(member, profile, leader_map)


def build_member_list(rows, total: int, page: int, page_size: int, db: Session) -> MemberListResponse:
    """활성 멤버 목록 → MemberListResponse 변환"""
    leader_map = get_leader_map(db)
    items = [_to_member_response(member, profile, leader_map) for member, profile in rows]
    return MemberListResponse(
        items=items,
        meta=PageMeta(current_page=page, page_size=page_size, total_items=total),
    )


def build_deleted_member_response(member, profile, db: Session) -> DeletedMember:
    """삭제된 멤버 단건 변환"""
    leader_map = get_leader_map(db)
    return _to_deleted_member(member, profile, leader_map)


def build_deleted_member_list(rows, total: int, page: int, page_size: int, db: Session) -> DeletedMemberListResponse:
    """삭제된 멤버 목록 → DeletedMemberListResponse 변환"""
    leader_map = get_leader_map(db)
    items = [_to_deleted_member(member, profile, leader_map) for member, profile in rows]
    return DeletedMemberListResponse(
        items=items,
        meta=PageMeta(current_page=page, page_size=page_size, total_items=total),
    )
