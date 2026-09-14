import datetime
from typing import List, Optional

from pydantic import BaseModel


class BusCreate(BaseModel):
    bus_name: str
    seat_count: int
    departure_date: datetime.date
    departure_time: str   # "HH:MM"
    departure_place: str
    arrival_place: str


class BusResponse(BaseModel):
    bus_id: int
    bus_name: str
    seat_count: int
    departure_date: datetime.date
    departure_time: str   # "HH:MM"
    departure_place: str
    arrival_place: str


class RetreatCreate(BaseModel):
    retreat_name: str
    start_date: datetime.date
    end_date: datetime.date
    fee_with_bus: int
    fee_without_bus: int
    meal_price: int
    suspended_meal_count: int = 0
    special_meal_name:  Optional[str] = None
    special_meal_price: Optional[int] = None
    personal_vehicle_url: Optional[str] = None


class RetreatUpdate(BaseModel):
    retreat_name: str
    start_date: datetime.date
    end_date: datetime.date
    fee_with_bus: int
    fee_without_bus: int
    meal_price: int
    suspended_meal_count: int = 0
    special_meal_name:  Optional[str] = None
    special_meal_price: Optional[int] = None
    personal_vehicle_url: Optional[str] = None
    is_research_open:       bool = True
    is_vehicle_open:        bool = True
    is_suspended_meal_open: bool = True
    is_patient_room_open:   bool = True


class RetreatCreateResponse(BaseModel):
    retreat_id: int
    retreat_name: str
    start_date: datetime.date
    end_date: datetime.date
    fee_with_bus: int
    fee_without_bus: int
    meal_price: int
    suspended_meal_count: int
    special_meal_name:  Optional[str] = None
    special_meal_price: Optional[int] = None
    personal_vehicle_url: Optional[str] = None
    is_research_open:       bool = True
    is_vehicle_open:        bool = True
    is_suspended_meal_open: bool = True
    is_patient_room_open:   bool = True


class RetreatActiveResponse(RetreatCreateResponse):
    buses: list[BusResponse]


class BusIdResponse(BaseModel):
    bus_id: int


# ── 인원조사 ──────────────────────────────────────────────────────────────────

class ResearchResponseItem(BaseModel):
    day1_attendance: Optional[str] = None
    day2_attendance: Optional[str] = None
    day3_attendance: Optional[str] = None
    day4_attendance: Optional[str] = None
    fee_type:        Optional[str] = None


class ResearchMemberResponse(BaseModel):
    member_id:   int
    name:        str
    generation:  int
    gender:      str
    gyogu:       int
    team:        int
    group_no:    int
    is_fee_paid: bool = False
    response:    Optional[ResearchResponseItem] = None


class ResearchResponseUpdate(BaseModel):
    day1_attendance: Optional[str] = None
    day2_attendance: Optional[str] = None
    day3_attendance: Optional[str] = None
    day4_attendance: Optional[str] = None
    fee_type:        Optional[str] = None


# ── 차량조사 ──────────────────────────────────────────────────────────────────

class WaitingBusInfo(BaseModel):
    bus_id:          int
    bus_name:        str
    departure_date:  str
    departure_time:  str
    waiting_number:  int


class VehicleMyResponse(BaseModel):
    member_id:     int
    name:          str
    gyogu:         Optional[int] = None
    team:          Optional[int] = None
    phone:         Optional[str] = None
    day1_bus:      List[int] = []
    day2_bus:      List[int] = []
    day3_bus:      List[int] = []
    day4_bus:      List[int] = []
    submitted_at:  Optional[datetime.datetime] = None
    waiting_buses: List[WaitingBusInfo] = []


class VehicleSubmitBody(BaseModel):
    day1_bus:       List[int] = []
    day2_bus:       List[int] = []
    day3_bus:       List[int] = []
    day4_bus:       List[int] = []
    accept_waiting: bool = False


class FullBusInfo(BaseModel):
    bus_id:         int
    bus_name:       str
    departure_time: str


class VehicleSubmitResponse(BaseModel):
    waiting_required: bool = False
    full_buses:       List[FullBusInfo] = []
    waiting_numbers:  dict[int, int] = {}   # bus_id → 예비 번호 (대기 확정 후)


# ── 서스펜디드밀 ───────────────────────────────────────────────────────────────

class SuspendedMealApplicationItem(BaseModel):
    application_id:    int
    meal_count:        int
    special_meal_count: int = 0
    fee_support:       bool
    applicant_reason:  Optional[str] = None
    applied_at:        str
    review_status:     str
    review_comment:    Optional[str] = None
    reviewed_at:       Optional[str] = None


class SuspendedMealMemberResponse(BaseModel):
    member_id:   int
    name:        str
    generation:  int
    gender:      str
    gyogu:       int
    team:        int
    group_no:    int
    application: Optional[SuspendedMealApplicationItem] = None


class SuspendedMealSubmitBody(BaseModel):
    meal_count:         int
    special_meal_count: int = 0
    fee_support:        bool
    applicant_reason:   Optional[str] = None


# ── 서스펜디드밀 관리자 ──────────────────────────────────────────────────────────

