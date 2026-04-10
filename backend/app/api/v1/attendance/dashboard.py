"""출석 대시보드 API"""
import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from typing import Union
from app.core.database import get_db
from app.schemas.dashboard import KpiResponse
from app.schemas.dashboards import Dashboard, Trend, GyoguTrendResponse, ThreeYearsTrendResponse, AbsentReasonResponse
from app.services.dashboard import build_kpi_response
from app.services.dashboards import build_trend, build_absent

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


router = APIRouter(prefix="/api/attendance/dashboard", tags=["대시보드"])


@router.get(
    "/trend",
    response_model=Union[ThreeYearsTrendResponse, list[GyoguTrendResponse]],
    summary="출석 인원 추이",
)
def get_trend(
    period_unit: str = Query(...),
    start_date: datetime.date = Query(...),
    end_date: datetime.date = Query(...),
    gyogu_no: Optional[int] = Query(None),
    team_no: Optional[int] = Query(None),
    is_imwondan: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    data = Trend(
        period_unit=period_unit,
        start_date=start_date,
        end_date=end_date,
        gyogu_no=gyogu_no,
        team_no=team_no,
        is_imwondan=is_imwondan,
    )
    return build_trend(db=db, data=data)

@router.get(
    "/absent-reason",
    response_model=list[AbsentReasonResponse],
    summary="결석 사유별 인원",
)
def get_absent_reason(
    data: Dashboard = Query(...),
    db: Session = Depends(get_db),
):
    return build_absent(db, data)