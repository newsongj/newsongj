from sqlalchemy.orm import Session
from app.models import Member, MemberProfile, Leader


def get_members(db: Session, page: int, page_size: int, year, gyogu=None, team=None, group_no=None, generation=None):
    # Member와 MemberProfile을 member_id로 연결
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

    # 전체 건수 조회
    total = query.count()

    # 페이징 처리
    offset = (page - 1) * page_size
    rows = query.offset(offset).limit(page_size).all()

    # Leader 전체를 한번에 조회해서 id → name 맵 생성
    leaders = db.query(Leader).all()
    leader_map = {str(l.leader_id): l.leader_name for l in leaders}

    return rows, total, leader_map


def resolve_leader_names(leader_str: str | None, leader_map: dict) -> str | None:
    """'1,3' 같은 문자열을 '팀장, 그룹장' 형태로 변환"""
    if not leader_str:
        return None
    ids = [id.strip() for id in leader_str.split(',')]
    names = [leader_map[id] for id in ids if id in leader_map]
    return ', '.join(names) if names else None
