from pydantic import BaseModel
from typing import Optional

class PageMeta(BaseModel):
    current_page: int
    page_size: int
    total_items: int
    
class AttendanceRecordList(BaseModel):
    """ 출석 기록 조회 쿼리 스키마"""
    worship_date: str
    gyogu_no: Optional[int]
    team_no: Optional[int] = None
    group_no: Optional[int] = None
    is_imwondan: Optional[bool] = None
    meta: PageMeta


class AttendanceRecord(BaseModel):
    """개인의 출석 여부 스키마"""
    member_id: int
    status: str
    absent_reason: Optional[str] = None

class AttendanceRecordListResponse(BaseModel):
    """출석 기록 조회 결과 스키마"""
    total_count: int
    items: list[AttendanceRecord]


class AttendanceRecordItem(AttendanceRecord):
    """출석관리 페이지 출력용 스키마"""
    name: str
    generation: str
    leader_name: Optional[str]
    gyogu: int
    team: int
    group: int
    
class AttendanceRecordsCreate(BaseModel):
    """저장 요청된 출석 데이터 스키마"""
    worship_date: Optional[str]
    records: list[AttendanceRecord]

class AttendanceRecordCountResponse(BaseModel):
    """저장된 출석 데이터 수량 스키마"""
    save_count: int