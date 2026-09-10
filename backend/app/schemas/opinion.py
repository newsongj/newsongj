import datetime
from typing import List, Optional

from pydantic import BaseModel


# ── 교적 자동기입 항목 옵션 ────────────────────────────────────────────────────

class MemberFieldOption(BaseModel):
    key: str
    label: str


# ── 소견서 회차 설정 (관리자) ───────────────────────────────────────────────────

class OpinionReportCreate(BaseModel):
    report_year:   int
    start_date:    Optional[datetime.date] = None
    end_date:      Optional[datetime.date] = None
    guide_text:    Optional[str] = None
    member_fields: List[str]
    input_fields:  List[str]
    status_options: List[str] = []
    plan_options:   List[str] = []


class OpinionReportUpdate(BaseModel):
    start_date:    Optional[datetime.date] = None
    end_date:      Optional[datetime.date] = None
    guide_text:    Optional[str] = None
    member_fields: List[str]
    input_fields:  List[str]
    status_options: List[str] = []
    plan_options:   List[str] = []


class OpinionReportCustomResponse(BaseModel):
    opinion_custom_id: int
    report_year:   int
    start_date:    Optional[datetime.date] = None
    end_date:      Optional[datetime.date] = None
    guide_text:    Optional[str] = None
    member_fields: List[str]
    input_fields:  List[str]
    status_options: List[str] = []
    plan_options:   List[str] = []
    is_active:      bool


# ── 작성자 배정 (관리자) ───────────────────────────────────────────────────────

class OpinionMappingItem(BaseModel):
    writer_member_id: int
    target_member_id: int


class OpinionMappingBulkCreate(BaseModel):
    mappings: List[OpinionMappingItem]


class OpinionMappingResponse(BaseModel):
    mapping_id:       int
    writer_member_id: int
    writer_name:      str
    target_member_id: int
    target_name:      str


# ── 소견서 목록 (작성자 본인) ───────────────────────────────────────────────────

class MyOpinionTargetItem(BaseModel):
    target_member_id: int
    target_name:       str
    gyogu:              Optional[int] = None
    team:                Optional[int] = None
    group_no:            Optional[int] = None
    has_report:          bool
    updated_at:          Optional[datetime.datetime] = None


class MyOpinionTargetListResponse(BaseModel):
    report_year: int
    is_active:   bool
    start_date:  Optional[datetime.date] = None
    end_date:    Optional[datetime.date] = None
    targets:     List[MyOpinionTargetItem]


# ── 소견서 작성 폼 ─────────────────────────────────────────────────────────────

class OpinionAutoField(BaseModel):
    key:   str
    label: str
    value: Optional[str] = None


class OpinionReportFormResponse(BaseModel):
    target_member_id: int
    target_name:       str
    is_active:          bool   # false면 읽기 전용(수정 불가)
    auto_fields:        List[OpinionAutoField]
    input_fields:        List[str]
    status_options:       List[str]
    plan_options:         List[str]

    current_status:      Optional[str] = None
    current_status_etc:  Optional[str] = None
    group_meeting_attendance_status:  Optional[str] = None
    sunday_morning_attendance_status: Optional[str] = None
    sunday_evening_attendance_status: Optional[str] = None
    next_year_plan:      Optional[str] = None
    next_year_plan_etc:  Optional[str] = None
    general_opinion:      Optional[str] = None
    special_opinion:      Optional[str] = None


class OpinionReportSaveBody(BaseModel):
    current_status:      Optional[str] = None
    current_status_etc:  Optional[str] = None
    group_meeting_attendance_status:  Optional[str] = None
    sunday_morning_attendance_status: Optional[str] = None
    sunday_evening_attendance_status: Optional[str] = None
    next_year_plan:      Optional[str] = None
    next_year_plan_etc:  Optional[str] = None
    general_opinion:      Optional[str] = None
    special_opinion:      Optional[str] = None
