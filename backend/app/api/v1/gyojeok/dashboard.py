from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.crud.dashboards import kpi_cards
from app.services.dashboards import build_trend
from app.schemas.dashboards import KpiCardResponse, Trend, DailyAttendance
from typing import Optional
import datetime

router = APIRouter()


@router.get("/dashboard/kpi", response_model=KpiCardResponse)
def get_kpi_cards(
    start_date: datetime.date = Query(...),
    end_date: datetime.date = Query(...),
    db: Session = Depends(get_db),
):
    return kpi_cards(db, start_date, end_date)


@router.get("/dashboard/trend", response_model=list[DailyAttendance])
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
    return build_trend(db, data)
