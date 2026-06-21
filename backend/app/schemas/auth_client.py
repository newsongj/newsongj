from typing import List, Optional

from pydantic import BaseModel


class ClientLoginRequest(BaseModel):
    login_id: str
    password: str


class MemberLoginRequest(BaseModel):
    phone: str
    name: str


class ClientLoginResponse(BaseModel):
    token: str
    data_scope: str
    member_id: Optional[int] = None
    gyogu: Optional[int] = None
    team: Optional[int] = None
    group_no: Optional[int] = None
    requires_password_change: bool = False
    menus: List[str] = []
    leader_names: List[str] = []
