"""인증 스키마 — 프론트(`models/auth.types.ts`) 스펙과 일치"""
from typing import List, Optional

from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    requires_password_change: bool = False
    message: Optional[str] = None


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
    requires_password_change: bool = False
