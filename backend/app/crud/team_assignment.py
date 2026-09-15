"""팀배치 CRUD — 순수 DB 조작만 담당"""
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.core.timezone import now_kst
from app.crud.query_builders import build_active_members_query
from app.models import Member, MemberProfile, TeamAssignmentCompanion, TeamAssignmentResult, TeamAssignmentRun


# ── 회차 / 기본 정보 ────────────────────────────────────────────────────────────

def get_run(db: Session, target_year: int) -> Optional[TeamAssignmentRun]:
    return (
        db.query(TeamAssignmentRun)
        .filter(TeamAssignmentRun.target_year == target_year)
        .first()
    )


def upsert_run_basics(
    db: Session, target_year: int, total_team_count: int, gyogu_count: int
) -> TeamAssignmentRun:
    run = get_run(db, target_year)
    if run:
        run.total_team_count = total_team_count
        run.gyogu_count = gyogu_count
    else:
        run = TeamAssignmentRun(
            target_year=target_year,
            total_team_count=total_team_count,
            gyogu_count=gyogu_count,
            status='draft',
        )
        db.add(run)
    db.commit()
    db.refresh(run)
    return run


def get_or_create_run(db: Session, target_year: int) -> TeamAssignmentRun:
    run = get_run(db, target_year)
    if run:
        return run
    run = TeamAssignmentRun(target_year=target_year, status='draft')
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def mark_run_assigned(db: Session, run: TeamAssignmentRun, seed: int) -> TeamAssignmentRun:
    run.status = 'assigned'
    run.random_seed = seed
    run.assigned_at = now_kst()
    db.commit()
    db.refresh(run)
    return run


def mark_run_committed(db: Session, run: TeamAssignmentRun) -> TeamAssignmentRun:
    run.status = 'committed'
    run.committed_at = now_kst()
    db.commit()
    db.refresh(run)
    return run


# ── 동반배치 묶음 ─────────────────────────────────────────────────────────────

def get_companions(db: Session, target_year: int) -> List[TeamAssignmentCompanion]:
    return (
        db.query(TeamAssignmentCompanion)
        .filter(TeamAssignmentCompanion.target_year == target_year)
        .order_by(TeamAssignmentCompanion.companion_no)
        .all()
    )


def replace_companions(db: Session, target_year: int, pairs: List[Tuple[int, int]]) -> None:
    """해당 연도 동반배치 행 전체 삭제 후 재삽입."""
    db.query(TeamAssignmentCompanion).filter(
        TeamAssignmentCompanion.target_year == target_year
    ).delete()
    for companion_no, member_id in pairs:
        db.add(TeamAssignmentCompanion(
            target_year=target_year, companion_no=companion_no, member_id=member_id,
        ))
    db.commit()


# ── 배치 대상 풀 ──────────────────────────────────────────────────────────────

def get_target_pool(db: Session, target_year: int) -> List[Tuple[Member, MemberProfile]]:
    """배치 대상 = target_year - 1 기준 활성 멤버 중 리더가 아닌(leader_ids가 빈) 사람."""
    q = build_active_members_query(db, target_year - 1).filter(MemberProfile.leader_ids.is_(None))
    return q.all()


# ── 배치 결과 임시 테이블 ─────────────────────────────────────────────────────

def replace_result_rows(db: Session, target_year: int, rows: List[dict]) -> None:
    """해당 연도 결과 행 전체 삭제 후 재삽입. rows는 member_id/gyogu/team/group_no/companion_no 딕셔너리."""
    db.query(TeamAssignmentResult).filter(
        TeamAssignmentResult.target_year == target_year
    ).delete()
    for row in rows:
        db.add(TeamAssignmentResult(
            target_year=target_year,
            member_id=row["member_id"],
            gyogu=row["gyogu"],
            team=row["team"],
            group_no=row.get("group_no", 0),
            companion_no=row.get("companion_no"),
            is_manual=0,
        ))
    db.commit()


def get_result_rows(db: Session, target_year: int) -> List[TeamAssignmentResult]:
    return (
        db.query(TeamAssignmentResult)
        .filter(TeamAssignmentResult.target_year == target_year)
        .all()
    )


def update_result_row_team(db: Session, target_year: int, member_id: int, gyogu: int, team: int) -> TeamAssignmentResult:
    row = (
        db.query(TeamAssignmentResult)
        .filter(
            TeamAssignmentResult.target_year == target_year,
            TeamAssignmentResult.member_id == member_id,
        )
        .first()
    )
    if not row:
        raise NotFoundError("배치 결과에서 해당 멤버를 찾을 수 없습니다.")
    row.gyogu = gyogu
    row.team = team
    row.is_manual = 1
    db.commit()
    db.refresh(row)
    return row
