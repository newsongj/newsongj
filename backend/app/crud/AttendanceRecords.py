from sqlalchemy.orm import Session
from app.models import AttendanceRecord, MemberProfile
from app.schemas.attendances import AttendanceRecordList, AttendanceRecord as RecordItem, AttendanceRecordListResponse, AttendanceRecordCountResponse
import datetime


def _paginate(query, page: int, page_size: int):
    """공통 페이징 처리"""
    total = query.count()
    offset = (page - 1) * page_size
    rows = query.offset(offset).limit(page_size).all()
    return rows, total

def create_attendance_record(db: Session, data: RecordItem, worship_date: datetime.date) -> AttendanceRecord | None:
    """출석부에 이미 저장된 데이터인지 여부 확인 후 저장"""
    try:
        record = db.query(AttendanceRecord).filter(
            AttendanceRecord.worship_date == worship_date,
            AttendanceRecord.member_id == data.member_id,
        ).first()

        if record: # 데이터가 있으면 출석 정보만 수정
            record.status        = data.status
            record.absent_reason = data.absent_reason
            record.checked_at    = datetime.datetime.now()
        else: # 데이터가 없으면 만들기
            record = AttendanceRecord(
                worship_date  = worship_date,
                member_id     = data.member_id,
                status        = data.status,
                absent_reason = data.absent_reason,
                checked_at    = datetime.datetime.now(),  # 등록일시는 서버 기준 자동
            )
            db.add(record)

        db.commit()
        db.refresh(record)
        return record
    except Exception:
        db.rollback()
        return None

def get_attendance_records(db: Session, data: AttendanceRecordList) -> AttendanceRecordListResponse:
    query = db.query(AttendanceRecord).filter(
        AttendanceRecord.worship_date==data.worship_date,
        AttendanceRecord.status
    )
    # 페이징
    page= data.meta.current_page
    page_size = data.meta.page_size

    return _paginate(query=query, page=page, page_size=page_size)