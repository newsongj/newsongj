"""수련회 CRUD — 순수 DB 조작만 담당"""
import datetime
import json
from typing import List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import (
    BusCustom, Member, MemberProfile,
    RetreatCustom, RetreatResponse, SuspendedMealApplication,
)
from app.schemas.retreat import (
    BusCreate, RetreatCreate, RetreatUpdate,
    ResearchResponseUpdate, VehicleSubmitBody, SuspendedMealSubmitBody,
)
from app.core.exceptions import ConflictError, NotFoundError
from app.core.timezone import now_kst


def get_active_retreat(db: Session) -> RetreatCustom | None:
    """is_active=1인 가장 최근 수련회 반환."""
    return (
        db.query(RetreatCustom)
        .filter(RetreatCustom.is_active == 1)
        .order_by(RetreatCustom.retreat_custom_id.desc())
        .first()
    )


def get_buses_for_retreat(db: Session, retreat: RetreatCustom) -> list[BusCustom]:
    """수련회 기간(start_date ~ end_date) 내 버스 목록 반환."""
    return (
        db.query(BusCustom)
        .filter(
            BusCustom.departure_date >= retreat.start_date,
            BusCustom.departure_date <= retreat.end_date,
        )
        .order_by(BusCustom.departure_date, BusCustom.departure_time)
        .all()
    )


def create_retreat(db: Session, data: RetreatCreate) -> RetreatCustom:
    retreat = RetreatCustom(
        retreat_name=data.retreat_name,
        start_date=data.start_date,
        end_date=data.end_date,
        fee_with_bus=data.fee_with_bus,
        fee_without_bus=data.fee_without_bus,
        meal_price=data.meal_price,
        suspended_meal_count=data.suspended_meal_count,
    )
    db.add(retreat)
    db.commit()
    db.refresh(retreat)
    return retreat


def update_retreat(db: Session, retreat_id: int, data: RetreatUpdate) -> RetreatCustom:
    retreat = db.query(RetreatCustom).filter(RetreatCustom.retreat_custom_id == retreat_id).first()
    if not retreat:
        raise NotFoundError("수련회를 찾을 수 없습니다.")
    retreat.retreat_name = data.retreat_name
    retreat.start_date = data.start_date
    retreat.end_date = data.end_date
    retreat.fee_with_bus = data.fee_with_bus
    retreat.fee_without_bus = data.fee_without_bus
    retreat.meal_price = data.meal_price
    retreat.suspended_meal_count = data.suspended_meal_count
    db.commit()
    db.refresh(retreat)
    return retreat


def create_bus(db: Session, data: BusCreate) -> BusCustom:
    time_obj = datetime.time.fromisoformat(data.departure_time)
    bus = BusCustom(
        bus_name=data.bus_name,
        seat_count=data.seat_count,
        departure_date=data.departure_date,
        departure_time=time_obj,
        departure_place=data.departure_place,
        arrival_place=data.arrival_place,
    )
    db.add(bus)
    db.commit()
    db.refresh(bus)
    return bus


def complete_retreat(db: Session, retreat_id: int) -> None:
    retreat = db.query(RetreatCustom).filter(RetreatCustom.retreat_custom_id == retreat_id).first()
    if not retreat:
        raise NotFoundError("수련회를 찾을 수 없습니다.")
    retreat.is_active = 0
    db.commit()


def delete_bus(db: Session, bus_id: int) -> None:
    bus = db.query(BusCustom).filter(BusCustom.bus_id == bus_id).first()
    if not bus:
        raise NotFoundError("버스를 찾을 수 없습니다.")
    db.delete(bus)
    db.commit()


# ── 교구 목록 ─────────────────────────────────────────────────────────────────

def get_distinct_gyogu_list(db: Session) -> List[int]:
    """삭제되지 않은 회원의 최신 프로필 기준으로 존재하는 교구 번호 목록 반환."""
    latest_sq = (
        db.query(MemberProfile.member_id, func.max(MemberProfile.profile_id).label("max_id"))
        .group_by(MemberProfile.member_id)
        .subquery()
    )
    rows = (
        db.query(MemberProfile.gyogu)
        .join(latest_sq, MemberProfile.profile_id == latest_sq.c.max_id)
        .join(Member, Member.member_id == MemberProfile.member_id)
        .filter(Member.deleted_at.is_(None))
        .filter(MemberProfile.gyogu.isnot(None))
        .distinct()
        .order_by(MemberProfile.gyogu)
        .all()
    )
    return [r.gyogu for r in rows]


