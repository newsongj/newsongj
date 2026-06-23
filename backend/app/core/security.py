"""인증/인가 — JWT 발급/검증 + 메뉴 기반 접근 제어."""
from datetime import timedelta
from typing import Any, Dict, List, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings
from app.core.timezone import now_kst

_bearer = HTTPBearer(auto_error=False)


def create_token(
    account_id: int,
    menus: List[str],
    data_scope: str,
    member_id: Optional[int] = None,
    gyogu: Optional[int] = None,
    team: Optional[int] = None,
    group_no: Optional[int] = None,
) -> str:
    expire = now_kst() + timedelta(hours=settings.JWT_EXPIRE_HOURS)
    payload = {
        "sub": str(account_id),
        "menus": menus,
        "data_scope": data_scope,
        "member_id": member_id,
        "gyogu": gyogu,
        "team": team,
        "group_no": group_no,
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def _decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> Dict[str, Any]:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )
    return _decode_token(credentials.credentials)


def require_menu(menu_key: str):
    """특정 메뉴 접근 권한을 요구하는 의존성 팩토리."""
    def _dep(payload: Dict[str, Any] = Depends(verify_token)) -> Dict[str, Any]:
        if menu_key not in payload.get("menus", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="접근 권한이 없습니다.",
            )
        return payload
    return _dep


def require_any_admin():
    """admin.* 메뉴 중 하나 이상 보유 시 통과 — 여러 페이지에서 공유하는 조회 엔드포인트에 사용."""
    def _dep(payload: Dict[str, Any] = Depends(verify_token)) -> Dict[str, Any]:
        menus = payload.get("menus", [])
        if not any(m.startswith("admin.") for m in menus):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="관리자 접근 권한이 없습니다.",
            )
        return payload
    return _dep
