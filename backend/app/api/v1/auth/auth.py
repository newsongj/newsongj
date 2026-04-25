"""인증 API — 로그인 / 내 정보 / 로그아웃 (프론트 스펙 일치)"""
from typing import Any, Dict

from fastapi import APIRouter, Depends

from app.core.security import verify_token
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    MeResponse,
)
from app.services.auth import (
    build_login_response,
    build_logout_response,
    build_me_response,
)

router = APIRouter()


@router.post("/api/v1/local/login", response_model=LoginResponse, tags=["인증"], summary="로컬 로그인")
def create_local_login(body: LoginRequest) -> LoginResponse:
    return build_login_response(body)


@router.get("/api/v1/me", response_model=MeResponse, tags=["인증"], summary="내 정보 조회")
def get_me(payload: Dict[str, Any] = Depends(verify_token)) -> MeResponse:
    return build_me_response(email=payload.get("sub", ""))


@router.post("/api/v1/logout", response_model=LogoutResponse, tags=["인증"], summary="로그아웃")
def create_logout(_: Dict[str, Any] = Depends(verify_token)) -> LogoutResponse:
    return build_logout_response()