# ── 인원조사 ──────────────────────────────────────────────────────────────────

def _latest_profile_subquery(db: Session):
    return (
        db.query(MemberProfile.member_id, func.max(MemberProfile.profile_id).label("max_id"))
        .group_by(MemberProfile.member_id)
        .subquery()
    )


def get_research_members(
    db: Session,
    retreat_id: int,
    data_scope: str,
    gyogu: Optional[int],
    team: Optional[int],
    group_no: Optional[int],
    query_group_no: Optional[int] = None,
    query_gyogu: Optional[int] = None,
    query_team: Optional[int] = None,
) -> List[Tuple]:
    latest_sq = _latest_profile_subquery(db)
    q = (
        db.query(Member, MemberProfile, RetreatResponse)
        .join(latest_sq, Member.member_id == latest_sq.c.member_id)
        .join(MemberProfile, MemberProfile.profile_id == latest_sq.c.max_id)
        .outerjoin(
            RetreatResponse,
            (RetreatResponse.member_id == Member.member_id) &
            (RetreatResponse.retreat_custom_id == retreat_id),
        )
        .filter(Member.deleted_at.is_(None))
    )
    if data_scope == "team":
        if gyogu is not None:
            q = q.filter(MemberProfile.gyogu == gyogu)
        q = q.filter(MemberProfile.team == team)
        if query_group_no is not None:
            q = q.filter(MemberProfile.group_no == query_group_no)
    elif data_scope == "group":
        if gyogu is not None:
            q = q.filter(MemberProfile.gyogu == gyogu)
        if team is not None:
            q = q.filter(MemberProfile.team == team)
        q = q.filter(MemberProfile.group_no == group_no)
    elif data_scope == "all":
        if query_gyogu is not None:
            q = q.filter(MemberProfile.gyogu == query_gyogu)
        if query_team is not None:
            q = q.filter(MemberProfile.team == query_team)
        if query_group_no is not None:
            q = q.filter(MemberProfile.group_no == query_group_no)
    return (
        q.order_by(MemberProfile.gyogu, MemberProfile.team, MemberProfile.group_no, Member.name)
        .all()
    )


def get_research_member_list(
    db: Session,
    retreat_id: int,
    gyogu: Optional[int] = None,
    team: Optional[int] = None,
) -> List[Tuple]:
    """관리자용 인원조사 명단 — data_scope 없이 전체 조회."""
    latest_sq = _latest_profile_subquery(db)
    q = (
        db.query(Member, MemberProfile, RetreatResponse)
        .join(latest_sq, Member.member_id == latest_sq.c.member_id)
        .join(MemberProfile, MemberProfile.profile_id == latest_sq.c.max_id)
        .outerjoin(
            RetreatResponse,
            (RetreatResponse.member_id == Member.member_id) &
            (RetreatResponse.retreat_custom_id == retreat_id),
        )
        .filter(Member.deleted_at.is_(None))
    )
    if gyogu is not None:
        q = q.filter(MemberProfile.gyogu == gyogu)
    if team is not None:
        q = q.filter(MemberProfile.team == team)
    return (
        q.order_by(MemberProfile.gyogu, MemberProfile.team, MemberProfile.group_no, Member.name)
        .all()
    )


def upsert_research_response(
    db: Session, retreat_id: int, member_id: int, body: ResearchResponseUpdate
) -> None:
    existing = (
        db.query(RetreatResponse)
        .filter(
            RetreatResponse.retreat_custom_id == retreat_id,
            RetreatResponse.member_id == member_id,
        )
        .first()
    )
    if existing:
        existing.day1_attendance = body.day1_attendance
        existing.day2_attendance = body.day2_attendance
        existing.day3_attendance = body.day3_attendance
        existing.day4_attendance = body.day4_attendance
        existing.fee_type = body.fee_type
    else:
        db.add(RetreatResponse(
            retreat_custom_id=retreat_id,
            member_id=member_id,
            day1_attendance=body.day1_attendance,
            day2_attendance=body.day2_attendance,
            day3_attendance=body.day3_attendance,
            day4_attendance=body.day4_attendance,
            fee_type=body.fee_type,
        ))
    db.commit()


