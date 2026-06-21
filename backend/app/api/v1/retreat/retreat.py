"""수련회 설정 API — 생성 / 조회 / 수정"""
from typing import Optional

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.retreat import (
    RetreatCreate, RetreatUpdate, RetreatCreateResponse, RetreatActiveResponse,
    ResearchListResponse, VehicleMemberListResponse, VehicleDashboardResponse,
    RetreatHeadcountResponse, RetreatAccommodationResponse,
    AdminSuspendedMealListResponse, AdminSuspendedMealStats, AdminSuspendedMealReviewRequest,
)
from app.services.retreat import (
    svc_create_retreat, svc_get_active_retreat, svc_update_retreat, svc_complete_retreat,
    svc_get_research_list, svc_get_vehicle_member_list, svc_get_vehicle_dashboard,
    svc_get_headcount, svc_get_accommodation,
    svc_get_admin_suspended_meal_list, svc_get_admin_suspended_meal_stats, svc_review_suspended_meal,
)

router = APIRouter()


@router.post("", response_model=RetreatCreateResponse, status_code=201, summary="수련회 생성")
def create_retreat(body: RetreatCreate, db: Session = Depends(get_db)):
    return svc_create_retreat(db, body)


@router.get("/active", response_model=RetreatActiveResponse, summary="현재 수련회 + 버스 목록 조회")
def get_active_retreat(db: Session = Depends(get_db)):
    return svc_get_active_retreat(db)


@router.get("/headcount", response_model=RetreatHeadcountResponse, summary="인원조사 집계")
def get_headcount(db: Session = Depends(get_db)):
    return svc_get_headcount(db)


@router.get("/accommodation", response_model=RetreatAccommodationResponse, summary="숙소/야식 인원 집계")
def get_accommodation(
    gyogu_no: Optional[int]  = Query(None),
    team_no:  Optional[int]  = Query(None),
    is_imwondan: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    return svc_get_accommodation(db, gyogu_no, team_no)


@router.get("/vehicle", response_model=VehicleDashboardResponse, summary="대시보드 차량탭 집계")
def get_vehicle_dashboard(db: Session = Depends(get_db)):
    return svc_get_vehicle_dashboard(db)


@router.get("/research/list", response_model=ResearchListResponse, summary="인원조사 명단 (관리자)")
def get_research_list(
    gyogu: Optional[int] = Query(None),
    team: Optional[int] = Query(None),
    survey_status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return svc_get_research_list(db, gyogu, team, survey_status)


@router.get("/vehicle-members", response_model=VehicleMemberListResponse, summary="차량조사 명단 (관리자)")
def get_vehicle_member_list(
    gyogu: Optional[int] = Query(None),
    team: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    return svc_get_vehicle_member_list(db, gyogu, team)


@router.get("/suspended-meal", response_model=AdminSuspendedMealListResponse, summary="서스펜디드밀 신청 목록 (관리자)")
def get_admin_suspended_meal_list(
    page:          int           = Query(1, ge=1),
    size:          int           = Query(20, ge=1, le=100),
    review_status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return svc_get_admin_suspended_meal_list(db, review_status, page, size)


@router.get("/suspended-meal/stats", response_model=AdminSuspendedMealStats, summary="서스펜디드밀 통계 (관리자)")
def get_admin_suspended_meal_stats(db: Session = Depends(get_db)):
    return svc_get_admin_suspended_meal_stats(db)


@router.put("/suspended-meal/{application_id}/review", status_code=200, summary="서스펜디드밀 승인/반려")
def review_suspended_meal(
    application_id: int = Path(...),
    body: AdminSuspendedMealReviewRequest = ...,
    db: Session = Depends(get_db),
):
    svc_review_suspended_meal(db, application_id, body)
    return {"ok": True}


@router.put("/{retreat_id}", status_code=200, summary="수련회 기본 정보 수정")
def update_retreat(
    retreat_id: int = Path(...),
    body: RetreatUpdate = ...,
    db: Session = Depends(get_db),
):
    svc_update_retreat(db, retreat_id, body)
    return {"ok": True}


@router.put("/{retreat_id}/complete", status_code=200, summary="수련회 완료 처리")
def complete_retreat(retreat_id: int = Path(...), db: Session = Depends(get_db)):
    svc_complete_retreat(db, retreat_id)
    return {"ok": True}
