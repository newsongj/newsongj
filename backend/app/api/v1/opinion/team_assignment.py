"""팀배치 API — 사전 설정(§3) / 배치 작업(§4)"""
from fastapi import APIRouter, Depends, Query

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_any_menu, require_menu
from app.schemas.team_assignment import (
    TeamAssignmentBasicsRequest, TeamAssignmentCommitRequest, TeamAssignmentCommitResponse,
    TeamAssignmentCompanionOut, TeamAssignmentCompanionsSaveRequest,
    TeamAssignmentCountsResponse,
    TeamAssignmentExclusionOut, TeamAssignmentExclusionsSaveRequest,
    TeamAssignmentMoveRequest, TeamAssignmentRunRequest, TeamAssignmentRunResponse,
    TeamAssignmentRunResultResponse,
)
from app.services.team_assignment import (
    svc_commit_assignment, svc_get_companions, svc_get_counts, svc_get_exclusions,
    svc_get_result, svc_get_run, svc_move_member, svc_run_assignment,
    svc_save_basics, svc_save_companions, svc_save_exclusions,
)

router = APIRouter()

_pre_assignment = Depends(require_menu("admin.opinion.pre_assignment"))
_team_assignment = Depends(require_menu("admin.opinion.team_assignment"))
_run_read = Depends(require_any_menu("admin.opinion.pre_assignment", "admin.opinion.team_assignment"))


# ── 팀배치 사전 설정 (§3) ────────────────────────────────────────────────────────────

@router.get("/team-assignment", response_model=TeamAssignmentRunResponse, tags=["팀배치 사전 설정"], summary="회차 조회 — 사전 설정·배치 작업 화면 공용", dependencies=[_run_read])
def get_team_assignment_run(
    target_year: int = Query(...),
    db: Session = Depends(get_db),
):
    return svc_get_run(db, target_year)


@router.get("/team-assignment/exclusions", response_model=list[TeamAssignmentExclusionOut], tags=["팀배치 사전 설정"], summary="제외 명단 조회", dependencies=[_pre_assignment])
def get_team_assignment_exclusions(
    target_year: int = Query(...),
    db: Session = Depends(get_db),
):
    return svc_get_exclusions(db, target_year)


@router.put("/team-assignment/exclusions", status_code=200, tags=["팀배치 사전 설정"], summary="제외 명단 전체 대체", dependencies=[_pre_assignment])
def put_team_assignment_exclusions(
    body: TeamAssignmentExclusionsSaveRequest,
    db: Session = Depends(get_db),
):
    svc_save_exclusions(db, body.target_year, body.items)


@router.get("/team-assignment/companions", response_model=list[TeamAssignmentCompanionOut], tags=["팀배치 사전 설정"], summary="동반배치 묶음 조회", dependencies=[_pre_assignment])
def get_team_assignment_companions(
    target_year: int = Query(...),
    db: Session = Depends(get_db),
):
    return svc_get_companions(db, target_year)


@router.put("/team-assignment/companions", status_code=200, tags=["팀배치 사전 설정"], summary="동반배치 묶음 전체 대체", dependencies=[_pre_assignment])
def put_team_assignment_companions(
    body: TeamAssignmentCompanionsSaveRequest,
    db: Session = Depends(get_db),
):
    svc_save_companions(db, body.target_year, body.pairs)


@router.get("/team-assignment/counts", response_model=TeamAssignmentCountsResponse, tags=["팀배치"], summary="배치 인원 집계 — 사전 설정·배치 작업 화면 공용", dependencies=[_run_read])
def get_team_assignment_counts(
    target_year: int = Query(...),
    db: Session = Depends(get_db),
):
    return svc_get_counts(db, target_year)


# ── 팀배치 작업 (§4) ────────────────────────────────────────────────────────────

@router.put("/team-assignment/basics", response_model=TeamAssignmentRunResponse, tags=["팀배치 작업"], summary="총 팀 수 / 교구 수 저장", dependencies=[_team_assignment])
def put_team_assignment_basics(
    body: TeamAssignmentBasicsRequest,
    db: Session = Depends(get_db),
):
    return svc_save_basics(db, body.target_year, body.total_team_count, body.gyogu_count)


@router.post("/team-assignment/run", response_model=TeamAssignmentRunResultResponse, tags=["팀배치 작업"], summary="배치 실행 (기존 결과 덮어씀)", dependencies=[_team_assignment])
def post_team_assignment_run(
    body: TeamAssignmentRunRequest,
    db: Session = Depends(get_db),
):
    return svc_run_assignment(db, body.target_year)


@router.get("/team-assignment/result", response_model=TeamAssignmentRunResultResponse, tags=["팀배치 작업"], summary="배치 결과 조회", dependencies=[_team_assignment])
def get_team_assignment_result(
    target_year: int = Query(...),
    db: Session = Depends(get_db),
):
    return svc_get_result(db, target_year)


@router.put("/team-assignment/move", status_code=200, tags=["팀배치 작업"], summary="팀 이동 (is_manual=1)", dependencies=[_team_assignment])
def put_team_assignment_move(
    body: TeamAssignmentMoveRequest,
    db: Session = Depends(get_db),
):
    svc_move_member(db, body.target_year, body.member_id, body.gyogu, body.team)


@router.post("/team-assignment/commit", response_model=TeamAssignmentCommitResponse, tags=["팀배치 작업"], summary="소견서 완료 + 교적 이관", dependencies=[_team_assignment])
def post_team_assignment_commit(
    body: TeamAssignmentCommitRequest,
    db: Session = Depends(get_db),
):
    return svc_commit_assignment(db, body.target_year)
