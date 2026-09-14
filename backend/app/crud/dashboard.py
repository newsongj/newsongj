"""대시보드 CRUD — 집계 쿼리 담당"""
import json
import datetime
from collections import Counter
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.crud.query_builders import (
    build_attendance_records_range_query,
    apply_attendance_filters,
    get_worship_dates_in_range,
    get_leader_id,
    newcomers_only,
)
from app.models import AttendanceRecord, Leader, Member, MemberProfile


def _parse_leader_ids(profile) -> list[str]:
    """profile.leader_ids JSON 문자열을 문자열 리스트로 파싱."""
    if not profile.leader_ids:
        return []
    try:
        return [str(x) for x in json.loads(profile.leader_ids)]
    except (json.JSONDecodeError, TypeError):
        return []


def _is_imwondan(profile, imwondan_lid: int | None) -> bool:
    """프로필이 임원단 소속인지 판정."""
    if not imwondan_lid:
        return False
    return str(imwondan_lid) in _parse_leader_ids(profile)


def _fetch_filtered_records_and_dates(
    db: Session,
    start_date: datetime.date,
    end_date: datetime.date,
    gyogu_no: int | None,
    team_no: int | None,
) -> tuple[list, list[datetime.date]]:
    """기간 내 필터 적용된 출석 record + 예배일 list를 반환.

    반환:
        rows  — 필터 적용된 (AttendanceRecord, Member, MemberProfile) 튜플 list.
        dates — 기간 내 예배일 list (필터 무관, n = len(dates) 계산용).

    SQL 회수: 2 (예배일 distinct + ranged record query).
    날짜별 루프 + build_attendance_records_query 호출 패턴(N+1)을 대체한다.
    """
    dates = get_worship_dates_in_range(db, start_date, end_date)
    q = build_attendance_records_range_query(db, start_date, end_date, include_newcomers=True)
    q = apply_attendance_filters(q, gyogu_no, team_no)
    rows = q.all()
    return rows, dates


TOP_GENERATION_COUNT = 2
GENERATION_POOL_SIZE = 6      # 후보로 볼 최근 기수 수
GENERATION_OUTLIER_MAX = 5    # 인원이 이 값 이하인 기수는 소수 기수로 보고 버린다


def get_top_generations(db: Session, limit: int = TOP_GENERATION_COUNT) -> list[int]:
    """KPI 카드가 볼 기수를 DB에서 뽑아 오름차순으로 반환.

    단순히 최상위 기수를 고르면 아직 한두 명뿐인 신규 기수(예: 48기 1명)가 카드를
    차지한다. 그래서 최근 6개 기수를 후보로 모은 뒤 인원 5명 이하인 기수를 버리고,
    남은 것 중 가장 어린 N개를 고른다. 신규 기수도 인원이 차오르면 자동으로 편입된다.

    필터(교구/팀)와 무관하게 전체 기준 — 필터에 따라 카드 라벨이 바뀌면 혼란스럽다.
    """
    rows = (
        db.query(Member.generation, func.count(Member.member_id))
        .filter(Member.deleted_at.is_(None))
        .group_by(Member.generation)
        .order_by(Member.generation.desc())
        .limit(GENERATION_POOL_SIZE)
        .all()
    )
    if not rows:
        return []

    counts = {gen: cnt for gen, cnt in rows}
    eligible = [gen for gen, cnt in counts.items() if cnt > GENERATION_OUTLIER_MAX]

    # 남는 기수가 부족하면(전부 소수 기수인 경우) 인원 많은 순으로 채운다
    if len(eligible) < limit:
        eligible = [gen for gen, _ in sorted(counts.items(), key=lambda kv: (-kv[1], -kv[0]))]

    return sorted(sorted(eligible, reverse=True)[:limit])


