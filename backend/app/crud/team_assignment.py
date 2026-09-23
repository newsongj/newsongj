"""팀배치 CRUD — 순수 DB 조작만 담당 (§3 사전 설정 · §4 배치 작업)"""
from typing import List

from sqlalchemy.orm import Session

from app.core.timezone import now_kst
from app.models import (
    OpinionReportCustom, TeamAssignmentCompanion, TeamAssignmentExclusion,
    TeamAssignmentResult, TeamAssignmentRun,
)


def get_run(db: Session, target_year: int) -> "TeamAssignmentRun | None":
    return (
        db.query(TeamAssignmentRun)
        .filter(TeamAssignmentRun.target_year == target_year)
        .first()
    )


def get_exclusions(db: Session, target_year: int) -> List[TeamAssignmentExclusion]:
    return (
        db.query(TeamAssignmentExclusion)
        .filter(TeamAssignmentExclusion.target_year == target_year)
        .all()
    )


def get_companions(db: Session, target_year: int) -> List[TeamAssignmentCompanion]:
    return (
        db.query(TeamAssignmentCompanion)
        .filter(TeamAssignmentCompanion.target_year == target_year)
        .all()
    )


def replace_exclusions(db: Session, target_year: int, items: List[dict]) -> None:
    """해당 연도 제외 명단을 통째로 대체한다 (delete-then-insert, 한 트랜잭션)."""
    db.query(TeamAssignmentExclusion).filter(
        TeamAssignmentExclusion.target_year == target_year,
    ).delete(synchronize_session=False)
    for item in items:
        db.add(TeamAssignmentExclusion(target_year=target_year, **item))
    db.commit()


def replace_companions(db: Session, target_year: int, pairs: List[dict]) -> None:
    """해당 연도 동반배치 묶음을 통째로 대체한다 (delete-then-insert, 한 트랜잭션)."""
    db.query(TeamAssignmentCompanion).filter(
        TeamAssignmentCompanion.target_year == target_year,
    ).delete(synchronize_session=False)
    for pair in pairs:
        db.add(TeamAssignmentCompanion(target_year=target_year, **pair))
    db.commit()


# ── 팀배치 작업 (§4) ────────────────────────────────────────────────────────────

def upsert_run_basics(
    db: Session, target_year: int, total_team_count: int, gyogu_count: int,
) -> TeamAssignmentRun:
    """총 팀 수 / 교구 수 저장. 없으면 draft로 새로 만든다."""
    run = get_run(db, target_year)
    if run is None:
        run = TeamAssignmentRun(target_year=target_year, status="draft")
        db.add(run)
    run.total_team_count = total_team_count
    run.gyogu_count = gyogu_count
    db.commit()
    db.refresh(run)
    return run


def mark_run_assigned(db: Session, target_year: int, random_seed: int) -> TeamAssignmentRun:
    run = get_run(db, target_year)
    run.random_seed = random_seed
    run.status = "assigned"
    run.assigned_at = now_kst()
    db.commit()
    db.refresh(run)
    return run


def mark_run_committed(db: Session, run: TeamAssignmentRun) -> TeamAssignmentRun:
    run.status = "committed"
    run.committed_at = now_kst()
    db.commit()
    db.refresh(run)
    return run


def get_results(db: Session, target_year: int) -> List[TeamAssignmentResult]:
    return (
        db.query(TeamAssignmentResult)
        .filter(TeamAssignmentResult.target_year == target_year)
        .all()
    )


def replace_results(db: Session, target_year: int, rows: List[dict]) -> None:
    """배치 실행 결과를 통째로 대체한다 (다시 실행 시 수기 조정은 사라진다, §4-4)."""
    db.query(TeamAssignmentResult).filter(
        TeamAssignmentResult.target_year == target_year,
    ).delete(synchronize_session=False)
    for row in rows:
        db.add(TeamAssignmentResult(target_year=target_year, **row))
    db.commit()


def update_result_team(
    db: Session, target_year: int, member_id: int, gyogu: int, team: int,
) -> "TeamAssignmentResult | None":
    """팀 이동 — is_manual=1로 표시한다 (§4-4). 사전 배치 인원도 대상이 될 수 있다."""
    result = (
        db.query(TeamAssignmentResult)
        .filter(
            TeamAssignmentResult.target_year == target_year,
            TeamAssignmentResult.member_id == member_id,
        )
        .first()
    )
    if result is None:
        return None
    result.gyogu = gyogu
    result.team = team
    result.is_manual = 1
    db.commit()
    db.refresh(result)
    return result


def get_opinion_custom(db: Session, report_year: int) -> "OpinionReportCustom | None":
    return (
        db.query(OpinionReportCustom)
        .filter(OpinionReportCustom.report_year == report_year)
        .first()
    )


def close_opinion_report(db: Session, report_year: int) -> None:
    """§4-5 완료 처리 — 해당 연도 소견서 설정 화면 잠금 + 사용자 작성 페이지 닫기.

    설정이 아예 없는 연도(소견서를 운영하지 않은 연도)면 잠글 대상이 없으므로 그냥 넘어간다.
    """
    custom = get_opinion_custom(db, report_year)
    if custom is None:
        return
    custom.is_active = 0
    custom.is_open = 0
