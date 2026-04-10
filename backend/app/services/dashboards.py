from sqlalchemy.orm import Session
from app.schemas.dashboards import KpiCard, KpiCardResponse, Trend, DailyAttendance, GyoguTrendResponse, CurrentTrend, PrevYearTrend, ThreeYearsTrendResponse, Dimention, DimentionResponse, AbsentReasonResponse
from app.crud.dashboards import kpi_cards, generation, get_trend, get_total_by_dates, get_absent_reason
import datetime

def build_absent(db: Session, data: KpiCard) -> list[AbsentReasonResponse]:
    rows = get_absent_reason(db, data=data)
    return [AbsentReasonResponse(reason=row.reason, count=row.count) for row in rows]

def build_kpi(db: Session, data: KpiCard) -> KpiCardResponse:
    # 토요일 수
    days_to_saturday = (5 - data.start_date.weekday()) % 7
    first_saturday = data.start_date + datetime.timedelta(days=days_to_saturday)
    num_saturdays = max((data.end_date - first_saturday).days // 7 + 1, 1) if first_saturday <= data.end_date else 1

    kpi = kpi_cards(db, num_saturdays, data.start_date, data.end_date)

    # 가장 많은 사유 찾기
    absent = build_absent(db, data)
    count = 0
    reason = ""
    for absent_reason in absent:
        if absent_reason.count > count:
            count = absent_reason.count
            reason = absent_reason.reason

    # 올해 기준 새큼이 기수
    sae_kum = int(datetime.date.today().strftime("%Y"))-1980

    return KpiCardResponse(
        avg_present=kpi.avg_present,
        total_members=kpi.total_members,
        # 새큼이 통계
        gen46 = generation(db, sae_kum, num_saturdays, data.start_date, data.end_date),
        gen45 = generation(db, sae_kum-1, num_saturdays, data.start_date, data.end_date),
        top_absent_reason = AbsentReasonResponse(reason=reason, count=count)
    )


def _build_gyogu_trend(rows) -> list[GyoguTrendResponse]:
    gyogu_map: dict[int, list[DailyAttendance]] = {}
    for row in rows:
        gyogu_map.setdefault(row.gyogu, []).append(
            DailyAttendance(period=row.period, present=row.present)
        )
    return [GyoguTrendResponse(gyogu=g, trend=t) for g, t in gyogu_map.items()]


def _same_week_saturday(d: datetime.date, year_offset: int) -> datetime.date:
    """같은 달 같은 주차(월중 N번째 토요일)를 year_offset년 전에서 반환"""
    week_no = (d.day - 1) // 7  # 0-based: 0=첫째주, 1=둘째주, ...
    first_of_month = datetime.date(d.year - year_offset, d.month, 1)
    days_to_sat = (5 - first_of_month.weekday()) % 7  # 토요일까지의 날 수
    return first_of_month + datetime.timedelta(days=days_to_sat + week_no * 7)


def build_trend(db: Session, data: Trend):
    """교구별 출석 인원 추이. 3years면 ThreeYearsTrendResponse, 그 외엔 list[GyoguTrendResponse]"""
    rows = get_trend(db, data)
    current = _build_gyogu_trend(rows)

    if data.period_unit != "3years":
        return current

    # 입력 기간의 토요일 목록과 period 레이블 수집
    sat_periods: list[tuple[datetime.date, str]] = []
    d = data.start_date
    while d <= data.end_date:
        if d.weekday() == 5:  # 토요일
            sat_periods.append((d, f"{d.month}/{d.day}"))
        d += datetime.timedelta(days=1)

    def prev_year_trend(offset: int) -> list[DailyAttendance]:
        prev_dates = [_same_week_saturday(sat, offset) for sat, _ in sat_periods]
        date_to_present = {
            row.worship_date: row.present
            for row in get_total_by_dates(db, prev_dates)
        }
        return [
            DailyAttendance(period=label, present=date_to_present.get(_same_week_saturday(sat, offset), 0))
            for sat, label in sat_periods
        ]

    current_year = data.start_date.year
    return ThreeYearsTrendResponse(
        current=CurrentTrend(year=current_year, data=current),
        year_ago=PrevYearTrend(year=current_year - 1, data=prev_year_trend(1)),
        two_years_ago=PrevYearTrend(year=current_year - 2, data=prev_year_trend(2)),
    )
    

def build_dimention(db: Session, data: Dimention) -> list[DimentionResponse]:
    """todo"""