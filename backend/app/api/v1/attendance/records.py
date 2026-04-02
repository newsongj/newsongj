"""출석 기록 API"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.attendance import AttendanceBatchRequest, AttendanceBatchResponse
from app.crud.attendance import upsert_attendance_batch

router = APIRouter(prefix="/api/attendance", tags=["출석"])


@router.post(
    "/records/batch",
    response_model=AttendanceBatchResponse,
    summary="출석 기록 일괄 저장 (upsert)",
)
def batch_save_attendance(body: AttendanceBatchRequest, db: Session = Depends(get_db)):
    saved = upsert_attendance_batch(db, body)
    return AttendanceBatchResponse(saved_count=saved)
