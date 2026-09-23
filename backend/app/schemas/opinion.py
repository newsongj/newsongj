import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel

OpinionWriterRole = Literal['임원단', '팀장', '그룹장']
OpinionWriteStatus = Literal['all', 'written', 'not_written']


class OpinionWriter(BaseModel):
    member_id: int
    name: str
    gyogu: Optional[int] = None
    team: Optional[int] = None
    group_no: Optional[int] = None
    phone_number: Optional[str] = None
    role: OpinionWriterRole


class OpinionCompanion(BaseModel):
    member_id: int
    name: str
    gyogu: Optional[int] = None
    team: Optional[int] = None
    group_no: Optional[int] = None


class OpinionReportRow(BaseModel):
    opinion_report_id: Optional[int] = None
    member_id: int
    report_year: int
    is_deleted: bool

    # 교적 자동 기입
    name: str
    gender: Optional[str] = None
    generation: Optional[int] = None
    # DB에 day=0 등 비정상 값이 섞여 있을 수 있어 date로 강제 파싱하지 않는다
    # (프론트도 opinion.types.ts에서 string | null로 소비).
    birthdate: Optional[str] = None
    phone_number: Optional[str] = None
    gyogu: Optional[int] = None
    team: Optional[int] = None
    group_no: Optional[int] = None
    member_type: Optional[str] = None
    attendance_grade: Optional[str] = None
    attendance_rate: Optional[float] = None
    plt_status: Optional[str] = None
    leader_names: List[str] = []
    school_work: Optional[str] = None
    major: Optional[str] = None

    # 작성 현황
    is_written: bool
    writers: List[OpinionWriter] = []
    expected_writers: List[OpinionWriter] = []
    companions: List[OpinionCompanion] = []
    updated_at: Optional[datetime.datetime] = None

    # 작성자 직접 입력
    current_status: Optional[str] = None
    current_status_etc: Optional[str] = None
    group_meeting_attendance_status: Optional[str] = None
    sunday_morning_attendance_status: Optional[str] = None
    sunday_evening_attendance_status: Optional[str] = None
    next_year_plan: Optional[str] = None
    next_year_plan_etc: Optional[str] = None
    general_opinion: Optional[str] = None
    special_opinion: Optional[str] = None


class OpinionReportUpdateRequest(BaseModel):
    """소견서 수정 요청 — 작성자 직접 입력 9개 항목 + 낙관적 잠금 기준값.

    전달되지 않은 항목은 기존 값을 유지한다 (input_fields에서 꺼진 항목).
    빈 문자열이 아니라 null로 지우는 것이 명시적 삭제다.
    """
    base_updated_at: Optional[datetime.datetime] = None
    current_status: Optional[str] = None
    current_status_etc: Optional[str] = None
    group_meeting_attendance_status: Optional[str] = None
    sunday_morning_attendance_status: Optional[str] = None
    sunday_evening_attendance_status: Optional[str] = None
    next_year_plan: Optional[str] = None
    next_year_plan_etc: Optional[str] = None
    general_opinion: Optional[str] = None
    special_opinion: Optional[str] = None


class OpinionReportUpdateResponse(BaseModel):
    opinion_report_id: int
    member_id: int
    report_year: int
    updated_at: datetime.datetime

    current_status: Optional[str] = None
    current_status_etc: Optional[str] = None
    group_meeting_attendance_status: Optional[str] = None
    sunday_morning_attendance_status: Optional[str] = None
    sunday_evening_attendance_status: Optional[str] = None
    next_year_plan: Optional[str] = None
    next_year_plan_etc: Optional[str] = None
    general_opinion: Optional[str] = None
    special_opinion: Optional[str] = None


class OpinionListResponse(BaseModel):
    enrolled: int
    written_total: int
    target: int
    written: int
    items: List[OpinionReportRow]
