"""출석률(member_profile.attendance_rate) 배치 계산/갱신.

공식:
- 앵커 = min(registered_at, enrolled_at, 첫 출석 기록일)
- N = 앵커 ~ today 범위 토요일 수
- N <= 52: 분자 = 같은 구간 PRESENT 수, 분모 = N
- N  > 52: 분자 = today 직전 52번째 토요일 ~ today 구간 PRESENT 수, 분모 = 52
- 저장: 백분율 소수 2자리 (예: 85.71)

registered_at(최초 등록일)이 앵커의 1순위다. 등록이 출석보다 항상 먼저이므로 실무상
이 값이 앵커가 되고, min()은 날짜 오입력 방어용으로 남겨둔다.

registered_at이 비어 있으면 enrolled_at → 첫 기록일 순으로 내려간다. 셋 다 없으면
산정 대상에서 제외된다(등급이 매겨지지 않음).
"""
import datetime
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
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
    """출석률 → 등급 매핑: ≥80 A, ≥60 B, ≥40 C, ≥20 D, <20 E."""
    if rate >= 80:
        return "A"
    if rate >= 60:
        return "B"
    if rate >= 40:
        return "C"
    if rate >= 20:
        return "D"
    return "E"


# ── DB 조회 ────────────────────────────────
def _first_record_dates(db: Session, member_ids: list[int]) -> dict[int, datetime.date]:
    """멤버별 최초 출석 기록일 — 새가족 시절 기록도 같은 테이블이라 함께 잡힌다."""
    if not member_ids:
        return {}
    rows = (
        db.query(AttendanceRecord.member_id,
                 func.min(AttendanceRecord.worship_date))
        .filter(AttendanceRecord.member_id.in_(member_ids))
        .group_by(AttendanceRecord.member_id)
        .all()
    )
    return dict(rows)


def _registered_dates(db: Session, member_ids: list[int]) -> dict[int, datetime.date]:
    """멤버별 최초 등록일(member.registered_at) — 값이 있는 것만 담는다."""
    if not member_ids:
        return {}
    rows = (
        db.query(Member.member_id, Member.registered_at)
        .filter(Member.member_id.in_(member_ids))
        .filter(Member.registered_at.isnot(None))
        .all()
    )
    return dict(rows)


def _count_present_from_anchors(
    db: Session, anchors: dict[int, datetime.date], end: datetime.date,
) -> dict[int, int]:
    """멤버별 앵커 이상 ~ end 이하 PRESENT 수. (N <= 52 케이스)"""
    if not anchors:
        return {}
    saturdays = saturdays_between(min(anchors.values()), end)
    if not saturdays:
        return {}
    q = (
        db.query(AttendanceRecord.member_id,
                 func.count(AttendanceRecord.attendance_id))
        .filter(AttendanceRecord.worship_date.in_(saturdays))
        .filter(or_(*[
            and_(AttendanceRecord.member_id == mid,
                 AttendanceRecord.worship_date >= anchor)
            for mid, anchor in anchors.items()
        ]))
    )
    q = by_status(q, "PRESENT")
    q = by_worship_date_lte(q, end)
    return dict(q.group_by(AttendanceRecord.member_id).all())


def _count_present_in_window(
    db: Session, member_ids: list[int], start: datetime.date, end: datetime.date,
) -> dict[int, int]:
    """고정 [start, end] 구간 내 PRESENT 수. (N > 52 케이스)"""
    saturdays = saturdays_between(start, end)
    if not saturdays:
        return {}
    q = db.query(AttendanceRecord.member_id,
                 func.count(AttendanceRecord.attendance_id))
    q = by_status(q, "PRESENT")
    q = by_worship_date_range(q, start, end)
    q = q.filter(AttendanceRecord.worship_date.in_(saturdays))
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
def resolve_anchors(
    db: Session,
    enrolled_map: dict[int, datetime.date | None],
    today: datetime.date,
) -> dict[int, datetime.date]:
    """멤버별 출석률 산정 시작일 = min(registered_at, enrolled_at, 첫 기록일).

    registered_at은 호출부에서 받지 않고 여기서 직접 조회한다 — 앵커 결정에 필요한
    값이 한곳에 모여 있는 편이 낫고, 호출부가 바뀌지 않아도 된다.

    - 최초 등록일이 있으면 그 날짜부터 산정 (신규 등록자의 정상 경로)
    - 미등반 새가족: registered_at만 있고 enrolled_at은 NULL
    - 등반한 새가족: 새가족 시절 registered_at이 유지되므로 등급이 끊기지 않는다
    - 셋 다 없으면 산정 대상에서 제외 (일괄 적재분 중 날짜 미정리 인원)
    """
    member_ids = list(enrolled_map)
    first_records = _first_record_dates(db, member_ids)
    registered = _registered_dates(db, member_ids)

    anchors: dict[int, datetime.date] = {}
    for mid, enrolled in enrolled_map.items():
        candidates = [
            d for d in (registered.get(mid), enrolled, first_records.get(mid))
            if d is not None
        ]
        if candidates:
            anchors[mid] = min(candidates)
    return anchors


def update_rates_for_members(
    db: Session,
    enrolled_map: dict[int, datetime.date | None],
    today: datetime.date,
) -> None:
    """요청 멤버들의 출석률을 재계산해 오늘 시점 유효 profile에 박아넣는다.

    호출부에서 이미 확보한 {member_id: enrolled_at} 매핑을 받는다 (새가족은 값이 None).
    실제 산정 시작일은 resolve_anchors가 registered_at·첫 기록일까지 고려해 결정하므로,
    호출부는 registered_at을 따로 넘기지 않아도 된다.
    commit은 호출부에서.
    """
    if not enrolled_map:
        return

    anchors = resolve_anchors(db, enrolled_map, today)
    if not anchors:
        return

    n_map = {
        mid: len(saturdays_between(anchor, today))
        for mid, anchor in anchors.items()
    }

    short_anchors = {mid: anchors[mid] for mid, n in n_map.items() if 0 < n <= WINDOW}
    long_ids      = [mid for mid, n in n_map.items() if n > WINDOW]

    present: dict[int, int] = {}
    if short_anchors:
        present.update(_count_present_from_anchors(db, short_anchors, today))
    if long_ids:
        window_start = nth_saturday_before(today, WINDOW)
        present.update(_count_present_in_window(db, long_ids, window_start, today))

    for mid, n in n_map.items():
        if n <= 0:
            continue
        denom = n if n <= WINDOW else WINDOW
        rate = compute_rate(present.get(mid, 0), denom)
        _set_rate_on_latest_profile(db, mid, today, rate)
