"""대시보드 CRUD — 집계 쿼리 담당"""
import json
import datetime
from collections import Counter, defaultdict
from sqlalchemy.orm import Session
from app.crud.query_builders import (
    build_attendance_records_query,
    apply_attendance_filters,
    get_worship_dates_in_range,
    get_leader_id,
)
from app.models import Leader


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


def get_trend_stats(
    db: Session,
    start_date: datetime.date,
    end_date: datetime.date,
    gyogu_no: int | None,
    team_no: int | None,
    is_imwondan: bool,
) -> dict[datetime.date, int]:
    """기간 내 예배일별 출석 인원 수를 {worship_date: present_count} 딕셔너리로 반환."""
    dates = get_worship_dates_in_range(db, start_date, end_date)
    result: dict[datetime.date, int] = {}

    for date in dates:
        q = build_attendance_records_query(db, date)
        q = apply_attendance_filters(q, db, gyogu_no, team_no, is_imwondan)
        if q is None:
            result[date] = 0
            continue

        present = sum(1 for record, _, _ in q.all() if record.status == "PRESENT")
        result[date] = present

    return result


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
    """
    dates = get_worship_dates_in_range(db, start_date, end_date)

    # dimension별 bucket 키 사전 결정
    if dimension == "gyogu":
        keys = ["1교구", "2교구", "3교구", "임원단"]
        imwondan_lid = get_leader_id(db, "임원단")
    elif dimension == "team":
        keys = [f"{i}팀" for i in range(1, 13)]
    elif dimension == "generation":
        from app.models import Member
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

    buckets: dict[str, list[int]] = {k: [] for k in keys}

    for date in dates:
        q = build_attendance_records_query(db, date)
        q = apply_attendance_filters(q, db, gyogu_no, team_no, is_imwondan)

        # 이번 예배일의 bucket별 카운트
        day_count: dict[str, int] = {k: 0 for k in keys}

        if q is not None:
            for record, member, profile in q.all():
                if record.status != "PRESENT":
                    continue

                if dimension == "gyogu":
                    gyogu_key = f"{profile.gyogu}교구"
                    if gyogu_key in day_count:
                        day_count[gyogu_key] += 1
                    if _is_imwondan(profile, imwondan_lid):
                        day_count["임원단"] += 1

                elif dimension == "team":
                    team_key = f"{profile.team}팀"
                    if team_key in day_count:
                        day_count[team_key] += 1

                elif dimension == "generation":
                    gen_key = f"{member.generation}기"
                    if gen_key in day_count:
                        day_count[gen_key] += 1

                elif dimension == "gender":
                    if member.gender in day_count:
                        day_count[member.gender] += 1

                elif dimension == "leader":
                    lid_list = _parse_leader_ids(profile)
                    for lid in lid_list:
                        for lname, lid_val in leader_id_map.items():
                            if lid == str(lid_val):
                                day_count[lname] += 1

        for k in keys:
            buckets[k].append(day_count[k])

    return {"n": len(dates), "buckets": buckets, "keys": keys}


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
    """기간 내 예배일별 결석 사유 카운트 집계.

    반환값:
        {"n": 예배 횟수, "buckets": {reason: [날짜별 count, ...]}}
    """
    dates = get_worship_dates_in_range(db, start_date, end_date)
    buckets: dict[str, list[int]] = {r: [] for r in ABSENT_REASONS}

    for date in dates:
        q = build_attendance_records_query(db, date)
        q = apply_attendance_filters(q, db, gyogu_no, team_no, is_imwondan)

        day_count: dict[str, int] = {r: 0 for r in ABSENT_REASONS}

        if q is not None:
            for record, _, _ in q.all():
                if record.status == "ABSENT" and record.absent_reason:
                    if record.absent_reason in day_count:
                        day_count[record.absent_reason] += 1

        for r in ABSENT_REASONS:
            buckets[r].append(day_count[r])

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
    dates = get_worship_dates_in_range(db, start_date, end_date)
    imwondan_lid = get_leader_id(db, "임원단")

    present_buckets: dict[str, list[int]] = {k: [] for k in GYOGU_KEYS}
    absent_buckets: dict[str, list[int]] = {k: [] for k in GYOGU_KEYS}

    for date in dates:
        q = build_attendance_records_query(db, date)
        q = apply_attendance_filters(q, db, gyogu_no, None, is_imwondan)

        day_present: dict[str, int] = {k: 0 for k in GYOGU_KEYS}
        day_absent: dict[str, int] = {k: 0 for k in GYOGU_KEYS}

        if q is not None:
            for record, _, profile in q.all():
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

        for k in GYOGU_KEYS:
            present_buckets[k].append(day_present[k])
            absent_buckets[k].append(day_absent[k])

    return {"n": len(dates), "present": present_buckets, "absent": absent_buckets}
