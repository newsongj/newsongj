"""소견서 설정 API — 회차 생성/수정/완료, 작성자 배정 (관리자)"""
from typing import List

from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_menu
from app.schemas.opinion import (
    MemberFieldOption,
    OpinionMappingBulkCreate, OpinionMappingResponse,
    OpinionReportCreate, OpinionReportCustomResponse, OpinionReportUpdate,
)
from app.services.opinion import (
    svc_bulk_create_mapping, svc_complete_opinion_custom, svc_create_opinion_custom,
    svc_delete_mapping, svc_get_active_opinion_custom, svc_get_mapping_list,
    svc_get_member_field_options, svc_update_opinion_custom,
)

router = APIRouter()

_settings = Depends(require_menu("admin.opinion.settings"))


@router.get("/member-fields/options", response_model=List[MemberFieldOption], summary="교적 자동기입 항목 선택지", dependencies=[_settings])
def get_member_field_options():
    return svc_get_member_field_options()


@router.get("/active", response_model=OpinionReportCustomResponse, summary="진행 중인 소견서 회차 조회", dependencies=[_settings])
def get_active_opinion_custom(db: Session = Depends(get_db)):
    return svc_get_active_opinion_custom(db)


@router.post("", response_model=OpinionReportCustomResponse, status_code=201, summary="소견서 회차 생성", dependencies=[_settings])
def create_opinion_custom(body: OpinionReportCreate, db: Session = Depends(get_db)):
    return svc_create_opinion_custom(db, body)


@router.put("/{opinion_custom_id}", status_code=200, summary="소견서 회차 설정 수정", dependencies=[_settings])
def update_opinion_custom(
    opinion_custom_id: int = Path(...),
    body: OpinionReportUpdate = ...,
    db: Session = Depends(get_db),
):
    svc_update_opinion_custom(db, opinion_custom_id, body)
    return {"ok": True}


@router.put("/{opinion_custom_id}/complete", status_code=200, summary="소견서 회차 완료 처리", dependencies=[_settings])
def complete_opinion_custom(opinion_custom_id: int = Path(...), db: Session = Depends(get_db)):
    svc_complete_opinion_custom(db, opinion_custom_id)
    return {"ok": True}


@router.get("/{report_year}/mapping", response_model=List[OpinionMappingResponse], summary="작성자 배정 현황 조회", dependencies=[_settings])
def get_mapping_list(report_year: int = Path(...), db: Session = Depends(get_db)):
    return svc_get_mapping_list(db, report_year)


@router.post("/{report_year}/mapping/bulk", status_code=200, summary="작성자 일괄 배정", dependencies=[_settings])
def bulk_create_mapping(
    report_year: int = Path(...),
    body: OpinionMappingBulkCreate = ...,
    db: Session = Depends(get_db),
):
    svc_bulk_create_mapping(db, report_year, body)
    return {"ok": True}


@router.delete("/mapping/{mapping_id}", status_code=200, summary="작성자 배정 취소", dependencies=[_settings])
def delete_mapping(mapping_id: int = Path(...), db: Session = Depends(get_db)):
    svc_delete_mapping(db, mapping_id)
    return {"ok": True}
