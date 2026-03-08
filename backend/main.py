from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import user

app = FastAPI()

@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all() 
