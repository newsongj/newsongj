"""사용자 수련회 API — 인원조사 / 차량 / 서스펜디드밀"""
from typing import List, Optional

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_menu, verify_token
from app.schemas.retreat import (
    ResearchMemberResponse, ResearchResponseUpdate,
    VehicleMyResponse, VehicleSubmitBody,
    SuspendedMealMemberResponse, SuspendedMealSubmitBody,
)
from app.crud.retreat import get_distinct_gyogu_list
from app.services.retreat import (
    svc_get_research_members,
    svc_upsert_research_response,
    svc_get_vehicle_my,
    svc_submit_vehicle,
    svc_get_suspended_meal_members,
    svc_upsert_suspended_meal,
)

router = APIRouter()


@router.get(
    "/api/gyogu-list",
    response_model=List[int],
    tags=["공통"],
    summary="실제 존재하는 교구 번호 목록",
    dependencies=[Depends(verify_token)],
)
def get_gyogu_list(db: Session = Depends(get_db)):
    return get_distinct_gyogu_list(db)


@router.get(
    "/api/retreat/research/members",
    response_model=List[ResearchMemberResponse],
    tags=["사용자 인원조사"],
    summary="인원조사 멤버 목록",
    dependencies=[Depends(require_menu("user.research"))],
)
def get_research_members(
    group_no: Optional[int] = Query(None),
    gyogu:    Optional[int] = Query(None),
    team:     Optional[int] = Query(None),
    payload: dict = Depends(require_menu("user.research")),
    db: Session = Depends(get_db),
):
    return svc_get_research_members(
        db,
        data_scope=payload["data_scope"],
        gyogu=payload.get("gyogu"),
        team=payload.get("team"),
        group_no=payload.get("group_no"),
        query_group_no=group_no,
        query_gyogu=gyogu,
        query_team=team,
    )


@router.put(
    "/api/retreat/research/response/{member_id}",
    status_code=200,
    tags=["사용자 인원조사"],
    summary="인원조사 응답 저장",
    dependencies=[Depends(require_menu("user.research"))],
)
def save_research_response(
    member_id: int = Path(...),
    body: ResearchResponseUpdate = ...,
    db: Session = Depends(get_db),
):
    svc_upsert_research_response(db, member_id, body)
    return {"ok": True}


@router.get(
    "/api/vehicle/my",
    response_model=VehicleMyResponse,
    tags=["사용자 차량조사"],
    summary="내 차량 신청 내역 조회",
)
def get_vehicle_my(
    payload: dict = Depends(require_menu("user.vehicle")),
    db: Session = Depends(get_db),
):
    member_id = payload.get("member_id")
    if not member_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=400, detail="계정이 회원과 연결되어 있지 않습니다.")
    return svc_get_vehicle_my(db, member_id)


@router.post(
    "/api/vehicle",
    status_code=200,
    tags=["사용자 차량조사"],
    summary="차량 신청 제출",
)
def submit_vehicle(
    body: VehicleSubmitBody,
    payload: dict = Depends(require_menu("user.vehicle")),
    db: Session = Depends(get_db),
):
    member_id = payload.get("member_id")
    if not member_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=400, detail="계정이 회원과 연결되어 있지 않습니다.")
    svc_submit_vehicle(db, member_id, body)
    return {"ok": True}


@router.get(
    "/api/retreat/suspended-meal/members",
    response_model=List[SuspendedMealMemberResponse],
    tags=["사용자 서스펜디드밀"],
    summary="서스펜디드밀 멤버 목록",
)
def get_suspended_meal_members(
    gyogu: Optional[int] = Query(None),
    team:  Optional[int] = Query(None),
    payload: dict = Depends(require_menu("user.suspended_meal")),
    db: Session = Depends(get_db),
):
    return svc_get_suspended_meal_members(
        db,
        data_scope=payload["data_scope"],
        gyogu=payload.get("gyogu"),
        team=payload.get("team"),
        group_no=payload.get("group_no"),
        query_gyogu=gyogu,
        query_team=team,
    )


@router.put(
    "/api/retreat/suspended-meal/response/{member_id}",
    status_code=200,
    tags=["사용자 서스펜디드밀"],
    summary="서스펜디드밀 신청/수정",
    dependencies=[Depends(require_menu("user.suspended_meal"))],
)
def submit_suspended_meal(
    member_id: int = Path(...),
    body: SuspendedMealSubmitBody = ...,
    db: Session = Depends(get_db),
):
    svc_upsert_suspended_meal(db, member_id, body)
    return {"ok": True}
