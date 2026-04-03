"""쿼리 빌더 & 필터 체이너 모음

두 가지 재사용 도구를 제공한다:

1. 소프트 삭제 필터 체이너 (Member.deleted_at 기반)
   - active_now, active_as_of, deleted_only
   - 정책 근거: feature_spec.md 8절

2. MemberProfile 필터 체이너 & 쿼리 빌더 (year/소속 기반)
   - by_gyogu, by_team, by_group_no, by_leader, by_leader_ids, by_member_type, by_year_range
   - build_active_members_query, build_deleted_members_query, build_members_as_of_query
   - 설계 의도: feature_spec.md 2절
"""
import datetime
from sqlalchemy.orm import Session, Query
from sqlalchemy import func, and_, or_
from app.models import Member, MemberProfile


# ---------------------------------------------------------------------------
# 소프트 삭제 필터 체이너
# ---------------------------------------------------------------------------

def active_now(q: Query) -> Query:
    """현재 활성 멤버만 — 사용자 목록 등 실시간 화면용
    (deleted_at IS NULL)
    """
    return q.filter(Member.deleted_at.is_(None))


def active_as_of(q: Query, date: datetime.date) -> Query:
    """기준일 당시 활성 멤버 — 출석/통계 등 날짜 기준 조회용
    (deleted_at IS NULL OR deleted_at > date)
    """
    return q.filter(or_(Member.deleted_at.is_(None), Member.deleted_at > date))


def deleted_only(q: Query) -> Query:
    """삭제된 멤버만 — 삭제 명단용
    (deleted_at IS NOT NULL)
    """
    return q.filter(Member.deleted_at.isnot(None))


# ---------------------------------------------------------------------------
# MemberProfile 필터 체이너
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
# 내부 기반 쿼리 빌더
# ---------------------------------------------------------------------------

def _base_query_as_of(db: Session, as_of_date: datetime.date) -> Query:
    """특정 날짜 기준으로 각 활성 멤버의 유효 profile을 가져오는 기반 쿼리.

    - MAX(year) WHERE year <= as_of_date 로 멤버별 최신 profile 선택
    - active_now 적용 (deleted_at IS NULL)
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
    return active_now(
        db.query(MemberProfile)
        .join(sq, and_(
            MemberProfile.member_id == sq.c.member_id,
            MemberProfile.year == sq.c.max_year,
        ))
        .join(Member, Member.member_id == MemberProfile.member_id)
    )


def _base_query_in_year(db: Session, year_int: int) -> Query:
    """특정 연도(YYYY-01-01 ~ YYYY+1-01-01) 내 각 활성 멤버의 최신 profile 기반 쿼리.

    - 해당 연도에 profile row가 하나라도 있는 멤버만 포함
    - active_now 적용 (deleted_at IS NULL)
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
    return active_now(
        db.query(MemberProfile)
        .join(sq, and_(
            MemberProfile.member_id == sq.c.member_id,
            MemberProfile.year == sq.c.max_year,
        ))
        .join(Member, Member.member_id == MemberProfile.member_id)
    )


# ---------------------------------------------------------------------------
# 공개 쿼리 빌더 — (Member, MemberProfile) 튜플 반환
# ---------------------------------------------------------------------------

def build_active_members_query(db: Session, year_int: int) -> Query:
    """특정 연도 내 활성 멤버와 최신 profile을 (Member, MemberProfile) 튜플로 반환하는 기반 쿼리.

    - 해당 연도 범위 내 profile row가 있는 멤버만 포함 (inner join)
    - 같은 날 row 중복 시 MAX(profile_id)로 단일 row 확정
    - active_now 적용 (deleted_at IS NULL)
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

    return active_now(
        db.query(Member, MemberProfile)
        .join(latest_sq, Member.member_id == latest_sq.c.member_id)
        .join(MemberProfile, MemberProfile.profile_id == latest_sq.c.max_profile_id)
    )


def build_deleted_members_query(db: Session) -> Query:
    """삭제된 멤버와 전체 이력 중 최신 profile을 (Member, MemberProfile) 튜플로 반환하는 기반 쿼리.

    - deleted_only 적용 (deleted_at IS NOT NULL)
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

    return deleted_only(
        db.query(Member, MemberProfile)
        .outerjoin(latest_sq, Member.member_id == latest_sq.c.member_id)
        .outerjoin(MemberProfile, MemberProfile.profile_id == latest_sq.c.max_profile_id)
    )


def build_members_as_of_query(db: Session, as_of_date: datetime.date) -> Query:
    """특정 날짜 기준 활성 멤버와 유효 profile을 (Member, MemberProfile) 튜플로 반환하는 기반 쿼리.

    - MAX(year) WHERE year <= as_of_date 로 멤버별 최신 profile 선택
    - active_as_of 적용 (deleted_at IS NULL OR deleted_at > as_of_date)
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
    q = (
        db.query(Member, MemberProfile)
        .join(sq, and_(
            MemberProfile.member_id == sq.c.member_id,
            MemberProfile.year == sq.c.max_year,
        ))
        .join(Member, Member.member_id == MemberProfile.member_id)
    )
    return active_as_of(q, as_of_date)


# ---------------------------------------------------------------------------
# 공개 조합 쿼리 — profile 목록 반환
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
