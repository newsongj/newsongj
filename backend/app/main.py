from fastapi import FastAPI
from app.core.database import engine, Base
import app.models  # noqa: F401 - Base에 테이블 등록을 위해 import 필요

# Alembic을 사용하므로 create_all은 개발 편의용으로만 유지
Base.metadata.create_all(bind=engine)

app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "ok"}
