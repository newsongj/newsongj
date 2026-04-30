"""gyojeok 멤버 CRUD — 순수 DB 조작만 담당"""
from sqlalchemy.orm import Session
from sqlalchemy import cast, String
from app.models import Member, MemberProfile, Leader
from app.schemas.members import MemberDeleteRequest, MemberCreate, MemberUpdate
from app.crud.member_profile import insert_profile, upsert_profile_on_date
from app.crud.query_builders import (
    active_now,
    by_gyogu, by_team, by_group_no, by_leader, by_member_type, by_year_range,
    build_active_members_query, build_deleted_members_query,
    NEWCOMER_TYPE,
)
from sqlalchemy import desc
import datetime
from app.core.timezone import now_kst, today_kst
from app.core.exceptions import MemberNotFoundError, MemberAlreadyActiveError  # noqa: F401  (재export — 하위호환)


def _apply_keyword_filter(query, db: Session, field: str, keyword: str):
    """키워드 검색 조건 적용 (활성/삭제 목록 공용)"""
    if field == "leader":
        matching_ids = [str(r[0]) for r in db.query(Leader.leader_id).filter(
            Leader.leader_name.like(f"%{keyword}%")
        ).all()]
        if not matching_ids:
            return query, True  # 결과 없음 플래그
        return by_leader(query, matching_ids), False
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
        return by_member_type(query, keyword), False
    return query, False


def _apply_filters(query, gyogu=None, team=None, group_no=None, generation=None):
    """공통 필터 적용 (활성/삭제 목록 공용)"""
    if gyogu is not None:
        query = by_gyogu(query, gyogu)
    if team is not None:
        query = by_team(query, team)
    if group_no is not None:
        query = by_group_no(query, group_no)
    if generation is not None:
        query = query.filter(Member.generation == generation)
    return query


def _is_newcomer(db: Session, member_id: int) -> bool:
    """대상 멤버의 최신 profile member_type이 '새가족'인지 — 일반 API는 새가족을 없는 사람 취급"""
    latest_type = (
        db.query(MemberProfile.member_type)
        .filter(MemberProfile.member_id == member_id)
        .order_by(desc(MemberProfile.updated_at), desc(MemberProfile.profile_id))
        .limit(1)
        .scalar()
    )
    return latest_type == NEWCOMER_TYPE


def _paginate(query, page: int, page_size: int):
    """공통 페이징 처리"""
    total = query.count()
    offset = (page - 1) * page_size
    rows = query.offset(offset).limit(page_size).all()
    return rows, total


def _finish_member_list(db, query, page, page_size, gyogu, team, group_no, generation, field, keyword):
    """필터/검색/페이징 공통 마무리 — get_members / get_newcomer_members 공용"""
    query = _apply_filters(query, gyogu, team, group_no, generation)
    if field and keyword:
        query, empty = _apply_keyword_filter(query, db, field, keyword)
        if empty:
            return [], 0
    return _paginate(query, page, page_size)


def get_members(db: Session, page: int, page_size: int, year: int, gyogu=None, team=None, group_no=None, generation=None, field=None, keyword=None):
    """활성 멤버 목록 조회 — 드롭다운 필터 + 키워드 검색 통합 (deleted_at IS NULL, 새가족 제외)"""
    query = build_active_members_query(db, year)
    return _finish_member_list(db, query, page, page_size, gyogu, team, group_no, generation, field, keyword)


def get_deleted_members(db: Session, page: int, page_size: int, year=None, gyogu=None, team=None, group_no=None, generation=None, deleted_from=None, deleted_to=None, field=None, keyword=None):
    """삭제된 멤버 목록 조회 (deleted_at IS NOT NULL) — 최신 profile이 새가족인 멤버 제외"""
    from sqlalchemy import or_
    query = build_deleted_members_query(db).filter(
        or_(MemberProfile.member_type.is_(None), MemberProfile.member_type != NEWCOMER_TYPE)
    )

    if deleted_from is not None:
        query = query.filter(Member.deleted_at >= deleted_from)
    if deleted_to is not None:
        query = query.filter(Member.deleted_at <= deleted_to)
    if year is not None:
        query = by_year_range(query, year)

    query = _apply_filters(query, gyogu, team, group_no, generation)

    if field and keyword:
        query, empty = _apply_keyword_filter(query, db, field, keyword)
        if empty:
            return [], 0

    return _paginate(query, page, page_size)


