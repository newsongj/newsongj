"""메타 API — 직분(리더) 목록 조회"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.meta import LeaderResponse
from app.services.meta import build_leader_list

router = APIRouter(prefix="/api/meta", tags=["메타"])


@router.get(
    "/leaders",
    response_model=list[LeaderResponse],
    summary="직분(리더) 목록 조회",
)
def list_leaders(db: Session = Depends(get_db)):
    """leader 테이블의 활성 직분 목록을 반환합니다."""
    return build_leader_list(db)
