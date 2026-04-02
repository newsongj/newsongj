from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models import AttendanceRecord, Member
from app.schemas.attendance import AttendanceBatchRequest
from app.core.timezone import now_kst


def upsert_attendance_batch(db: Session, req: AttendanceBatchRequest) -> int:
    request_ids = {item.member_id for item in req.records}

    valid_ids = {
        row.member_id
        for row in db.query(Member.member_id)
        .filter(Member.member_id.in_(request_ids), Member.deleted_at.is_(None))
        .all()
    }

    invalid_ids = request_ids - valid_ids
    if invalid_ids:
        raise HTTPException(
            status_code=404,
            detail=f"존재하지 않거나 삭제된 멤버입니다: {sorted(invalid_ids)}",
        )

    saved_count = 0

    for item in req.records:
        existing = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.member_id == item.member_id,
                AttendanceRecord.worship_date == req.worship_date,
            )
            .first()
        )

        if existing is None:
            db.add(AttendanceRecord(
                worship_date=req.worship_date,
                member_id=item.member_id,
                gyogu=0,      # 삭제 예정 컬럼 — NOT NULL 제약 임시 충족
                team=0,
                group_no=0,
                status=item.status,
                absent_reason=item.absent_reason,
                checked_at=now_kst(),
            ))
            saved_count += 1

        elif existing.status != item.status or existing.absent_reason != item.absent_reason:
            existing.status = item.status
            existing.absent_reason = item.absent_reason
            existing.checked_at = now_kst()
            saved_count += 1

    db.commit()
    return saved_count
