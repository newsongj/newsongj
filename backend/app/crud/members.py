"""gyojeok 멤버 CRUD — 순수 DB 조작만 담당"""
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_, cast, String
from app.models import Member, MemberProfile, Leader
from app.schemas.members import MemberDeleteRequest, MemberCreate
from fastapi import HTTPException
import datetime


def _apply_keyword_filter(query, db: Session, field: str, keyword: str):
    """키워드 검색 조건 적용 (활성/삭제 목록 공용)"""
    if field == "leader":
        matching_ids = [str(r[0]) for r in db.query(Leader.leader_id).filter(
            Leader.leader_name.like(f"%{keyword}%")
        ).all()]
        if not matching_ids:
            return query, True  # 결과 없음 플래그
        return query.filter(
            or_(*[MemberProfile.leader_ids.like(f'%"{lid}"%') for lid in matching_ids])
        ), False
    elif field == "generation":
        digits = ''.join(filter(str.isdigit, keyword))
        if not digits:
            return query, True
        return query.filter(Member.generation == int(digits)), False
    elif field == "name":
        return query.filter(Member.name.like(f"%{keyword}%")), False
    elif field == "phone_number":
        return query.filter(Member.phone_number.like(f"%{keyword}%")), False
    elif field == "birthdate":
        return query.filter(cast(Member.birthdate, String).like(f"%{keyword}%")), False
    elif field == "enrolled_at":
        return query.filter(cast(Member.enrolled_at, String).like(f"%{keyword}%")), False
    elif field == "school_work":
        return query.filter(Member.school_work.like(f"%{keyword}%")), False
    elif field == "major":
        return query.filter(Member.major.like(f"%{keyword}%")), False
    elif field == "v8pid":
        return query.filter(Member.v8pid.like(f"%{keyword}%")), False
    elif field == "member_type":
        return query.filter(MemberProfile.member_type.like(f"%{keyword}%")), False
    return query, False


def _apply_filters(query, gyogu=None, team=None, group_no=None, generation=None):
    """공통 필터 적용 (활성/삭제 목록 공용)"""
    if gyogu is not None:
        query = query.filter(MemberProfile.gyogu == gyogu)
    if team is not None:
        query = query.filter(MemberProfile.team == team)
    if group_no is not None:
        query = query.filter(MemberProfile.group_no == group_no)
    if generation is not None:
        query = query.filter(Member.generation == generation)
    return query


def _paginate(query, page: int, page_size: int):
    """공통 페이징 처리"""
    total = query.count()
    offset = (page - 1) * page_size
    rows = query.offset(offset).limit(page_size).all()
    return rows, total


def get_members(db: Session, page: int, page_size: int, year: int, gyogu=None, team=None, group_no=None, generation=None, field=None, keyword=None):
    """활성 멤버 목록 조회 — 드롭다운 필터 + 키워드 검색 통합 (deleted_at IS NULL)

    year 처리 방식:
    - 해당 연도(YYYY) 범위 내 profile row가 하나라도 있는 멤버만 포함 (inner join)
    - 해당 연도 내 row가 여러 개면 MAX(year) → 동일 날짜면 MAX(profile_id) 로 최신 row 선택
    """
    year_start = datetime.date(year, 1, 1)
    year_end = datetime.date(year + 1, 1, 1)

    # Step 1: 해당 연도 내 member별 MAX(year)
    max_year_sq = db.query(
        MemberProfile.member_id,
        func.max(MemberProfile.year).label("max_year"),
    ).filter(
        MemberProfile.year >= year_start,
        MemberProfile.year < year_end,
    ).group_by(MemberProfile.member_id).subquery()

    # Step 2: 같은 날짜 row가 여러 개일 때 MAX(profile_id)로 단일 row 확정
    latest_sq = db.query(
        MemberProfile.member_id,
        func.max(MemberProfile.profile_id).label("max_profile_id"),
    ).join(
        max_year_sq,
        (MemberProfile.member_id == max_year_sq.c.member_id)
        & (MemberProfile.year == max_year_sq.c.max_year),
    ).group_by(MemberProfile.member_id).subquery()

    # inner join: 해당 연도 profile 없는 멤버는 결과에서 제외
    query = db.query(Member, MemberProfile).join(
        latest_sq, Member.member_id == latest_sq.c.member_id,
    ).join(
        MemberProfile,
        MemberProfile.profile_id == latest_sq.c.max_profile_id,
    ).filter(Member.deleted_at.is_(None))

    query = _apply_filters(query, gyogu, team, group_no, generation)

    if field and keyword:
        query, empty = _apply_keyword_filter(query, db, field, keyword)
        if empty:
            return [], 0

    return _paginate(query, page, page_size)


def _deleted_base_query(db: Session):
    """삭제된 멤버 조회용 기본 쿼리 (전체 이력 중 최신 프로필 조인, 공용)
    동일 날짜 row 중복 시 MAX(profile_id)로 단일 row 확정.
    """
    max_year_sq = db.query(
        MemberProfile.member_id,
        func.max(MemberProfile.year).label("max_year"),
    ).group_by(MemberProfile.member_id).subquery()

    latest_sq = db.query(
        MemberProfile.member_id,
        func.max(MemberProfile.profile_id).label("max_profile_id"),
    ).join(
        max_year_sq,
        (MemberProfile.member_id == max_year_sq.c.member_id)
        & (MemberProfile.year == max_year_sq.c.max_year),
    ).group_by(MemberProfile.member_id).subquery()

    return db.query(Member, MemberProfile).outerjoin(
        latest_sq, Member.member_id == latest_sq.c.member_id,
    ).outerjoin(
        MemberProfile,
        MemberProfile.profile_id == latest_sq.c.max_profile_id,
    ).filter(Member.deleted_at.isnot(None))


