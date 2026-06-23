"""인증 API — 내 정보 / 로그아웃"""
from typing import Any, Dict

from fastapi import APIRouter, Depends

from app.core.security import verify_token
from app.schemas.auth import LogoutResponse, MeResponse
from app.services.auth import build_logout_response, build_me_response

router = APIRouter()


@router.get("/api/v1/me", response_model=MeResponse, tags=["인증"], summary="내 정보 조회")
def get_me(payload: Dict[str, Any] = Depends(verify_token)) -> MeResponse:
    return build_me_response(payload)


@router.post("/api/v1/logout", response_model=LogoutResponse, tags=["인증"], summary="로그아웃")
def create_logout(_: Dict[str, Any] = Depends(verify_token)) -> LogoutResponse:
    return build_logout_response()
