import logging

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.core.config import settings
from app.core.middleware import register_exception_handlers, register_request_logger
from app.core.security import verify_token
import app.models  # noqa: F401 - Base에 테이블 등록을 위해 import 필요
from app.api.v1.auth import auth as auth_router
from app.api.v1.gyojeok import members
from app.api.v1.meta import leaders
from app.api.v1.attendance import records as attendance_records
from app.api.v1.attendance import dashboard as attendance_dashboard

# 로깅 기본 설정 — 요청 로거 / 예외 핸들러가 사용
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

# Alembic 현재 미사용. create_all은 개발 편의용으로만 유지
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)
register_request_logger(app)

app.include_router(auth_router.router)
app.include_router(
    members.router,
    prefix=f"{settings.API_PREFIX}/gyojeok",
    dependencies=[Depends(verify_token)],
)
app.include_router(leaders.router, dependencies=[Depends(verify_token)])
app.include_router(attendance_records.router, dependencies=[Depends(verify_token)])
app.include_router(attendance_dashboard.router, dependencies=[Depends(verify_token)])


@app.get("/")
def read_root():
    return {"message": "ok"}
