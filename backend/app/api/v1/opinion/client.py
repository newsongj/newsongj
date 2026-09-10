"""소견서 작성 API — 로그인한 작성자가 배정된 대상자 목록/작성 폼 조회 및 저장"""
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_token
from app.schemas.opinion import (
    MyOpinionTargetListResponse, OpinionReportFormResponse, OpinionReportSaveBody,
)
from app.services.opinion import svc_get_my_targets, svc_get_opinion_form, svc_save_opinion_report

router = APIRouter(prefix="/api/opinion-report/write", tags=["소견서 작성"])


def _require_member_id(payload: dict) -> int:
    member_id = payload.get("member_id")
    if not member_id:
        raise HTTPException(status_code=400, detail="계정이 회원과 연결되어 있지 않습니다.")
    return member_id


@router.get("/my-targets", response_model=MyOpinionTargetListResponse, summary="내가 배정받은 소견서 대상자 목록")
def get_my_targets(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    return svc_get_my_targets(db, _require_member_id(payload))


@router.get("/{target_member_id}", response_model=OpinionReportFormResponse, summary="소견서 작성 폼 조회")
def get_opinion_form(
    target_member_id: int = Path(...),
    payload: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    return svc_get_opinion_form(db, _require_member_id(payload), target_member_id)


@router.put("/{target_member_id}", status_code=200, summary="소견서 저장")
def save_opinion_report(
    target_member_id: int = Path(...),
    body: OpinionReportSaveBody = ...,
    payload: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    svc_save_opinion_report(db, _require_member_id(payload), target_member_id, body)
    return {"ok": True}
