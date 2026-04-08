"""재사용 가능한 쿼리 조각 모음 — 도메인 무관, 재사용 여부 기준

1. 소프트 삭제 필터 체이너 (Member.deleted_at 기반)
   - active_now, active_as_of, deleted_only

2. MemberProfile 필터 체이너 & 쿼리 빌더
   - by_gyogu, by_team, by_group_no, by_leader, by_leader_ids, by_member_type, by_year_range
   - build_active_members_query, build_deleted_members_query, build_members_as_of_query

3. 출석/대시보드 공통 필터 & 조회
   - apply_attendance_filters
   - get_worship_dates_in_range
   - get_records_by_dates
   - build_attendance_records_query
"""
import datetime
from sqlalchemy.orm import Session, Query
from sqlalchemy import func, and_, or_
from app.models import Member, MemberProfile, Leader, AttendanceRecord


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


def by_leader(q: Query, leader_ids: int | list) -> Query:
    """leader_ids JSON 배열 안에 포함된 멤버 필터. 단일 id 또는 id 목록 모두 허용."""
    ids = leader_ids if isinstance(leader_ids, list) else [leader_ids]
    return q.filter(or_(*[MemberProfile.leader_ids.like(f'%"{lid}"%') for lid in ids]))


def get_leader_id(db: Session, leader_name: str) -> int | None:
    """leader 이름으로 leader_id 조회."""
    return db.query(Leader.leader_id).filter(Leader.leader_name == leader_name).scalar()


def by_member_type(q: Query, keyword: str) -> Query:
    return q.filter(MemberProfile.member_type.like(f"%{keyword}%"))


def by_year_range(q: Query, year_int: int) -> Query:
    """특정 연도(YYYY-01-01 ~ YYYY+1-01-01) 범위 내 profile 필터."""
    year_start = datetime.date(year_int, 1, 1)
    year_end   = datetime.date(year_int + 1, 1, 1)
    return q.filter(MemberProfile.updated_at >= year_start, MemberProfile.updated_at < year_end)


# ---------------------------------------------------------------------------
# 내부 서브쿼리 헬퍼 — 중복 제거용
# ---------------------------------------------------------------------------

def _latest_as_of_sq(db: Session, as_of_date: datetime.date):
    """멤버별 updated_at <= as_of_date 범위에서 최신 profile date 서브쿼리."""
    return (
        db.query(
            MemberProfile.member_id,
            func.max(MemberProfile.updated_at).label("max_year"),
        )
        .filter(MemberProfile.updated_at <= as_of_date)
        .group_by(MemberProfile.member_id)
        .subquery()
    )


def _latest_in_year_sq(db: Session, year_int: int):
    """멤버별 특정 연도(YYYY-01-01 ~ YYYY+1-01-01) 범위 내 최신 profile date 서브쿼리."""
    year_start = datetime.date(year_int, 1, 1)
    year_end   = datetime.date(year_int + 1, 1, 1)
    return (
        db.query(
            MemberProfile.member_id,
            func.max(MemberProfile.updated_at).label("max_year"),
        )
        .filter(MemberProfile.updated_at >= year_start, MemberProfile.updated_at < year_end)
        .group_by(MemberProfile.member_id)
        .subquery()
    )


def _latest_profile_id_sq(db: Session, max_year_sq):
    """MAX(updated_at) 서브쿼리 기준으로 같은 날 중복 row를 MAX(profile_id)로 단일화하는 서브쿼리."""
    return (
        db.query(
            MemberProfile.member_id,
            func.max(MemberProfile.profile_id).label("max_profile_id"),
        )
        .join(
            max_year_sq,
            (MemberProfile.member_id == max_year_sq.c.member_id)
            & (MemberProfile.updated_at == max_year_sq.c.max_year),
        )
        .group_by(MemberProfile.member_id)
        .subquery()
    )


# ---------------------------------------------------------------------------
# 내부 기반 쿼리 빌더
# ---------------------------------------------------------------------------

def _base_query_as_of(db: Session, as_of_date: datetime.date) -> Query:
    """특정 날짜 기준 활성 멤버의 유효 profile 기반 쿼리 (MemberProfile 반환).

    - active_now 적용 (deleted_at IS NULL)
    - 필터 체이너(by_*)로 조건 추가 후 .all() 실행
    """
    sq = _latest_as_of_sq(db, as_of_date)
    return active_now(
        db.query(MemberProfile)
        .join(sq, and_(
            MemberProfile.member_id == sq.c.member_id,
            MemberProfile.updated_at == sq.c.max_year,
        ))
        .join(Member, Member.member_id == MemberProfile.member_id)
    )


def _base_query_in_year(db: Session, year_int: int) -> Query:
    """특정 연도 내 활성 멤버의 최신 profile 기반 쿼리 (MemberProfile 반환).

    - active_now 적용 (deleted_at IS NULL)
    - 필터 체이너(by_*)로 조건 추가 후 .all() 실행
    """
    sq = _latest_in_year_sq(db, year_int)
    return active_now(
        db.query(MemberProfile)
        .join(sq, and_(
            MemberProfile.member_id == sq.c.member_id,
            MemberProfile.updated_at == sq.c.max_year,
        ))
        .join(Member, Member.member_id == MemberProfile.member_id)
    )


