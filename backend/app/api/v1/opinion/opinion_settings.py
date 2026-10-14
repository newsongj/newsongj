"""소견서 API — 설정 (§1)"""
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_any_menu, require_menu
from app.schemas.opinion_settings import (
    OpinionMappingGroup, OpinionSettingsResponse, OpinionSettingsSaveRequest,
)
from app.services.opinion_settings import (
    svc_get_opinion_mappings, svc_get_opinion_settings, svc_save_opinion_settings,
)

router = APIRouter()

_settings = Depends(require_menu("admin.opinion.settings"))
# 현황 대시보드도 설정의 member_fields / input_fields 를 읽어 상세 모달을 그린다 (§0-1)
_settings_read = Depends(require_any_menu("admin.opinion.settings", "admin.opinion.dashboard"))


@router.get("/settings", response_model=OpinionSettingsResponse, tags=["소견서 설정"], summary="설정 조회 — 없는 연도는 exists=false + 기본값", dependencies=[_settings_read])
def get_opinion_settings(
    report_year: int = Query(...),
    db: Session = Depends(get_db),
):
    return svc_get_opinion_settings(db, report_year)


@router.put("/settings", status_code=200, tags=["소견서 설정"], summary="설정 + 임원단 매핑 저장 (연도 기준 upsert, 매핑은 전체 대체)", dependencies=[_settings])
def put_opinion_settings(
    body: OpinionSettingsSaveRequest,
    db: Session = Depends(get_db),
):
    svc_save_opinion_settings(db, body)


@router.get("/mappings", response_model=List[OpinionMappingGroup], tags=["소견서 설정"], summary="임원단 매핑 조회 — 작성자 기준 묶음", dependencies=[_settings])
def get_opinion_mappings(
    report_year: int = Query(...),
    db: Session = Depends(get_db),
):
    return svc_get_opinion_mappings(db, report_year)
