"""member_profile CRUD — 조회/쓰기 단위 함수 모음

설계 원칙:
  - year는 "소속 유효 시작일(effective_from date)" — 연도 레이블이 아님
  - 당일 중복 변경은 추적하지 않음 (upsert_profile_on_date 참고)
  - 상세 설계 의도: feature_spec.md 2절 참고
"""
import datetime
from sqlalchemy.orm import Session, Query
from sqlalchemy import func, and_, or_
from app.models import MemberProfile, Member


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
        .filter(MemberProfile.member_id == member_id, MemberProfile.year == date)
        .first()
    )


def get_latest_profile(
    db: Session,
    member_id: int,
) -> MemberProfile | None:
    """전체 이력 중 가장 최신(MAX year) profile row 반환 — 현재 소속."""
    latest_year = (
        db.query(func.max(MemberProfile.year))
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
        db.query(func.max(MemberProfile.year))
        .filter(MemberProfile.member_id == member_id, MemberProfile.year <= as_of_date)
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
        db.query(func.max(MemberProfile.year))
        .filter(
            MemberProfile.member_id == member_id,
            MemberProfile.year >= year_start,
            MemberProfile.year < year_end,
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
        .order_by(MemberProfile.year)
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
        year=year,
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


# ---------------------------------------------------------------------------
# 역방향 조회 — 기반 쿼리 빌더 (내부용)
# ---------------------------------------------------------------------------

def _base_query_as_of(db: Session, as_of_date: datetime.date) -> Query:
    """특정 날짜 기준으로 각 활성 멤버의 유효 profile을 가져오는 기반 쿼리.

    - MAX(year) WHERE year <= as_of_date 로 멤버별 최신 profile 선택
    - deleted_at IS NULL 인 활성 멤버만 포함
    - 필터 체이너(by_*)로 조건 추가 후 .all() 실행
    """
    sq = (
        db.query(
            MemberProfile.member_id,
            func.max(MemberProfile.year).label("max_year"),
        )
        .filter(MemberProfile.year <= as_of_date)
        .group_by(MemberProfile.member_id)
        .subquery()
    )
    return (
        db.query(MemberProfile)
        .join(sq, and_(
            MemberProfile.member_id == sq.c.member_id,
            MemberProfile.year == sq.c.max_year,
        ))
        .join(Member, and_(
            Member.member_id == MemberProfile.member_id,
            Member.deleted_at.is_(None),
        ))
    )


def _base_query_in_year(db: Session, year_int: int) -> Query:
    """특정 연도(YYYY-01-01 ~ YYYY+1-01-01) 내 각 활성 멤버의 최신 profile 기반 쿼리.

    - 해당 연도에 profile row가 하나라도 있는 멤버만 포함
    - deleted_at IS NULL 인 활성 멤버만 포함
    - 필터 체이너(by_*)로 조건 추가 후 .all() 실행
    """
    year_start = datetime.date(year_int, 1, 1)
    year_end   = datetime.date(year_int + 1, 1, 1)
    sq = (
        db.query(
            MemberProfile.member_id,
            func.max(MemberProfile.year).label("max_year"),
        )
        .filter(MemberProfile.year >= year_start, MemberProfile.year < year_end)
        .group_by(MemberProfile.member_id)
        .subquery()
    )
    return (
        db.query(MemberProfile)
        .join(sq, and_(
            MemberProfile.member_id == sq.c.member_id,
            MemberProfile.year == sq.c.max_year,
        ))
        .join(Member, and_(
            Member.member_id == MemberProfile.member_id,
            Member.deleted_at.is_(None),
        ))
    )


# ---------------------------------------------------------------------------
# 역방향 조회 — 필터 체이너 (query modifier)
# ---------------------------------------------------------------------------

def by_gyogu(q: Query, gyogu: int) -> Query:
    return q.filter(MemberProfile.gyogu == gyogu)


def by_team(q: Query, team: int) -> Query:
    return q.filter(MemberProfile.team == team)


def by_group_no(q: Query, group_no: int) -> Query:
    return q.filter(MemberProfile.group_no == group_no)


def by_leader(q: Query, leader_id: int) -> Query:
    """leader_ids JSON 배열 안에 leader_id가 포함된 profile 필터."""
    return q.filter(MemberProfile.leader_ids.like(f'%"{leader_id}"%'))


def by_leader_ids(q: Query, leader_ids: list[str]) -> Query:
    """leader_ids 목록 중 하나라도 포함된 profile 필터 (이름 검색 결과 다중 id 대응)."""
    return q.filter(or_(*[MemberProfile.leader_ids.like(f'%"{lid}"%') for lid in leader_ids]))


def by_member_type(q: Query, keyword: str) -> Query:
    return q.filter(MemberProfile.member_type.like(f"%{keyword}%"))


def by_year_range(q: Query, year_int: int) -> Query:
    """특정 연도(YYYY-01-01 ~ YYYY+1-01-01) 범위 내 profile 필터."""
    year_start = datetime.date(year_int, 1, 1)
    year_end   = datetime.date(year_int + 1, 1, 1)
    return q.filter(MemberProfile.year >= year_start, MemberProfile.year < year_end)


# ---------------------------------------------------------------------------
# 역방향 조회 — 조합 (composed)
# ---------------------------------------------------------------------------

def get_profiles_as_of(
    db: Session,
    as_of_date: datetime.date,
    gyogu: int | None = None,
    team: int | None = None,
    group_no: int | None = None,
) -> list[MemberProfile]:
    """특정 날짜 기준 유효 소속 profile 목록. 필터는 선택."""
    q = _base_query_as_of(db, as_of_date)
    if gyogu    is not None: q = by_gyogu(q, gyogu)
    if team     is not None: q = by_team(q, team)
    if group_no is not None: q = by_group_no(q, group_no)
    return q.all()


def get_profiles_in_year(
    db: Session,
    year_int: int,
    gyogu: int | None = None,
    team: int | None = None,
    group_no: int | None = None,
) -> list[MemberProfile]:
    """특정 연도 기준 최신 소속 profile 목록. 필터는 선택."""
    q = _base_query_in_year(db, year_int)
    if gyogu    is not None: q = by_gyogu(q, gyogu)
    if team     is not None: q = by_team(q, team)
    if group_no is not None: q = by_group_no(q, group_no)
    return q.all()


# ---------------------------------------------------------------------------
# 멤버 목록 기반 쿼리 빌더 — (Member, MemberProfile) 튜플 반환
# ---------------------------------------------------------------------------

def build_active_members_query(db: Session, year_int: int) -> Query:
    """특정 연도 내 활성 멤버와 최신 profile을 (Member, MemberProfile) 튜플로 반환하는 기반 쿼리.

    - 해당 연도 범위 내 profile row가 있는 멤버만 포함 (inner join)
    - 같은 날 row 중복 시 MAX(profile_id)로 단일 row 확정
    - deleted_at IS NULL 인 활성 멤버만 포함
    """
    year_start = datetime.date(year_int, 1, 1)
    year_end   = datetime.date(year_int + 1, 1, 1)

    max_year_sq = (
        db.query(
            MemberProfile.member_id,
            func.max(MemberProfile.year).label("max_year"),
        )
        .filter(MemberProfile.year >= year_start, MemberProfile.year < year_end)
        .group_by(MemberProfile.member_id)
        .subquery()
    )

    latest_sq = (
        db.query(
            MemberProfile.member_id,
            func.max(MemberProfile.profile_id).label("max_profile_id"),
        )
        .join(
            max_year_sq,
            (MemberProfile.member_id == max_year_sq.c.member_id)
            & (MemberProfile.year == max_year_sq.c.max_year),
        )
        .group_by(MemberProfile.member_id)
        .subquery()
    )

    return (
        db.query(Member, MemberProfile)
        .join(latest_sq, Member.member_id == latest_sq.c.member_id)
        .join(MemberProfile, MemberProfile.profile_id == latest_sq.c.max_profile_id)
        .filter(Member.deleted_at.is_(None))
    )


def build_deleted_members_query(db: Session) -> Query:
    """삭제된 멤버와 전체 이력 중 최신 profile을 (Member, MemberProfile) 튜플로 반환하는 기반 쿼리.

    - deleted_at IS NOT NULL 인 삭제된 멤버만 포함
    - 같은 날 row 중복 시 MAX(profile_id)로 단일 row 확정
    - profile 없는 멤버도 포함 (outer join)
    """
    max_year_sq = (
        db.query(
            MemberProfile.member_id,
            func.max(MemberProfile.year).label("max_year"),
        )
        .group_by(MemberProfile.member_id)
        .subquery()
    )

    latest_sq = (
        db.query(
            MemberProfile.member_id,
            func.max(MemberProfile.profile_id).label("max_profile_id"),
        )
        .join(
            max_year_sq,
            (MemberProfile.member_id == max_year_sq.c.member_id)
            & (MemberProfile.year == max_year_sq.c.max_year),
        )
        .group_by(MemberProfile.member_id)
        .subquery()
    )

    return (
        db.query(Member, MemberProfile)
        .outerjoin(latest_sq, Member.member_id == latest_sq.c.member_id)
        .outerjoin(MemberProfile, MemberProfile.profile_id == latest_sq.c.max_profile_id)
        .filter(Member.deleted_at.isnot(None))
    )


def build_members_as_of_query(db: Session, as_of_date: datetime.date) -> Query:
    """특정 날짜 기준 활성 멤버와 유효 profile을 (Member, MemberProfile) 튜플로 반환하는 기반 쿼리.

    - MAX(year) WHERE year <= as_of_date 로 멤버별 최신 profile 선택
    - deleted_at IS NULL 인 활성 멤버만 포함
    - 출석 API용 — worship_date 기준 소속 확정
    """
    sq = (
        db.query(
            MemberProfile.member_id,
            func.max(MemberProfile.year).label("max_year"),
        )
        .filter(MemberProfile.year <= as_of_date)
        .group_by(MemberProfile.member_id)
        .subquery()
    )
    return (
        db.query(Member, MemberProfile)
        .join(sq, and_(
            MemberProfile.member_id == sq.c.member_id,
            MemberProfile.year == sq.c.max_year,
        ))
        .join(Member, and_(
            Member.member_id == MemberProfile.member_id,
            Member.deleted_at.is_(None),
        ))
    )
