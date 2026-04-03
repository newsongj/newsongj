from pydantic import BaseModel, model_validator
from typing import Optional, Literal
import datetime
from app.schemas.common import PageMeta


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


class MemberListResponse(BaseModel):
    items: list[MemberResponse]
    meta: PageMeta


# 멤버 생성/수정 요청 스키마
class MemberRequest(BaseModel):
    name: str
    gender: Literal['남', '여']
    generation: int
    phone_number: Optional[str] = None
    birthdate: Optional[datetime.date] = None
    gyogu: Optional[int] = None
    team: Optional[int] = None
    group_no: Optional[int] = None
    leader_ids: Optional[str] = None   # JSON 배열 문자열 (예: ["1", "3"])
    member_type: Optional[Literal['토요예배', '주일예배', '래사랑', '군지체', '해외지체', '새가족']] = None
    attendance_grade: Optional[Literal['A', 'B', 'C', 'D']] = None
    plt_status: Optional[Literal['수료', '1학기 수료']] = None
    v8pid: Optional[str] = None
    school_work: Optional[str] = None  # 학교 및 직장
    major: Optional[str] = None        # 전공
    # enrolled_at: 서버에서 자동 생성 (crud/members.py create_member에서 datetime.now())

    @model_validator(mode="after")
    def validate_profile_fields(self) -> "MemberRequest":
        profile_fields = [self.gyogu, self.team, self.group_no, self.member_type]
        filled = sum(1 for f in profile_fields if f is not None)
        if filled not in (0, 4):
            raise ValueError("gyogu, team, group_no, member_type는 모두 입력하거나 모두 비워야 합니다.")
        return self


# 멤버 생성/수정 응답 (member_id만 반환)
class MemberIdResponse(BaseModel):
    member_id: int


# 멤버 삭제 요청 스키마 (삭제 사유만, 삭제 시각은 서버에서 자동)
class MemberDeleteRequest(BaseModel):
    deleted_reason: str


# 삭제된 멤버 응답 (MemberResponse 확장)
class DeletedMember(MemberResponse):
    deleted_at: datetime.datetime
    deleted_reason: str


# 삭제된 멤버 목록 응답
class DeletedMemberListResponse(BaseModel):
    items: list[DeletedMember]
    meta: PageMeta

