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
    period: str          # 짧은 라벨 ("1/4", "1월", "2026년")
    date: str            # ISO YYYY-MM-DD — 정렬/툴팁/연도 판별용
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


class DimensionBreakdown(BaseModel):
    """차원별 출석 평균. gyogu/team은 필터 조합에 따라 조건부."""
    gyogu: Optional[list[DimensionItem]] = None       # gyogu_no 미지정일 때만
    team: Optional[list[DimensionItem]] = None        # gyogu_no 지정 + team_no 미지정일 때만
    generation: list[DimensionItem]
    gender: list[DimensionItem]
    leader: list[DimensionItem]


class DashboardResponse(BaseModel):
    """출석 대시보드 통합 응답 — 5개 섹션 한 번에.

    trend는 lookback(weekly:12주, monthly:6달, yearly:3년, custom:범위 전체)이지만
    나머지 섹션(kpi/dimension/absent_reason/gyogu_status)은 단일 시점/범위만 본다.
    모든 수치는 주(토요일) 평균.
    """
    kpi: KpiResponse
    trend: list[TrendItem]
    dimension: DimensionBreakdown
    absent_reason: list[AbsentReasonItem]
    gyogu_status: list[GyoguStatusItem]
