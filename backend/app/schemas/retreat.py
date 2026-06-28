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


class RetreatUpdate(BaseModel):
    retreat_name: str
    start_date: datetime.date
    end_date: datetime.date
    fee_with_bus: int
    fee_without_bus: int
    meal_price: int
    suspended_meal_count: int = 0


class RetreatCreateResponse(BaseModel):
    retreat_id: int
    retreat_name: str
    start_date: datetime.date
    end_date: datetime.date
    fee_with_bus: int
    fee_without_bus: int
    meal_price: int
    suspended_meal_count: int


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
    member_id:  int
    name:       str
    generation: int
    gender:     str
    gyogu:      int
    team:       int
    group_no:   int
    response:   Optional[ResearchResponseItem] = None


class ResearchResponseUpdate(BaseModel):
    day1_attendance: Optional[str] = None
    day2_attendance: Optional[str] = None
    day3_attendance: Optional[str] = None
    day4_attendance: Optional[str] = None
    fee_type:        Optional[str] = None


# ── 차량조사 ──────────────────────────────────────────────────────────────────

class VehicleMyResponse(BaseModel):
    member_id:    int
    name:         str
    gyogu:        Optional[int] = None
    team:         Optional[int] = None
    phone:        Optional[str] = None
    day1_bus:     List[int] = []
    day2_bus:     List[int] = []
    day3_bus:     List[int] = []
    day4_bus:     List[int] = []
    submitted_at: Optional[datetime.datetime] = None


class VehicleSubmitBody(BaseModel):
    day1_bus: List[int] = []
    day2_bus: List[int] = []
    day3_bus: List[int] = []
    day4_bus: List[int] = []


# ── 서스펜디드밀 ───────────────────────────────────────────────────────────────

class SuspendedMealApplicationItem(BaseModel):
    application_id:   int
    meal_count:       int
    fee_support:      bool
    applicant_reason: Optional[str] = None
    applied_at:       str
    review_status:    str
    review_comment:   Optional[str] = None
    reviewed_at:      Optional[str] = None


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
    meal_count:       int
    fee_support:      bool
    applicant_reason: Optional[str] = None


# ── 서스펜디드밀 관리자 ──────────────────────────────────────────────────────────

class AdminSuspendedMealItem(BaseModel):
    application_id:   int
    member_id:        int
    member_name:      str
    meal_count:       int
    fee_support:      bool
    applicant_reason: Optional[str] = None
    applied_at:       str
    review_status:    str
    review_comment:   Optional[str] = None
    reviewed_at:      Optional[str] = None


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
    member_id:    int
    member_name:  str
    generation:   int
    gender:       str
    gyogu:        int
    team:         int
    group_no:     int
    phone:        Optional[str] = None
    has_response: bool
    day1_bus:     Optional[List[VehicleListBusInfo]] = None
    day2_bus:     Optional[List[VehicleListBusInfo]] = None
    day3_bus:     Optional[List[VehicleListBusInfo]] = None
    day4_bus:     Optional[List[VehicleListBusInfo]] = None


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
