from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models import AttendanceRecord, Member
from app.schemas.attendance import AttendanceBatchRequest
from app.crud.query_builders import (
    active_as_of,
    build_members_as_of_query,
    by_group_no,
    apply_attendance_filters,
)
from app.crud.attendance_rate import update_rates_for_members
from app.core.timezone import now_kst, today_kst
from app.core.exceptions import InvalidMemberIdsError, InvalidEnrolledError  # noqa: F401  (재export — 하위호환)
import datetime


def upsert_attendance_batch(db: Session, req: AttendanceBatchRequest) -> int:
    request_ids = {item.member_id for item in req.records}

    valid_map: dict[int, datetime.date | None] = {
        row.member_id: (row.enrolled_at.date() if row.enrolled_at else None)
        for row in active_as_of(
            db.query(Member.member_id, Member.enrolled_at)
              .filter(Member.member_id.in_(request_ids)),
            req.worship_date,
        ).all()
    }
    valid_ids = set(valid_map)

    invalid_ids = request_ids - valid_ids
    if invalid_ids:
        raise InvalidMemberIdsError(sorted(invalid_ids))

    today = today_kst()
    bad_enrolled = [mid for mid, e in valid_map.items() if e is None or e > today]
    if bad_enrolled:
        raise InvalidEnrolledError(sorted(bad_enrolled))

    # 기존 레코드 일괄 조회 — N+1 방지
    existing_map: dict[int, AttendanceRecord] = {
        r.member_id: r
        for r in db.query(AttendanceRecord).filter(
            AttendanceRecord.member_id.in_(valid_ids),
            AttendanceRecord.worship_date == req.worship_date,
        ).all()
    }

    saved_count = 0

    for item in req.records:
        existing = existing_map.get(item.member_id)

        if existing is None:
            db.add(AttendanceRecord(
                worship_date=req.worship_date,
                member_id=item.member_id,
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

    db.flush()
    update_rates_for_members(db, valid_map, today)

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
    query = apply_attendance_filters(query, db, gyogu_no, team_no, is_imwondan)
    if query is None:
        return [], 0
    if group_no is not None:
        query = by_group_no(query, group_no)

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
