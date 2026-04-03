"""gyojeok 멤버 API 엔드포인트 — 파라미터 파싱 + service 호출만 담당"""
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.crud.members import (
    get_members, get_deleted_members, get_deleted_member as crud_get_deleted_member,
    create_member as crud_create_member,
    update_member as crud_update_member,
    delete_member as crud_delete_member,
    restore_member as crud_restore_member,
)
from app.services.members import build_member_list, build_deleted_member_list, build_deleted_member_response
from app.schemas.members import (
    MemberListResponse, DeletedMemberListResponse, DeletedMember,
    MemberDeleteRequest, MemberRequest, MemberIdResponse,
)
from typing import Optional
import datetime

router = APIRouter()


@router.get("/members", response_model=MemberListResponse, tags=["교적 조회"], summary="활성 멤버 목록 조회")
def list_members(
    year: int = Query(..., description="조회 연도 (예: 2026)"),
    page: int = Query(1),
    page_size: int = Query(10),
    gyogu: Optional[int] = Query(None),
    team: Optional[int] = Query(None),
    group_no: Optional[int] = Query(None),
    generation: Optional[int] = Query(None),
    field: Optional[str] = Query(None, description="검색 유형: name|generation|phone_number|birthdate|leader|enrolled_at|school_work|major|v8pid|member_type"),
    keyword: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    rows, total = get_members(db, page, page_size, year, gyogu, team, group_no, generation, field, keyword)
    return build_member_list(rows, total, page, page_size, db)


@router.get("/members/deleted", response_model=DeletedMemberListResponse, tags=["교적 조회"], summary="삭제된 멤버 목록 조회")
def list_deleted_members(
    page: int = Query(1),
    page_size: int = Query(10),
    year: Optional[int] = Query(None, description="조회 연도 (예: 2026) — 최종 profile 연도 기준"),
    gyogu: Optional[int] = Query(None),
    team: Optional[int] = Query(None),
    group_no: Optional[int] = Query(None),
    generation: Optional[int] = Query(None),
    deleted_from: Optional[datetime.date] = Query(None),
    deleted_to: Optional[datetime.date] = Query(None),
    field: Optional[str] = Query(None, description="검색 유형: name|generation|phone_number|birthdate|leader|enrolled_at|school_work|major|v8pid|member_type"),
    keyword: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    rows, total = get_deleted_members(db, page, page_size, year, gyogu, team, group_no, generation, deleted_from, deleted_to, field, keyword)
    return build_deleted_member_list(rows, total, page, page_size, db)


@router.get("/members/deleted/{member_id}", response_model=DeletedMember, tags=["교적 조회"], summary="삭제된 멤버 상세 조회")
def get_deleted_member_detail(
    member_id: int = Path(...),
    db: Session = Depends(get_db),
):
    member, profile = crud_get_deleted_member(db, member_id)
    return build_deleted_member_response(member, profile, db)


@router.post("/members", response_model=MemberIdResponse, status_code=201, tags=["교적 생성"], summary="멤버 추가")
def create_member(
    body: MemberRequest,
    db: Session = Depends(get_db),
):
    member, _ = crud_create_member(db, body)
    return MemberIdResponse(member_id=member.member_id)


@router.put("/members/{member_id}", response_model=MemberIdResponse, tags=["교적 수정"], summary="멤버 정보 수정")
def update_member(
    member_id: int = Path(...),
    body: MemberRequest = ...,
    db: Session = Depends(get_db),
):
    replaced_id = crud_update_member(db, member_id, body)
    return MemberIdResponse(member_id=replaced_id)


@router.delete("/members/{member_id}", response_model=MemberIdResponse, tags=["교적 삭제"], summary="멤버 소프트 삭제")
def delete_member(
    member_id: int = Path(...),
    body: MemberDeleteRequest = ...,
    db: Session = Depends(get_db),
):
    crud_delete_member(db, member_id, body)
    return MemberIdResponse(member_id=member_id)


@router.post("/members/restore/{member_id}", response_model=MemberIdResponse, tags=["교적 삭제"], summary="삭제된 멤버 복원")
def restore_member(
    member_id: int = Path(...),
    db: Session = Depends(get_db),
):
    crud_restore_member(db, member_id)
    return MemberIdResponse(member_id=member_id)
