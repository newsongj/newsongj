import datetime
from typing import List, Optional

from pydantic import BaseModel


# ── 회차 / 기본 정보 ────────────────────────────────────────────────────────────

class TeamAssignmentRun(BaseModel):
    target_year:       int
    total_team_count:  int
    gyogu_count:       int
    random_seed:       Optional[int] = None
    status:            str  # 'draft' | 'assigned' | 'committed'
    assigned_at:       Optional[datetime.datetime] = None
    committed_at:      Optional[datetime.datetime] = None


class TeamAssignmentBasicsBody(BaseModel):
    target_year:      int
    total_team_count: int
    gyogu_count:      int


class TeamAssignmentTargetYearBody(BaseModel):
    target_year: int


# ── 동반배치 묶음 ─────────────────────────────────────────────────────────────

class TeamAssignmentCompanionMember(BaseModel):
    member_id:     int
    name:          str
    gender:        Optional[str] = None
    generation:    Optional[int] = None
    gyogu:         Optional[int] = None
    team:          Optional[int] = None
    group_no:      Optional[int] = None
    member_type:   Optional[str] = None
    leader_names:  List[str] = []


class TeamAssignmentCompanion(BaseModel):
    companion_no: int
    members:      List[TeamAssignmentCompanionMember]


class TeamAssignmentCompanionPair(BaseModel):
    companion_no: int
    member_id:    int


class TeamAssignmentCompanionsBody(BaseModel):
    target_year: int
    pairs:       List[TeamAssignmentCompanionPair]


# ── 배치 결과 ───────────────────────────────────────────────────────────────

class TeamAssignmentRow(BaseModel):
    member_id:        int
    name:             str
    gender:           Optional[str] = None
    generation:       Optional[int] = None
    attendance_grade: Optional[str] = None
    member_type:      Optional[str] = None
    leader_names:     List[str] = []

    prev_gyogu:    Optional[int] = None
    prev_team:     Optional[int] = None
    prev_group_no: Optional[int] = None

    gyogu:        int
    team:         int
    group_no:     int
    companion_no: Optional[int] = None
    is_manual:    bool


class TeamAssignmentResultResponse(BaseModel):
    run:          TeamAssignmentRun
    target_count: int
    rows:         List[TeamAssignmentRow]


class TeamAssignmentMoveBody(BaseModel):
    target_year: int
    member_id:   int
    gyogu:       int
    team:        int
