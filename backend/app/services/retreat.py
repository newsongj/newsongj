"""수련회 비즈니스 로직 — CRUD 호출 후 응답 스키마 변환."""
import datetime
import json
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models import BusCustom
from app.schemas.retreat import (
    BusCreate, BusIdResponse, BusResponse,
    RetreatCreate, RetreatUpdate,
    RetreatCreateResponse, RetreatActiveResponse,
    ResearchMemberResponse, ResearchResponseItem, ResearchResponseUpdate,
    ResearchListItem, ResearchListResponse,
    VehicleListBusInfo, VehicleMemberListItem, VehicleMemberListResponse,
    BusDashboardItem, VehicleDashboardResponse,
    RetreatDayHeadcount, RetreatHeadcountResponse,
    RetreatAccommodationDayData, RetreatAccommodationResponse,
    VehicleMyResponse, VehicleSubmitBody,
    SuspendedMealMemberResponse, SuspendedMealApplicationItem, SuspendedMealSubmitBody,
    AdminSuspendedMealItem, AdminSuspendedMealListResponse,
    AdminSuspendedMealStats, AdminSuspendedMealReviewRequest,
)
from app.crud.retreat import (
    get_active_retreat as crud_get_active_retreat,
    get_buses_for_retreat as crud_get_buses_for_retreat,
    create_retreat as crud_create_retreat,
    update_retreat as crud_update_retreat,
    complete_retreat as crud_complete_retreat,
    create_bus as crud_create_bus,
    delete_bus as crud_delete_bus,
    get_research_members as crud_get_research_members,
    get_research_member_list as crud_get_research_member_list,
    upsert_research_response as crud_upsert_research_response,
    get_vehicle_member_list as crud_get_vehicle_member_list,
    get_vehicle_responses as crud_get_vehicle_responses,
    count_day1_normal as crud_count_day1_normal,
    get_vehicle_response as crud_get_vehicle_response,
    get_member_with_profile as crud_get_member_with_profile,
    upsert_vehicle_response as crud_upsert_vehicle_response,
    get_suspended_meal_members as crud_get_suspended_meal_members,
    upsert_suspended_meal as crud_upsert_suspended_meal,
    get_admin_suspended_meal_list as crud_get_admin_suspended_meal_list,
    get_admin_suspended_meal_stats as crud_get_admin_suspended_meal_stats,
    review_suspended_meal as crud_review_suspended_meal,
)
from app.core.exceptions import NotFoundError


def _time_to_hhmm(t) -> str:
    """SQLAlchemy TIME → 'HH:MM' 문자열 변환. pymysql은 timedelta로 반환할 수 있음."""
    if isinstance(t, datetime.timedelta):
        total = int(t.total_seconds())
        h, rem = divmod(total, 3600)
        m = rem // 60
        return f"{h:02d}:{m:02d}"
    if isinstance(t, datetime.time):
        return t.strftime('%H:%M')
    return str(t)[:5]


def _bus_to_response(bus: BusCustom) -> BusResponse:
    return BusResponse(
        bus_id=bus.bus_id,
        bus_name=bus.bus_name,
        seat_count=bus.seat_count,
        departure_date=bus.departure_date,
        departure_time=_time_to_hhmm(bus.departure_time),
        departure_place=bus.departure_place,
        arrival_place=bus.arrival_place,
    )


def svc_get_active_retreat(db: Session) -> RetreatActiveResponse:
    retreat = crud_get_active_retreat(db)
    if not retreat:
        raise NotFoundError("활성 수련회가 없습니다.")
    buses = crud_get_buses_for_retreat(db, retreat)
    return RetreatActiveResponse(
        retreat_id=retreat.retreat_custom_id,
        retreat_name=retreat.retreat_name,
        start_date=retreat.start_date,
        end_date=retreat.end_date,
        fee_with_bus=retreat.fee_with_bus,
        fee_without_bus=retreat.fee_without_bus,
        meal_price=retreat.meal_price,
        suspended_meal_count=retreat.suspended_meal_count,
        buses=[_bus_to_response(b) for b in buses],
    )


