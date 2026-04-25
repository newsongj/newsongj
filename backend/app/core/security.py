"""인증/인가 — JWT 발급/검증 + 토큰 검증 Depends.

임시 하드코딩 — 추후 환경변수로 이전 예정.
"""
from datetime import timedelta
from typing import Any, Dict

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
