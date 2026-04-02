from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from typing import Optional
from app.schemas.attendances import AttendanceRecordsCreate, AttendanceRecordCountResponse
from app.services.AttendanceRecords import build_attendance_records
import datetime

router = APIRouter()

@router.post("/records/batch")
def post_record(
    body: AttendanceRecordsCreate,
    db: Session = Depends(get_db),
):
    return build_attendance_records(db, body)