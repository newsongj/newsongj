from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.crud.member import (
    get_members, get_deleted_members, resolve_leader_names,
    create_member, delete_member, restore_member as crud_restore_member,
    build_member_row, modify_member,
)
from app.schemas.member import (
    DeletedMemberListResponse, DeletedMember, MemberListResponse,
    MemberRow, PageMeta, MemberDeleteState, AddMember, MemberIdResponse,
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
    rows, total, leader_map = get_members(db, page, page_size, year, gyogu, team, group_no, generation)

    items = []
    for member, profile in rows:
        items.append(
            MemberRow(
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
                leader=resolve_leader_names(profile.leader, leader_map) if profile else None,
                v8pid=member.v8pid,
                year=profile.year if profile else None,
                enrolled_at=member.enrolled_at,
            )
        )

    return MemberListResponse(
        items=items,
        meta=PageMeta(
            current_page=page,
            page_size=page_size,
            total_items=total,
        ),
    )


# 삭제된 멤버 목록 조회
@router.get("/members/deleted", response_model=DeletedMemberListResponse)
def deleted_list_members(
    page: int = Query(1),
    page_size: int = Query(10),
    year: Optional[datetime.date] = Query(None),
    gyogu: Optional[int] = Query(None),
    team: Optional[int] = Query(None),
    group_no: Optional[int] = Query(None),
    generation: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    rows, total, leader_map = get_deleted_members(db, page, page_size, year, gyogu, team, group_no, generation)

    items = []
    for member, profile in rows:
        items.append(
            DeletedMember(
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
                leader=resolve_leader_names(profile.leader, leader_map) if profile else None,
                v8pid=member.v8pid,
                year=profile.year if profile else None,
                enrolled_at=member.enrolled_at,
                deleted_at=member.deleted_at,
                deleted_reason=member.deleted_reason,
            )
        )

    return DeletedMemberListResponse(
        items=items,
        meta=PageMeta(
            current_page=page,
            page_size=page_size,
            total_items=total,
        ),
    )


# 멤버 추가
@router.post("/members", response_model=AddMember, status_code=201)
def add_member(
    body: AddMember,
    db: Session = Depends(get_db),
):
    member, profile = create_member(db, body)
    return build_member_row(member, profile, db)


# 멤버 수정
@router.put("/members/{member_id}", response_model=MemberIdResponse)
def edit_member(
    member_id: int = Path(...),
    body: AddMember = ...,
    db: Session = Depends(get_db),
):
    replaced_id = modify_member(db, member_id, body)
    return MemberIdResponse(member_id=replaced_id)


# 멤버 소프트 삭제
@router.delete("/members/{member_id}", response_model=MemberRow)
def remove_member(
    member_id: int = Path(...),
    body: MemberDeleteState = ...,
    db: Session = Depends(get_db),
):
    member = delete_member(db, member_id, body)
    return build_member_row(member, None, db)


# 삭제된 멤버 복원 (버그 수정: 원본은 함수명이 crud import와 충돌했음)
@router.post("/members/restore/{member_id}", response_model=MemberRow)
def restore_member_endpoint(
    member_id: int = Path(...),
    db: Session = Depends(get_db),
):
    member = crud_restore_member(db, member_id)
    return build_member_row(member, None, db)
