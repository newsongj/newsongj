"""팀배치 비즈니스 로직 — 배치 알고리즘(1번모듈.py 이식) + CRUD 호출 후 응답 스키마 변환.

배치 알고리즘: (성별 × 출석등급) 조합별로 묶어 총 팀 수만큼 라운드로빈 분배한다.
teamIndex는 조합(bucket) 경계에서 리셋하지 않는다 — 이게 핵심 불변 조건.
동반배치 묶음은 하나의 배치 단위로 압축되어 통째로 같은 팀에 들어간다.
"""
import datetime
import random
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.crud.leaders import get_leader_map
from app.crud.member_profile import get_latest_profile_in_year, upsert_profile_on_date
from app.crud.team_assignment import (
    get_companions as crud_get_companions,
    get_or_create_run as crud_get_or_create_run,
    get_result_rows as crud_get_result_rows,
    get_run as crud_get_run,
    get_target_pool as crud_get_target_pool,
    mark_run_assigned as crud_mark_run_assigned,
    mark_run_committed as crud_mark_run_committed,
    replace_companions as crud_replace_companions,
    replace_result_rows as crud_replace_result_rows,
    update_result_row_team as crud_update_result_row_team,
    upsert_run_basics as crud_upsert_run_basics,
)
from app.core.exceptions import ConflictError, NotFoundError
from app.models import Member, OpinionReportCustom, TeamAssignmentRun as TeamAssignmentRunModel
from app.schemas.team_assignment import (
    TeamAssignmentBasicsBody,
    TeamAssignmentCompanion,
    TeamAssignmentCompanionMember,
    TeamAssignmentCompanionPair,
    TeamAssignmentMoveBody,
    TeamAssignmentResultResponse,
    TeamAssignmentRow,
    TeamAssignmentRun,
)
from app.services.members import resolve_leader_names

DEFAULT_TEAM_COUNT = 36
DEFAULT_GYOGU_COUNT = 3


# ── 변환 헬퍼 ──────────────────────────────────────────────────────────────────

def _run_to_schema(run: TeamAssignmentRunModel) -> TeamAssignmentRun:
    return TeamAssignmentRun(
        target_year=run.target_year,
        total_team_count=run.total_team_count,
        gyogu_count=run.gyogu_count,
        random_seed=run.random_seed,
        status=run.status,
        assigned_at=run.assigned_at,
        committed_at=run.committed_at,
    )


def _default_run(target_year: int) -> TeamAssignmentRun:
    return TeamAssignmentRun(
        target_year=target_year,
        total_team_count=DEFAULT_TEAM_COUNT,
        gyogu_count=DEFAULT_GYOGU_COUNT,
        random_seed=None,
        status='draft',
        assigned_at=None,
        committed_at=None,
    )


def _pool_item(member: Member, profile, leader_map: dict) -> dict:
    return {
        "member_id": member.member_id,
        "name": member.name,
        "gender": member.gender,
        "generation": member.generation,
        "attendance_grade": profile.attendance_grade if profile else None,
        "member_type": profile.member_type if profile else None,
        "leader_names": resolve_leader_names(profile.leader_ids, leader_map) if profile else [],
        "prev_gyogu": profile.gyogu if profile else None,
        "prev_team": profile.team if profile else None,
        "prev_group_no": profile.group_no if profile else None,
    }


# ── 배치 알고리즘 (1번모듈.py 이식) ───────────────────────────────────────────

def _seeded_shuffle(items: list, seed: int) -> list:
    """시드 기반 셔플 — 같은 seed면 같은 결과가 나오도록."""
    out = list(items)
    state = seed or 1

    def _next() -> float:
        nonlocal state
        state = (state * 1103515245 + 12345) & 0x7fffffff
        return state / 0x7fffffff

    for i in range(len(out) - 1, 0, -1):
        j = int(_next() * (i + 1))
        out[i], out[j] = out[j], out[i]
    return out


