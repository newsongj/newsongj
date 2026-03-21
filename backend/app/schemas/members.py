from pydantic import BaseModel
from typing import Optional
import datetime


class MemberResponse(BaseModel):
    member_id: int
    name: str
    gender: str
    generation: int
    gyogu: Optional[int]
    team: Optional[int]
    group_no: Optional[int]
    phone_number: Optional[str]
    birthdate: Optional[datetime.date]
    member_type: Optional[str]
    attendance_grade: Optional[str]
    plt_status: Optional[str]
    leader_ids: Optional[str]       # JSON 배열 문자열 또는 resolve된 이름 문자열
    v8pid: Optional[str]
    school_work: Optional[str]      # 학교 및 직장
    major: Optional[str]            # 전공
    year: Optional[datetime.date]
    enrolled_at: Optional[datetime.datetime]

    class Config:
        from_attributes = True


class PageMeta(BaseModel):
    current_page: int
    page_size: int
    total_items: int


class MemberListResponse(BaseModel):
    items: list[MemberResponse]
    meta: PageMeta


# 멤버 생성/수정 요청 스키마
class MemberCreate(BaseModel):
    name: str
    gender: str
    generation: int
    phone_number: Optional[str] = None
    birthdate: Optional[datetime.date] = None
    gyogu: Optional[int] = None
    team: Optional[int] = None
    group_no: Optional[int] = None
    leader_ids: Optional[str] = None   # JSON 배열 문자열 (예: ["1", "3"])
    member_type: Optional[str] = None
    attendance_grade: Optional[str] = None
    plt_status: Optional[str] = None
    v8pid: Optional[str] = None
    school_work: Optional[str] = None  # 학교 및 직장
    major: Optional[str] = None        # 전공
    enrolled_at: Optional[datetime.datetime] = None


# 멤버 생성/수정 응답 (member_id만 반환)
class MemberIdResponse(BaseModel):
    member_id: int


# 멤버 삭제 요청 스키마 (삭제 시각 + 사유)
class MemberDeleteRequest(BaseModel):
    deleted_at: datetime.datetime
    deleted_reason: str


# 삭제된 멤버 응답 (MemberResponse 확장)
class DeletedMember(MemberResponse):
    deleted_at: datetime.datetime
    deleted_reason: str


# 삭제된 멤버 목록 응답
class DeletedMemberListResponse(BaseModel):
    items: list[DeletedMember]
    meta: PageMeta
