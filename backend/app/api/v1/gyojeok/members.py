"""gyojeok 멤버 API 엔드포인트 — 파라미터 파싱 + service 호출만 담당"""
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from typing import Optional
import datetime

from app.core.database import get_db
from app.core.security import require_menu
from app.services.members import (
    build_member_list_response,
    build_deleted_member_list_response,
    build_deleted_member_detail,
    create_member as svc_create_member,
    update_member as svc_update_member,
    delete_member as svc_delete_member,
    delete_members as svc_delete_members,
    restore_member as svc_restore_member,
    restore_members as svc_restore_members,
)
from app.schemas.members import (
    MemberListResponse, DeletedMemberListResponse, DeletedMember,
    MemberIdsRequest, MemberDeleteRequest, MemberBulkDeleteRequest,
    MemberCreate, MemberUpdate, MemberIdResponse, MemberBulkResponse,
)

router = APIRouter()

_members  = Depends(require_menu("admin.gyojeok.members"))
_deleted  = Depends(require_menu("admin.gyojeok.deleted_members"))


@router.get("/members", response_model=MemberListResponse, tags=["교적 조회"], summary="활성 멤버 목록 조회", dependencies=[_members])
def list_members(
    year: int = Query(..., description="조회 연도 (예: 2026)"),
    page: int = Query(1),
    page_size: int = Query(10),
    gyogu: Optional[int] = Query(None),
    team: Optional[int] = Query(None),
    group_no: Optional[int] = Query(None),
    generation: Optional[int] = Query(None),
    field: Optional[str] = Query(None),
    keyword: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return build_member_list_response(
        db, page, page_size, year, gyogu, team, group_no, generation, field, keyword,
    )


@router.get("/members/deleted", response_model=DeletedMemberListResponse, tags=["교적 조회"], summary="삭제된 멤버 목록 조회", dependencies=[_deleted])
def list_deleted_members(
    page: int = Query(1),
    page_size: int = Query(10),
    year: Optional[int] = Query(None),
    gyogu: Optional[int] = Query(None),
    team: Optional[int] = Query(None),
    group_no: Optional[int] = Query(None),
    generation: Optional[int] = Query(None),
    deleted_from: Optional[datetime.date] = Query(None),
    deleted_to: Optional[datetime.date] = Query(None),
    field: Optional[str] = Query(None),
    keyword: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return build_deleted_member_list_response(
        db, page, page_size, year, gyogu, team, group_no, generation,
        deleted_from, deleted_to, field, keyword,
    )


@router.get("/members/deleted/{member_id}", response_model=DeletedMember, tags=["교적 조회"], summary="삭제된 멤버 상세 조회", dependencies=[_deleted])
def get_deleted_member(member_id: int = Path(...), db: Session = Depends(get_db)):
    return build_deleted_member_detail(db, member_id)


@router.post("/members", response_model=MemberIdResponse, status_code=201, tags=["교적 생성"], summary="멤버 추가", dependencies=[_members])
def create_member(body: MemberCreate, db: Session = Depends(get_db)):
    return svc_create_member(db, body)


@router.put("/members/{member_id}", response_model=MemberIdResponse, tags=["교적 수정"], summary="멤버 정보 수정", dependencies=[_members])
def update_member(member_id: int = Path(...), body: MemberUpdate = ..., db: Session = Depends(get_db)):
    return svc_update_member(db, member_id, body)


@router.delete("/members/bulk", response_model=MemberBulkResponse, tags=["교적 삭제"], summary="멤버 다건 소프트 삭제", dependencies=[_members])
def delete_members(body: MemberBulkDeleteRequest, db: Session = Depends(get_db)):
    return svc_delete_members(db, body)


@router.delete("/members/{member_id}", response_model=MemberIdResponse, tags=["교적 삭제"], summary="멤버 소프트 삭제", dependencies=[_members])
def delete_member(member_id: int = Path(...), body: MemberDeleteRequest = ..., db: Session = Depends(get_db)):
    return svc_delete_member(db, member_id, body)


@router.post("/members/restore/bulk", response_model=MemberBulkResponse, tags=["교적 삭제"], summary="삭제된 멤버 다건 복원", dependencies=[_deleted])
def restore_members(body: MemberIdsRequest, db: Session = Depends(get_db)):
    return svc_restore_members(db, body)


@router.post("/members/restore/{member_id}", response_model=MemberIdResponse, tags=["교적 삭제"], summary="삭제된 멤버 복원", dependencies=[_deleted])
def restore_member(member_id: int = Path(...), db: Session = Depends(get_db)):
    return svc_restore_member(db, member_id)
