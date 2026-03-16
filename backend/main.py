from fastapi import FastAPI
from database import engine, Base

# models import: create_all()이 테이블 자동 생성하지 않도록 models는 참조만
import models

# DB에 models.py 기준 테이블 자동 생성 (없는 테이블만 생성, 기존 테이블 건드리지 않음)
Base.metadata.create_all(bind=engine)

app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "ok"}
