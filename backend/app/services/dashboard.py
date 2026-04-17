"""대시보드 비즈니스 로직 — 집계 결과를 응답 스키마로 변환"""
import datetime
from collections import defaultdict
from sqlalchemy.orm import Session
from app.crud.dashboard import get_kpi_stats, get_trend_stats, get_dimension_stats, get_absent_reason_stats, get_gyogu_status_stats, ABSENT_REASONS, GYOGU_KEYS
from app.core.date_utils import saturdays_between
from app.schemas.dashboard import KpiResponse, AttendanceStats, GenStats, TopReason, TrendItem, DimensionItem, AbsentReasonItem, GyoguStatusItem


def _empty_gen_stats(end_date) -> list[GenStats]:
    gen_curr = end_date.year - 1980
    return [
        GenStats(gen=gen_curr - 1, present=0, total=0),
        GenStats(gen=gen_curr,     present=0, total=0),
    ]


def build_kpi_response(
    db: Session,
    start_date,
    end_date,
    gyogu_no: int | None,
    team_no,
    is_imwondan: bool,
) -> KpiResponse:
    stats = get_kpi_stats(db, start_date, end_date, gyogu_no, team_no, is_imwondan)

    if stats is None:
        return KpiResponse(
            all=AttendanceStats(present=0, total=0),
            by_gen=_empty_gen_stats(end_date),
            top_reason=None,
        )

    n = stats["n"]

    top = stats["reason_counter"].most_common(1)
    top_reason = TopReason(reason=top[0][0], count=round(top[0][1] / n, 1)) if top else None

    return KpiResponse(
        all=AttendanceStats(
            present=round(stats["total_present"] / n, 1),
            total=round(stats["total_members"] / n, 1),
        ),
        by_gen=[
            GenStats(
                gen=stats["gen_prev"],
                present=round(stats["gen_stats"][stats["gen_prev"]]["present"] / n, 1),
                total=round(stats["gen_stats"][stats["gen_prev"]]["total"] / n, 1),
            ),
            GenStats(
                gen=stats["gen_curr"],
                present=round(stats["gen_stats"][stats["gen_curr"]]["present"] / n, 1),
                total=round(stats["gen_stats"][stats["gen_curr"]]["total"] / n, 1),
            ),
        ],
        top_reason=top_reason,
    )


def build_trend_response(
    db: Session,
    period_unit: str,
    start_date: datetime.date,
    end_date: datetime.date,
    gyogu_no: int | None,
    team_no: int | None,
    is_imwondan: bool,
) -> list[TrendItem]:
    date_present = get_trend_stats(db, start_date, end_date, gyogu_no, team_no, is_imwondan)

    if period_unit == "weekly":
        # 기간 내 모든 일요일 생성, 데이터 없으면 0
        saturdays = saturdays_between(start_date, end_date)
        return [
            TrendItem(period=f"{d.month}/{d.day}", present=float(date_present.get(d, 0)))
            for d in saturdays
        ]

    if period_unit == "monthly":
        items = []
        y, m = start_date.year, start_date.month
        while (y, m) <= (end_date.year, end_date.month):
            vals = [p for d, p in date_present.items() if d.year == y and d.month == m]
            present = round(sum(vals) / len(vals), 1) if vals else 0.0
            items.append(TrendItem(period=f"{m}월", present=present))
            m += 1
            if m > 12:
                m = 1
                y += 1
        return items

    # yearly
    items = []
    for y in range(start_date.year, end_date.year + 1):
        vals = [p for d, p in date_present.items() if d.year == y]
        present = round(sum(vals) / len(vals), 1) if vals else 0.0
        items.append(TrendItem(period=f"{y}년", present=present))
    return items


def build_dimension_response(
    db: Session,
    dimension: str,
    start_date: datetime.date,
    end_date: datetime.date,
    gyogu_no: int | None,
    team_no: int | None,
    is_imwondan: bool,
) -> list[DimensionItem]:
    stats = get_dimension_stats(db, dimension, start_date, end_date, gyogu_no, team_no, is_imwondan)
    n = stats["n"]

    return [
        DimensionItem(
            name=key,
            present=round(sum(stats["buckets"][key]) / n, 1) if n > 0 else 0.0,
        )
        for key in stats["keys"]
    ]


def build_absent_reason_response(
    db: Session,
    start_date: datetime.date,
    end_date: datetime.date,
    gyogu_no: int | None,
    team_no: int | None,
    is_imwondan: bool,
) -> list[AbsentReasonItem]:
    stats = get_absent_reason_stats(db, start_date, end_date, gyogu_no, team_no, is_imwondan)
    n = stats["n"]

    return [
        AbsentReasonItem(
            reason=r,
            count=round(sum(stats["buckets"][r]) / n, 1) if n > 0 else 0.0,
        )
        for r in ABSENT_REASONS
    ]


def build_gyogu_status_response(
    db: Session,
    start_date: datetime.date,
    end_date: datetime.date,
    gyogu_no: int | None,
    is_imwondan: bool,
) -> list[GyoguStatusItem]:
    stats = get_gyogu_status_stats(db, start_date, end_date, gyogu_no, is_imwondan)
    n = stats["n"]

    return [
        GyoguStatusItem(
            name=k,
            present=round(sum(stats["present"][k]) / n, 1) if n > 0 else 0.0,
            absent=round(sum(stats["absent"][k]) / n, 1) if n > 0 else 0.0,
        )
        for k in GYOGU_KEYS
    ]
