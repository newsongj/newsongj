"""수련회 비즈니스 로직 — CRUD 호출 후 응답 스키마 변환."""
import datetime
import json
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models import BusCustom, BusWaiting, MemberProfile
from sqlalchemy import func as sa_func
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
    VehicleMyResponse, VehicleSubmitBody, VehicleSubmitResponse, FullBusInfo, WaitingBusInfo,
    SuspendedMealMemberResponse, SuspendedMealApplicationItem, SuspendedMealSubmitBody,
    AdminSuspendedMealItem, AdminSuspendedMealListResponse,
    AdminSuspendedMealStats, AdminSuspendedMealReviewRequest,
    FeePaidUpdate,
    PatientRoomSubmitBody, PatientRoomMemberResponse, PatientRoomApplicationItem,
    AdminPatientRoomItem, AdminPatientRoomListResponse, AdminPatientRoomStats, AdminPatientRoomReviewRequest,
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
    get_full_buses as crud_get_full_buses,
    upsert_bus_waiting as crud_upsert_bus_waiting,
    get_bus_waiting_list as crud_get_bus_waiting_list,
    register_bus_selections as crud_register_bus_selections,
    get_bus_registration_list as crud_get_bus_registration_list,
    promote_from_waiting as crud_promote_from_waiting,
    cancel_waiting_not_in as crud_cancel_waiting_not_in,
    get_suspended_meal_members as crud_get_suspended_meal_members,
    upsert_suspended_meal as crud_upsert_suspended_meal,
    get_admin_suspended_meal_list as crud_get_admin_suspended_meal_list,
    get_admin_suspended_meal_stats as crud_get_admin_suspended_meal_stats,
    review_suspended_meal as crud_review_suspended_meal,
    update_fee_paid as crud_update_fee_paid,
    get_patient_room_members as crud_get_patient_room_members,
    upsert_patient_room as crud_upsert_patient_room,
    get_admin_patient_room_list as crud_get_admin_patient_room_list,
    get_admin_patient_room_stats as crud_get_admin_patient_room_stats,
    review_patient_room as crud_review_patient_room,
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
        special_meal_name=retreat.special_meal_name,
        special_meal_price=retreat.special_meal_price,
        personal_vehicle_url=retreat.personal_vehicle_url,
        is_research_open=bool(retreat.is_research_open),
        is_vehicle_open=bool(retreat.is_vehicle_open),
        is_suspended_meal_open=bool(retreat.is_suspended_meal_open),
        is_patient_room_open=bool(retreat.is_patient_room_open),
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
        special_meal_name=retreat.special_meal_name,
        special_meal_price=retreat.special_meal_price,
        personal_vehicle_url=retreat.personal_vehicle_url,
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
    gyogu: Optional[int],
    team: Optional[int],
    group_no: Optional[int],
    query_group_no: Optional[int],
    query_gyogu: Optional[int] = None,
    query_team: Optional[int] = None,
) -> List[ResearchMemberResponse]:
    retreat = crud_get_active_retreat(db)
    if not retreat:
        raise NotFoundError("활성 수련회가 없습니다.")
    rows = crud_get_research_members(
        db, retreat.retreat_custom_id, data_scope, gyogu, team, group_no,
        query_group_no, query_gyogu, query_team,
    )
    def _research_item(r):
        if r is None:
            return None
        if not any([r.day1_attendance, r.day2_attendance, r.day3_attendance, r.day4_attendance]):
            return None
        return ResearchResponseItem(
            day1_attendance=r.day1_attendance,
            day2_attendance=r.day2_attendance,
            day3_attendance=r.day3_attendance,
            day4_attendance=r.day4_attendance,
            fee_type=r.fee_type,
        )

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
            is_fee_paid=bool(response.is_fee_paid) if response else False,
            response=_research_item(response),
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
    num_days = (retreat.end_date - retreat.start_date).days + 1
    rows = crud_get_research_member_list(db, retreat.retreat_custom_id, gyogu, team)

    def _has_research(r) -> bool:
        return r is not None and any([
            r.day1_attendance, r.day2_attendance, r.day3_attendance, r.day4_attendance,
        ])

    enrolled = len(rows)
    surveyed = sum(1 for _, _, r in rows if _has_research(r))
    fee_paid = sum(1 for _, _, r in rows if r is not None and r.fee_type is not None)

    if survey_status == 'done':
        rows = [(m, p, r) for m, p, r in rows if _has_research(r)]
    elif survey_status == 'pending':
        rows = [(m, p, r) for m, p, r in rows if not _has_research(r)]

    members = [
        ResearchListItem(
            member_id=member.member_id,
            member_name=member.name,
            generation=member.generation,
            gender=member.gender,
            gyogu=profile.gyogu,
            team=profile.team,
            group_no=profile.group_no,
            has_response=_has_research(response),
            day1_attendance=response.day1_attendance if response else None,
            day2_attendance=response.day2_attendance if response else None,
            day3_attendance=response.day3_attendance if response else None,
            day4_attendance=response.day4_attendance if response else None,
            fee_type=response.fee_type if response else None,
            is_fee_paid=bool(response.is_fee_paid) if response else False,
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
    num_days = (retreat.end_date - retreat.start_date).days + 1
    rows = crud_get_research_member_list(db, retreat.retreat_custom_id)

    def _has_research_hc(r) -> bool:
        return r is not None and any([
            r.day1_attendance, r.day2_attendance, r.day3_attendance, r.day4_attendance,
        ])

    # enrolled = group_no != 0 멤버 수 (진행율 분모)
    enrolled = sum(1 for _, p, _ in rows if p.group_no != 0)
    # surveyed = 응답한 멤버 수 (group_no=0 포함)
    surveyed = sum(1 for _, _, r in rows if _has_research_hc(r))

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
    bus_id: Optional[int] = None,
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

    def _has_any_bus(r) -> bool:
        if r is None or r.bus_created_at is None:
            return False
        for key in ('day1_bus', 'day2_bus', 'day3_bus', 'day4_bus'):
            raw = getattr(r, key, None)
            try:
                if raw and json.loads(raw):
                    return True
            except (ValueError, TypeError):
                pass
        return False

    num_days = (retreat.end_date - retreat.start_date).days + 1

    # 단일 버스 필터 시 registered_at 조회용 맵 생성
    reg_map: dict[int, str] = {}
    if bus_id:
        for reg in crud_get_bus_registration_list(db, bus_id):
            reg_map[reg.member_id] = reg.registered_at.strftime("%Y-%m-%dT%H:%M:%S")

    result = []
    confirmed_ids: set[int] = set()

    for member, profile, response in rows:
        has_response = _has_any_bus(response)

        if bus_id:
            # 해당 버스 확정 탑승자만 포함
            is_confirmed = False
            if response:
                for col in ('day1_bus', 'day2_bus', 'day3_bus', 'day4_bus'):
                    try:
                        if bus_id in json.loads(getattr(response, col) or '[]'):
                            is_confirmed = True
                            break
                    except (ValueError, TypeError):
                        pass
            if not is_confirmed:
                continue
            confirmed_ids.add(member.member_id)

        result.append(VehicleMemberListItem(
            member_id=member.member_id,
            member_name=member.name,
            generation=member.generation,
            gender=member.gender,
            gyogu=profile.gyogu,
            team=profile.team,
            group_no=profile.group_no,
            phone=member.phone_number,
            has_response=has_response,
            registered_at=reg_map.get(member.member_id) if bus_id else None,
            day1_bus=_resolve_buses(response.day1_bus if response else None, has_response),
            day2_bus=_resolve_buses(response.day2_bus if response else None, has_response),
            day3_bus=_resolve_buses(response.day3_bus if response else None, has_response),
            day4_bus=_resolve_buses(response.day4_bus if response else None, has_response),
        ))

    if bus_id:
        # 확정자: 신청 시각 오름차순 (없으면 맨 뒤)
        result.sort(key=lambda x: x.registered_at or "9999")

        # 대기자 append — 확정자와 중복 방지
        latest_sq = (
            db.query(MemberProfile.member_id, sa_func.max(MemberProfile.profile_id).label("max_id"))
            .group_by(MemberProfile.member_id)
            .subquery()
        )
        waiting_rows = crud_get_bus_waiting_list(db, bus_id)
        for rank, (waiting, member) in enumerate(waiting_rows, start=1):
            if member.member_id in confirmed_ids:
                continue
            profile = (
                db.query(MemberProfile)
                .join(latest_sq, MemberProfile.profile_id == latest_sq.c.max_id)
                .filter(MemberProfile.member_id == member.member_id)
                .first()
            )
            result.append(VehicleMemberListItem(
                member_id=member.member_id,
                member_name=member.name,
                generation=member.generation,
                gender=member.gender,
                gyogu=profile.gyogu if profile else 0,
                team=profile.team if profile else 0,
                group_no=profile.group_no if profile else 0,
                phone=member.phone_number,
                has_response=True,
                waiting_number=rank,
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

    # 대기 중인 버스 목록 + 예비 번호 계산
    waiting_rows = (
        db.query(BusWaiting, BusCustom)
        .join(BusCustom, BusCustom.bus_id == BusWaiting.bus_id)
        .filter(BusWaiting.member_id == member_id)
        .order_by(BusWaiting.waiting_id)
        .all()
    )
    waiting_buses = []
    for waiting, bus in waiting_rows:
        rank = (
            db.query(sa_func.count())
            .filter(
                BusWaiting.bus_id == waiting.bus_id,
                BusWaiting.waiting_id <= waiting.waiting_id,
            )
            .scalar()
        )
        waiting_buses.append(WaitingBusInfo(
            bus_id=bus.bus_id,
            bus_name=bus.bus_name,
            departure_date=str(bus.departure_date) if bus.departure_date else '',
            departure_time=_time_to_hhmm(bus.departure_time),
            waiting_number=rank,
        ))

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
        waiting_buses=waiting_buses,
    )


def svc_submit_vehicle(db: Session, member_id: int, body: VehicleSubmitBody) -> VehicleSubmitResponse:
    retreat = crud_get_active_retreat(db)
    if not retreat:
        raise NotFoundError("활성 수련회가 없습니다.")

    # 기존 선택 버스 목록 저장 (승격 트리거용)
    old_response = crud_get_vehicle_response(db, retreat.retreat_custom_id, member_id)
    old_bus_ids: set[int] = set()
    if old_response:
        for col in ('day1_bus', 'day2_bus', 'day3_bus', 'day4_bus'):
            try:
                old_bus_ids.update(json.loads(getattr(old_response, col) or '[]'))
            except (ValueError, TypeError):
                pass

    all_bus_ids = list({id for day in (body.day1_bus, body.day2_bus, body.day3_bus, body.day4_bus) for id in day})
    full_bus_ids = set(crud_get_full_buses(db, all_bus_ids))

    # 이미 확정 탑승 중이거나 대기 중인 버스는 만석 팝업 재표시 제외
    already_waiting_ids = {
        row.bus_id
        for row in db.query(BusWaiting).filter(BusWaiting.member_id == member_id).all()
    }
    existing_bus_ids = old_bus_ids | already_waiting_ids
    new_full_bus_ids = full_bus_ids - existing_bus_ids

    if new_full_bus_ids and not body.accept_waiting:
        full_buses = [
            FullBusInfo(
                bus_id=b.bus_id,
                bus_name=b.bus_name,
                departure_time=_time_to_hhmm(b.departure_time),
            )
            for b in db.query(BusCustom).filter(BusCustom.bus_id.in_(new_full_bus_ids)).all()
        ]
        return VehicleSubmitResponse(waiting_required=True, full_buses=full_buses)

    normal_bus_ids = [id for id in all_bus_ids if id not in full_bus_ids]
    # 새로 추가되는 대기 버스만 upsert (기존 대기는 cancel_waiting_not_in이 보존)
    waiting_bus_ids = list(new_full_bus_ids) if body.accept_waiting else []

    def filter_day(ids: list[int]) -> list[int]:
        return [id for id in ids if id in normal_bus_ids]

    normal_body = VehicleSubmitBody(
        day1_bus=filter_day(body.day1_bus),
        day2_bus=filter_day(body.day2_bus),
        day3_bus=filter_day(body.day3_bus),
        day4_bus=filter_day(body.day4_bus),
    )
    crud_upsert_vehicle_response(db, retreat.retreat_custom_id, member_id, normal_body)
    if normal_bus_ids:
        crud_register_bus_selections(db, normal_bus_ids, member_id)

    # 새 제출에 없는 버스의 대기 취소
    crud_cancel_waiting_not_in(db, member_id, all_bus_ids)

    waiting_numbers: dict[int, int] = {}
    if waiting_bus_ids:
        # bus_id → day_no 매핑
        bus_day_map: dict[int, int] = {}
        for day_n, day_ids in enumerate([body.day1_bus, body.day2_bus, body.day3_bus, body.day4_bus], start=1):
            for bid in day_ids:
                if bid not in bus_day_map:
                    bus_day_map[bid] = day_n
        pairs = [(bid, bus_day_map.get(bid, 1)) for bid in waiting_bus_ids]
        waiting_numbers = crud_upsert_bus_waiting(db, pairs, member_id)

    # 이번 제출에서 제거된 버스에 대해 대기자 자동 승격
    new_bus_ids = set(normal_bus_ids)
    removed_bus_ids = old_bus_ids - new_bus_ids
    for bus_id in removed_bus_ids:
        crud_promote_from_waiting(db, bus_id, retreat.retreat_custom_id)

    return VehicleSubmitResponse(waiting_numbers=waiting_numbers)


# ── 서스펜디드밀 ───────────────────────────────────────────────────────────────

def svc_get_suspended_meal_members(
    db: Session,
    data_scope: str,
    gyogu: Optional[int],
    team: Optional[int],
    group_no: Optional[int],
    query_gyogu: Optional[int] = None,
    query_team: Optional[int] = None,
) -> List[SuspendedMealMemberResponse]:
    retreat = crud_get_active_retreat(db)
    if not retreat:
        raise NotFoundError("활성 수련회가 없습니다.")
    rows = crud_get_suspended_meal_members(db, data_scope, gyogu, team, group_no, query_gyogu, query_team)
    result = []
    for member, profile, app in rows:
        app_item = None
        if app:
            app_item = SuspendedMealApplicationItem(
                application_id=app.application_id,
                meal_count=app.meal_count,
                special_meal_count=app.special_meal_count,
                fee_support=bool(app.fee_support),
                applicant_reason=app.applicant_reason,
                applied_at=app.applied_at.isoformat() if app.applied_at else "",
                review_status=app.review_status,
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
            gyogu=profile.gyogu,
            team=profile.team,
            group_no=profile.group_no,
            meal_count=app.meal_count,
            special_meal_count=app.special_meal_count,
            fee_support=bool(app.fee_support),
            applicant_reason=app.applicant_reason,
            applied_at=app.applied_at.isoformat() if app.applied_at else "",
            review_status=app.review_status,
            review_comment=app.review_comment,
            reviewed_at=app.reviewed_at.isoformat() if app.reviewed_at else None,
        )
        for app, member, profile in rows
    ]
    return AdminSuspendedMealListResponse(items=items, total=total)


def svc_get_admin_suspended_meal_stats(db: Session) -> AdminSuspendedMealStats:
    total, pending, approved, rejected = crud_get_admin_suspended_meal_stats(db)
    return AdminSuspendedMealStats(total=total, pending=pending, approved=approved, rejected=rejected)


def svc_review_suspended_meal(
    db: Session, application_id: int, body: AdminSuspendedMealReviewRequest
) -> None:
    crud_review_suspended_meal(db, application_id, body.review_status, body.review_comment)


def svc_update_fee_paid(db: Session, member_id: int, body: FeePaidUpdate) -> None:
    retreat = crud_get_active_retreat(db)
    if not retreat:
        raise NotFoundError("활성 수련회가 없습니다.")
    crud_update_fee_paid(db, retreat.retreat_custom_id, member_id, body.is_fee_paid)


# ── 환자방 ────────────────────────────────────────────────────────────────────

def svc_get_patient_room_members(
    db: Session,
    data_scope: str,
    gyogu: Optional[int],
    team: Optional[int],
    group_no: Optional[int],
    query_gyogu: Optional[int] = None,
    query_team: Optional[int] = None,
) -> List[PatientRoomMemberResponse]:
    rows = crud_get_patient_room_members(db, data_scope, gyogu, team, group_no, query_gyogu, query_team)
    result = []
    for member, profile, app in rows:
        app_item = None
        if app:
            app_item = PatientRoomApplicationItem(
                application_id=app.application_id,
                applicant_reason=app.applicant_reason,
                applied_at=app.applied_at.isoformat() if app.applied_at else "",
                review_status=app.review_status,
                review_comment=app.review_comment,
                reviewed_at=app.reviewed_at.isoformat() if app.reviewed_at else None,
            )
        result.append(PatientRoomMemberResponse(
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


def svc_upsert_patient_room(db: Session, member_id: int, body: PatientRoomSubmitBody) -> None:
    crud_upsert_patient_room(db, member_id, body)


def svc_get_admin_patient_room_list(
    db: Session,
    review_status: Optional[str],
    page: int,
    size: int,
) -> AdminPatientRoomListResponse:
    total, rows = crud_get_admin_patient_room_list(db, review_status, page, size)
    items = [
        AdminPatientRoomItem(
            application_id=app.application_id,
            member_id=app.member_id,
            member_name=member.name,
            gyogu=profile.gyogu,
            team=profile.team,
            group_no=profile.group_no,
            applicant_reason=app.applicant_reason,
            applied_at=app.applied_at.isoformat() if app.applied_at else "",
            review_status=app.review_status,
            review_comment=app.review_comment,
            reviewed_at=app.reviewed_at.isoformat() if app.reviewed_at else None,
        )
        for app, member, profile in rows
    ]
    return AdminPatientRoomListResponse(items=items, total=total)


def svc_get_admin_patient_room_stats(db: Session) -> AdminPatientRoomStats:
    total, pending, approved, rejected = crud_get_admin_patient_room_stats(db)
    return AdminPatientRoomStats(total=total, pending=pending, approved=approved, rejected=rejected)


def svc_review_patient_room(
    db: Session, application_id: int, body: AdminPatientRoomReviewRequest
) -> None:
    crud_review_patient_room(db, application_id, body.review_status, body.review_comment)