def get_deleted_members(db: Session, page: int, page_size: int, year=None, gyogu=None, team=None, group_no=None, generation=None, deleted_from=None, deleted_to=None, field=None, keyword=None):
    """삭제된 멤버 목록 조회 (deleted_at IS NOT NULL)

    year: 삭제 멤버의 최종 member_profile 연도 기준 필터 (선택)
    deleted_from/deleted_to: deleted_at 범위 필터
    field/keyword: 활성 멤버와 동일한 검색 필드
    """
    query = _deleted_base_query(db)

    if deleted_from is not None:
        query = query.filter(Member.deleted_at >= deleted_from)
    if deleted_to is not None:
        query = query.filter(Member.deleted_at <= deleted_to)

    # year — 최종 profile의 year가 해당 연도 범위에 속하는 멤버만
    if year is not None:
        year_start = datetime.date(year, 1, 1)
        year_end = datetime.date(year + 1, 1, 1)
        query = query.filter(MemberProfile.year >= year_start, MemberProfile.year < year_end)

    query = _apply_filters(query, gyogu, team, group_no, generation)

    if field and keyword:
        query, empty = _apply_keyword_filter(query, db, field, keyword)
        if empty:
            return [], 0

    return _paginate(query, page, page_size)


def get_deleted_member(db: Session, member_id: int):
    """삭제된 멤버 단건 상세 조회 (최신 프로필 조인)"""
    row = _deleted_base_query(db).filter(
        Member.member_id == member_id,
    ).first()

    if not row:
        raise HTTPException(status_code=404, detail="삭제된 멤버를 찾을 수 없습니다.")

    return row  # (Member, MemberProfile) 튜플


def create_member(db: Session, data: MemberCreate) -> tuple[Member, MemberProfile | None]:
    """멤버 생성 (Member + MemberProfile)"""
    member = Member(
        name=data.name,
        gender=data.gender,
        generation=data.generation,
        phone_number=data.phone_number,
        v8pid=data.v8pid,
        birthdate=data.birthdate,
        school_work=data.school_work,
        major=data.major,
        enrolled_at=datetime.datetime.now(),  # 등록일시는 서버 기준 자동
    )
    db.add(member)
    db.flush()  # member_id 확보

    profile = None
    # 프로필 필수 필드가 모두 있을 때만 생성
    if all(v is not None for v in [data.member_type, data.gyogu, data.team, data.group_no]):
        # year는 서버에서 현재 연도를 자동으로 넣음
        current_year = datetime.date(datetime.date.today().year, 1, 1)
        profile = MemberProfile(
            member_id=member.member_id,
            year=current_year,
            member_type=data.member_type,
            gyogu=data.gyogu,
            team=data.team,
            group_no=data.group_no,
            leader_ids=data.leader_ids,
            plt_status=data.plt_status,
        )
        db.add(profile)

    db.commit()
    db.refresh(member)
    if profile:
        db.refresh(profile)

    return member, profile


def update_member(db: Session, member_id: int, data: MemberCreate) -> int:
    """멤버 정보 수정 (Member + 최신 MemberProfile)"""
    member = db.query(Member).filter(Member.member_id == member_id, Member.deleted_at.is_(None)).first()
    if not member:
        raise HTTPException(status_code=404, detail="멤버를 찾을 수 없습니다.")

    # Member 기본 정보 업데이트
    member.name = data.name
    member.gender = data.gender
    member.generation = data.generation
    member.phone_number = data.phone_number
    member.v8pid = data.v8pid
    member.birthdate = data.birthdate
    member.school_work = data.school_work
    member.major = data.major
    # enrolled_at은 등록일자이므로 수정하지 않음

    # member_profile은 이력 보존 — 덮어쓰지 않고 새 row insert
    # year = 오늘 날짜 (소속 변경 유효 시작일)
    new_profile = MemberProfile(
        member_id=member_id,
        year=datetime.date.today(),
        gyogu=data.gyogu,
        team=data.team,
        group_no=data.group_no,
        member_type=data.member_type,
        plt_status=data.plt_status,
        leader_ids=data.leader_ids,
        # attendance_grade는 동적 계산 필드이므로 미설정
    )
    db.add(new_profile)

    db.commit()
    return member_id


def delete_member(db: Session, member_id: int, data: MemberDeleteRequest) -> Member:
    """멤버 소프트 삭제 (deleted_at, deleted_reason 세팅)"""
    member = db.query(Member).filter(Member.member_id == member_id, Member.deleted_at.is_(None)).first()
    if not member:
        raise HTTPException(status_code=404, detail="멤버를 찾을 수 없습니다.")

    member.deleted_at = datetime.datetime.now()  # 삭제 시각은 서버 기준 자동
    member.deleted_reason = data.deleted_reason
    db.commit()
    db.refresh(member)
    return member


def restore_member(db: Session, member_id: int) -> Member:
    """삭제된 멤버 복원 (deleted_at, deleted_reason 초기화)"""
    member = db.query(Member).filter(Member.member_id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="멤버를 찾을 수 없습니다.")
    if member.deleted_at is None:
        raise HTTPException(status_code=400, detail="삭제되지 않은 멤버입니다.")

    member.deleted_at = None
    member.deleted_reason = None
    db.commit()
    db.refresh(member)
    return member
