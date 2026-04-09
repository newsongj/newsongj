"""출석 대시보드 API"""
import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.schemas.dashboard import KpiResponse
from app.services.dashboard import build_kpi_response

router = APIRouter(prefix="/api/attendance/dashboard", tags=["출석 대시보드"])


@router.get("/kpi", response_model=KpiResponse, summary="출석 KPI 조회")
def get_kpi(
    start_date: datetime.date = Query(..., description="시작일 (YYYY-MM-DD)"),
    end_date: datetime.date = Query(..., description="종료일 (YYYY-MM-DD)"),
    gyogu_no: Optional[int] = Query(None, description="교구 번호 (미지정 시 전체)"),
    team_no: Optional[int] = Query(None, description="팀 번호"),
    is_imwondan: bool = Query(False, description="임원단 필터"),
    db: Session = Depends(get_db),
):
    return build_kpi_response(db, start_date, end_date, gyogu_no, team_no, is_imwondan)
