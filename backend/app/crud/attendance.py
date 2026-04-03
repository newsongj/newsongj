from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models import AttendanceRecord, Member, Leader
from app.schemas.attendance import AttendanceBatchRequest
from app.crud.member_profile import (
    build_members_as_of_query,
    by_gyogu, by_team, by_group_no, by_leader,
)
from app.core.timezone import now_kst
import datetime


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


def get_attendance_records(
    db: Session,
    worship_date: datetime.date,
    gyogu_no: int,
    team_no: int | None = None,
    group_no: int | None = None,
    is_imwondan: bool = False,
    page: int = 1,
    size: int = 20,
) -> tuple[list, int]:
    """worship_date 기준 유효 소속 멤버 목록 + 출석 기록 LEFT JOIN.

    - member_profile 기준: 출석 기록 없는 멤버도 포함
    - (Member, MemberProfile, AttendanceRecord|None) 튜플 목록 반환
    """
    query = build_members_as_of_query(db, worship_date)
    query = by_gyogu(query, gyogu_no)
    if team_no is not None:
        query = by_team(query, team_no)
    if group_no is not None:
        query = by_group_no(query, group_no)

    if is_imwondan:
        leader_id = db.query(Leader.leader_id).filter(Leader.leader_name == "임원단").scalar()
        if not leader_id:
            return [], 0
        query = by_leader(query, leader_id)

    total = query.count()

    rows = (
        query
        .outerjoin(
            AttendanceRecord,
            and_(
                AttendanceRecord.member_id == Member.member_id,
                AttendanceRecord.worship_date == worship_date,
            )
        )
        .add_entity(AttendanceRecord)
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    return rows, total