# ── 차량조사 ──────────────────────────────────────────────────────────────────

def get_vehicle_member_list(
    db: Session,
    retreat_id: int,
    gyogu: Optional[int] = None,
    team: Optional[int] = None,
) -> List[Tuple]:
    """관리자용 차량조사 명단 — 전체 멤버 + 차량응답 outerjoin."""
    latest_sq = _latest_profile_subquery(db)
    q = (
        db.query(Member, MemberProfile, RetreatResponse)
        .join(latest_sq, Member.member_id == latest_sq.c.member_id)
        .join(MemberProfile, MemberProfile.profile_id == latest_sq.c.max_id)
        .outerjoin(
            RetreatResponse,
            (RetreatResponse.member_id == Member.member_id) &
            (RetreatResponse.retreat_custom_id == retreat_id),
        )
        .filter(Member.deleted_at.is_(None))
    )
    if gyogu is not None:
        q = q.filter(MemberProfile.gyogu == gyogu)
    if team is not None:
        q = q.filter(MemberProfile.team == team)
    return (
        q.order_by(MemberProfile.gyogu, MemberProfile.team, MemberProfile.group_no, Member.name)
        .all()
    )


def count_day1_normal(db: Session, retreat_id: int) -> int:
    """인원조사에서 첫째날 '정상'을 선택한 멤버 수."""
    return (
        db.query(RetreatResponse)
        .filter(
            RetreatResponse.retreat_custom_id == retreat_id,
            RetreatResponse.day1_attendance == '정상',
        )
        .count()
    )


def get_vehicle_responses(db: Session, retreat_id: int) -> List[RetreatResponse]:
    """차량 제출 완료(bus_created_at not null)된 응답 전체 반환."""
    return (
        db.query(RetreatResponse)
        .filter(
            RetreatResponse.retreat_custom_id == retreat_id,
            RetreatResponse.bus_created_at.isnot(None),
        )
        .all()
    )


def get_vehicle_response(
    db: Session, retreat_id: int, member_id: int
) -> Optional[RetreatResponse]:
    return (
        db.query(RetreatResponse)
        .filter(
            RetreatResponse.retreat_custom_id == retreat_id,
            RetreatResponse.member_id == member_id,
        )
        .first()
    )


def get_member_with_profile(
    db: Session, member_id: int
) -> Tuple[Optional[Member], Optional[MemberProfile]]:
    latest_sq = _latest_profile_subquery(db)
    row = (
        db.query(Member, MemberProfile)
        .join(latest_sq, Member.member_id == latest_sq.c.member_id)
        .join(MemberProfile, MemberProfile.profile_id == latest_sq.c.max_id)
        .filter(Member.member_id == member_id)
        .first()
    )
    if row:
        return row[0], row[1]
    member = db.query(Member).filter(Member.member_id == member_id).first()
    return member, None


def upsert_vehicle_response(
    db: Session, retreat_id: int, member_id: int, body: VehicleSubmitBody
) -> None:
    existing = get_vehicle_response(db, retreat_id, member_id)
    now = now_kst()
    if existing:
        existing.day1_bus = json.dumps(body.day1_bus)
        existing.day2_bus = json.dumps(body.day2_bus)
        existing.day3_bus = json.dumps(body.day3_bus)
        existing.day4_bus = json.dumps(body.day4_bus)
        if existing.bus_created_at is None:
            existing.bus_created_at = now
        existing.bus_updated_at = now
    else:
        db.add(RetreatResponse(
            retreat_custom_id=retreat_id,
            member_id=member_id,
            day1_bus=json.dumps(body.day1_bus),
            day2_bus=json.dumps(body.day2_bus),
            day3_bus=json.dumps(body.day3_bus),
            day4_bus=json.dumps(body.day4_bus),
            bus_created_at=now,
            bus_updated_at=now,
        ))
    db.commit()