def svc_create_retreat(db: Session, body: RetreatCreate) -> RetreatCreateResponse:
    retreat = crud_create_retreat(db, body)
    return RetreatCreateResponse(
        retreat_id=retreat.retreat_custom_id,
        retreat_name=retreat.retreat_name,
        start_date=retreat.start_date,
        end_date=retreat.end_date,
        fee_with_bus=retreat.fee_with_bus,
        fee_without_bus=retreat.fee_without_bus,
        meal_price=retreat.meal_price,
        suspended_meal_count=retreat.suspended_meal_count,
    )


def svc_update_retreat(db: Session, retreat_id: int, body: RetreatUpdate) -> None:
    crud_update_retreat(db, retreat_id, body)


def svc_create_bus(db: Session, body: BusCreate) -> BusIdResponse:
    bus = crud_create_bus(db, body)
    return BusIdResponse(bus_id=bus.bus_id)


def svc_complete_retreat(db: Session, retreat_id: int) -> None:
    crud_complete_retreat(db, retreat_id)


def svc_delete_bus(db: Session, bus_id: int) -> None:
    crud_delete_bus(db, bus_id)


# ── 인원조사 ──────────────────────────────────────────────────────────────────

def svc_get_research_members(
    db: Session,
    data_scope: str,
    team: Optional[int],
    group_no: Optional[int],
    query_group_no: Optional[int],
) -> List[ResearchMemberResponse]:
    retreat = crud_get_active_retreat(db)
    if not retreat:
        raise NotFoundError("활성 수련회가 없습니다.")
    rows = crud_get_research_members(db, retreat.retreat_custom_id, data_scope, team, group_no, query_group_no)
    result = []
    for member, profile, response in rows:
        result.append(ResearchMemberResponse(
            member_id=member.member_id,
            name=member.name,
            generation=member.generation,
            gender=member.gender,
            gyogu=profile.gyogu,
            team=profile.team,
            group_no=profile.group_no,
            response=ResearchResponseItem(
                day1_attendance=response.day1_attendance,
                day2_attendance=response.day2_attendance,
                day3_attendance=response.day3_attendance,
                day4_attendance=response.day4_attendance,
                fee_type=response.fee_type,
            ) if response else None,
        ))
    return result


def svc_get_research_list(
    db: Session,
    gyogu: Optional[int],
    team: Optional[int],
    survey_status: Optional[str],
) -> ResearchListResponse:
    retreat = crud_get_active_retreat(db)
    if not retreat:
        raise NotFoundError("활성 수련회가 없습니다.")
    num_days = (retreat.end_date - retreat.start_date).days
    rows = crud_get_research_member_list(db, retreat.retreat_custom_id, gyogu, team)

    enrolled = len(rows)
    surveyed = sum(1 for _, _, r in rows if r is not None)
    fee_paid = sum(1 for _, _, r in rows if r is not None and r.fee_type is not None)

    if survey_status == 'done':
        rows = [(m, p, r) for m, p, r in rows if r is not None]
    elif survey_status == 'pending':
        rows = [(m, p, r) for m, p, r in rows if r is None]

    members = [
        ResearchListItem(
            member_id=member.member_id,
            member_name=member.name,
            generation=member.generation,
            gender=member.gender,
            gyogu=profile.gyogu,
            team=profile.team,
            group_no=profile.group_no,
            has_response=response is not None,
            day1_attendance=response.day1_attendance if response else None,
            day2_attendance=response.day2_attendance if response else None,
            day3_attendance=response.day3_attendance if response else None,
            day4_attendance=response.day4_attendance if response else None,
            fee_type=response.fee_type if response else None,
        )
        for member, profile, response in rows
    ]
    return ResearchListResponse(
        fee_with_bus=retreat.fee_with_bus,
        fee_without_bus=retreat.fee_without_bus,
        enrolled=enrolled,
        surveyed=surveyed,
        fee_paid=fee_paid,
        num_days=num_days,
        members=members,
    )