def get_deleted_member(db: Session, member_id: int):
    """삭제된 멤버 단건 상세 조회 (최신 프로필 조인) — 새가족 제외"""
    row = build_deleted_members_query(db).filter(
        Member.member_id == member_id,
    ).first()

    if not row or _is_newcomer(db, member_id):
        raise MemberNotFoundError("삭제된 멤버를 찾을 수 없습니다.")

    return row  # (Member, MemberProfile) 튜플


def create_member(db: Session, data: MemberCreate) -> tuple[Member, MemberProfile | None]:
    """멤버 생성 (Member + MemberProfile) — 일반 멤버용. member_type='새가족'은 별도 도메인에서 처리."""
    if data.member_type == NEWCOMER_TYPE:
        from app.core.exceptions import ConflictError
        raise ConflictError("새가족은 미등반새가족 전용 API로 생성하세요.")

    member = Member(
        name=data.name,
        gender=data.gender,
        generation=data.generation,
        phone_number=data.phone_number,
        v8pid=data.v8pid,
        birthdate=data.birthdate,
        school_work=data.school_work,
        major=data.major,
        enrolled_at=now_kst(),  # 등록일시는 서버 기준 자동
    )
    db.add(member)
    db.flush()  # member_id 확보

    profile = None
    # 프로필 필수 필드가 모두 있을 때만 생성
    if all(v is not None for v in [data.member_type, data.gyogu, data.team, data.group_no]):
        profile = insert_profile(
            db, member.member_id, today_kst(),
            gyogu=data.gyogu,          # type: ignore[arg-type]
            team=data.team,            # type: ignore[arg-type]
            group_no=data.group_no,    # type: ignore[arg-type]
            member_type=data.member_type,  # type: ignore[arg-type]
            leader_ids=data.leader_ids, plt_status=data.plt_status,
        )

    db.commit()
    db.refresh(member)
    if profile:
        db.refresh(profile)

    return member, profile


def update_member(
    db: Session,
    member_id: int,
    data: MemberUpdate,
    profile_year: datetime.date | None = None,
) -> int:
    """멤버 정보 수정 (Member + 최신 MemberProfile)

    profile_year: profile row의 year 기준일. None이면 오늘(KST) 사용.
                  미래 날짜 지정이 필요한 경우 명시적으로 전달.
    """
    member = active_now(db.query(Member).filter(Member.member_id == member_id)).first()
    if not member or _is_newcomer(db, member_id):
        raise MemberNotFoundError("멤버를 찾을 수 없습니다.")

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

    # member_profile 이력 보존 — 같은 날 변경이면 UPDATE, 다른 날이면 새 row INSERT
    # 4개 필드 모두 있을 때만 upsert (없으면 Member 기본 정보만 수정)
    today = profile_year or today_kst()
    if all(v is not None for v in [data.member_type, data.gyogu, data.team, data.group_no]):
        upsert_profile_on_date(
            db, member_id, today,
            gyogu=data.gyogu,          # type: ignore[arg-type]
            team=data.team,            # type: ignore[arg-type]
            group_no=data.group_no,    # type: ignore[arg-type]
            member_type=data.member_type,  # type: ignore[arg-type]
            leader_ids=data.leader_ids, plt_status=data.plt_status,
        )

    db.commit()
    return member_id


def delete_member(db: Session, member_id: int, data: MemberDeleteRequest) -> Member:
    """멤버 소프트 삭제 (deleted_at, deleted_reason 세팅)"""
    member = active_now(db.query(Member).filter(Member.member_id == member_id)).first()
    if not member or _is_newcomer(db, member_id):
        raise MemberNotFoundError("멤버를 찾을 수 없습니다.")

    member.deleted_at = now_kst()  # 삭제 시각은 서버 기준 자동
    member.deleted_reason = data.deleted_reason
    db.commit()
    db.refresh(member)
    return member


def restore_member(db: Session, member_id: int) -> Member:
    """삭제된 멤버 복원 (deleted_at, deleted_reason 초기화)"""
    member = db.query(Member).filter(Member.member_id == member_id).first()
    if not member or _is_newcomer(db, member_id):
        raise MemberNotFoundError("멤버를 찾을 수 없습니다.")
    if member.deleted_at is None:
        raise MemberAlreadyActiveError("삭제되지 않은 멤버입니다.")

    member.deleted_at = None
    member.deleted_reason = None
    db.commit()
    db.refresh(member)
    return member
