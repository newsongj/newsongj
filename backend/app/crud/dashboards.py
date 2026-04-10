from sqlalchemy.orm import Session
from sqlalchemy import func, case, select
from app.models import AttendanceRecord, Member, MemberProfile
from app.schemas.dashboards import KpiCardResponse, Generation, Trend, KpiCard, AbsentReasonResponse
import datetime


def _latest_profile_subq():
    """worship_date 기준 가장 최근 member_profile의 updated_at을 구하는 상관 서브쿼리"""
    return (
        select(func.max(MemberProfile.updated_at))
        .where(
            MemberProfile.member_id == AttendanceRecord.member_id,
            MemberProfile.updated_at <= AttendanceRecord.worship_date,
        )
        .correlate(AttendanceRecord)
        .scalar_subquery()
    )


def generation(db: Session, gen: int, num_saturdays: int, start_date: datetime.date, end_date: datetime.date) -> Generation:
    """특정 기수 출석 통계"""
    gen_base = (
        db.query(AttendanceRecord)
        .join(Member, AttendanceRecord.member_id == Member.member_id)
        .filter(
            Member.generation == gen,
            AttendanceRecord.worship_date >= start_date,
            AttendanceRecord.worship_date <= end_date,
        )
    )
    gen_total = round(gen_base.count() / num_saturdays)
    gen_present = round(gen_base.filter(AttendanceRecord.status == "PRESENT").count() / num_saturdays)
    return Generation(present=gen_present, total=gen_total)


def kpi_cards(db: Session, num_saturdays: int, start_date: datetime.date, end_date: datetime.date) -> KpiCardResponse:
    """KPI 카드 집계 쿼리"""
    date_base = db.query(AttendanceRecord).filter(
        AttendanceRecord.worship_date >= start_date,
        AttendanceRecord.worship_date <= end_date,
    )
    total_members = date_base.count()
    present_count = date_base.filter(AttendanceRecord.status == "PRESENT").count()

    avg_present = round(present_count / num_saturdays)
    

    return KpiCardResponse(
        avg_present=avg_present,
        total_members=total_members,
        gen45=Generation(present=0, total=0),
        gen46=Generation(present=0, total=0),
        top_absent_reason=AbsentReasonResponse(reason="", count=0)
    )


def get_trend(db: Session, data: Trend):
    """출석 인원 추이 - gyogu별 DB GROUP BY 쿼리"""
    present_count = func.sum(
        case((AttendanceRecord.status == "PRESENT", 1), else_=0)
    ).label("present")

    if data.period_unit == "weekly" or "3years":
        # 주의 여섯째 날(토요일)을 M/D 형식으로 표시
        period_col = func.date_format(func.min(AttendanceRecord.worship_date), "%c/%e").label("period")
        worship_date_group_col = func.yearweek(AttendanceRecord.worship_date, 6)
    elif data.period_unit == "monthly":
        period_col = func.date_format(AttendanceRecord.worship_date, "%m월").label("period")
        worship_date_group_col = func.date_format(AttendanceRecord.worship_date, "%Y-%m")
    elif data.period_unit == "yearly":
        period_col = func.date_format(AttendanceRecord.worship_date, "%Y년").label("period")
        worship_date_group_col = func.year(AttendanceRecord.worship_date)
    else:  # custom
        period_col = func.date_format(AttendanceRecord.worship_date, "%c/%e").label("period")
        worship_date_group_col = AttendanceRecord.worship_date

    gyogu_col = MemberProfile.gyogu.label("gyogu")

    query = (
        db.query(gyogu_col, period_col, present_count)
        .join(
            MemberProfile,
            (MemberProfile.member_id == AttendanceRecord.member_id) &
            (MemberProfile.updated_at == _latest_profile_subq()),
        )
        .filter(
            AttendanceRecord.worship_date >= data.start_date,
            AttendanceRecord.worship_date <= data.end_date,
        )
    )
    # if not data.is_imwondan: 임원단 필터링 (추후 구현)

    if data.gyogu_no is not None:
        query = query.filter(MemberProfile.gyogu == data.gyogu_no)
    if data.team_no is not None:
        query = query.filter(MemberProfile.team == data.team_no)

    return (
        query
        .group_by(MemberProfile.gyogu, worship_date_group_col)
        .order_by(MemberProfile.gyogu, worship_date_group_col)
        .all()
    )

def get_total_by_dates(db: Session, dates: list[datetime.date]):
    """특정 날짜 목록의 전체 출석 인원 합계"""
    return (
        db.query(
            AttendanceRecord.worship_date,
            func.sum(case((AttendanceRecord.status == "PRESENT", 1), else_=0)).label("present"),
        )
        .filter(AttendanceRecord.worship_date.in_(dates))
        .group_by(AttendanceRecord.worship_date)
        .order_by(AttendanceRecord.worship_date)
        .all()
    )


def get_absent_reason(db: Session, data: KpiCard):
    query = (
        db.query(
            AttendanceRecord.absent_reason.label("reason"),
            func.count().label("count"),
        )
        .filter(
            AttendanceRecord.worship_date >= data.start_date,
            AttendanceRecord.worship_date <= data.end_date,
            AttendanceRecord.absent_reason.isnot(None),
        )
    )

    # if not data.is_imwondan: 임원단 필터링 (추후 구현)

    if data.gyogu_no is not None or data.team_no is not None:
        query = query.join(
            MemberProfile,
            (MemberProfile.member_id == AttendanceRecord.member_id) &
            (MemberProfile.updated_at == _latest_profile_subq()),
        )
        if data.gyogu_no is not None:
            query = query.filter(MemberProfile.gyogu == data.gyogu_no)
        if data.team_no is not None:
            query = query.filter(MemberProfile.team == data.team_no)

    return query.group_by(AttendanceRecord.absent_reason).all()
    