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
    is_imwondan: bool,
) -> tuple[list, list[datetime.date]]:
    """기간 내 필터 적용된 출석 record + 예배일 list를 반환.

    반환:
        rows  — 필터 적용된 (AttendanceRecord, Member, MemberProfile) 튜플 list.
                apply_attendance_filters가 None을 반환하면 빈 list.
        dates — 기간 내 예배일 list (필터 무관, n = len(dates) 계산용).

    SQL 회수: 2 (예배일 distinct + ranged record query).
    날짜별 루프 + build_attendance_records_query 호출 패턴(N+1)을 대체한다.
    """
    dates = get_worship_dates_in_range(db, start_date, end_date)
    q = build_attendance_records_range_query(db, start_date, end_date)
    q = apply_attendance_filters(q, db, gyogu_no, team_no, is_imwondan)
    rows = [] if q is None else q.all()
    return rows, dates


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
    rows, dates = _fetch_filtered_records_and_dates(
        db, start_date, end_date, gyogu_no, team_no, is_imwondan
    )
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
        "gen_prev": gen_prev,
        "gen_curr": gen_curr,
        "gen_stats": gen_stats,
        "reason_counter": reason_counter,
    }


def get_trend_stats(
    db: Session,
    start_date: datetime.date,
    end_date: datetime.date,
    gyogu_no: int | None,
    team_no: int | None,
    is_imwondan: bool,
) -> dict[datetime.date, int]:
    """기간 내 예배일별 출석 인원 수를 {worship_date: present_count} 딕셔너리로 반환.

    SQL GROUP BY worship_date — record를 hydrate하지 않고 DB 측에서 카운트.
    """
    dates = get_worship_dates_in_range(db, start_date, end_date)
    result: dict[datetime.date, int] = {d: 0 for d in dates}

    base = build_attendance_records_range_query(db, start_date, end_date)
    base = apply_attendance_filters(base, db, gyogu_no, team_no, is_imwondan)
    if base is None:
        return result

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
    is_imwondan: bool,
) -> dict:
    """team/generation/gender 차원: SQL GROUP BY로 한 방에 카운트.

    buckets[key]는 services 측 sum(...)/n 평균 계산을 위해 단일원소 list로 보관.
    """
    dates = get_worship_dates_in_range(db, start_date, end_date)
    buckets: dict[str, list[int]] = {k: [0] for k in keys}

    base = build_attendance_records_range_query(db, start_date, end_date)
    base = apply_attendance_filters(base, db, gyogu_no, team_no, is_imwondan)
    if base is None:
        return {"n": len(dates), "buckets": buckets, "keys": keys}

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
    is_imwondan: bool,
) -> dict:
    """gyogu(임원단 포함)/leader 차원: leader_ids JSON 파싱이 필요해 raw fetch 후 Python 집계.

    buckets[key]는 날짜별 카운트 list (기존 동작 보존).
    """
    rows, dates = _fetch_filtered_records_and_dates(
        db, start_date, end_date, gyogu_no, team_no, is_imwondan
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
    is_imwondan: bool,
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
            db, dimension, keys, start_date, end_date, gyogu_no, team_no, is_imwondan
        )

    if dimension in ("gyogu", "leader"):
        return _dimension_stats_python(
            db, dimension, keys, imwondan_lid, leader_id_map,
            start_date, end_date, gyogu_no, team_no, is_imwondan,
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
    is_imwondan: bool,
) -> dict:
    """기간 내 결석 사유 카운트 집계 (SQL GROUP BY).

    반환값:
        {"n": 예배 횟수, "buckets": {reason: [total_count]}}
        services는 sum(buckets[r])/n으로 평균을 내므로 단일원소 list로 충분.
    """
    dates = get_worship_dates_in_range(db, start_date, end_date)
    buckets: dict[str, list[int]] = {r: [0] for r in ABSENT_REASONS}

    base = build_attendance_records_range_query(db, start_date, end_date)
    base = apply_attendance_filters(base, db, gyogu_no, team_no, is_imwondan)
    if base is None:
        return {"n": len(dates), "buckets": buckets}

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
    is_imwondan: bool,
) -> dict:
    """교구별 예배일당 출석/결석 인원 집계.

    반환값:
        {"n": 예배 횟수, "present": {key: [...]}, "absent": {key: [...]}}
    """
    imwondan_lid = get_leader_id(db, "임원단")

    rows, dates = _fetch_filtered_records_and_dates(
        db, start_date, end_date, gyogu_no, None, is_imwondan
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
