"""메타 데이터 응답 스키마"""
from pydantic import BaseModel


class LeaderResponse(BaseModel):
    """직분(리더) 단건 응답"""
    leader_id: int
    leader_name: str

    model_config = {"from_attributes": True}
