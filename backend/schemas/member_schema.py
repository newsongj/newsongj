from datetime import date, datetime
from enum import Enum
from typing import Optional, Literal

from pydantic import BaseModel

class GenderEnum(str, Enum):
    MALE= "남"
    FEMALE = "여"

member_type = Literal["토요예배", "주일예배", "래사랑", "군지체", "해외지체", "새가족"]
rate = Literal["A", "B", "C", "D"]
plt = Literal["수료", "1학기 수료"]

# 출석부용
class UserBase(BaseModel):
    name: str
    gender: GenderEnum
    generation: int

class UserProfile(BaseModel):
    # 유저 프로필 테이블
    profile_id: int
    year: Optional[int] = 2026
    member_type: member_type
    attendance_rate: Optional[float] = None
    attendance_grade: rate
    gyogu: int
    team: int
    group_no: int
    leader: Optional[str] = None
    plt_status: Optional[plt] = None

    class Config:
        from_attributes = True

class User(UserBase):
    member_id: int
    v8pid: Optional[str] = None
    birthdate: Optional[date] = None
    phone_number: Optional[str] = None
    enrolled_at: Optional[datetime] = None
    # 유저 프로필 테이블
    profile: list[UserProfile] = []

    class Config:
        from_attributes = True


class UserDelete(User):
    deleted_at: Optional[datetime] = None
    deleted_reason: Optional[str] = None

    class Config:
        from_attributes = True
