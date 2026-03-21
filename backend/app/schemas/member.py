from pydantic import BaseModel
from typing import Optional
import datetime


class MemberRow(BaseModel):
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
    leader: Optional[str]
    v8pid: Optional[str]
    year: Optional[datetime.date]
    enrolled_at: Optional[datetime.datetime]

    class Config:
        from_attributes = True


class PageMeta(BaseModel):
    current_page: int
    page_size: int
    total_items: int


class MemberListResponse(BaseModel):
    items: list[MemberRow]
    meta: PageMeta


# 멤버 생성/수정 요청 스키마
class AddMember(BaseModel):
    name: str
    gender: str
    generation: int
    phone_number: Optional[str] = None
    birthdate: Optional[datetime.date] = None
    gyogu: Optional[int] = None
    team: Optional[int] = None
    group_no: Optional[int] = None
    leader: Optional[str] = None
    member_type: Optional[str] = None
    attendance_grade: Optional[str] = None
    plt_status: Optional[str] = None
    v8pid: Optional[str] = None
    enrolled_at: Optional[datetime.datetime] = None


# 멤버 생성/수정 응답 (member_id만 반환)
class MemberIdResponse(BaseModel):
    member_id: int


# 멤버 삭제 요청 스키마 (삭제 시각 + 사유)
class MemberDeleteState(BaseModel):
    deleted_at: datetime.datetime
    deleted_reason: str


# 삭제된 멤버 응답 (MemberRow 확장)
class DeletedMember(MemberRow):
    deleted_at: datetime.datetime
    deleted_reason: str


# 삭제된 멤버 목록 응답
class DeletedMemberListResponse(BaseModel):
    items: list[DeletedMember]
    meta: PageMeta