def get_kpi_stats(
    db: Session,
    start_date: datetime.date,
    end_date: datetime.date,
    gyogu_no: int | None,
    team_no: int | None,
) -> dict | None:
    """기간 내 예배별 출석 통계를 집계해 KPI 원시 데이터 반환.

    attendance_record 기준으로 집계 — member_profile은 필터/기수 산정용 join.

    반환값:
        None  — 기간 내 예배 기록 없음
        dict  — n, total_present, total_members, gen_stats, reason_counter
    """
    rows, dates = _fetch_filtered_records_and_dates(
        db, start_date, end_date, gyogu_no, team_no
    )
    if not dates:
        return None

    generations = get_top_generations(db)
    gen_stats: dict[int, dict] = {g: {"present": 0, "total": 0} for g in generations}

    total_present = 0
    total_members = 0
    reason_counter: Counter = Counter()

    for record, member, _ in rows:
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
        "generations": generations,
        "gen_stats": gen_stats,
        "reason_counter": reason_counter,
    }


def get_newcomer_kpi_stats(
    db: Session,
    start_date: datetime.date,
    end_date: datetime.date,
    gyogu_no: int | None,
    team_no: int | None,
) -> dict:
    """기간 내 새가족 출석 집계 — KPI 카드용.

    각 기록의 worship_date 시점 profile이 '새가족'인 건만 센다. 등반 이후 기록은
    일반 멤버로 잡히므로, 과거 수치가 등반 때문에 소급 변동하지 않는다.

    반환값: {"n": 예배 횟수, "present": PRESENT 수, "total": 전체 기록 수}
    """
    dates = get_worship_dates_in_range(db, start_date, end_date)

    base = build_attendance_records_range_query(
        db, start_date, end_date, include_newcomers=True
    )
    base = newcomers_only(base)
    base = apply_attendance_filters(base, gyogu_no, team_no)

    total = base.with_entities(func.count()).scalar() or 0
    present = (
        base.with_entities(func.count())
        .filter(AttendanceRecord.status == "PRESENT")
        .scalar()
    ) or 0

    return {"n": len(dates), "present": present, "total": total}


def get_trend_stats(
    db: Session,
    start_date: datetime.date,
    end_date: datetime.date,
    gyogu_no: int | None,
    team_no: int | None,
) -> dict[datetime.date, int]:
    """기간 내 예배일별 출석 인원 수를 {worship_date: present_count} 딕셔너리로 반환.

    SQL GROUP BY worship_date — record를 hydrate하지 않고 DB 측에서 카운트.
    """
    dates = get_worship_dates_in_range(db, start_date, end_date)
    result: dict[datetime.date, int] = {d: 0 for d in dates}

    base = build_attendance_records_range_query(db, start_date, end_date, include_newcomers=True)
    base = apply_attendance_filters(base, gyogu_no, team_no)

    agg = (
        base.with_entities(
            AttendanceRecord.worship_date,
            func.count().label("present"),
        )
        .filter(AttendanceRecord.status == "PRESENT")
        .group_by(AttendanceRecord.worship_date)
        .all()
    )
    for d, c in agg:
        if d in result:
            result[d] = c
    return result


def _dimension_keys_and_meta(
    db: Session, dimension: str
) -> tuple[list[str], int | None, dict[str, int]]:
    """dimension별 bucket 키 목록 + 메타 정보(임원단 leader_id, leader_id_map) 산출."""
    imwondan_lid: int | None = None
    leader_id_map: dict[str, int] = {}

    if dimension == "gyogu":
        keys = ["1교구", "2교구", "3교구", "임원단"]
        imwondan_lid = get_leader_id(db, "임원단")
    elif dimension == "team":
        keys = [f"{i}팀" for i in range(1, 13)]
    elif dimension == "generation":
        gens = (
            db.query(Member.generation)
            .distinct()
            .order_by(Member.generation)
            .all()
        )
        keys = [f"{g[0]}기" for g in gens]
    elif dimension == "gender":
        keys = ["남", "여"]
    elif dimension == "leader":
        leaders = (
            db.query(Leader)
            .filter(Leader.is_active == 1)
            .order_by(Leader.display_order)
            .all()
        )
        keys = [l.leader_name for l in leaders]
        leader_id_map = {l.leader_name: l.leader_id for l in leaders}
    else:
        keys = []

    return keys, imwondan_lid, leader_id_map


