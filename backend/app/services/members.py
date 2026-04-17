"""gyojeok 멤버 비즈니스 로직 — DB 조회 결과를 응답 스키마로 변환.

api 계층은 이 파일의 build_* / CUD 함수만 호출한다 (crud 직접 import 금지).
"""
import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.schemas.members import (
    MemberResponse, DeletedMember, PageMeta,
    MemberListResponse, DeletedMemberListResponse,
    MemberCreate, MemberUpdate, MemberDeleteRequest, MemberIdResponse,
)
from app.crud.leaders import get_leader_map
from app.crud.members import (
    get_members as crud_get_members,
    get_deleted_members as crud_get_deleted_members,
    get_deleted_member as crud_get_deleted_member,
    create_member as crud_create_member,
    update_member as crud_update_member,
    delete_member as crud_delete_member,
    restore_member as crud_restore_member,
)
import json


def resolve_leader_names(leader_ids_json: str | None, leader_map: dict) -> list[str]:
    """JSON 배열 문자열 (예: '["1", "3"]')을 ['팀장', '그룹장'] 리스트로 변환"""
    if not leader_ids_json:
        return []
    try:
        ids = json.loads(leader_ids_json)
    except (json.JSONDecodeError, TypeError):
        return []
    return [leader_map[str(id)] for id in ids if str(id) in leader_map]


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
        leader_names=resolve_leader_names(profile.leader_ids, leader_map) if profile else [],
        v8pid=member.v8pid,
        school_work=member.school_work,
        major=member.major,
        updated_at=profile.updated_at if profile else None,
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


# ── api 계층 진입점 (오케스트레이션) ──────────────────────
def build_member_list_response(
    db: Session,
    page: int,
    page_size: int,
    year: int,
    gyogu: Optional[int] = None,
    team: Optional[int] = None,
    group_no: Optional[int] = None,
    generation: Optional[int] = None,
    field: Optional[str] = None,
    keyword: Optional[str] = None,
) -> MemberListResponse:
    """활성 멤버 목록 조회 + 응답 조립."""
    rows, total = crud_get_members(
        db, page, page_size, year, gyogu, team, group_no, generation, field, keyword,
    )
    return build_member_list(rows, total, page, page_size, db)


def build_deleted_member_list_response(
    db: Session,
    page: int,
    page_size: int,
    year: Optional[int] = None,
    gyogu: Optional[int] = None,
    team: Optional[int] = None,
    group_no: Optional[int] = None,
    generation: Optional[int] = None,
    deleted_from: Optional[datetime.date] = None,
    deleted_to: Optional[datetime.date] = None,
    field: Optional[str] = None,
    keyword: Optional[str] = None,
) -> DeletedMemberListResponse:
    """삭제된 멤버 목록 조회 + 응답 조립."""
    rows, total = crud_get_deleted_members(
        db, page, page_size, year, gyogu, team, group_no, generation,
        deleted_from, deleted_to, field, keyword,
    )
    return build_deleted_member_list(rows, total, page, page_size, db)


def build_deleted_member_detail(db: Session, member_id: int) -> DeletedMember:
    """삭제된 멤버 단건 조회 + 응답 조립. 없으면 MemberNotFoundError 전파."""
    member, profile = crud_get_deleted_member(db, member_id)
    return build_deleted_member_response(member, profile, db)


def create_member(db: Session, body: MemberCreate) -> MemberIdResponse:
    member, _ = crud_create_member(db, body)
    return MemberIdResponse(member_id=member.member_id)


def update_member(db: Session, member_id: int, body: MemberUpdate) -> MemberIdResponse:
    """없으면 MemberNotFoundError 전파."""
    replaced_id = crud_update_member(db, member_id, body)
    return MemberIdResponse(member_id=replaced_id)


def delete_member(db: Session, member_id: int, body: MemberDeleteRequest) -> MemberIdResponse:
    """없으면 MemberNotFoundError 전파."""
    crud_delete_member(db, member_id, body)
    return MemberIdResponse(member_id=member_id)


def restore_member(db: Session, member_id: int) -> MemberIdResponse:
    """없으면 MemberNotFoundError, 이미 활성이면 MemberAlreadyActiveError 전파."""
    crud_restore_member(db, member_id)
    return MemberIdResponse(member_id=member_id)
