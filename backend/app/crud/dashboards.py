from sqlalchemy.orm import Session
from sqlalchemy import func, case
from app.models import AttendanceRecord, Member
from app.schemas.dashboards import KpiCardResponse, Generation, Trend, DailyAttendance
import datetime


def generation(db: Session, gen: int, start_date: datetime.date, end_date: datetime.date) -> Generation:
    """기수 출석 통계"""
    gen_base = (
        db.query(AttendanceRecord)
        .join(Member, AttendanceRecord.member_id == Member.member_id)
        .filter(
            Member.generation == gen,
            AttendanceRecord.worship_date >= start_date,
            AttendanceRecord.worship_date <= end_date,
        )
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
    present_count = date_base.filter(AttendanceRecord.status == "PRESENT").count()

    days_to_saturday = (5 - start_date.weekday()) % 7
    first_saturday = start_date + datetime.timedelta(days=days_to_saturday)
    num_saturdays = max((end_date - first_saturday).days // 7 + 1, 1) if first_saturday <= end_date else 1
    avg_present = round(present_count / num_saturdays)

    gen45 = generation(db, 45, start_date, end_date)
    gen46 = generation(db, 46, start_date, end_date)

    return KpiCardResponse(
        avg_present=avg_present,
        total_members=total_members,
        gen45=gen45,
        gen46=gen46,
    )


def get_trend(db: Session, data: Trend):
    """출석 인원 추이 - DB GROUP BY 쿼리"""
    present_count = func.sum(
        case((AttendanceRecord.status == "PRESENT", 1), else_=0)
    ).label("present")

    if data.period_unit == "custom":
        period_col = func.date_format(AttendanceRecord.worship_date, "%c/%e").label("period")
        worship_date_group_col = AttendanceRecord.worship_date
    elif data.period_unit == "weekly":
        # 주의 여섯째 날(토요일)을 M/D 형식으로 표시
        period_col = func.date_format(func.min(AttendanceRecord.worship_date), "%c/%e").label("period")
        worship_date_group_col = func.yearweek(AttendanceRecord.worship_date, 6)
    elif data.period_unit == "monthly":
        period_col = func.date_format(AttendanceRecord.worship_date, "%m월").label("period")
        worship_date_group_col = func.date_format(AttendanceRecord.worship_date, "%Y-%m")
    else:  # yearly
        period_col = func.date_format(AttendanceRecord.worship_date, "%Y년").label("period")
        worship_date_group_col = func.year(AttendanceRecord.worship_date)

    query = (
        db.query(period_col, present_count)
        .filter(
            AttendanceRecord.worship_date >= data.start_date,
            AttendanceRecord.worship_date <= data.end_date,
        )
    )

    if not data.is_imwondan:
        if data.gyogu_no is not None:
            query = query.filter(AttendanceRecord.gyogu == data.gyogu_no)
        if data.team_no is not None:
            query = query.filter(AttendanceRecord.team == data.team_no)
    # else: 임원단 필터링 (추후 구현)

    return query.group_by(worship_date_group_col).order_by(worship_date_group_col).all()
