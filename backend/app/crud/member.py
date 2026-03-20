from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models import Member, MemberProfile, Leader
from app.schemas.member import MemberDeleteState, MemberRow, AddMember
from fastapi import HTTPException


def get_members(db: Session, page: int, page_size: int, year=None, gyogu=None, team=None, group_no=None, generation=None):
    # Member와 MemberProfile을 member_id로 연결 (LEFT JOIN)
    query = db.query(Member, MemberProfile).outerjoin(
        MemberProfile, Member.member_id == MemberProfile.member_id
    )

    # 삭제된 멤버 제외 (필수)
    query = query.filter(Member.deleted_at == None)

    # 필터 파라미터가 있을 때만 조건 추가
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

    # 전체 건수 조회
    total = query.count()

    # 페이징 처리
    offset = (page - 1) * page_size
    rows = query.offset(offset).limit(page_size).all()

    # Leader 전체를 한번에 조회해서 id → name 맵 생성
    leaders = db.query(Leader).all()
    leader_map = {str(l.leader_id): l.leader_name for l in leaders}

    return rows, total, leader_map

def get_deleted_members(db: Session, page: int, page_size: int, year=None, gyogu=None, team=None, group_no=None, generation=None):
    # Member와 MemberProfile을 member_id로 연결 (LEFT JOIN)
    query = db.query(Member, MemberProfile).outerjoin(
        MemberProfile, Member.member_id == MemberProfile.member_id
    )

    # 삭제되지 않은 멤버 제외 (필수)
    query = query.filter(Member.deleted_at != None)

    # 필터 파라미터가 있을 때만 조건 추가
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

    # 전체 건수 조회
    total = query.count()

    # 페이징 처리
    offset = (page - 1) * page_size
    rows = query.offset(offset).limit(page_size).all()

    # Leader 전체를 한번에 조회해서 id → name 맵 생성
    leaders = db.query(Leader).all()
    leader_map = {str(l.leader_id): l.leader_name for l in leaders}

    return rows, total, leader_map


def create_member(db: Session, data: MemberRow) -> tuple[Member, MemberProfile | None]:
    member = Member(
        name=data.name,
        gender=data.gender,
        generation=data.generation,
        phone_number=data.phone_number,
        v8pid=data.v8pid,
        birthdate=data.birthdate,
        enrolled_at=data.enrolled_at,
    )
    db.add(member)
    db.flush()  # member_id 확보

    profile = None
    # 프로필 필수 필드가 모두 있을 때만 생성
    if all(v is not None for v in [data.year, data.member_type, data.gyogu, data.team, data.group_no]):
        profile = MemberProfile(
            member_id=member.member_id,
            year=data.year,
            member_type=data.member_type,
            gyogu=data.gyogu,
            team=data.team,
            group_no=data.group_no,
            leader=data.leader,
            plt_status=data.plt_status,
        )
        db.add(profile)

    db.commit()
    db.refresh(member)
    if profile:
        db.refresh(profile)

    return member, profile


def build_member_row(member, profile, db) -> MemberRow:
    leaders = db.query(Leader).all()
    leader_map = {str(l.leader_id): l.leader_name for l in leaders}
    return MemberRow(
        member_id=member.member_id,
        name=member.name,
        gender=member.gender,
        generation=member.generation,
        gyogu=profile.gyogu if profile else None,
        team=profile.team if profile else None,
        group_no=profile.group_no if profile else None,
        phone_number=member.phone_number,
        birthdate=member.birthdate,
        member_type=profile.member_type if profile else None,
        attendance_grade=profile.attendance_grade if profile else None,
        plt_status=profile.plt_status if profile else None,
        leader=resolve_leader_names(profile.leader, leader_map) if profile else None,
        v8pid=member.v8pid,
        year=profile.year if profile else None,
        enrolled_at=member.enrolled_at,
    )


def modify_member(db: Session, member_id: int, data: AddMember) -> int:
    member = db.query(Member).filter(Member.member_id == member_id, Member.deleted_at == None).first()
    if not member:
        raise HTTPException(status_code=404, detail="멤버를 찾을 수 없습니다.")

    member.name = data.name
    member.gender = data.gender
    member.generation = data.generation
    member.phone_number = data.phone_number
    member.v8pid = data.v8pid
    member.birthdate = data.birthdate
    member.enrolled_at = data.enrolled_at

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
        profile.leader = data.leader

    db.commit()
    return member_id


def delete_member(db: Session, member_id: int, data: MemberDeleteState) -> Member:
    member = db.query(Member).filter(Member.member_id == member_id, Member.deleted_at == None).first()
    if not member:
        raise HTTPException(status_code=404, detail="멤버를 찾을 수 없습니다.")

    member.deleted_at = data.deleted_at
    member.deleted_reason = data.deleted_reason
    db.commit()
    db.refresh(member)
    return member


def restore_member(db: Session, member_id: int) -> Member:
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


def resolve_leader_names(leader_str: str | None, leader_map: dict) -> str | None:
    """'1,3' 같은 문자열을 '팀장, 그룹장' 형태로 변환"""
    if not leader_str:
        return None
    ids = [id.strip() for id in leader_str.split(',')]
    names = [leader_map[id] for id in ids if id in leader_map]
    return ', '.join(names) if names else None
