"""member_profile CRUD — MemberProfile 단건 조회/쓰기만 담당

설계 원칙:
  - updated_at은 "소속 유효 시작일(effective_from date)" — 연도 레이블이 아님
  - 당일 중복 변경은 추적하지 않음 (upsert_profile_on_date 참고)
  - 상세 설계 의도: feature_spec.md 2절 참고
  - 필터 체이너 & 쿼리 빌더: query_builders.py 참고
"""
import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import MemberProfile


# ---------------------------------------------------------------------------
# 조회 (read)
# ---------------------------------------------------------------------------

def get_profile_on_date(
    db: Session,
    member_id: int,
    date: datetime.date,
) -> MemberProfile | None:
    """정확히 그 날짜(year)와 일치하는 profile row 반환."""
    return (
        db.query(MemberProfile)
        .filter(MemberProfile.member_id == member_id, MemberProfile.updated_at == date)
        .first()
    )


def get_latest_profile(
    db: Session,
    member_id: int,
) -> MemberProfile | None:
    """전체 이력 중 가장 최신(MAX year) profile row 반환 — 현재 소속."""
    latest_year = (
        db.query(func.max(MemberProfile.updated_at))
        .filter(MemberProfile.member_id == member_id)
        .scalar()
    )
    if latest_year is None:
        return None
    return get_profile_on_date(db, member_id, latest_year)


def get_profile_as_of(
    db: Session,
    member_id: int,
    as_of_date: datetime.date,
) -> MemberProfile | None:
    """특정 날짜 기준으로 유효한 소속 반환 — MAX(year) WHERE year <= as_of_date.

    출석 집계, 통계, 특정 시점 소속 조회 등에 사용.
    """
    latest_year = (
        db.query(func.max(MemberProfile.updated_at))
        .filter(MemberProfile.member_id == member_id, MemberProfile.updated_at <= as_of_date)
        .scalar()
    )
    if latest_year is None:
        return None
    return get_profile_on_date(db, member_id, latest_year)


def get_latest_profile_in_year(
    db: Session,
    member_id: int,
    year_int: int,
) -> MemberProfile | None:
    """특정 연도(YYYY-01-01 ~ YYYY+1-01-01) 범위 내 MAX(year) profile row 반환."""
    year_start = datetime.date(year_int, 1, 1)
    year_end   = datetime.date(year_int + 1, 1, 1)
    latest_year = (
        db.query(func.max(MemberProfile.updated_at))
        .filter(
            MemberProfile.member_id == member_id,
            MemberProfile.updated_at >= year_start,
            MemberProfile.updated_at < year_end,
        )
        .scalar()
    )
    if latest_year is None:
        return None
    return get_profile_on_date(db, member_id, latest_year)


def get_all_profiles(
    db: Session,
    member_id: int,
) -> list[MemberProfile]:
    """멤버의 전체 profile 이력을 year 오름차순으로 반환."""
    return (
        db.query(MemberProfile)
        .filter(MemberProfile.member_id == member_id)
        .order_by(MemberProfile.updated_at)
        .all()
    )


# ---------------------------------------------------------------------------
# 쓰기 (write) — 순수 단위
# ---------------------------------------------------------------------------

def insert_profile(
    db: Session,
    member_id: int,
    year: datetime.date,
    gyogu: int,
    team: int,
    group_no: int,
    member_type: str,
    leader_ids: str | None = None,
    plt_status: str | None = None,
) -> MemberProfile:
    """새 profile row를 INSERT하고 반환. commit은 호출부에서."""
    profile = MemberProfile(
        member_id=member_id,
        updated_at=year,
        gyogu=gyogu,
        team=team,
        group_no=group_no,
        member_type=member_type,
        leader_ids=leader_ids,
        plt_status=plt_status,
    )
    db.add(profile)
    return profile


def update_profile(
    profile: MemberProfile,
    gyogu: int,
    team: int,
    group_no: int,
    member_type: str,
    leader_ids: str | None = None,
    plt_status: str | None = None,
) -> MemberProfile:
    """기존 profile row의 필드를 덮어쓰고 반환. commit은 호출부에서."""
    profile.gyogu       = gyogu
    profile.team        = team
    profile.group_no    = group_no
    profile.member_type = member_type
    profile.leader_ids  = leader_ids
    profile.plt_status  = plt_status
    return profile


# ---------------------------------------------------------------------------
# 조합 (composed)
# ---------------------------------------------------------------------------

def upsert_profile_on_date(
    db: Session,
    member_id: int,
    date: datetime.date,
    gyogu: int,
    team: int,
    group_no: int,
    member_type: str,
    leader_ids: str | None = None,
    plt_status: str | None = None,
) -> MemberProfile:
    """당일 row가 있으면 UPDATE, 없으면 INSERT. commit은 호출부에서.

    정책: 같은 날 두 번 이상 변경은 추적하지 않음 (feature_spec.md 2절).
    """
    existing = get_profile_on_date(db, member_id, date)
    if existing:
        return update_profile(existing, gyogu, team, group_no, member_type, leader_ids, plt_status)
    return insert_profile(db, member_id, date, gyogu, team, group_no, member_type, leader_ids, plt_status)
