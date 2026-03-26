from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.crud.dashboards import kpi_cards, trend
from app.schemas.dashboards import KpiCardResponse, Trend, TrendResponse
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
