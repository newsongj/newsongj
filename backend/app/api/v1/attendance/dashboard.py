"""대시보드 API"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
import datetime
from app.core.database import get_db
from app.schemas.dashboards import KpiCard, KpiCardResponse, Trend, GyoguTrendResponse, ThreeYearsTrendResponse, AbsentReasonResponse
from typing import Union
from app.services.dashboards import build_kpi, build_trend, build_absent


router = APIRouter(prefix="/api/attendance/dashboard", tags=["대시보드"])


@router.get(
    "/kpis",
    response_model=KpiCardResponse,
    summary="KPI 대시보드",
)
def get_kpi(
    start_date: datetime.date = Query(...),
    end_date: datetime.date = Query(...),
    db: Session = Depends(get_db),
):
    data = KpiCard(start_date=start_date, end_date=end_date)
    return build_kpi(db=db, data=data)


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
    data: KpiCard = Query(...),
    db: Session = Depends(get_db),
):
    return build_absent(db, data)