from sqlalchemy.orm import Session
from app.schemas.attendances import AttendanceRecord, AttendanceRecordList, AttendanceRecordsCreate, AttendanceRecordCountResponse
from app.crud.AttendanceRecords import create_attendance_record


def _record(db, data: AttendanceRecord, worship_date) -> bool:
    """출석 정보 하나 저장"""
    result = create_attendance_record(db, data, worship_date)
    if result is None:
        return False
    else:
        return True

def build_attendance_records(db: Session, data: AttendanceRecordsCreate) -> AttendanceRecordCountResponse:
    count = 0
    
    for record in data.records:
        # 데이터 하나씩 확인
        if _record(db, record) is True:
            count += 1
    return AttendanceRecordCountResponse(save_count=count)