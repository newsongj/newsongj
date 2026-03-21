from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """환경변수를 한 곳에서 관리하는 설정 클래스. .env 파일 자동 로드."""

    # DB 설정 — 기본값 없음, .env 누락 시 앱 시작 실패
    DB_HOST: str
    DB_PORT: int = 3306
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str

    # 앱 기본 설정
    APP_TITLE: str = "newsongj API"
    APP_VERSION: str = "1.0.0"

    # JWT 설정 — SECRET_KEY는 프로덕션 전환 시 .env로 교체 필요
    SECRET_KEY: str = "changeme"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24시간

    class Config:
        env_file = ".env"          # 프로젝트 루트의 .env 자동 로드
        env_file_encoding = "utf-8"
        extra = "ignore"           # .env에 정의되지 않은 변수 무시 (DB_ROOT_PASSWORD 등)


# 앱 전역에서 이 인스턴스를 import해서 사용
settings = Settings()
