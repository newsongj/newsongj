from sqlalchemy.orm import Session
from app.schemas.dashboards import KpiCard, KpiCardResponse, Trend, DailyAttendance
from app.crud.dashboards import kpi_cards, generation, get_trend


def kpi_response(db: Session, data: KpiCard):
    (total_members, avg_present) = kpi_cards(db, data)

    return KpiCardResponse(
        avg_present=avg_present,
        total_members=total_members,
        gen45=generation(db, 45),
        gen46=generation(db, 46),
    )


def build_trend(db: Session, data: Trend) -> list[DailyAttendance]:
    """출석 인원 추이"""
    rows = get_trend(db, data)
    return [DailyAttendance(period=row.period, present=row.present) for row in rows]
