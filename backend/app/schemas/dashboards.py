from pydantic import BaseModel
from typing import Optional
import datetime

"""대시보드 API"""
class KpiCard(BaseModel):
    """KPI 대시보드 요청"""
    start_date: datetime.date
    end_date: datetime.date

class Generation(BaseModel):
    """특정 기수의 출석 인원"""
    present: int
    total: int

class KpiCardResponse(BaseModel):
    """KPI 대시보드 응답"""
    avg_present: int
    total_members: int
    """시큼이"""
    gen45: Generation
    """새큼이"""
    gen46: Generation


class Trend(BaseModel):
    period_unit: str  # weekly | monthly | yearly | custom
    start_date: datetime.date
    end_date: datetime.date
    gyogu_no: Optional[int] = None
    team_no: Optional[int] = None
    is_imwondan: Optional[bool] = None

class DailyAttendance(BaseModel):
    """단위 기간의 출석 인원"""
    period: str
    present: int

class TrendResponse(BaseModel):
    """출석 인원 추이 응답"""
    data: list[DailyAttendance]
