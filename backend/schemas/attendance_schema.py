from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel


AbsentReason = Literal["학교/학원", "회사", "알바", "가족모임", "개인일정", "아픔", "기타"]
AttendanceStatus = Literal["PRESENT", "ABSENT"]


class AttendanceRecordBase(BaseModel):
    worship_date: date
    member_id: int
    gyogu: int
    team: int
    group_no: int
    status: AttendanceStatus
    absent_reason: Optional[AbsentReason] = None
    checked_at: datetime


class AttendanceRecordRead(AttendanceRecordBase):
    attendance_id: int
    member_name: Optional[str] = None

    class Config:
        from_attributes = True


def to_attendance_record_schema(record) -> AttendanceRecordRead:
    return AttendanceRecordRead(
        attendance_id=record.attendance_id,
        worship_date=record.worship_date,
        member_id=record.member_id,
        gyogu=record.gyogu,
        team=record.team,
        group_no=record.group_no,
        status=record.status,
        absent_reason=record.absent_reason,
        checked_at=record.checked_at,
        member_name=getattr(getattr(record, "user", None), "name", None),
    )


def to_attendance_record_schema_list(records) -> List[AttendanceRecordRead]:
    return [to_attendance_record_schema(record) for record in records]