# ── 서스펜디드밀 ───────────────────────────────────────────────────────────────

def get_suspended_meal_members(
    db: Session,
    data_scope: str,
    gyogu: Optional[int],
    team: Optional[int],
    group_no: Optional[int],
    query_gyogu: Optional[int] = None,
    query_team: Optional[int] = None,
) -> List[Tuple]:
    latest_sq = _latest_profile_subquery(db)
    q = (
        db.query(Member, MemberProfile, SuspendedMealApplication)
        .join(latest_sq, Member.member_id == latest_sq.c.member_id)
        .join(MemberProfile, MemberProfile.profile_id == latest_sq.c.max_id)
        .outerjoin(SuspendedMealApplication, SuspendedMealApplication.member_id == Member.member_id)
        .filter(Member.deleted_at.is_(None))
    )
    if data_scope == "team":
        if gyogu is not None:
            q = q.filter(MemberProfile.gyogu == gyogu)
        q = q.filter(MemberProfile.team == team)
    elif data_scope == "group":
        if gyogu is not None:
            q = q.filter(MemberProfile.gyogu == gyogu)
        if team is not None:
            q = q.filter(MemberProfile.team == team)
        q = q.filter(MemberProfile.group_no == group_no)
    elif data_scope == "all":
        if query_gyogu is not None:
            q = q.filter(MemberProfile.gyogu == query_gyogu)
        if query_team is not None:
            q = q.filter(MemberProfile.team == query_team)
    return (
        q.order_by(MemberProfile.gyogu, MemberProfile.team, MemberProfile.group_no, Member.name)
        .all()
    )


def get_admin_suspended_meal_list(
    db: Session,
    review_status: Optional[str],
    page: int,
    size: int,
):
    q = (
        db.query(SuspendedMealApplication, Member)
        .join(Member, Member.member_id == SuspendedMealApplication.member_id)
    )
    if review_status in ('PENDING', 'APPROVED', 'REJECTED'):
        q = q.filter(SuspendedMealApplication.review_status == review_status)

    total = q.count()
    items = (
        q.order_by(SuspendedMealApplication.applied_at.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    return total, items


def get_admin_suspended_meal_stats(db: Session):
    total    = db.query(SuspendedMealApplication).count()
    pending  = db.query(SuspendedMealApplication).filter(SuspendedMealApplication.review_status == 'PENDING').count()
    approved = db.query(SuspendedMealApplication).filter(SuspendedMealApplication.review_status == 'APPROVED').count()
    rejected = db.query(SuspendedMealApplication).filter(SuspendedMealApplication.review_status == 'REJECTED').count()
    return total, pending, approved, rejected


def review_suspended_meal(
    db: Session, application_id: int, review_status: str, review_comment: str
) -> SuspendedMealApplication:
    app = (
        db.query(SuspendedMealApplication)
        .filter(SuspendedMealApplication.application_id == application_id)
        .first()
    )
    if not app:
        raise NotFoundError("신청을 찾을 수 없습니다.")
    app.review_status  = review_status
    app.review_comment = review_comment
    app.reviewed_at    = now_kst()
    db.commit()
    return app


def upsert_suspended_meal(
    db: Session, member_id: int, body: SuspendedMealSubmitBody
) -> None:
    existing = (
        db.query(SuspendedMealApplication)
        .filter(SuspendedMealApplication.member_id == member_id)
        .first()
    )
    is_empty = body.meal_count == 0 and not body.fee_support
    if existing:
        if existing.review_status in ("APPROVED", "REJECTED"):
            raise ConflictError("이미 처리된 신청은 수정할 수 없습니다.")
        if is_empty:
            db.delete(existing)
        else:
            existing.meal_count = body.meal_count
            existing.fee_support = 1 if body.fee_support else 0
            existing.applicant_reason = body.applicant_reason
    elif not is_empty:
        db.add(SuspendedMealApplication(
            member_id=member_id,
            meal_count=body.meal_count,
            fee_support=1 if body.fee_support else 0,
            applicant_reason=body.applicant_reason,
            applied_at=now_kst(),
        ))
    db.commit()
