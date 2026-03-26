"""메타 데이터 비즈니스 로직 — 단순 조회는 CRUD 레이어 없이 서비스에서 직접 처리"""
from sqlalchemy.orm import Session
from app.models import Leader
from app.schemas.meta import LeaderResponse


def build_leader_list(db: Session) -> list[LeaderResponse]:
    """활성 직분 목록을 display_order 순으로 조회 후 응답 변환"""
    rows = (
        db.query(Leader)
        .filter(Leader.is_active == 1)
        .order_by(Leader.display_order)
        .all()
    )
    return [LeaderResponse.model_validate(row) for row in rows]