def svc_upsert_research_response(
    db: Session, member_id: int, body: ResearchResponseUpdate
) -> None:
    retreat = crud_get_active_retreat(db)
    if not retreat:
        raise NotFoundError("활성 수련회가 없습니다.")
    crud_upsert_research_response(db, retreat.retreat_custom_id, member_id, body)


# ── 차량조사 ──────────────────────────────────────────────────────────────────

def svc_get_vehicle_dashboard(db: Session) -> VehicleDashboardResponse:
    retreat = crud_get_active_retreat(db)
    if not retreat:
        raise NotFoundError("활성 수련회가 없습니다.")
    num_days = (retreat.end_date - retreat.start_date).days
    buses = crud_get_buses_for_retreat(db, retreat)
    responses = crud_get_vehicle_responses(db, retreat.retreat_custom_id)

    def _parse_ids(raw: Optional[str]) -> List[int]:
        if not raw:
            return []
        try:
            return json.loads(raw)
        except (ValueError, TypeError):
            return []

    passenger_counts: dict[int, int] = {bus.bus_id: 0 for bus in buses}
    for resp in responses:
        day_raws = [resp.day1_bus, resp.day2_bus, resp.day3_bus, resp.day4_bus]
        for raw in day_raws:
            for bus_id in _parse_ids(raw):
                if bus_id in passenger_counts:
                    passenger_counts[bus_id] += 1

    normal_depart = crud_count_day1_normal(db, retreat.retreat_custom_id)

    return VehicleDashboardResponse(
        retreat_start_date=retreat.start_date,
        normal_depart=normal_depart,
        num_days=num_days,
        buses=[
            BusDashboardItem(
                bus_id=bus.bus_id,
                bus_name=bus.bus_name,
                departure_date=bus.departure_date,
                departure_time=_time_to_hhmm(bus.departure_time),
                passenger_count=passenger_counts.get(bus.bus_id, 0),
                seat_count=bus.seat_count,
            )
            for bus in buses
        ],
    )


def svc_get_headcount(db: Session) -> RetreatHeadcountResponse:
    retreat = crud_get_active_retreat(db)
    if not retreat:
        raise NotFoundError("활성 수련회가 없습니다.")
    num_days = (retreat.end_date - retreat.start_date).days
    rows = crud_get_research_member_list(db, retreat.retreat_custom_id)

    # enrolled = group_no != 0 멤버 수 (진행율 분모)
    enrolled = sum(1 for _, p, _ in rows if p.group_no != 0)
    # surveyed = 응답한 멤버 수 (group_no=0 포함)
    surveyed = sum(1 for _, _, r in rows if r is not None)

    _ATTENDING = {'정상', '참석', '후발'}
    _att_map = {'미정': 'undecided', '불참': 'absent', '정상': 'normal', '참석': 'attend', '후발': 'late'}

    def _is_attending(r) -> bool:
        if r is None:
            return False
        for n in range(1, num_days + 1):
            if getattr(r, f'day{n}_attendance', None) in _ATTENDING:
                return True
        return False

    attending = [(m, p, r) for m, p, r in rows if _is_attending(r)]
    total  = len(attending)
    male   = sum(1 for m, _, _ in attending if m.gender == '남')
    female = total - male

    def _day_stats(day_n: int) -> RetreatDayHeadcount:
        c = dict(total=0, undecided=0, absent=0, normal=0, attend=0, late=0)
        for _, _, r in rows:
            if r is None:
                continue
            v = getattr(r, f'day{day_n}_attendance', None)
            if v is None:
                continue
            c['total'] += 1
            key = _att_map.get(v)
            if key:
                c[key] += 1
        return RetreatDayHeadcount(**c)

    days = [_day_stats(n) for n in range(1, num_days + 1)]

    return RetreatHeadcountResponse(
        enrolled=enrolled,
        surveyed=surveyed,
        total=total,
        male=male,
        female=female,
        num_days=num_days,
        days=days,
    )


