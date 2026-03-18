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
