"""교적 멤버 CRUD — 순수 DB 조작만 담당"""
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models import Member, MemberProfile
from app.schemas.members import MemberDeleteRequest, MemberCreate
from fastapi import HTTPException


def get_members(db: Session, page: int, page_size: int, year, gyogu=None, team=None, group_no=None, generation=None):
    """활성 멤버 목록 조회 (deleted_at IS NULL)"""
    # year는 필수: MemberProfile이 연도별 행이므로 year 조건 없이 조인하면 중복 반환됨
    query = db.query(Member, MemberProfile).outerjoin(
        MemberProfile,
        (Member.member_id == MemberProfile.member_id) & (MemberProfile.year == year),
    )

    # 삭제된 멤버 제외 (필수)
    query = query.filter(Member.deleted_at == None)

    # 선택 필터
    if gyogu:
        query = query.filter(MemberProfile.gyogu == gyogu)
    if team:
        query = query.filter(MemberProfile.team == team)
    if group_no:
        query = query.filter(MemberProfile.group_no == group_no)
    if generation:
        query = query.filter(Member.generation == generation)

    total = query.count()
    offset = (page - 1) * page_size
    rows = query.offset(offset).limit(page_size).all()

    return rows, total


def get_deleted_members(db: Session, page: int, page_size: int, year=None, gyogu=None, team=None, group_no=None, generation=None):
    """삭제된 멤버 목록 조회 (deleted_at IS NOT NULL)"""
    query = db.query(Member, MemberProfile).outerjoin(
        MemberProfile, Member.member_id == MemberProfile.member_id
    )

    # 삭제된 멤버만
    query = query.filter(Member.deleted_at != None)

    if year:
        query = query.filter(MemberProfile.year == year)
    if gyogu:
        query = query.filter(MemberProfile.gyogu == gyogu)
    if team:
        query = query.filter(MemberProfile.team == team)
    if group_no:
        query = query.filter(MemberProfile.group_no == group_no)
    if generation:
        query = query.filter(Member.generation == generation)

    total = query.count()
    offset = (page - 1) * page_size
    rows = query.offset(offset).limit(page_size).all()

    return rows, total


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
        enrolled_at=data.enrolled_at,
    )
    db.add(member)
    db.flush()  # member_id 확보

    profile = None
    # 프로필 필수 필드가 모두 있을 때만 생성
    if all(v is not None for v in [data.member_type, data.gyogu, data.team, data.group_no]):
        profile = MemberProfile(
            member_id=member.member_id,
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
    member.enrolled_at = data.enrolled_at

    # 가장 최근 연도의 프로필을 찾아서 업데이트
    profile = db.query(MemberProfile).filter(
        MemberProfile.member_id == member_id,
    ).order_by(desc(MemberProfile.year)).first()

    if profile:
        profile.gyogu = data.gyogu
        profile.team = data.team
        profile.group_no = data.group_no
        profile.member_type = data.member_type
        profile.attendance_grade = data.attendance_grade
        profile.plt_status = data.plt_status
        profile.leader_ids = data.leader_ids

    db.commit()
    return member_id


def delete_member(db: Session, member_id: int, data: MemberDeleteRequest) -> Member:
    """멤버 소프트 삭제 (deleted_at, deleted_reason 세팅)"""
    member = db.query(Member).filter(Member.member_id == member_id, Member.deleted_at == None).first()
    if not member:
        raise HTTPException(status_code=404, detail="멤버를 찾을 수 없습니다.")

    member.deleted_at = data.deleted_at
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
