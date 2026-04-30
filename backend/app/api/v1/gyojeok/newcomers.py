"""미등반 새가족 API 엔드포인트."""
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.services.newcomers import (
    build_newcomer_list_response,
    create_newcomer as svc_create_newcomer,
    update_newcomer as svc_update_newcomer,
    delete_newcomer as svc_delete_newcomer,
    enroll_newcomer as svc_enroll_newcomer,
)
from app.schemas.members import MemberListResponse, MemberIdResponse
from app.schemas.newcomers import NewcomerCreate, NewcomerUpdate, EnrollRequest

router = APIRouter()


@router.get("/members/newcomers", response_model=MemberListResponse, tags=["미등반새가족"], summary="미등반 새가족 목록 조회")
def list_newcomer_members(
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
    return build_newcomer_list_response(
        db, page, page_size, year, gyogu, team, group_no, generation, field, keyword,
    )


@router.post("/members/newcomers", response_model=MemberIdResponse, status_code=201, tags=["미등반새가족"], summary="새가족 추가")
def create_newcomer(
    body: NewcomerCreate,
    db: Session = Depends(get_db),
):
    return svc_create_newcomer(db, body)


@router.put("/members/newcomers/{member_id}", response_model=MemberIdResponse, tags=["미등반새가족"], summary="새가족 정보 수정")
def update_newcomer(
    member_id: int = Path(...),
    body: NewcomerUpdate = ...,
    db: Session = Depends(get_db),
):
    return svc_update_newcomer(db, member_id, body)


@router.delete("/members/newcomers/{member_id}", response_model=MemberIdResponse, tags=["미등반새가족"], summary="새가족 소프트 삭제")
def delete_newcomer(
    member_id: int = Path(...),
    db: Session = Depends(get_db),
):
    return svc_delete_newcomer(db, member_id)


@router.put("/members/{member_id}/enroll", response_model=MemberIdResponse, tags=["미등반새가족"], summary="새가족 등반 처리")
def enroll_newcomer(
    member_id: int = Path(...),
    body: EnrollRequest = ...,
    db: Session = Depends(get_db),
):
    return svc_enroll_newcomer(db, member_id, body)
