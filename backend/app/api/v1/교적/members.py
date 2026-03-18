from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.crud.member import get_members, resolve_leader_names
from app.schemas.member import MemberListResponse, MemberRow, PageMeta
from typing import Optional
import datetime

router = APIRouter()


@router.get("/members", response_model=MemberListResponse)
def list_members(
    page: int = Query(1),
    page_size: int = Query(10),
    year: Optional[datetime.date] = Query(None),
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
