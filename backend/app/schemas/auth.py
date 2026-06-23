"""인증 스키마 — /api/v1/me 응답"""
from typing import List, Optional

from pydantic import BaseModel


class LogoutResponse(BaseModel):
    success: bool
    message: str


class MenuInfo(BaseModel):
    menu_idx: int
    name: str
    description: Optional[str] = None
    code: str
    is_activated: bool


class MeResponse(BaseModel):
    user_idx: int
    email: str
    name: str
    dept_idx: Optional[int] = None
    roles: List[str]
    menus: List[MenuInfo]
