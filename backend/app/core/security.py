"""인증/인가 — JWT 발급/검증 + 토큰 검증 Depends.

임시 하드코딩 — 추후 환경변수로 이전 예정.
"""
from datetime import timedelta
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.timezone import now_kst

# === 임시 하드코딩 (TODO: .env로 이전) ===
ADMIN_EMAIL = "newsongj"
ADMIN_PASSWORD = "password"
JWT_SECRET = "dev-secret-newsongj-2026"
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24

_bearer = HTTPBearer(auto_error=False)


def create_access_token(subject: str) -> str:
    """JWT 발급 — sub=email, exp=24h"""
    expire = now_kst() + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


def create_client_token(
    account_id: int,
    data_scope: str,
    member_id: Optional[int] = None,
    gyogu: Optional[int] = None,
    team: Optional[int] = None,
    group_no: Optional[int] = None,
) -> str:
    """클라이언트 사용자 JWT 발급 — type=client 클레임으로 어드민 토큰과 구분"""
    expire = now_kst() + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {
        "sub": str(account_id),
        "type": "client",
        "data_scope": data_scope,
        "member_id": member_id,
        "gyogu": gyogu,
        "team": team,
        "group_no": group_no,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> Dict[str, Any]:
    """보호 라우터에 Depends로 부착 — 토큰 없거나 위조/만료 시 401"""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )
    return decode_access_token(credentials.credentials)


def verify_client_token(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> Dict[str, Any]:
    """사용자 전용 라우터에 Depends로 부착 — client 타입 토큰만 허용"""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )
    payload = decode_access_token(credentials.credentials)
    if payload.get("type") != "client":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
    return payload
