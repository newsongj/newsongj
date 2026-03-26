"""gyojeok 멤버 CRUD — 순수 DB 조작만 담당"""
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.models import Member, MemberProfile
from app.schemas.members import MemberDeleteRequest, MemberCreate
from fastapi import HTTPException
import datetime


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


def get_members(db: Session, page: int, page_size: int, year, gyogu=None, team=None, group_no=None, generation=None):
    """활성 멤버 목록 조회 (deleted_at IS NULL)"""
    # year는 필수: MemberProfile이 연도별 행이므로 year 조건 없이 조인하면 중복 반환됨
    query = db.query(Member, MemberProfile).outerjoin(
        MemberProfile,
        (Member.member_id == MemberProfile.member_id) & (MemberProfile.year == year),
    )

    # 삭제된 멤버 제외 (필수)
    query = query.filter(Member.deleted_at == None)

    # 공통 필터 적용
    query = _apply_filters(query, gyogu, team, group_no, generation)

    return _paginate(query, page, page_size)


def _deleted_base_query(db: Session):
    """삭제된 멤버 조회용 기본 쿼리 (최신 프로필 조인, 공용)"""
    latest_year = db.query(
        MemberProfile.member_id,
        func.max(MemberProfile.year).label("max_year"),
    ).group_by(MemberProfile.member_id).subquery()

    return db.query(Member, MemberProfile).outerjoin(
        latest_year, Member.member_id == latest_year.c.member_id
    ).outerjoin(
        MemberProfile,
        (Member.member_id == MemberProfile.member_id)
        & (MemberProfile.year == latest_year.c.max_year),
    ).filter(Member.deleted_at != None)


def get_deleted_members(db: Session, page: int, page_size: int, year=None, gyogu=None, team=None, group_no=None, generation=None, deleted_from=None, deleted_to=None):
    """삭제된 멤버 목록 조회 (deleted_at IS NOT NULL, 최신 프로필만 조인)"""
    query = _deleted_base_query(db)

    # 삭제일 범위 필터
    if deleted_from is not None:
        query = query.filter(Member.deleted_at >= deleted_from)
    if deleted_to is not None:
        query = query.filter(Member.deleted_at <= deleted_to)

    # year 필터 (삭제 목록에서는 선택)
    if year is not None:
        query = query.filter(MemberProfile.year == year)

    # 공통 필터 적용
    query = _apply_filters(query, gyogu, team, group_no, generation)

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
    member = db.query(Member).filter(Member.member_id == member_id, Member.deleted_at == None).first()
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

    # 가장 최근 연도의 프로필을 찾아서 업데이트
    profile = db.query(MemberProfile).filter(
        MemberProfile.member_id == member_id,
    ).order_by(desc(MemberProfile.year)).first()

    if not profile:
        raise HTTPException(status_code=404, detail="해당 멤버의 프로필이 존재하지 않습니다.")

    profile.gyogu = data.gyogu
    profile.team = data.team
    profile.group_no = data.group_no
    profile.member_type = data.member_type
    # attendance_grade는 동적 계산 필드이므로 수정하지 않음
    profile.plt_status = data.plt_status
    profile.leader_ids = data.leader_ids

    db.commit()
    return member_id


def delete_member(db: Session, member_id: int, data: MemberDeleteRequest) -> Member:
    """멤버 소프트 삭제 (deleted_at, deleted_reason 세팅)"""
    member = db.query(Member).filter(Member.member_id == member_id, Member.deleted_at == None).first()
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
