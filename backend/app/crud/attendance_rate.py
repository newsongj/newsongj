"""출석률(member_profile.attendance_rate) 배치 계산/갱신.

공식:
- N = enrolled_at ~ today 범위 토요일 수
- N <= 52: 분자 = 같은 구간 PRESENT 수, 분모 = N
- N  > 52: 분자 = today 직전 52번째 토요일 ~ today 구간 PRESENT 수, 분모 = 52
- 저장: 백분율 소수 2자리 (예: 85.71)
"""
import datetime
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import AttendanceRecord, Member
from app.core.date_utils import saturdays_between, nth_saturday_before
from app.crud.query_builders import (
    by_status,
    by_worship_date_range,
    by_worship_date_lte,
    by_member_ids,
)
from app.crud.member_profile import get_profile_as_of

WINDOW = 52


# ── 순수 계산 ──────────────────────────────
def compute_rate(present: int, denom: int) -> Decimal:
    """백분율 소수 2자리, ROUND_HALF_UP."""
    return (Decimal(present) * 100 / Decimal(denom)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )


def compute_grade(rate: Decimal) -> str:
    """출석률 → 등급 매핑: ≥80 A, ≥60 B, ≥40 C, <40 D."""
    if rate >= 80:
        return "A"
    if rate >= 60:
        return "B"
    if rate >= 40:
        return "C"
    return "D"


# ── DB 조회 ────────────────────────────────
def _count_present_with_member_start(
    db: Session, member_ids: list[int], end: datetime.date,
) -> dict[int, int]:
    """멤버별 enrolled_at 이상 ~ end 이하 PRESENT 수. (N <= 52 케이스)"""
    q = (
        db.query(AttendanceRecord.member_id,
                 func.count(AttendanceRecord.attendance_id))
        .join(Member, Member.member_id == AttendanceRecord.member_id)
        .filter(AttendanceRecord.worship_date >= func.date(Member.enrolled_at))
    )
    q = by_status(q, "PRESENT")
    q = by_worship_date_lte(q, end)
    q = by_member_ids(q, member_ids)
    return dict(q.group_by(AttendanceRecord.member_id).all())


def _count_present_in_window(
    db: Session, member_ids: list[int], start: datetime.date, end: datetime.date,
) -> dict[int, int]:
    """고정 [start, end] 구간 내 PRESENT 수. (N > 52 케이스)"""
    q = db.query(AttendanceRecord.member_id,
                 func.count(AttendanceRecord.attendance_id))
    q = by_status(q, "PRESENT")
    q = by_worship_date_range(q, start, end)
    q = by_member_ids(q, member_ids)
    return dict(q.group_by(AttendanceRecord.member_id).all())


# ── 쓰기 ──────────────────────────────────
def _set_rate_on_latest_profile(
    db: Session, member_id: int, today: datetime.date, rate: Decimal,
) -> None:
    profile = get_profile_as_of(db, member_id, today)
    if profile is not None:
        profile.attendance_rate = rate
        profile.attendance_grade = compute_grade(rate)


# ── 오케스트레이션 ────────────────────────
def update_rates_for_members(
    db: Session,
    enrolled_map: dict[int, datetime.date],
    today: datetime.date,
) -> None:
    """요청 멤버들의 출석률을 재계산해 오늘 시점 유효 profile에 박아넣는다.

    호출부에서 이미 확보한 {member_id: enrolled_at} 매핑을 그대로 받아 쿼리 중복을 피한다.
    commit은 호출부에서.
    """
    if not enrolled_map:
        return

    n_map = {
        mid: len(saturdays_between(start, today))
        for mid, start in enrolled_map.items()
    }

    short_ids = [mid for mid, n in n_map.items() if 0 < n <= WINDOW]
    long_ids  = [mid for mid, n in n_map.items() if n > WINDOW]

    present: dict[int, int] = {}
    if short_ids:
        present.update(_count_present_with_member_start(db, short_ids, today))
    if long_ids:
        window_start = nth_saturday_before(today, WINDOW)
        present.update(_count_present_in_window(db, long_ids, window_start, today))

    for mid, n in n_map.items():
        if n <= 0:
            continue
        denom = n if n <= WINDOW else WINDOW
        rate = compute_rate(present.get(mid, 0), denom)
        _set_rate_on_latest_profile(db, mid, today, rate)
