"""대시보드 CRUD — 집계 쿼리 담당"""
import datetime
from collections import Counter
from sqlalchemy.orm import Session
from app.crud.query_builders import (
    build_attendance_records_query,
    apply_attendance_filters,
    get_worship_dates_in_range,
)


def get_kpi_stats(
    db: Session,
    start_date: datetime.date,
    end_date: datetime.date,
    gyogu_no: int | None,
    team_no: int | None,
    is_imwondan: bool,
) -> dict | None:
    """기간 내 예배별 출석 통계를 집계해 KPI 원시 데이터 반환.

    attendance_record 기준으로 집계 — member_profile은 필터/기수 산정용 join.

    반환값:
        None  — 기간 내 예배 기록 없음
        dict  — n, total_present, total_members, gen_stats, reason_counter
    """
    dates = get_worship_dates_in_range(db, start_date, end_date)
    if not dates:
        return None

    gen_curr = end_date.year - 1980
    gen_prev = gen_curr - 1
    gen_stats: dict[int, dict] = {
        gen_prev: {"present": 0, "total": 0},
        gen_curr: {"present": 0, "total": 0},
    }

    total_present = 0
    total_members = 0
    reason_counter: Counter = Counter()

    for date in dates:
        q = build_attendance_records_query(db, date)
        q = apply_attendance_filters(q, db, gyogu_no, team_no, is_imwondan)
        if q is None:
            continue

        for record, member, _ in q.all():
            total_members += 1
            is_present = record.status == "PRESENT"

            if is_present:
                total_present += 1
            if record.status == "ABSENT" and record.absent_reason:
                reason_counter[record.absent_reason] += 1
            if member.generation in gen_stats:
                gen_stats[member.generation]["total"] += 1
                if is_present:
                    gen_stats[member.generation]["present"] += 1

    return {
        "n": len(dates),
        "total_present": total_present,
        "total_members": total_members,
        "gen_prev": gen_prev,
        "gen_curr": gen_curr,
        "gen_stats": gen_stats,
        "reason_counter": reason_counter,
    }
