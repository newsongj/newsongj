"""교적 멤버 API 엔드포인트 — 파라미터 파싱 + service 호출만 담당"""
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.crud.members import (
    get_members, get_deleted_members,
    create_member as crud_create_member,
    update_member as crud_update_member,
    delete_member as crud_delete_member,
    restore_member as crud_restore_member,
)
from app.services.members import build_member_list, build_deleted_member_list, build_member_response
from app.schemas.members import (
    MemberListResponse, DeletedMemberListResponse,
    MemberResponse, MemberDeleteRequest, MemberCreate, MemberIdResponse,
)
from typing import Optional
import datetime

router = APIRouter()


# 활성 멤버 목록 조회
@router.get("/members", response_model=MemberListResponse)
def list_members(
    year: datetime.date = Query(...),  # 필수: MemberProfile이 연도별 행이므로 반드시 지정
    page: int = Query(1),
    page_size: int = Query(10),
    gyogu: Optional[int] = Query(None),
    team: Optional[int] = Query(None),
    group_no: Optional[int] = Query(None),
    generation: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    rows, total = get_members(db, page, page_size, year, gyogu, team, group_no, generation)
    return build_member_list(rows, total, page, page_size, db)


# 삭제된 멤버 목록 조회
@router.get("/members/deleted", response_model=DeletedMemberListResponse)
def list_deleted_members(
    page: int = Query(1),
    page_size: int = Query(10),
    year: Optional[datetime.date] = Query(None),
    gyogu: Optional[int] = Query(None),
    team: Optional[int] = Query(None),
    group_no: Optional[int] = Query(None),
    generation: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    rows, total = get_deleted_members(db, page, page_size, year, gyogu, team, group_no, generation)
    return build_deleted_member_list(rows, total, page, page_size, db)


# 멤버 추가
@router.post("/members", response_model=MemberResponse, status_code=201)
def create_member(
    body: MemberCreate,
    db: Session = Depends(get_db),
):
    member, profile = crud_create_member(db, body)
    return build_member_response(member, profile, db)


# 멤버 수정
@router.put("/members/{member_id}", response_model=MemberIdResponse)
def update_member(
    member_id: int = Path(...),
    body: MemberCreate = ...,
    db: Session = Depends(get_db),
):
    replaced_id = crud_update_member(db, member_id, body)
    return MemberIdResponse(member_id=replaced_id)


# 멤버 소프트 삭제
@router.delete("/members/{member_id}", response_model=MemberResponse)
def delete_member(
    member_id: int = Path(...),
    body: MemberDeleteRequest = ...,
    db: Session = Depends(get_db),
):
    member = crud_delete_member(db, member_id, body)
    return build_member_response(member, None, db)


# 삭제된 멤버 복원
@router.post("/members/restore/{member_id}", response_model=MemberResponse)
def restore_member(
    member_id: int = Path(...),
    db: Session = Depends(get_db),
):
    member = crud_restore_member(db, member_id)
    return build_member_response(member, None, db)
