"""출석 대시보드 API"""
import datetime
from enum import Enum
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.schemas.dashboard import KpiResponse, TrendItem, DimensionItem, AbsentReasonItem, GyoguStatusItem
from app.services.dashboard import build_kpi_response, build_trend_response, build_dimension_response, build_absent_reason_response, build_gyogu_status_response


class PeriodUnit(str, Enum):
    weekly = "weekly"
    monthly = "monthly"
    yearly = "yearly"
    three_year = "three_year"


class DimensionType(str, Enum):
    gyogu = "gyogu"
    team = "team"
    generation = "generation"
    gender = "gender"
    leader = "leader"

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


@router.get("/trend", response_model=list[TrendItem], summary="출석 추이 조회")
def get_trend(
    period_unit: PeriodUnit = Query(..., description="집계 단위 (weekly|monthly|yearly|three_year)"),
    start_date: datetime.date = Query(..., description="시작일 (YYYY-MM-DD)"),
    end_date: datetime.date = Query(..., description="종료일 (YYYY-MM-DD)"),
    gyogu_no: Optional[int] = Query(None, description="교구 번호 (미지정 시 전체)"),
    team_no: Optional[int] = Query(None, description="팀 번호"),
    is_imwondan: bool = Query(False, description="임원단 필터"),
    db: Session = Depends(get_db),
):
    return build_trend_response(db, period_unit.value, start_date, end_date, gyogu_no, team_no, is_imwondan)


@router.get("/dimension", response_model=list[DimensionItem], summary="차원별 출석 인원 조회")
def get_dimension(
    dimension: DimensionType = Query(..., description="집계 차원 (gyogu|team|generation|gender|leader)"),
    start_date: datetime.date = Query(..., description="시작일 (YYYY-MM-DD)"),
    end_date: datetime.date = Query(..., description="종료일 (YYYY-MM-DD)"),
    gyogu_no: Optional[int] = Query(None, description="교구 번호 (미지정 시 전체)"),
    team_no: Optional[int] = Query(None, description="팀 번호"),
    is_imwondan: bool = Query(False, description="임원단 필터"),
    db: Session = Depends(get_db),
):
    return build_dimension_response(db, dimension.value, start_date, end_date, gyogu_no, team_no, is_imwondan)


@router.get("/absent-reason", response_model=list[AbsentReasonItem], summary="결석사유 분포 조회")
def get_absent_reason(
    start_date: datetime.date = Query(..., description="시작일 (YYYY-MM-DD)"),
    end_date: datetime.date = Query(..., description="종료일 (YYYY-MM-DD)"),
    gyogu_no: Optional[int] = Query(None, description="교구 번호 (미지정 시 전체)"),
    team_no: Optional[int] = Query(None, description="팀 번호"),
    is_imwondan: bool = Query(False, description="임원단 필터"),
    db: Session = Depends(get_db),
):
    return build_absent_reason_response(db, start_date, end_date, gyogu_no, team_no, is_imwondan)


@router.get("/gyogu-status", response_model=list[GyoguStatusItem], summary="교구별 출석/결석 현황 조회")
def get_gyogu_status(
    start_date: datetime.date = Query(..., description="시작일 (YYYY-MM-DD)"),
    end_date: datetime.date = Query(..., description="종료일 (YYYY-MM-DD)"),
    gyogu_no: Optional[int] = Query(None, description="교구 번호 (미지정 시 전체)"),
    is_imwondan: bool = Query(False, description="임원단 필터"),
    db: Session = Depends(get_db),
):
    return build_gyogu_status_response(db, start_date, end_date, gyogu_no, is_imwondan)