def svc_get_accommodation(
    db: Session,
    gyogu_no: Optional[int],
    team_no: Optional[int],
) -> RetreatAccommodationResponse:
    retreat = crud_get_active_retreat(db)
    if not retreat:
        raise NotFoundError("활성 수련회가 없습니다.")
    num_days = (retreat.end_date - retreat.start_date).days
    rows = crud_get_research_member_list(db, retreat.retreat_custom_id, gyogu_no, team_no)
    responded = [(m, p, r) for m, p, r in rows if r is not None]

    def _stays_night(r, night_n: int) -> bool:
        """Night N: dayN 출석 AND (마지막 밤이 아닌 경우) day(N+1) 출석."""
        day_att = getattr(r, f'day{night_n}_attendance', None)
        first_day_vals = {'정상', '참석', '후발'}
        other_day_vals = {'참석', '후발'}
        present = day_att in (first_day_vals if night_n == 1 else other_day_vals)
        if not present:
            return False
        if night_n >= num_days:
            return True
        next_att = getattr(r, f'day{night_n + 1}_attendance', None)
        return next_att in other_day_vals

    def _night_data(night_n: int) -> RetreatAccommodationDayData:
        present = [(m, p, r) for m, p, r in responded if _stays_night(r, night_n)]
        total = len(present)
        male  = sum(1 for m, _, _ in present if m.gender == '남')
        return RetreatAccommodationDayData(total=total, male=male, female=total - male)

    days = [_night_data(n) for n in range(1, num_days + 1)]
    return RetreatAccommodationResponse(days=days)


def svc_get_vehicle_member_list(
    db: Session,
    gyogu: Optional[int],
    team: Optional[int],
) -> List[VehicleMemberListItem]:
    retreat = crud_get_active_retreat(db)
    if not retreat:
        raise NotFoundError("활성 수련회가 없습니다.")
    buses = crud_get_buses_for_retreat(db, retreat)
    bus_map = {
        bus.bus_id: (bus.bus_name, _time_to_hhmm(bus.departure_time))
        for bus in buses
    }
    rows = crud_get_vehicle_member_list(db, retreat.retreat_custom_id, gyogu, team)

    def _resolve_buses(raw: Optional[str], has_resp: bool) -> Optional[List[VehicleListBusInfo]]:
        if not has_resp:
            return None
        if not raw:
            return []
        try:
            ids = json.loads(raw)
        except (ValueError, TypeError):
            return []
        infos = []
        for bus_id in ids:
            entry = bus_map.get(bus_id)
            if entry:
                infos.append(VehicleListBusInfo(bus_name=entry[0], departure_time=entry[1]))
        return infos

    num_days = (retreat.end_date - retreat.start_date).days
    result = []
    for member, profile, response in rows:
        has_response = response is not None and response.bus_created_at is not None
        result.append(VehicleMemberListItem(
            member_id=member.member_id,
            member_name=member.name,
            generation=member.generation,
            gender=member.gender,
            gyogu=profile.gyogu,
            team=profile.team,
            group_no=profile.group_no,
            has_response=has_response,
            day1_bus=_resolve_buses(response.day1_bus if response else None, has_response),
            day2_bus=_resolve_buses(response.day2_bus if response else None, has_response),
            day3_bus=_resolve_buses(response.day3_bus if response else None, has_response),
            day4_bus=_resolve_buses(response.day4_bus if response else None, has_response),
        ))
    return VehicleMemberListResponse(num_days=num_days, members=result)


