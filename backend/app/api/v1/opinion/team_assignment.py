"""팀배치 API — 기본정보/동반배치 설정, 배치 실행/조회/조정, 확정 (관리자)"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_menu
from app.schemas.team_assignment import (
    TeamAssignmentBasicsBody,
    TeamAssignmentCompanion,
    TeamAssignmentCompanionsBody,
    TeamAssignmentMoveBody,
    TeamAssignmentResultResponse,
    TeamAssignmentRun,
    TeamAssignmentTargetYearBody,
)
from app.services.team_assignment import (
    svc_commit,
    svc_get_companions,
    svc_get_result,
    svc_get_run,
    svc_move_member,
    svc_run_assignment,
    svc_save_basics,
    svc_save_companions,
)
from typing import List

router = APIRouter(prefix="/api/opinion/team-assignment", tags=["team-assignment"])

_perm = Depends(require_menu("admin.opinion.team_assignment"))


@router.get("", response_model=TeamAssignmentRun, summary="팀배치 회차 조회", dependencies=[_perm])
def get_run(target_year: int, db: Session = Depends(get_db)):
    return svc_get_run(db, target_year)


@router.put("/basics", status_code=200, summary="팀배치 기본정보 저장", dependencies=[_perm])
def save_basics(body: TeamAssignmentBasicsBody, db: Session = Depends(get_db)):
    svc_save_basics(db, body)
    return {"ok": True}


@router.get("/companions", response_model=List[TeamAssignmentCompanion], summary="동반배치 묶음 조회", dependencies=[_perm])
def get_companions(target_year: int, db: Session = Depends(get_db)):
    return svc_get_companions(db, target_year)


@router.put("/companions", status_code=200, summary="동반배치 묶음 저장 (해당 연도 전체 대체)", dependencies=[_perm])
def save_companions(body: TeamAssignmentCompanionsBody, db: Session = Depends(get_db)):
    svc_save_companions(db, body.target_year, body.pairs)
    return {"ok": True}


@router.post("/run", response_model=TeamAssignmentResultResponse, summary="팀배치 실행 (기존 결과 덮어씀)", dependencies=[_perm])
def run_assignment(body: TeamAssignmentTargetYearBody, db: Session = Depends(get_db)):
    return svc_run_assignment(db, body.target_year)


@router.get("/result", response_model=TeamAssignmentResultResponse, summary="팀배치 결과 조회", dependencies=[_perm])
def get_result(target_year: int, db: Session = Depends(get_db)):
    return svc_get_result(db, target_year)


@router.put("/move", status_code=200, summary="팀 이동 (수기 조정)", dependencies=[_perm])
def move_member(body: TeamAssignmentMoveBody, db: Session = Depends(get_db)):
    svc_move_member(db, body.target_year, body)
    return {"ok": True}


@router.post("/commit", status_code=200, summary="팀배치 확정 (교적 이관 + 소견서 회차 종료)", dependencies=[_perm])
def commit(body: TeamAssignmentTargetYearBody, db: Session = Depends(get_db)):
    svc_commit(db, body.target_year)
    return {"ok": True}
