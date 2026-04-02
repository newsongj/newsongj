"""leaders CRUD — Leader 테이블 조회"""
from sqlalchemy.orm import Session
from app.models import Leader


def get_leader_map(db: Session) -> dict:
    """Leader 테이블 전체를 조회해서 id → name 맵 반환"""
    leaders = db.query(Leader).all()
    return {str(l.leader_id): l.leader_name for l in leaders}
