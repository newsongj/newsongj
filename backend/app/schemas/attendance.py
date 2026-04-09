from pydantic import BaseModel, model_validator
from datetime import date
from typing import Optional, Literal
from app.core.timezone import today_kst
from app.schemas.common import PageMeta


class AttendanceRecordItem(BaseModel):
    member_id: int
    status: Literal["PRESENT", "ABSENT"]
    absent_reason: Optional[Literal["학교/학원", "회사", "알바", "가족모임", "개인일정", "아픔", "기타"]] = None

    @model_validator(mode="after")
    def validate_absent_reason(self) -> "AttendanceRecordItem":
        if self.status == "PRESENT" and self.absent_reason is not None:
            raise ValueError("PRESENT 상태에서는 absent_reason을 입력할 수 없습니다.")
        if self.status == "ABSENT" and self.absent_reason is None:
            raise ValueError("ABSENT 상태에서는 absent_reason이 필요합니다.")
        return self


class AttendanceBatchRequest(BaseModel):
    worship_date: date
    records: list[AttendanceRecordItem]

    @model_validator(mode="after")
    def validate_request(self) -> "AttendanceBatchRequest":
        if self.worship_date > today_kst():
            raise ValueError("worship_date는 미래 날짜를 허용하지 않습니다.")
        ids = [r.member_id for r in self.records]
        duplicates = {i for i in ids if ids.count(i) > 1}
        if duplicates:
            raise ValueError(f"member_id 중복 요청: {sorted(duplicates)}")
        return self


class AttendanceBatchResponse(BaseModel):
    saved_count: int


class AttendanceMemberItem(BaseModel):
    """출석 목록 조회 응답 단건 — member_profile 기준, 출석 기록은 없을 수 있음"""
    member_id: int
    name: str
    generation: int
    leader_names: Optional[str]  # 콤마 구분 문자열 (예: "팀장, 구역장"), 없으면 None
    status: Optional[Literal["PRESENT", "ABSENT"]] = None  # 출석 기록 없으면 None
    absent_reason: Optional[Literal["학교/학원", "회사", "알바", "가족모임", "개인일정", "아픔", "기타"]] = None


class AttendanceListResponse(BaseModel):
    items: list[AttendanceMemberItem]
    meta: PageMeta
