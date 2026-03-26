from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
import app.models  # noqa: F401 - Base에 테이블 등록을 위해 import 필요
from app.api.v1.gyojeok import members
from app.api.v1.meta.leaders import router as meta_leaders_router

# Alembic 현재 미사용. create_all은 개발 편의용으로만 유지
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(members.router, prefix="/api/v1/gyojeok")
app.include_router(meta_leaders_router)


@app.get("/")
def read_root():
    return {"message": "ok"}
