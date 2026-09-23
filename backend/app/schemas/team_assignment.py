import datetime
from typing import List, Optional

from pydantic import BaseModel


class TeamAssignmentMemberInfo(BaseModel):
    """제외 명단·동반배치 GET 응답에 함께 내려가는 멤버 정보 — 화면이 join 없이 그리게 한다."""
    member_id: int
    name: str
    gyogu: Optional[int] = None
    team: Optional[int] = None
    group_no: Optional[int] = None
    leader_names: List[str] = []


class TeamAssignmentRunResponse(BaseModel):
    target_year: int
    total_team_count: int
    gyogu_count: int
    random_seed: Optional[int] = None
    status: str
    assigned_at: Optional[datetime.datetime] = None
    committed_at: Optional[datetime.datetime] = None


# ── 제외 명단 ─────────────────────────────────────────────────────────────────

class TeamAssignmentExclusionItemIn(BaseModel):
    member_id: int
    gyogu: int
    team: int
    reason: Optional[str] = None


class TeamAssignmentExclusionsSaveRequest(BaseModel):
    target_year: int
    items: List[TeamAssignmentExclusionItemIn]


class TeamAssignmentExclusionOut(BaseModel):
    member: TeamAssignmentMemberInfo
    gyogu: int
    team: int
    reason: Optional[str] = None


# ── 동반배치 묶음 ─────────────────────────────────────────────────────────────

class TeamAssignmentCompanionPairIn(BaseModel):
    companion_no: int
    member_id: int


class TeamAssignmentCompanionsSaveRequest(BaseModel):
    target_year: int
    pairs: List[TeamAssignmentCompanionPairIn]


class TeamAssignmentCompanionOut(BaseModel):
    companion_no: int
    members: List[TeamAssignmentMemberInfo]


# ── 집계 ──────────────────────────────────────────────────────────────────────

class TeamAssignmentCountsResponse(BaseModel):
    total: int
    newcomer: int
    regular: int
    random: int
    companion: int
    excluded: int


# ── 팀배치 작업 (§4) ────────────────────────────────────────────────────────────

class TeamAssignmentBasicsRequest(BaseModel):
    target_year: int
    total_team_count: int
    gyogu_count: int


class TeamAssignmentResultRow(BaseModel):
    member_id: int
    name: str
    gender: Optional[str] = None
    generation: Optional[int] = None
    phone_number: Optional[str] = None
    birthdate: Optional[datetime.date] = None
    attendance_grade: Optional[str] = None
    member_type: Optional[str] = None
    plt_status: Optional[str] = None
    school_work: Optional[str] = None
    major: Optional[str] = None
    v8pid: Optional[str] = None
    enrolled_at: Optional[datetime.datetime] = None
    leader_names: List[str] = []

    prev_gyogu: Optional[int] = None
    prev_team: Optional[int] = None
    prev_group_no: Optional[int] = None

    gyogu: int
    team: int
    group_no: int = 0
    companion_no: Optional[int] = None
    is_excluded: bool = False
    is_manual: bool = False


class TeamAssignmentRunResultResponse(BaseModel):
    run: TeamAssignmentRunResponse
    counts: TeamAssignmentCountsResponse
    rows: List[TeamAssignmentResultRow]


class TeamAssignmentRunRequest(BaseModel):
    target_year: int


class TeamAssignmentMoveRequest(BaseModel):
    target_year: int
    member_id: int
    gyogu: int
    team: int


class TeamAssignmentCommitRequest(BaseModel):
    target_year: int


class TeamAssignmentCommitResponse(BaseModel):
    run: TeamAssignmentRunResponse
    profile_rows_created: int
