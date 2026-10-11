import datetime
from typing import List, Optional

from pydantic import BaseModel


class OpinionSettingsResponse(BaseModel):
    """GET /api/opinion/settings — 설정이 없는 연도는 exists=False + 기본값 (§1-1)."""
    report_year: int
    exists: bool
    is_active: bool
    is_open: bool
    theme: Optional[str] = None
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None
    guide_text: Optional[str] = None
    member_fields: List[str]
    input_fields: List[str]


class OpinionMappingPair(BaseModel):
    writer_member_id: int
    target_member_id: int


class OpinionSettingsSaveRequest(BaseModel):
    """PUT /api/opinion/settings — exists / is_active 는 서버가 관리하므로 받지 않는다 (§1-2).

    길이·키 검증은 400 으로 내려야 해서 스키마가 아니라 서비스에서 한다 (pydantic 은 422).
    """
    report_year: int
    theme: Optional[str] = None
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None
    guide_text: Optional[str] = None
    is_open: bool = True
    member_fields: List[str] = []
    input_fields: List[str] = []
    mappings: List[OpinionMappingPair] = []


class OpinionMappingMember(BaseModel):
    member_id: int
    name: str
    gyogu: Optional[int] = None
    team: Optional[int] = None
    group_no: Optional[int] = None
    generation: Optional[int] = None
    phone_number: Optional[str] = None
    leader_names: List[str] = []


class OpinionMappingGroup(BaseModel):
    """GET /api/opinion/mappings — 작성자 기준으로 묶은 매핑 (§1-3)."""
    writer: OpinionMappingMember
    targets: List[OpinionMappingMember]
