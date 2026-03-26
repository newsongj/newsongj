from sqlalchemy.orm import Session
from app.schemas.dashboards import KpiCard, KpiCardResponse, Trend, TrendResponse
from app.crud.dashboards import kpi_cards, generation, trend


def kpi_response(db: Session, data:KpiCard):
    (total_members, avg_present) = kpi_cards(db, data)
    
    return KpiCardResponse(
        avg_present=avg_present,
        total_members=total_members,
        gen45=generation(db, 45),
        gen46=generation(db, 46),
    )