def svc_get_vehicle_my(db: Session, member_id: int) -> VehicleMyResponse:
    retreat = crud_get_active_retreat(db)
    if not retreat:
        raise NotFoundError("활성 수련회가 없습니다.")
    member, profile = crud_get_member_with_profile(db, member_id)
    if not member:
        raise NotFoundError("멤버를 찾을 수 없습니다.")
    response = crud_get_vehicle_response(db, retreat.retreat_custom_id, member_id)

    def _parse_bus(raw: Optional[str]) -> List[int]:
        if not raw:
            return []
        try:
            return json.loads(raw)
        except (ValueError, TypeError):
            return []

    return VehicleMyResponse(
        member_id=member.member_id,
        name=member.name,
        gyogu=profile.gyogu if profile else None,
        team=profile.team if profile else None,
        phone=member.phone_number,
        day1_bus=_parse_bus(response.day1_bus) if response else [],
        day2_bus=_parse_bus(response.day2_bus) if response else [],
        day3_bus=_parse_bus(response.day3_bus) if response else [],
        day4_bus=_parse_bus(response.day4_bus) if response else [],
        submitted_at=response.bus_updated_at or response.bus_created_at if response else None,
    )


def svc_submit_vehicle(db: Session, member_id: int, body: VehicleSubmitBody) -> None:
    retreat = crud_get_active_retreat(db)
    if not retreat:
        raise NotFoundError("활성 수련회가 없습니다.")
    crud_upsert_vehicle_response(db, retreat.retreat_custom_id, member_id, body)


# ── 서스펜디드밀 ───────────────────────────────────────────────────────────────

def svc_get_suspended_meal_members(
    db: Session,
    data_scope: str,
    team: Optional[int],
    group_no: Optional[int],
) -> List[SuspendedMealMemberResponse]:
    retreat = crud_get_active_retreat(db)
    if not retreat:
        raise NotFoundError("활성 수련회가 없습니다.")
    rows = crud_get_suspended_meal_members(db, data_scope, team, group_no)
    result = []
    for member, profile, app in rows:
        app_item = None
        if app:
            status = app.review_status if app.review_status else "PENDING"
            app_item = SuspendedMealApplicationItem(
                application_id=app.application_id,
                meal_count=app.meal_count,
                fee_support=bool(app.fee_support),
                applicant_reason=app.applicant_reason,
                applied_at=app.applied_at.isoformat() if app.applied_at else "",
                review_status=status,
                review_comment=app.review_comment,
                reviewed_at=app.reviewed_at.isoformat() if app.reviewed_at else None,
            )
        result.append(SuspendedMealMemberResponse(
            member_id=member.member_id,
            name=member.name,
            generation=member.generation,
            gender=member.gender,
            gyogu=profile.gyogu,
            team=profile.team,
            group_no=profile.group_no,
            application=app_item,
        ))
    return result


def svc_upsert_suspended_meal(
    db: Session, member_id: int, body: SuspendedMealSubmitBody
) -> None:
    crud_upsert_suspended_meal(db, member_id, body)


# ── 서스펜디드밀 관리자 ──────────────────────────────────────────────────────────

def svc_get_admin_suspended_meal_list(
    db: Session,
    review_status: Optional[str],
    page: int,
    size: int,
) -> AdminSuspendedMealListResponse:
    total, rows = crud_get_admin_suspended_meal_list(db, review_status, page, size)
    items = [
        AdminSuspendedMealItem(
            application_id=app.application_id,
            member_id=app.member_id,
            member_name=member.name,
            meal_count=app.meal_count,
            fee_support=bool(app.fee_support),
            applicant_reason=app.applicant_reason,
            applied_at=app.applied_at.isoformat() if app.applied_at else "",
            review_status=app.review_status if app.review_status else "PENDING",
            review_comment=app.review_comment,
            reviewed_at=app.reviewed_at.isoformat() if app.reviewed_at else None,
        )
        for app, member in rows
    ]
    return AdminSuspendedMealListResponse(items=items, total=total)


def svc_get_admin_suspended_meal_stats(db: Session) -> AdminSuspendedMealStats:
    total, pending, approved, rejected = crud_get_admin_suspended_meal_stats(db)
    return AdminSuspendedMealStats(total=total, pending=pending, approved=approved, rejected=rejected)


def svc_review_suspended_meal(
    db: Session, application_id: int, body: AdminSuspendedMealReviewRequest
) -> None:
    crud_review_suspended_meal(db, application_id, body.review_status, body.review_comment)
