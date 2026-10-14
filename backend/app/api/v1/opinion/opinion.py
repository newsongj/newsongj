"""소견서 API — 현황 대시보드 · 사용자 작성 페이지"""
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_menu
from app.schemas.opinion import (
    OpinionListResponse, OpinionMyReportResponse, OpinionMyTargetsResponse,
    OpinionReportUpdateRequest, OpinionReportUpdateResponse,
)
from app.services.opinion import (
    svc_get_my_report, svc_get_my_targets, svc_get_opinion_reports,
    svc_save_my_report, svc_update_opinion_report,
)

router = APIRouter()

_dashboard = require_menu("admin.opinion.dashboard")
_user_opinion = require_menu("user.opinion")


# ── 소견서 현황 대시보드 (§2) ────────────────────────────────────────────────────────────

@router.get("/reports", response_model=OpinionListResponse, tags=["소견서"], summary="소견서 명단 조회 (관리자)", dependencies=[Depends(_dashboard)])
def get_opinion_reports(
    report_year: int = Query(...),
    gyogu: Optional[int] = Query(None),
    team: Optional[int] = Query(None),
    group_no: Optional[int] = Query(None),
    status: Optional[str] = Query("all"),
    db: Session = Depends(get_db),
):
    return svc_get_opinion_reports(db, report_year, gyogu, team, group_no, status)


@router.put("/reports/{member_id}", response_model=OpinionReportUpdateResponse, tags=["소견서"], summary="소견서 수정 (관리자)")
def update_opinion_report(
    member_id: int = Path(...),
    report_year: int = Query(...),
    body: OpinionReportUpdateRequest = ...,
    db: Session = Depends(get_db),
    payload: Dict[str, Any] = Depends(_dashboard),
):
    return svc_update_opinion_report(db, member_id, report_year, body, payload.get("member_id"))


# ── 사용자 작성 페이지 (OPINION_USERPAGE_APISPEC.md §3) ─────────────────────────────

@router.get("/my-targets", response_model=OpinionMyTargetsResponse, tags=["소견서"], summary="담당 대상자 목록 (사용자)")
def get_my_targets(
    report_year: int = Query(...),
    db: Session = Depends(get_db),
    payload: Dict[str, Any] = Depends(_user_opinion),
):
    return svc_get_my_targets(db, report_year, payload.get("member_id"))


@router.get("/my-reports/{member_id}", response_model=OpinionMyReportResponse, tags=["소견서"], summary="소견서 단건 조회 (사용자)")
def get_my_report(
    member_id: int = Path(...),
    report_year: int = Query(...),
    db: Session = Depends(get_db),
    payload: Dict[str, Any] = Depends(_user_opinion),
):
    return svc_get_my_report(db, member_id, report_year, payload.get("member_id"))


@router.put("/my-reports/{member_id}", response_model=OpinionReportUpdateResponse, tags=["소견서"], summary="소견서 저장 (사용자)")
def save_my_report(
    member_id: int = Path(...),
    report_year: int = Query(...),
    body: OpinionReportUpdateRequest = ...,
    db: Session = Depends(get_db),
    payload: Dict[str, Any] = Depends(_user_opinion),
):
    return svc_save_my_report(db, member_id, report_year, body, payload.get("member_id"))
