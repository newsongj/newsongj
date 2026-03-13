from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from newsongj.backend.crud import member_crud
from database import get_db
from schemas import member_schema

router = APIRouter(prefix="/users", tags=["Users"])


class UserDeletePayload(BaseModel):
    deleted_reason: Optional[str] = None
    deleted_at: Optional[datetime] = None


@router.get("/all", response_model=List[member_schema.User])
def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(30, ge=1, le=100),
    year: Optional[int] = None,
    db: Session = Depends(get_db),
):
    if year is None:
        year = datetime.now().year

    return member_crud.get_users(db, skip=skip, limit=limit)


@router.get("/deleted_users", response_model=List[member_schema.UserDelete])
def get_deleted_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return member_crud.get_deleted_users(db, skip=skip, limit=limit)


@router.get("/filtered", response_model=List[member_schema.UserDelete])
def get_filtered_users(
    year: Optional[int] = Query(None),
    is_deleted: Optional[bool] = Query(None),
    generation: Optional[int] = Query(None, ge=0),
    gender: Optional[str] = Query(None),
    name_keyword: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    users = member_crud.get_users_filtered(
        db,
        year=year,
        is_deleted=is_deleted,
        generation=generation,
        gender=gender,
        name_keyword=name_keyword,
        skip=skip,
        limit=limit,
    )

    return users


@router.get("/{member_id}", response_model=member_schema.UserDelete)
def get_user_profile(member_id: int, db: Session = Depends(get_db), year: Optional[int] = None):

    if year is None:
        year = datetime.now().year

    user = member_crud.get_user_profile(db, member_id, year)

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.put("/{member_id}/delete", response_model=member_schema.UserDelete)
def delete_user(
    member_id: int,
    payload: UserDeletePayload,
    db: Session = Depends(get_db),
):
    user = member_crud.mark_user_deleted(
        db,
        member_id=member_id,
        deleted_reason=payload.deleted_reason,
        deleted_at=payload.deleted_at,
    )
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{member_id}/restore", response_model=member_schema.UserDelete)
def restore_user(member_id: int, db: Session = Depends(get_db)):
    user = member_crud.clear_user_deleted(db, member_id=member_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user