from sqlalchemy.orm import Session
from collections import defaultdict
from app.models import AttendanceRecord, Member
from app.schemas.dashboards import KpiCardResponse, Generation, Trend, TrendResponse, DailyAttendance
import datetime


def generation(db: Session, gen: int) -> Generation:
    """기수 출석 통계 (날짜 필터 없음)"""
    gen_base = (
        db.query(AttendanceRecord)
        .join(Member, AttendanceRecord.member_id == Member.member_id)
        .filter(Member.generation == gen)
    )
    gen_total = gen_base.count()
    gen_present = gen_base.filter(AttendanceRecord.status == "PRESENT").count()
    return Generation(present=gen_present, total=gen_total)


def kpi_cards(db: Session, start_date: datetime.date, end_date: datetime.date) -> KpiCardResponse:
    """KPI 카드 집계 쿼리"""
    date_base = db.query(AttendanceRecord).filter(
        AttendanceRecord.worship_date >= start_date,
        AttendanceRecord.worship_date <= end_date,
    )
    total_members = date_base.count()
    avg_present = date_base.filter(AttendanceRecord.status == "PRESENT").count()

    gen45 = generation(db, 45)
    gen46 = generation(db, 46)

    return KpiCardResponse(
        avg_present=avg_present,
        total_members=total_members,
        gen45=gen45,
        gen46=gen46,
    )
