"""인증 서비스 — 로그인 검증 + 응답 빌드"""
from fastapi import HTTPException, status

from app.core.security import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    create_access_token,
)
from app.schemas.auth import LoginRequest, LoginResponse, LogoutResponse, MeResponse


def build_login_response(body: LoginRequest) -> LoginResponse:
    if body.email != ADMIN_EMAIL or body.password != ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
        )
    token = create_access_token(subject=body.email)
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        requires_password_change=False,
    )


def build_me_response(email: str) -> MeResponse:
    return MeResponse(
        user_idx=1,
        email=email,
        name="관리자",
        dept_idx=None,
        roles=["admin"],
        menus=[],
        requires_password_change=False,
    )


def build_logout_response() -> LogoutResponse:
    return LogoutResponse(success=True, message="로그아웃되었습니다.")
