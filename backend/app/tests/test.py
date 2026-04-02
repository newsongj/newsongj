from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from ...tests.attendanceRecord_test import test_create_attendance, create_test_members
from app.models import Member, MemberProfile

router = APIRouter()

@router.get("/member_test")
def insert_member(db: Session = Depends(get_db)):
    #test_create_attendance()
    ids = create_test_members(db, ["t1", "t2", "t3"])
    return ids

@router.get("/all")
def search_member(db: Session = Depends(get_db)):
    result= db.query(Member).all()

    return result

@router.get("/profile/all")
def profile_all(db: Session = Depends(get_db)):
    result = db.query(MemberProfile).all()
    return result

@router.get("/testing")
def test(db: Session = Depends(get_db)):
    test_create_attendance(db)
    return {'완료'}