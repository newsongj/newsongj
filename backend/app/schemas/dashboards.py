from pydantic import BaseModel
from typing import Optional
import datetime

"""대시보드 API"""
class KpiCard(BaseModel):
    """KPI 요청 등 대시보드 쿼리 기본 요소"""
    start_date: datetime.date
    end_date: datetime.date
    gyogu_no: Optional[int] = None
    team_no: Optional[int] = None
    is_imwondan: Optional[bool] = None

class Generation(BaseModel):
    """특정 기수의 출석 인원"""
    present: int
    total: int

class AbsentReasonResponse(BaseModel):
    """결석 사유"""
    reason: str
    count: int

class KpiCardResponse(BaseModel):
    """KPI 대시보드 응답"""
    avg_present: int
    total_members: int
    gen45: Generation
    """시큼이"""
    gen46: Generation
    """새큼이"""
    top_absent_reason: AbsentReasonResponse


class Trend(KpiCard):
    """최근 출석 인원 추이 요청"""
    period_unit: str  # weekly | monthly | yearly | custom | 3years

class DailyAttendance(BaseModel):
    """단위 기간의 출석 인원"""
    period: str
    present: int

class GyoguTrendResponse(BaseModel):
    """교구별 출석 인원 추이"""
    gyogu: int
    trend: list[DailyAttendance]

class CurrentTrend(BaseModel):
    year: int
    data: list[GyoguTrendResponse]

class PrevYearTrend(BaseModel):
    year: int
    data: list[DailyAttendance]

class ThreeYearsTrendResponse(BaseModel):
    """3개년 출석 추이"""
    current: CurrentTrend
    year_ago: PrevYearTrend
    two_years_ago: PrevYearTrend

class Dimention(KpiCard):
    """차원별 출석 인원 쿼리"""
    dimension: str

class DimentionResponse(BaseModel):
    """차원 기준의 출석 인원"""
    name: str
    present: int
