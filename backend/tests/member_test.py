from datetime import date, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.v1.gyojeok import member
from database import get_db
from models import User, UserProfile


router = APIRouter(prefix="/test", tags=["test"])

@router.get("")
def insert_user(db: Session = Depends(get_db)):
    suffix = datetime.now().strftime("%Y%m%d%H%M%S")
    new_user = User(
        name=f"test_user_{suffix[-4:]}",
        gender="남",
        generation=10,
        phone_number=f"010-{suffix[8:12]}-{suffix[12:]}",
        v8pid=f"v8_{suffix}",
        birthdate=date(2000, 1, 1),
        enrolled_at=datetime.now(),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {
        "message": "user inserted",
        "member_id": new_user.member_id,
        "name": new_user.name,
        "v8pid": new_user.v8pid,
    }

@router.get("/p")
def insert_profile(db: Session = Depends(get_db), id=0):
    suffix = datetime.now().strftime("%Y%m%d%H%M%S")
    new_profile = UserProfile(
        member_id=id,
        year=suffix[0:4],
        member_type="토요예배",
        attendance_rate=0,
        attendance_grade="C",
        gyogu=1,
        team=1,
        group_no=0,
        leader=None,
        plt_status="수료"
    )
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)
    return {
        "message": "profile inserted",
        "member_id": new_profile.member_id,
        "name": new_profile.name,
    }