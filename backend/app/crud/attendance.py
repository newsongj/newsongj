from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models import AttendanceRecord, Member, MemberProfile
from app.schemas.attendance import AttendanceBatchRequest, NewcomerAttendanceBatchRequest
from app.crud.query_builders import (
    active_as_of,
    build_members_as_of_query,
    by_group_no,
    apply_attendance_filters,
    exclude_newcomers,
    unenrolled_newcomers_as_of,
    _latest_as_of_sq,
    _latest_profile_id_sq,
)
from app.crud.attendance_rate import update_rates_for_members
from app.core.timezone import now_kst, today_kst
from app.core.exceptions import (  # noqa: F401  (재export — 하위호환)
    InvalidEnrolledError,
    InvalidMemberIdsError,
    InvalidNewcomerAttendanceIdsError,
)
import datetime


def _upsert_attendance_records(db: Session, req: AttendanceBatchRequest, valid_ids: set[int]) -> int:
    if not valid_ids:
        return 0

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
    return saved_count


def upsert_attendance_batch(db: Session, req: AttendanceBatchRequest) -> int:
    request_ids = {item.member_id for item in req.records}

    # worship_date 시점 유효 profile join → 새가족(미등반) 제외
    max_year_sq = _latest_as_of_sq(db, req.worship_date)
    latest_sq = _latest_profile_id_sq(db, max_year_sq)
    base_q = (
        db.query(Member.member_id, Member.enrolled_at)
        .join(latest_sq, latest_sq.c.member_id == Member.member_id)
        .join(MemberProfile, MemberProfile.profile_id == latest_sq.c.max_profile_id)
        .filter(Member.member_id.in_(request_ids))
    )
    base_q = exclude_newcomers(active_as_of(base_q, req.worship_date))

    valid_map: dict[int, datetime.date | None] = {
        row.member_id: (row.enrolled_at.date() if row.enrolled_at else None)
        for row in base_q.all()
    }
    valid_ids = set(valid_map)

    invalid_ids = request_ids - valid_ids
    if invalid_ids:
        raise InvalidMemberIdsError(sorted(invalid_ids))

    today = today_kst()
    bad_enrolled = [mid for mid, e in valid_map.items() if e is None or e > today]
    if bad_enrolled:
        raise InvalidEnrolledError(sorted(bad_enrolled))

    saved_count = _upsert_attendance_records(db, req, valid_ids)
    update_rates_for_members(db, valid_map, today)

    db.commit()
    return saved_count


def _upsert_newcomer_attendance_records(db: Session, req: NewcomerAttendanceBatchRequest, valid_ids: set[int]) -> int:
    if not valid_ids:
        return 0

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
                edu_week=item.edu_week,
                memo=item.memo,
                checked_at=now_kst(),
            ))
            saved_count += 1
        elif (
            existing.status != item.status
            or existing.absent_reason != item.absent_reason
            or existing.edu_week != item.edu_week
            or existing.memo != item.memo
        ):
            existing.status = item.status
            existing.absent_reason = item.absent_reason
            existing.edu_week = item.edu_week
            existing.memo = item.memo
            existing.checked_at = now_kst()
            saved_count += 1

    db.flush()
    return saved_count


def upsert_newcomer_attendance_batch(db: Session, req: NewcomerAttendanceBatchRequest) -> int:
    request_ids = {item.member_id for item in req.records}

    max_year_sq = _latest_as_of_sq(db, req.worship_date)
    latest_sq = _latest_profile_id_sq(db, max_year_sq)
    base_q = (
        db.query(Member.member_id)
        .join(latest_sq, latest_sq.c.member_id == Member.member_id)
        .join(MemberProfile, MemberProfile.profile_id == latest_sq.c.max_profile_id)
        .filter(Member.member_id.in_(request_ids))
    )
    valid_ids = {
        row.member_id
        for row in unenrolled_newcomers_as_of(
            active_as_of(base_q, req.worship_date),
            req.worship_date,
        ).all()
    }

    invalid_ids = request_ids - valid_ids
    if invalid_ids:
        raise InvalidNewcomerAttendanceIdsError(sorted(invalid_ids))

    saved_count = _upsert_newcomer_attendance_records(db, req, valid_ids)
    # 새가족도 출석률/등급 산정 대상 — enrolled_at은 없고, 앵커는 resolve_anchors가
    # registered_at(최초 등록일)을 직접 조회해 결정한다
    update_rates_for_members(db, {mid: None for mid in valid_ids}, today_kst())
    db.commit()
    return saved_count


def get_newcomer_attendance_history(db: Session, member_id: int, limit: int | None = None) -> list[AttendanceRecord]:
    """새가족 교육 이력 조회 — 교육 입력이 있는 기록만, worship_date 내림차순.

    "교육 입력이 있는 기록" = edu_week가 있거나 memo가 비어있지 않은 행.
    통합 테이블이라 일반 출석 기록과 섞이므로 이 조건으로 교육 이력만 걸러낸다.
    """
    query = (
        db.query(AttendanceRecord)
        .filter(
            AttendanceRecord.member_id == member_id,
            or_(
                AttendanceRecord.edu_week.isnot(None),
                AttendanceRecord.memo != "",
            ),
        )
        .order_by(AttendanceRecord.worship_date.desc())
    )
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def has_education_record(db: Session, member_ids: list[int]) -> set[int]:
    """교육 이력이 있는 member_id 집합 — get_newcomer_attendance_history와 동일 기준."""
    if not member_ids:
        return set()
    rows = (
        db.query(AttendanceRecord.member_id)
        .filter(
            AttendanceRecord.member_id.in_(member_ids),
            or_(
                AttendanceRecord.edu_week.isnot(None),
                AttendanceRecord.memo != "",
            ),
        )
        .distinct()
        .all()
    )
    return {r.member_id for r in rows}


def get_attendance_records(
    db: Session,
    worship_date: datetime.date,
    gyogu_no: int,
    team_no: int | None = None,
    group_no: int | None = None,
    page: int = 1,
    size: int = 20,
) -> tuple[list, int]:
    """worship_date 기준 유효 소속 멤버 목록 + 출석 기록 LEFT JOIN.

    - member_profile 기준: 출석 기록 없는 멤버도 포함
    - (Member, MemberProfile, AttendanceRecord|None) 튜플 목록 반환
    """
    query = build_members_as_of_query(db, worship_date)
    query = apply_attendance_filters(query, gyogu_no, team_no)
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


def get_newcomer_attendance_records(
    db: Session,
    worship_date: datetime.date,
    gyogu_no: int,
    team_no: int | None = None,
    group_no: int | None = None,
    page: int = 1,
    size: int = 20,
) -> tuple[list, int]:
    """worship_date 기준 미등반 새가족 목록 + 출석 기록 LEFT JOIN.

    - 저장 경로(upsert_newcomer_attendance_batch)와 동일한 대상 판정을 쓴다.
    - 기록 없는 새가족도 포함 (outer join)
    - (Member, MemberProfile, AttendanceRecord|None) 튜플 목록 반환
    """
    query = build_members_as_of_query(db, worship_date, include_newcomers=True)
    query = unenrolled_newcomers_as_of(query, worship_date)
    query = apply_attendance_filters(query, gyogu_no, team_no)
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
        .order_by(MemberProfile.gyogu, MemberProfile.team, MemberProfile.group_no, Member.name)
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    return rows, total
