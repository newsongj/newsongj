from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session, joinedload

import models
from schemas import member_schema


# 상세 교적 1건
def get_user_profile(db: Session, id: int, year: Optional[int] = None):
    if year is None:
        year = datetime.now().year
    # 1. 유저 정보 가져오기
    user = db.query(models.User).filter(models.User.member_id == id).first()
    if not user:
        return None

    # 2. 해당 유저의 프로필 중 연도가 일치하는 첫 번째 데이터를 찾습니다.
    # (SQLAlchemy의 쿼리 필터를 사용)
    specific_profile = db.query(models.UserProfile).filter(
        models.UserProfile.member_id == id,
        models.UserProfile.year == year
    ).first()

    # 응답에서 특정 연도의 프로필만 노출
    user.profile = [specific_profile] if specific_profile else []
    return user


# 조건 필터로 교적 목록 조회
def get_users_filtered(
    db: Session,
    *,
    year: Optional[int] = None,
    is_deleted: Optional[bool] = None,
    generation: Optional[int] = None,
    gender: Optional[str] = None,
    name_keyword: Optional[str] = None,
    skip: int = 0,
    limit: int = 30,
):

    query = db.query(models.User)

    if is_deleted is True:
        query = query.filter(models.User.deleted_at.is_not(None))
    elif is_deleted is False:
        query = query.filter(models.User.deleted_at.is_(None))

    if generation is not None:
        query = query.filter(models.User.generation == generation)
    if gender is not None:
        query = query.filter(models.User.gender == gender)
    if name_keyword:
        query = query.filter(models.User.name.contains(name_keyword))

    query = (
        query.options(joinedload(models.User.profile))
        .order_by(models.User.member_id.desc())
        .offset(skip)
        .limit(limit)
    )
    users = query.all()

    if year is None:
        year = datetime.now().year

    for user in users:
        target_profile = next((p for p in user.profile if p.year == year), None)
        user.profile = [target_profile] if target_profile else []
    return users

def get_profile(db: Session, id:int):
    return db.query(models.UserProfile).filter(models.UserProfile.member_id == id)

# 삭제되지 않은 교적들
def get_users(db: Session, skip: int = 0, limit: int = 30):
    return get_users_filtered(db, is_deleted=False, skip=skip, limit=limit)


# 삭제된 교적들
def get_deleted_users(db: Session, skip: int = 0, limit: int = 30):
    return get_users_filtered(db, is_deleted=True, skip=skip, limit=limit)


# deleted_at / deleted_reason 입력
def mark_user_deleted(
    db: Session,
    member_id: int,
    deleted_reason: Optional[str] = None,
    deleted_at: Optional[datetime] = None,
):
    user = get_user_profile(db, member_id)
    if user is None:
        return None

    user.deleted_at = deleted_at or datetime.now()
    user.deleted_reason = deleted_reason
    db.commit()
    db.refresh(user)
    return user


# deleted_at / deleted_reason 초기화
def clear_user_deleted(db: Session, member_id: int):
    user = get_user_profile(db, member_id)
    if user is None:
        return None

    user.deleted_at = None
    user.deleted_reason = None
    db.commit()
    db.refresh(user)
    return user


def create_user(db: Session, user: member_schema.User):
    db_user = models.User(
        name=user.name,
        gender=user.gender,
        generation=user.generation,
        phone_number=user.phone_number,
        v8pid=user.v8pid,
        birthdate=user.birthdate,
        enrolled_at=user.enrolled_at,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def edit_user(db: Session, user: member_schema.User):
    db_user = db.query(models.User).filter(models.User.member_id == user.member_id).first()
    if db_user is None:
        return None

    db_user.name = user.name
    db_user.gender = user.gender
    db_user.generation = user.generation
    db_user.phone_number = user.phone_number
    db_user.v8pid = user.v8pid
    db_user.birthdate = user.birthdate
    db_user.enrolled_at = user.enrolled_at

    db.commit()
    db.refresh(db_user)
    return db_user
