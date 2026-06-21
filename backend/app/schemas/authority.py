from typing import Dict, List, Optional

from pydantic import BaseModel

MENU_KEYS: List[str] = [
    "admin.authority.accounts",
    "admin.authority.policies",
    "admin.gyojeok.attendance_dashboard",
    "admin.gyojeok.attendance",
    "admin.gyojeok.members",
    "admin.gyojeok.newcomers",
    "admin.gyojeok.deleted_members",
    "admin.retreat.create",
    "admin.retreat.edit",
    "admin.retreat.dashboard",
    "admin.retreat.research_list",
    "admin.retreat.vehicle_list",
    "admin.retreat.suspended_meal",
    "user.research",
    "user.vehicle",
    "user.suspended_meal",
]

MENU_LABELS: Dict[str, str] = {
    "admin.authority.accounts":            "계정 관리",
    "admin.authority.policies":            "정책 관리",
    "admin.gyojeok.attendance_dashboard":  "출석 대시보드",
    "admin.gyojeok.attendance":            "출석 관리",
    "admin.gyojeok.members":               "교적 명단",
    "admin.gyojeok.newcomers":             "미등반 새가족 명단",
    "admin.gyojeok.deleted_members":       "삭제 명단",
    "admin.retreat.create":                "수련회 생성",
    "admin.retreat.edit":                  "수련회 설정 수정",
    "admin.retreat.dashboard":             "수련회 대시보드",
    "admin.retreat.research_list":         "인원조사 명단",
    "admin.retreat.vehicle_list":          "차량조사 명단",
    "admin.retreat.suspended_meal":        "서스펜디드밀 명단",
    "user.research":                       "인원조사",
    "user.vehicle":                        "차량조사",
    "user.suspended_meal":                 "서스펜디드밀",
}

MENU_GROUPS: Dict[str, List[str]] = {
    "권한관리": ["admin.authority.accounts", "admin.authority.policies"],
    "교적관리": [
        "admin.gyojeok.attendance_dashboard",
        "admin.gyojeok.attendance",
        "admin.gyojeok.members",
        "admin.gyojeok.newcomers",
        "admin.gyojeok.deleted_members",
    ],
    "수련회": [
        "admin.retreat.create",
        "admin.retreat.edit",
        "admin.retreat.dashboard",
        "admin.retreat.research_list",
        "admin.retreat.vehicle_list",
        "admin.retreat.suspended_meal",
    ],
    "사용자": ["user.research", "user.vehicle", "user.suspended_meal"],
}


# ── 계정 ─────────────────────────────────────────────────────────────────────

class AccountResponse(BaseModel):
    account_id: int
    login_id: str
    data_scope: str
    is_active: bool
    member_id: Optional[int] = None
    name: Optional[str] = None
    gyogu: Optional[int] = None
    team: Optional[int] = None
    group_no: Optional[int] = None
    policy_id: Optional[int] = None
    policy_name: Optional[str] = None


class AccountCreate(BaseModel):
    login_id: str
    password: str
    data_scope: str
    policy_id: Optional[int] = None


class AccountPasswordUpdate(BaseModel):
    password: str


class AccountScopeUpdate(BaseModel):
    data_scope: str


class AccountStatusUpdate(BaseModel):
    is_active: bool


class AccountPolicyUpdate(BaseModel):
    policy_id: Optional[int] = None


class BulkDeactivateRequest(BaseModel):
    account_ids: List[int]


class BulkDeleteRequest(BaseModel):
    account_ids: List[int]


# ── 정책 ─────────────────────────────────────────────────────────────────────

class PolicyResponse(BaseModel):
    policy_id: int
    policy_name: str
    description: Optional[str] = None
    menus: List[str] = []


class PolicyCreate(BaseModel):
    policy_name: str
    description: Optional[str] = None
    menus: List[str] = []


class PolicyUpdate(BaseModel):
    policy_name: str
    description: Optional[str] = None
    menus: List[str] = []


# ── 리더 일괄 계정 관리 ──────────────────────────────────────────────────────

class LeaderPreviewItem(BaseModel):
    member_id: int
    name: str
    login_id: str
    gyogu: int
    team: int
    group_no: int
    leader_names: List[str]


class LeaderWithAccountItem(BaseModel):
    member_id: int
    name: str
    login_id: str
    gyogu: int
    team: int
    group_no: int
    leader_names: List[str]
    account_id: Optional[int] = None
    has_account: bool = False
    is_active: bool = False
    policy_id: Optional[int] = None
    data_scope: Optional[str] = None


class BulkLeaderCreateRequest(BaseModel):
    member_ids: List[int]
    data_scope: str
    policy_id: Optional[int] = None


class BulkLeaderCreateResultItem(BaseModel):
    name: str
    login_id: str
    password: str


class BulkSyncRequest(BaseModel):
    all_leader_member_ids: List[int]
    active_member_ids: List[int]
    data_scope: str
    policy_id: Optional[int] = None


class BulkSyncResult(BaseModel):
    created: List[BulkLeaderCreateResultItem] = []
    deactivated_count: int = 0


# ── 범위별 정책 할당 ──────────────────────────────────────────────────────────

class ScopePoliciesResponse(BaseModel):
    all: List[int] = []
    team: List[int] = []
    group: List[int] = []
    member: List[int] = []


class ScopePoliciesUpdate(BaseModel):
    all: List[int] = []
    team: List[int] = []
    group: List[int] = []
    member: List[int] = []