def _dimension_stats_sql(
    db: Session,
    dimension: str,
    keys: list[str],
    start_date: datetime.date,
    end_date: datetime.date,
    gyogu_no: int | None,
    team_no: int | None,
) -> dict:
    """team/generation/gender 차원: SQL GROUP BY로 한 방에 카운트.

    buckets[key]는 services 측 sum(...)/n 평균 계산을 위해 단일원소 list로 보관.
    """
    dates = get_worship_dates_in_range(db, start_date, end_date)
    buckets: dict[str, list[int]] = {k: [0] for k in keys}

    base = build_attendance_records_range_query(db, start_date, end_date, include_newcomers=True)
    base = apply_attendance_filters(base, gyogu_no, team_no)

    if dimension == "team":
        group_col = MemberProfile.team
        key_fmt = lambda v: f"{v}팀"
    elif dimension == "generation":
        group_col = Member.generation
        key_fmt = lambda v: f"{v}기"
    elif dimension == "gender":
        group_col = Member.gender
        key_fmt = lambda v: v
    else:
        return {"n": len(dates), "buckets": buckets, "keys": keys}

    agg = (
        base.with_entities(group_col, func.count().label("c"))
        .filter(AttendanceRecord.status == "PRESENT")
        .group_by(group_col)
        .all()
    )
    for value, c in agg:
        key = key_fmt(value)
        if key in buckets:
            buckets[key] = [c]

    return {"n": len(dates), "buckets": buckets, "keys": keys}


def _dimension_stats_python(
    db: Session,
    dimension: str,
    keys: list[str],
    imwondan_lid: int | None,
    leader_id_map: dict[str, int],
    start_date: datetime.date,
    end_date: datetime.date,
    gyogu_no: int | None,
    team_no: int | None,
) -> dict:
    """gyogu(임원단 포함)/leader 차원: leader_ids JSON 파싱이 필요해 raw fetch 후 Python 집계.

    buckets[key]는 날짜별 카운트 list (기존 동작 보존).
    """
    rows, dates = _fetch_filtered_records_and_dates(
        db, start_date, end_date, gyogu_no, team_no
    )
    by_date: dict[datetime.date, dict[str, int]] = {
        d: {k: 0 for k in keys} for d in dates
    }

    for record, _, profile in rows:
        if record.status != "PRESENT":
            continue
        day_count = by_date.get(record.worship_date)
        if day_count is None:
            continue

        if dimension == "gyogu":
            gyogu_key = f"{profile.gyogu}교구"
            if gyogu_key in day_count:
                day_count[gyogu_key] += 1
            if _is_imwondan(profile, imwondan_lid):
                day_count["임원단"] += 1

        elif dimension == "leader":
            lid_list = _parse_leader_ids(profile)
            for lid in lid_list:
                for lname, lid_val in leader_id_map.items():
                    if lid == str(lid_val):
                        day_count[lname] += 1

    buckets: dict[str, list[int]] = {k: [] for k in keys}
    for d in dates:
        day_count = by_date[d]
        for k in keys:
            buckets[k].append(day_count[k])

    return {"n": len(dates), "buckets": buckets, "keys": keys}


def get_dimension_stats(
    db: Session,
    dimension: str,
    start_date: datetime.date,
    end_date: datetime.date,
    gyogu_no: int | None,
    team_no: int | None,
) -> dict:
    """dimension별 예배일당 출석 인원을 집계.

    반환값:
        {
            "n": 예배 횟수,
            "buckets": { bucket_name: [날짜별 present 수, ...] },
            "keys": [정렬된 bucket_name 목록],
        }

    경로 분기:
        team/generation/gender — SQL GROUP BY (1쿼리, buckets는 단일원소 list)
        gyogu/leader           — leader_ids JSON 파싱 필요 → Python 집계 (날짜별 list)
    """
    keys, imwondan_lid, leader_id_map = _dimension_keys_and_meta(db, dimension)

    if dimension in ("team", "generation", "gender"):
        return _dimension_stats_sql(
            db, dimension, keys, start_date, end_date, gyogu_no, team_no
        )

    if dimension in ("gyogu", "leader"):
        return _dimension_stats_python(
            db, dimension, keys, imwondan_lid, leader_id_map,
            start_date, end_date, gyogu_no, team_no,
        )

    # 알 수 없는 dimension — 빈 결과
    dates = get_worship_dates_in_range(db, start_date, end_date)
    return {"n": len(dates), "buckets": {}, "keys": []}


