import os
from pathlib import Path
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _get_env_files() -> tuple[str, ...]:
    # config.py 위치(backend/app/core/) 기준으로 backend/ 디렉토리를 고정
    base_dir = Path(__file__).resolve().parent.parent.parent.parent
    app_env = os.getenv("APP_ENV", "").strip().lower()
    candidates = [base_dir / ".env"]
    if app_env:
        candidates.append(base_dir / f".env.{app_env}")
    return tuple(str(c) for c in candidates if c.exists())


class Settings(BaseSettings):
    """환경변수를 한 곳에서 관리하는 설정 클래스. .env 파일 자동 로드."""

    model_config = SettingsConfigDict(
        env_file=_get_env_files(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # URL
    FRONTEND_URL: str = Field(..., env="FRONTEND_URL")
    BACKEND_URL: str = Field(..., env="BACKEND_URL")

    # MySQL 데이터베이스
    DB_HOST: str = Field(..., env="DB_HOST")
    DB_PORT: int = Field(..., env="DB_PORT")
    DB_USER: str = Field(..., env="DB_USER")
    DB_PASSWORD: str = Field(..., env="DB_PASSWORD")
    DB_NAME: str = Field(..., env="DB_NAME")

    # 앱 기본 설정
    APP_TITLE: str = "newsongj API"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"

    # JWT 설정 — SECRET_KEY는 프로덕션 전환 시 .env로 교체 필요
    SECRET_KEY: str = "changeme"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24시간

    @property
    def cors_origins(self) -> List[str]:
        return [self.FRONTEND_URL]


# 앱 전역에서 이 인스턴스를 import해서 사용
settings = Settings()
