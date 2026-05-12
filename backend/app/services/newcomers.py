"""미등반 새가족 비즈니스 로직."""
from typing import Optional
from sqlalchemy.orm import Session
from app.schemas.members import MemberListResponse, MemberIdResponse, MemberBulkResponse
from app.schemas.newcomers import (
    NewcomerCreate, NewcomerUpdate, NewcomerDeleteRequest,
    NewcomerBulkDeleteRequest, EnrollRequest, BulkEnrollRequest,
)
from app.services.members import build_member_list  # 응답 변환 재사용
from app.crud.newcomers import (
    get_newcomers as crud_get_newcomers,
    create_newcomer as crud_create_newcomer,
    update_newcomer as crud_update_newcomer,
    delete_newcomer as crud_delete_newcomer,
    delete_newcomers as crud_delete_newcomers,
    enroll_newcomer as crud_enroll_newcomer,
    enroll_newcomers as crud_enroll_newcomers,
)


def build_newcomer_list_response(
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
    rows, total = crud_get_newcomers(
        db, page, page_size, year, gyogu, team, group_no, generation, field, keyword,
    )
    return build_member_list(rows, total, page, page_size, db)


def create_newcomer(db: Session, body: NewcomerCreate) -> MemberIdResponse:
    member = crud_create_newcomer(db, body)
    return MemberIdResponse(member_id=member.member_id)


def update_newcomer(db: Session, member_id: int, body: NewcomerUpdate) -> MemberIdResponse:
    crud_update_newcomer(db, member_id, body)
    return MemberIdResponse(member_id=member_id)


def delete_newcomer(db: Session, member_id: int, body: NewcomerDeleteRequest) -> MemberIdResponse:
    crud_delete_newcomer(db, member_id, body)
    return MemberIdResponse(member_id=member_id)


def delete_newcomers(db: Session, body: NewcomerBulkDeleteRequest) -> MemberBulkResponse:
    member_ids = crud_delete_newcomers(db, body)
    return MemberBulkResponse(member_ids=member_ids, count=len(member_ids))


def enroll_newcomer(db: Session, member_id: int, body: EnrollRequest) -> MemberIdResponse:
    crud_enroll_newcomer(db, member_id, body)
    return MemberIdResponse(member_id=member_id)


def enroll_newcomers(db: Session, body: BulkEnrollRequest) -> MemberBulkResponse:
    member_ids = crud_enroll_newcomers(db, body)
    return MemberBulkResponse(member_ids=member_ids, count=len(member_ids))