# ---------------------------------------------------------------------------
# 출석/대시보드 공통 필터 조합 헬퍼
# ---------------------------------------------------------------------------

def apply_attendance_filters(
    q: Query,
    db: Session,
    gyogu_no: int | None = None,
    team_no: int | None = None,
    is_imwondan: bool = False,
) -> Query | None:
    """gyogu/team/임원단 필터를 한 번에 적용. 임원단 leader가 없으면 None 반환."""
    if gyogu_no is not None:
        q = by_gyogu(q, gyogu_no)
    if team_no is not None:
        q = by_team(q, team_no)
    if is_imwondan:
        leader_id = get_leader_id(db, "임원단")
        if not leader_id:
            return None
        q = by_leader(q, leader_id)
    return q


# ---------------------------------------------------------------------------
# 공개 쿼리 빌더 — (Member, MemberProfile) 튜플 반환
# ---------------------------------------------------------------------------

def build_active_members_query(db: Session, year_int: int) -> Query:
    """특정 연도 내 활성 멤버와 최신 profile을 (Member, MemberProfile) 튜플로 반환하는 기반 쿼리.

    - 해당 연도 범위 내 profile row가 있는 멤버만 포함 (inner join)
    - 같은 날 row 중복 시 MAX(profile_id)로 단일 row 확정
    - active_now 적용 (deleted_at IS NULL)
    """
    max_year_sq = _latest_in_year_sq(db, year_int)
    latest_sq = _latest_profile_id_sq(db, max_year_sq)

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
            func.max(MemberProfile.updated_at).label("max_year"),
        )
        .group_by(MemberProfile.member_id)
        .subquery()
    )
    latest_sq = _latest_profile_id_sq(db, max_year_sq)

    return deleted_only(
        db.query(Member, MemberProfile)
        .outerjoin(latest_sq, Member.member_id == latest_sq.c.member_id)
        .outerjoin(MemberProfile, MemberProfile.profile_id == latest_sq.c.max_profile_id)
    )


def build_members_as_of_query(db: Session, as_of_date: datetime.date) -> Query:
    """특정 날짜 기준 활성 멤버와 유효 profile을 (Member, MemberProfile) 튜플로 반환하는 기반 쿼리.

    - active_as_of 적용 (deleted_at IS NULL OR deleted_at > as_of_date)
    - 출석 API용 — worship_date 기준 소속 확정
    """
    sq = _latest_as_of_sq(db, as_of_date)
    q = (
        db.query(Member, MemberProfile)
        .join(sq, and_(
            MemberProfile.member_id == sq.c.member_id,
            MemberProfile.updated_at == sq.c.max_year,
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


# ---------------------------------------------------------------------------
# AttendanceRecord 조회
# ---------------------------------------------------------------------------

def get_worship_dates_in_range(
    db: Session,
    start_date: datetime.date,
    end_date: datetime.date,
) -> list[datetime.date]:
    """기간 내 예배 날짜 목록 (attendance_record 기준, 오름차순)."""
    rows = (
        db.query(AttendanceRecord.worship_date)
        .filter(
            AttendanceRecord.worship_date >= start_date,
            AttendanceRecord.worship_date <= end_date,
        )
        .distinct()
        .order_by(AttendanceRecord.worship_date)
        .all()
    )
    return [r.worship_date for r in rows]


def get_records_by_dates(
    db: Session,
    dates: list[datetime.date],
) -> dict[tuple, AttendanceRecord]:
    """날짜 목록에 해당하는 출석 기록을 (member_id, worship_date) → record 맵으로 반환."""
    if not dates:
        return {}
    return {
        (r.member_id, r.worship_date): r
        for r in db.query(AttendanceRecord).filter(
            AttendanceRecord.worship_date.in_(dates)
        ).all()
    }


def build_attendance_records_query(db: Session, worship_date: datetime.date) -> Query:
    """특정 예배일의 출석 기록을 member + 당시 profile과 함께 반환.

    (AttendanceRecord, Member, MemberProfile) 튜플로 반환.
    - worship_date 기준 가장 최신 profile 사용 (updated_at <= worship_date)
    - 소프트 삭제 필터 없음 — 출석 기록은 삭제 여부와 무관한 역사적 사실
    - by_gyogu/by_team/by_leader 등 필터 체이너로 조건 추가 후 .all() 실행
    """
    sq = _latest_as_of_sq(db, worship_date)
    return (
        db.query(AttendanceRecord, Member, MemberProfile)
        .join(Member, Member.member_id == AttendanceRecord.member_id)
        .join(sq, sq.c.member_id == AttendanceRecord.member_id)
        .join(MemberProfile, and_(
            MemberProfile.member_id == sq.c.member_id,
            MemberProfile.updated_at == sq.c.max_year,
        ))
        .filter(AttendanceRecord.worship_date == worship_date)
    )
