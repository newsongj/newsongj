"""출석 대시보드 통합 API — 5개 섹션을 한 번에 반환."""
import calendar
import datetime
from enum import Enum
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.dashboard import DashboardResponse
from app.services.dashboard import build_dashboard_response


class PeriodUnit(str, Enum):
    weekly = "weekly"
    monthly = "monthly"
    yearly = "yearly"
    custom = "custom"


router = APIRouter(prefix="/api/attendance/dashboard", tags=["출석 대시보드"])


_TREND_LOOKBACK_WEEKS = 12   # weekly: 직전 12주
_TREND_LOOKBACK_MONTHS = 6   # monthly: 직전 6달
_TREND_LOOKBACK_YEARS = 3    # yearly: 직전 3년


def _resolve_period(
    period_unit: PeriodUnit,
    date: Optional[str],
    start_date: Optional[datetime.date],
    end_date: Optional[datetime.date],
) -> tuple[tuple[datetime.date, datetime.date], tuple[datetime.date, datetime.date]]:
    """period_unit + date/start_date/end_date → (main_range, trend_range).

    main 범위:  kpi/dimension/absent_reason/gyogu_status가 보는 단일 시점/범위
    trend 범위: trend가 보는 lookback 범위

    형식 위반 시 HTTPException(422).
    """
    if period_unit == PeriodUnit.weekly:
        if not date:
            raise HTTPException(422, "weekly: date(YYYY-MM-DD)가 필요합니다.")
        try:
            d = datetime.datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(422, "weekly: date는 YYYY-MM-DD 형식이어야 합니다 (예: 2026-01-03).")
        if d.weekday() != 5:
            raise HTTPException(422, "weekly: date는 토요일이어야 합니다 (예: 2026-01-03).")
        trend_start = d - datetime.timedelta(weeks=_TREND_LOOKBACK_WEEKS - 1)
        return (d, d), (trend_start, d)

    if period_unit == PeriodUnit.monthly:
        if not date:
            raise HTTPException(422, "monthly: date(YYYY-MM)가 필요합니다.")
        try:
            anchor = datetime.datetime.strptime(date, "%Y-%m").date()
        except ValueError:
            raise HTTPException(422, "monthly: date는 YYYY-MM 형식이어야 합니다 (예: 2026-01).")
        y, m = anchor.year, anchor.month
        main_start = datetime.date(y, m, 1)
        main_end = datetime.date(y, m, calendar.monthrange(y, m)[1])
        # trend: 5달 전 1일 ~ 그 달 말일
        ty, tm = y, m - (_TREND_LOOKBACK_MONTHS - 1)
        while tm <= 0:
            tm += 12
            ty -= 1
        trend_start = datetime.date(ty, tm, 1)
        return (main_start, main_end), (trend_start, main_end)

    if period_unit == PeriodUnit.yearly:
        if not date:
            raise HTTPException(422, "yearly: date(YYYY)가 필요합니다.")
        try:
            y = int(date)
            if y < 1900 or y > 9999:
                raise ValueError
        except ValueError:
            raise HTTPException(422, "yearly: date는 4자리 연도여야 합니다 (예: 2026).")
        main_start = datetime.date(y, 1, 1)
        main_end = datetime.date(y, 12, 31)
        trend_start = datetime.date(y - (_TREND_LOOKBACK_YEARS - 1), 1, 1)
        return (main_start, main_end), (trend_start, main_end)

    # custom
    if start_date is None or end_date is None:
        raise HTTPException(422, "custom: start_date와 end_date가 모두 필요합니다.")
    if start_date > end_date:
        raise HTTPException(422, "custom: start_date는 end_date보다 같거나 빨라야 합니다.")
    return (start_date, end_date), (start_date, end_date)


@router.get(
    "",
    response_model=DashboardResponse,
    response_model_exclude_none=True,
    summary="출석 대시보드 통합 조회",
    description=(
        "5개 섹션(kpi, trend, dimension, absent_reason, gyogu_status)을 한 번에 반환.\n\n"
        "- **trend**는 lookback 범위를 본다 (weekly:12주 / monthly:6달 / yearly:3년 / custom:전체).\n"
        "- **나머지 섹션**은 단일 시점/범위(weekly:1토요일, monthly:1달, yearly:1년, custom:전체)만 본다.\n"
        "- 모든 수치는 주(토요일) 평균.\n"
        "- dimension의 gyogu/team은 필터 조합에 따라 응답에서 생략될 수 있다."
    ),
)
def get_dashboard(
    period_unit: PeriodUnit = Query(..., description="weekly | monthly | yearly | custom"),
    date: Optional[str] = Query(
        None,
        description="weekly:YYYY-MM-DD(토요일) / monthly:YYYY-MM / yearly:YYYY",
    ),
    start_date: Optional[datetime.date] = Query(None, description="custom 전용 (YYYY-MM-DD)"),
    end_date: Optional[datetime.date] = Query(None, description="custom 전용 (YYYY-MM-DD)"),
    gyogu_no: Optional[int] = Query(None, description="교구 번호 (미지정 시 전체)"),
    team_no: Optional[int] = Query(None, description="팀 번호 (gyogu_no와 함께만 지정 가능)"),
    is_imwondan: bool = Query(False, description="임원단 필터"),
    db: Session = Depends(get_db),
):
    # 필터 조합 검증
    if team_no is not None and gyogu_no is None:
        raise HTTPException(422, "team_no는 gyogu_no와 함께 지정해야 합니다.")

    main_range, trend_range = _resolve_period(period_unit, date, start_date, end_date)

    return build_dashboard_response(
        db,
        period_unit=period_unit.value,
        main_start=main_range[0],
        main_end=main_range[1],
        trend_start=trend_range[0],
        trend_end=trend_range[1],
        gyogu_no=gyogu_no,
        team_no=team_no,
        is_imwondan=is_imwondan,
    )
