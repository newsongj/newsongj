"""출석 기록 API"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
import datetime

from app.core.database import get_db
from app.schemas.attendance import AttendanceBatchRequest, AttendanceBatchResponse, AttendanceListResponse
from app.services.attendance import build_attendance_list_response, save_attendance_batch

router = APIRouter(prefix="/api/attendance", tags=["출석"])


@router.get(
    "/records",
    response_model=AttendanceListResponse,
    summary="출석 목록 조회 (member_profile 기준)",
)
def list_attendance_records(
    worship_date: datetime.date = Query(..., description="예배 날짜 (YYYY-MM-DD)"),
    gyogu_no: int = Query(..., description="교구 번호"),
    team_no: Optional[int] = Query(None, description="팀 번호"),
    group_no: Optional[int] = Query(None, description="그룹 번호"),
    is_imwondan: bool = Query(False, description="임원단 필터"),
    page: int = Query(1, description="페이지 (1-based)"),
    page_size: int = Query(20, description="페이지당 건수"),
    db: Session = Depends(get_db),
):
    return build_attendance_list_response(
        db, worship_date, gyogu_no, team_no, group_no, is_imwondan, page, page_size,
    )


@router.post(
    "/records/batch",
    response_model=AttendanceBatchResponse,
    summary="출석 기록 일괄 저장 (upsert)",
)
def batch_save_attendance(body: AttendanceBatchRequest, db: Session = Depends(get_db)):
    return save_attendance_batch(db, body)