# 결석 사유 enum 순서 고정
ABSENT_REASONS = ["학교/학원", "회사", "알바", "가족모임", "개인일정", "아픔", "기타"]


def get_absent_reason_stats(
    db: Session,
    start_date: datetime.date,
    end_date: datetime.date,
    gyogu_no: int | None,
    team_no: int | None,
) -> dict:
    """기간 내 결석 사유 카운트 집계 (SQL GROUP BY).

    반환값:
        {"n": 예배 횟수, "buckets": {reason: [total_count]}}
        services는 sum(buckets[r])/n으로 평균을 내므로 단일원소 list로 충분.
    """
    dates = get_worship_dates_in_range(db, start_date, end_date)
    buckets: dict[str, list[int]] = {r: [0] for r in ABSENT_REASONS}

    base = build_attendance_records_range_query(db, start_date, end_date, include_newcomers=True)
    base = apply_attendance_filters(base, gyogu_no, team_no)

    agg = (
        base.with_entities(
            AttendanceRecord.absent_reason,
            func.count().label("c"),
        )
        .filter(AttendanceRecord.status == "ABSENT")
        .filter(AttendanceRecord.absent_reason.isnot(None))
        .group_by(AttendanceRecord.absent_reason)
        .all()
    )
    for reason, c in agg:
        if reason in buckets:
            buckets[reason] = [c]

    return {"n": len(dates), "buckets": buckets}


GYOGU_KEYS = ["1교구", "2교구", "3교구", "임원단"]


def get_gyogu_status_stats(
    db: Session,
    start_date: datetime.date,
    end_date: datetime.date,
    gyogu_no: int | None,
) -> dict:
    """교구별 예배일당 출석/결석 인원 집계.

    반환값:
        {"n": 예배 횟수, "present": {key: [...]}, "absent": {key: [...]}}
    """
    imwondan_lid = get_leader_id(db, "임원단")

    rows, dates = _fetch_filtered_records_and_dates(
        db, start_date, end_date, gyogu_no, None
    )

    by_date_present: dict[datetime.date, dict[str, int]] = {
        d: {k: 0 for k in GYOGU_KEYS} for d in dates
    }
    by_date_absent: dict[datetime.date, dict[str, int]] = {
        d: {k: 0 for k in GYOGU_KEYS} for d in dates
    }

    for record, _, profile in rows:
        day_present = by_date_present.get(record.worship_date)
        day_absent = by_date_absent.get(record.worship_date)
        if day_present is None or day_absent is None:
            continue

        gyogu_key = f"{profile.gyogu}교구"
        is_present = record.status == "PRESENT"

        if gyogu_key in day_present:
            if is_present:
                day_present[gyogu_key] += 1
            else:
                day_absent[gyogu_key] += 1

        if _is_imwondan(profile, imwondan_lid):
            if is_present:
                day_present["임원단"] += 1
            else:
                day_absent["임원단"] += 1

    present_buckets: dict[str, list[int]] = {k: [] for k in GYOGU_KEYS}
    absent_buckets: dict[str, list[int]] = {k: [] for k in GYOGU_KEYS}
    for d in dates:
        for k in GYOGU_KEYS:
            present_buckets[k].append(by_date_present[d][k])
            absent_buckets[k].append(by_date_absent[d][k])

    return {"n": len(dates), "present": present_buckets, "absent": absent_buckets}
