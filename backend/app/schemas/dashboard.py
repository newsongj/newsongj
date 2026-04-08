from pydantic import BaseModel
from typing import Optional


class AttendanceStats(BaseModel):
    present: int
    total: int


class GenStats(BaseModel):
    gen: int
    present: int
    total: int


class TopReason(BaseModel):
    reason: str
    count: int


class KpiResponse(BaseModel):
    all: AttendanceStats
    by_gen: list[GenStats]
    top_reason: Optional[TopReason]
