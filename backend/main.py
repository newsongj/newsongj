from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import get_db
import models

app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "deploy skip 오류 수정 test"}


@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()