def _build_units(pool: List[dict], companion_pairs: List[Tuple[int, int]]) -> List[dict]:
    """묶음별로 멤버를 모아 배치 단위(unit)를 구성. 층화 기준은 묶음 대표(첫 멤버) 값."""
    by_member = {p["member_id"]: p for p in pool}
    companion_of = {member_id: companion_no for companion_no, member_id in companion_pairs}

    groups: dict[int, list] = {}
    for companion_no, member_id in companion_pairs:
        row = by_member.get(member_id)
        if not row:
            continue
        groups.setdefault(companion_no, []).append(row)

    units: List[dict] = []
    for companion_no in sorted(groups.keys()):
        members = groups[companion_no]
        if not members:
            continue
        units.append({
            "members": members,
            "companion_no": companion_no,
            "gender": members[0]["gender"] or "남",
            "grade": members[0]["attendance_grade"] or "E",
        })

    for row in pool:
        if row["member_id"] in companion_of:
            continue
        units.append({
            "members": [row],
            "companion_no": None,
            "gender": row["gender"] or "남",
            "grade": row["attendance_grade"] or "E",
        })

    return units


def _assign_units(units: List[dict], total_team_count: int, gyogu_count: int, seed: int) -> List[dict]:
    """(성별 × 등급) 조합별 라운드로빈 분배. teamIndex는 조합 사이에서 리셋하지 않는다."""
    shuffled = _seeded_shuffle(units, seed)

    buckets: dict[str, list] = {}
    for unit in shuffled:
        key = f"{unit['gender']}-{unit['grade']}"
        buckets.setdefault(key, []).append(unit)

    team_per_gyogu = max(1, total_team_count // gyogu_count)
    rows: List[dict] = []
    team_index = 0

    for key in sorted(buckets.keys()):
        for unit in buckets[key]:
            gyogu = min(gyogu_count, team_index // team_per_gyogu + 1)
            team = team_index % team_per_gyogu + 1

            for member in unit["members"]:
                rows.append({
                    "member_id": member["member_id"],
                    "gyogu": gyogu,
                    "team": team,
                    "group_no": 0,
                    "companion_no": unit["companion_no"],
                })

            team_index = (team_index + 1) % total_team_count

    return rows


def _assemble_rows(db: Session, target_year: int, pool_tuples=None) -> List[TeamAssignmentRow]:
    if pool_tuples is None:
        pool_tuples = crud_get_target_pool(db, target_year)
    leader_map = get_leader_map(db)
    pool_map = {m.member_id: (m, p) for m, p in pool_tuples}

    rows: List[TeamAssignmentRow] = []
    for result in crud_get_result_rows(db, target_year):
        found = pool_map.get(result.member_id)
        if not found:
            continue
        member, profile = found
        rows.append(TeamAssignmentRow(
            member_id=member.member_id,
            name=member.name,
            gender=member.gender,
            generation=member.generation,
            attendance_grade=profile.attendance_grade if profile else None,
            member_type=profile.member_type if profile else None,
            leader_names=resolve_leader_names(profile.leader_ids, leader_map) if profile else [],
            prev_gyogu=profile.gyogu if profile else None,
            prev_team=profile.team if profile else None,
            prev_group_no=profile.group_no if profile else None,
            gyogu=result.gyogu,
            team=result.team,
            group_no=result.group_no,
            companion_no=result.companion_no,
            is_manual=bool(result.is_manual),
        ))
    return rows


# ── 회차 / 기본 정보 ────────────────────────────────────────────────────────────

def svc_get_run(db: Session, target_year: int) -> TeamAssignmentRun:
    run = crud_get_run(db, target_year)
    if not run:
        return _default_run(target_year)
    return _run_to_schema(run)


def svc_save_basics(db: Session, body: TeamAssignmentBasicsBody) -> None:
    run = crud_get_run(db, body.target_year)
    if run and run.status == 'committed':
        raise ConflictError("이미 완료된 회차의 기본정보는 수정할 수 없습니다.")
    crud_upsert_run_basics(db, body.target_year, body.total_team_count, body.gyogu_count)


# ── 동반배치 묶음 ─────────────────────────────────────────────────────────────

def svc_get_companions(db: Session, target_year: int) -> List[TeamAssignmentCompanion]:
    companions = crud_get_companions(db, target_year)
    if not companions:
        return []
    leader_map = get_leader_map(db)

    grouped: dict[int, List[TeamAssignmentCompanionMember]] = {}
    for c in companions:
        member = db.query(Member).filter(Member.member_id == c.member_id).first()
        if not member:
            continue
        profile = get_latest_profile_in_year(db, c.member_id, target_year - 1)
        grouped.setdefault(c.companion_no, []).append(TeamAssignmentCompanionMember(
            member_id=member.member_id,
            name=member.name,
            gender=member.gender,
            generation=member.generation,
            gyogu=profile.gyogu if profile else None,
            team=profile.team if profile else None,
            group_no=profile.group_no if profile else None,
            member_type=profile.member_type if profile else None,
            leader_names=resolve_leader_names(profile.leader_ids, leader_map) if profile else [],
        ))

    return [
        TeamAssignmentCompanion(companion_no=no, members=members)
        for no, members in sorted(grouped.items())
    ]


def svc_save_companions(db: Session, target_year: int, pairs: List[TeamAssignmentCompanionPair]) -> None:
    run = crud_get_run(db, target_year)
    if run and run.status == 'committed':
        raise ConflictError("이미 완료된 회차의 동반배치는 수정할 수 없습니다.")
    crud_replace_companions(db, target_year, [(p.companion_no, p.member_id) for p in pairs])


# ── 배치 실행 / 조회 / 조정 ───────────────────────────────────────────────────

def svc_run_assignment(db: Session, target_year: int) -> TeamAssignmentResultResponse:
    run = crud_get_run(db, target_year)
    if run and run.status == 'committed':
        raise ConflictError("이미 완료된 회차입니다. 다시 배치할 수 없습니다.")
    if not run:
        run = crud_get_or_create_run(db, target_year)

    pool_tuples = crud_get_target_pool(db, target_year)
    leader_map = get_leader_map(db)
    pool = [_pool_item(member, profile, leader_map) for member, profile in pool_tuples]

    companion_pairs = [(c.companion_no, c.member_id) for c in crud_get_companions(db, target_year)]
    seed = random.randint(0, 2147483647)

    units = _build_units(pool, companion_pairs)
    assigned = _assign_units(units, run.total_team_count, run.gyogu_count, seed)
    crud_replace_result_rows(db, target_year, assigned)
    run = crud_mark_run_assigned(db, run, seed)

    rows = _assemble_rows(db, target_year, pool_tuples=pool_tuples)
    return TeamAssignmentResultResponse(run=_run_to_schema(run), target_count=len(pool_tuples), rows=rows)


def svc_get_result(db: Session, target_year: int) -> TeamAssignmentResultResponse:
    run = crud_get_run(db, target_year)
    if not run:
        return TeamAssignmentResultResponse(run=_default_run(target_year), target_count=0, rows=[])

    pool_tuples = crud_get_target_pool(db, target_year)
    rows = _assemble_rows(db, target_year, pool_tuples=pool_tuples)
    return TeamAssignmentResultResponse(run=_run_to_schema(run), target_count=len(pool_tuples), rows=rows)


def svc_move_member(db: Session, target_year: int, body: TeamAssignmentMoveBody) -> None:
    run = crud_get_run(db, target_year)
    if not run or run.status == 'draft':
        raise ConflictError("배치를 먼저 실행해주세요.")
    if run.status == 'committed':
        raise ConflictError("이미 완료된 회차는 수정할 수 없습니다.")
    crud_update_result_row_team(db, target_year, body.member_id, body.gyogu, body.team)


# ── 확정 ──────────────────────────────────────────────────────────────────────

def svc_commit(db: Session, target_year: int) -> None:
    run = crud_get_run(db, target_year)
    if not run or run.status == 'draft':
        raise ConflictError("배치를 먼저 실행해주세요.")
    if run.status == 'committed':
        raise ConflictError("이미 완료된 회차입니다.")

    try:
        for result in crud_get_result_rows(db, target_year):
            prev_profile = get_latest_profile_in_year(db, result.member_id, target_year - 1)
            if not prev_profile:
                raise NotFoundError(f"멤버 {result.member_id}의 기존 교적을 찾을 수 없습니다.")
            upsert_profile_on_date(
                db, result.member_id, datetime.date(target_year, 1, 1),
                result.gyogu, result.team, result.group_no,
                member_type=prev_profile.member_type,
                leader_ids=None,
                attendance_grade=prev_profile.attendance_grade,
                plt_status=prev_profile.plt_status,
            )

        custom = (
            db.query(OpinionReportCustom)
            .filter(OpinionReportCustom.report_year == target_year - 1)
            .first()
        )
        if custom:
            custom.is_active = 0

        crud_mark_run_committed(db, run)
    except Exception:
        db.rollback()
        raise
