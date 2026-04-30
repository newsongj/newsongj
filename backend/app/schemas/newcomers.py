"""미등반 새가족 도메인 스키마."""
from pydantic import BaseModel
from typing import Optional, Literal
import datetime


# 등반 가능한 일반 member_type — 새가족은 이 set로 전환되며 enrolled_at 세팅
EnrollableMemberType = Literal['토요예배', '주일예배', '래사랑', '군지체', '해외지체']


class NewcomerCreate(BaseModel):
    """새가족 생성 요청 — `member_type`은 항상 '새가족'으로 강제, `enrolled_at`은 등반 시점에 세팅"""
    name: str
    gender: Literal['남', '여']
    generation: int
    phone_number: Optional[str] = None
    v8pid: Optional[str] = None
    birthdate: Optional[datetime.date] = None
    school_work: Optional[str] = None
    major: Optional[str] = None
    gyogu: int
    team: int
    group_no: int


class NewcomerUpdate(NewcomerCreate):
    """새가족 정보 수정 — 필드 동일, `member_type`은 변경 불가 (등반은 별도 API)"""
    pass


class EnrollRequest(BaseModel):
    """등반 처리 요청 — 새가족 → 일반 멤버 전환

    `enrolled_at`: 실제 등반(등록) 일시
    `member_type`: 등반 후 소속 (default 토요예배)
    """
    enrolled_at: datetime.datetime
    member_type: EnrollableMemberType = '토요예배'
