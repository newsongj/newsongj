"""인증 서비스 — /api/v1/me 응답 빌드."""
from typing import Any, Dict, List

from app.schemas.auth import MenuInfo, MeResponse, LogoutResponse


def build_me_response(payload: Dict[str, Any]) -> MeResponse:
    menus_from_token: List[str] = payload.get("menus", [])
    return MeResponse(
        user_idx=int(payload["sub"]) if str(payload.get("sub", "")).isdigit() else 0,
        email=str(payload.get("sub", "")),
        name="사용자",
        roles=[],
        menus=[
            MenuInfo(menu_idx=i, name=key, code=key, is_activated=True)
            for i, key in enumerate(menus_from_token)
        ],
    )


def build_logout_response() -> LogoutResponse:
    return LogoutResponse(success=True, message="로그아웃되었습니다.")
