from pydantic import BaseModel
from typing import Optional


class AttendanceStats(BaseModel):
    present: float
    total: float


class GenStats(BaseModel):
    gen: int
    present: float
    total: float


class TopReason(BaseModel):
    reason: str
    count: float


class KpiResponse(BaseModel):
    all: AttendanceStats
    by_gen: list[GenStats]
    top_reason: Optional[TopReason]


class TrendItem(BaseModel):
    period: str
    present: float


class DimensionItem(BaseModel):
    name: str
    present: float


class AbsentReasonItem(BaseModel):
    reason: str
    count: float


class GyoguStatusItem(BaseModel):
    name: str
    present: float
    absent: float
