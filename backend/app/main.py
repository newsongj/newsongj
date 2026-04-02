from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.core.config import settings
import app.models  # noqa: F401 - Base에 테이블 등록을 위해 import 필요
from app.api.v1.gyojeok import members, dashboard
from app.api.v1.attendance import attendanceRecord
from app.tests import test as test_router
from app.api.v1.meta.leaders import router as meta_leaders_router

# Alembic 현재 미사용. create_all은 개발 편의용으로만 유지
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router, prefix="/api/attendance")
app.include_router(attendanceRecord.router, prefix="/api/attendance")
app.include_router(test_router.router, prefix="/test")
app.include_router(members.router, prefix=f"{settings.API_PREFIX}/gyojeok")
app.include_router(leaders.router)


@app.get("/")
def read_root():
    return {"message": "ok"}
