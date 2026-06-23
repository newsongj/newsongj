"""버스 API — 추가 / 삭제"""
from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_any_admin
from app.schemas.retreat import BusCreate, BusIdResponse
from app.services.retreat import svc_create_bus, svc_delete_bus

router = APIRouter()

_any_admin = Depends(require_any_admin())


@router.post("", response_model=BusIdResponse, status_code=201, summary="버스 추가", dependencies=[_any_admin])
def create_bus(body: BusCreate, db: Session = Depends(get_db)):
    return svc_create_bus(db, body)


@router.delete("/{bus_id}", status_code=200, summary="버스 삭제", dependencies=[_any_admin])
def delete_bus(bus_id: int = Path(...), db: Session = Depends(get_db)):
    svc_delete_bus(db, bus_id)
    return {"ok": True}