class AdminSuspendedMealItem(BaseModel):
    application_id:    int
    member_id:         int
    member_name:       str
    gyogu:             int
    team:              int
    group_no:          int
    meal_count:        int
    special_meal_count: int = 0
    fee_support:       bool
    applicant_reason:  Optional[str] = None
    applied_at:        str
    review_status:     str
    review_comment:    Optional[str] = None
    reviewed_at:       Optional[str] = None


class AdminSuspendedMealListResponse(BaseModel):
    items: List[AdminSuspendedMealItem]
    total: int


class AdminSuspendedMealStats(BaseModel):
    total:    int
    pending:  int
    approved: int
    rejected: int


class AdminSuspendedMealReviewRequest(BaseModel):
    review_status: str   # 'APPROVED' | 'REJECTED'
    review_comment: str


# ── 인원조사 명단 (관리자) ───────────────────────────────────────────────────────

class ResearchListItem(BaseModel):
    member_id:       int
    member_name:     str
    generation:      int
    gender:          str
    gyogu:           int
    team:            int
    group_no:        int
    has_response:    bool
    day1_attendance: Optional[str] = None
    day2_attendance: Optional[str] = None
    day3_attendance: Optional[str] = None
    day4_attendance: Optional[str] = None
    fee_type:        Optional[str] = None
    is_fee_paid:     bool = False


class FeePaidUpdate(BaseModel):
    is_fee_paid: bool


class ResearchListResponse(BaseModel):
    fee_with_bus:    int
    fee_without_bus: int
    enrolled:        int
    surveyed:        int
    fee_paid:        int
    num_days:        int
    members:         List[ResearchListItem]


# ── 차량조사 명단 (관리자) ───────────────────────────────────────────────────────

class VehicleListBusInfo(BaseModel):
    bus_name:       str
    departure_time: str


class VehicleMemberListItem(BaseModel):
    member_id:      int
    member_name:    str
    generation:     int
    gender:         str
    gyogu:          int
    team:           int
    group_no:       int
    phone:          Optional[str] = None
    has_response:   bool
    waiting_number: Optional[int] = None    # 단일 버스 필터 시에만 채워짐
    registered_at:  Optional[str] = None    # 단일 버스 필터 시에만 채워짐
    day1_bus:       Optional[List[VehicleListBusInfo]] = None
    day2_bus:       Optional[List[VehicleListBusInfo]] = None
    day3_bus:       Optional[List[VehicleListBusInfo]] = None
    day4_bus:       Optional[List[VehicleListBusInfo]] = None


class VehicleMemberListResponse(BaseModel):
    num_days: int
    members:  List[VehicleMemberListItem]


# ── 대시보드 차량탭 ──────────────────────────────────────────────────────────────

class BusDashboardItem(BaseModel):
    bus_id:          int
    bus_name:        str
    departure_date:  datetime.date
    departure_time:  str
    passenger_count: int
    seat_count:      int


class VehicleDashboardResponse(BaseModel):
    retreat_start_date: datetime.date
    normal_depart:      int
    num_days:           int
    buses:              List[BusDashboardItem]


# ── 환자방 ────────────────────────────────────────────────────────────────────

class PatientRoomApplicationItem(BaseModel):
    application_id:   int
    applicant_reason: Optional[str] = None
    applied_at:       str
    review_status:    str
    review_comment:   Optional[str] = None
    reviewed_at:      Optional[str] = None


class PatientRoomMemberResponse(BaseModel):
    member_id:   int
    name:        str
    generation:  int
    gender:      str
    gyogu:       int
    team:        int
    group_no:    int
    application: Optional[PatientRoomApplicationItem] = None


class PatientRoomSubmitBody(BaseModel):
    applicant_reason: Optional[str] = None


# ── 환자방 관리자 ──────────────────────────────────────────────────────────────

class AdminPatientRoomItem(BaseModel):
    application_id:   int
    member_id:        int
    member_name:      str
    gender:           str
    gyogu:            int
    team:             int
    group_no:         int
    applicant_reason: Optional[str] = None
    applied_at:       str
    review_status:    str
    review_comment:   Optional[str] = None
    reviewed_at:      Optional[str] = None


class AdminPatientRoomListResponse(BaseModel):
    items: List[AdminPatientRoomItem]
    total: int


class AdminPatientRoomStats(BaseModel):
    total:    int
    pending:  int
    approved: int
    rejected: int


class AdminPatientRoomReviewRequest(BaseModel):
    review_status:  str
    review_comment: str


# ── 인원조사 집계 (대시보드) ──────────────────────────────────────────────────────

class RetreatDayHeadcount(BaseModel):
    total:     int
    undecided: int
    absent:    int
    normal:    int
    attend:    int
    late:      int


class RetreatHeadcountResponse(BaseModel):
    enrolled: int
    surveyed: int
    total:    int
    male:     int
    female:   int
    num_days: int
    days:     List[RetreatDayHeadcount]


# ── 숙소/야식 인원 집계 (대시보드) ───────────────────────────────────────────────

class RetreatAccommodationDayData(BaseModel):
    total:  int
    male:   int
    female: int


class RetreatAccommodationResponse(BaseModel):
    days: List[RetreatAccommodationDayData]
