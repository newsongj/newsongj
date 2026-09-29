"""팀배치 서비스 — DB 조회 결과를 응답 스키마로 변환 (§3 사전 설정 · §4 배치 작업)

api 계층은 이 파일의 svc_* 함수만 호출한다 (crud 직접 import 금지).
"""
import datetime
import math
import random
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, TeamAssignmentCommittedError
from app.crud.leaders import get_leader_map
from app.crud.member_profile import insert_profile as crud_insert_profile
from app.crud.opinion import get_report_year_snapshot as crud_get_report_year_snapshot
from app.crud.team_assignment import (
    close_opinion_report as crud_close_opinion_report,
    get_companions as crud_get_companions,
    get_exclusions as crud_get_exclusions,
    get_results as crud_get_results,
    get_run as crud_get_run,
    mark_run_assigned as crud_mark_run_assigned,
    mark_run_committed as crud_mark_run_committed,
    replace_companions as crud_replace_companions,
    replace_exclusions as crud_replace_exclusions,
    replace_results as crud_replace_results,
    update_result_team as crud_update_result_team,
    upsert_run_basics as crud_upsert_run_basics,
)
from app.models import Member, MemberProfile
from app.services.members import resolve_leader_names
from app.schemas.team_assignment import (
    TeamAssignmentCommitResponse,
    TeamAssignmentCompanionOut, TeamAssignmentCompanionPairIn,
    TeamAssignmentCountsResponse,
    TeamAssignmentExclusionItemIn, TeamAssignmentExclusionOut,
    TeamAssignmentMemberInfo, TeamAssignmentResultRow, TeamAssignmentRunResponse,
    TeamAssignmentRunResultResponse,
)

DEFAULT_TOTAL_TEAM_COUNT = 36
DEFAULT_GYOGU_COUNT = 3


def _to_run_response(run: "object | None", target_year: int) -> TeamAssignmentRunResponse:
    if run is None:
        return TeamAssignmentRunResponse(
            target_year=target_year,
            total_team_count=DEFAULT_TOTAL_TEAM_COUNT,
            gyogu_count=DEFAULT_GYOGU_COUNT,
            random_seed=None,
            status="draft",
            assigned_at=None,
            committed_at=None,
        )
    return TeamAssignmentRunResponse(
        target_year=run.target_year,
        total_team_count=run.total_team_count,
        gyogu_count=run.gyogu_count,
        random_seed=run.random_seed,
        status=run.status,
        assigned_at=run.assigned_at,
        committed_at=run.committed_at,
    )


def svc_get_run(db: Session, target_year: int) -> TeamAssignmentRunResponse:
    return _to_run_response(crud_get_run(db, target_year), target_year)


def _member_index(db: Session, target_year: int) -> Dict[int, Tuple[Member, MemberProfile]]:
    """§2-1과 동일한 스냅샷 규칙 — 제외/동반배치 대상은 (target_year - 1) 시점 재적 기준."""
    snapshot_rows = crud_get_report_year_snapshot(db, target_year - 1)
    return {m.member_id: (m, p) for m, p in snapshot_rows}


def _member_info(
    db: Session, member_index: Dict[int, Tuple[Member, MemberProfile]], leader_map: dict, member_id: int,
) -> TeamAssignmentMemberInfo:
    entry = member_index.get(member_id)
    if entry is not None:
        member, profile = entry
        return TeamAssignmentMemberInfo(
            member_id=member.member_id,
            name=member.name,
            gyogu=profile.gyogu,
            team=profile.team,
            group_no=profile.group_no,
            leader_names=resolve_leader_names(profile.leader_ids, leader_map),
        )
    member = db.query(Member).filter(Member.member_id == member_id).first()
    return TeamAssignmentMemberInfo(
        member_id=member_id,
        name=member.name if member else "알 수 없음",
        gyogu=None, team=None, group_no=None, leader_names=[],
    )


def _assert_not_committed(db: Session, target_year: int) -> None:
    run = crud_get_run(db, target_year)
    if run is not None and run.status == "committed":
        raise TeamAssignmentCommittedError()


# ── 제외 명단 ─────────────────────────────────────────────────────────────────

def svc_get_exclusions(db: Session, target_year: int) -> List[TeamAssignmentExclusionOut]:
    rows = crud_get_exclusions(db, target_year)
    member_index = _member_index(db, target_year)
    leader_map = get_leader_map(db)

    out = [
        TeamAssignmentExclusionOut(
            member=_member_info(db, member_index, leader_map, r.member_id),
            gyogu=r.gyogu, team=r.team, reason=r.reason,
        )
        for r in rows
    ]
    out.sort(key=lambda e: (e.gyogu, e.team, e.member.name))
    return out


def svc_save_exclusions(
    db: Session, target_year: int, items: List[TeamAssignmentExclusionItemIn],
) -> None:
    _assert_not_committed(db, target_year)

    member_ids = [it.member_id for it in items]
    if len(member_ids) != len(set(member_ids)):
        raise ConflictError("제외 명단에 같은 인원이 중복으로 들어 있습니다.")

    companion_ids = {r.member_id for r in crud_get_companions(db, target_year)}
    overlap = set(member_ids) & companion_ids
    if overlap:
        raise ConflictError(f"동반배치 묶음에 이미 속한 인원입니다: {sorted(overlap)}")

    payload = [
        {"member_id": it.member_id, "gyogu": it.gyogu, "team": it.team, "reason": it.reason}
        for it in items
    ]
    crud_replace_exclusions(db, target_year, payload)


# ── 동반배치 묶음 ─────────────────────────────────────────────────────────────

def svc_get_companions(db: Session, target_year: int) -> List[TeamAssignmentCompanionOut]:
    rows = crud_get_companions(db, target_year)
    member_index = _member_index(db, target_year)
    leader_map = get_leader_map(db)

    grouped: Dict[int, List[int]] = {}
    for r in rows:
        grouped.setdefault(r.companion_no, []).append(r.member_id)

    out = [
        TeamAssignmentCompanionOut(
            companion_no=no,
            members=[_member_info(db, member_index, leader_map, mid) for mid in member_ids],
        )
        for no, member_ids in sorted(grouped.items())
    ]
    return out


def svc_save_companions(
    db: Session, target_year: int, pairs: List[TeamAssignmentCompanionPairIn],
) -> None:
    _assert_not_committed(db, target_year)

    member_ids = [p.member_id for p in pairs]
    if len(member_ids) != len(set(member_ids)):
        raise ConflictError("동반배치 묶음에 같은 인원이 중복으로 들어 있습니다.")

    exclusion_ids = {r.member_id for r in crud_get_exclusions(db, target_year)}
    overlap = set(member_ids) & exclusion_ids
    if overlap:
        raise ConflictError(f"제외 명단에 이미 속한 인원입니다: {sorted(overlap)}")

    payload = [{"companion_no": p.companion_no, "member_id": p.member_id} for p in pairs]
    crud_replace_companions(db, target_year, payload)


# ── 집계 ──────────────────────────────────────────────────────────────────────

def svc_get_counts(db: Session, target_year: int) -> TeamAssignmentCountsResponse:
    snapshot_rows = crud_get_report_year_snapshot(db, target_year - 1)
    population = [(m, p) for m, p in snapshot_rows if m.deleted_at is None]
    population_ids = {m.member_id for m, _ in population}

    total = len(population)
    newcomer = sum(1 for _, p in population if p.member_type == "새가족")
    regular = total - newcomer

    excluded_ids = {r.member_id for r in crud_get_exclusions(db, target_year)} & population_ids
    companion_ids = ({r.member_id for r in crud_get_companions(db, target_year)} - excluded_ids) & population_ids

    excluded = len(excluded_ids)
    companion = len(companion_ids)
    random = total - companion - excluded

    return TeamAssignmentCountsResponse(
        total=total, newcomer=newcomer, regular=regular,
        random=random, companion=companion, excluded=excluded,
    )


# ── 팀배치 작업 (§4) ────────────────────────────────────────────────────────────

MIN_TARGET_YEAR = 1980
MAX_TARGET_YEAR = 2500


def svc_save_basics(
    db: Session, target_year: int, total_team_count: int, gyogu_count: int,
) -> TeamAssignmentRunResponse:
    if target_year < MIN_TARGET_YEAR or target_year > MAX_TARGET_YEAR:
        raise ConflictError(
            f"연도는 {MIN_TARGET_YEAR}~{MAX_TARGET_YEAR} 범위여야 합니다."
        )
    
    _assert_not_committed(db, target_year)
    if total_team_count <= 0 or gyogu_count <= 0:
        raise ConflictError("총 팀 수와 교구 수는 1 이상이어야 합니다.")
    if total_team_count % gyogu_count != 0:
        raise ConflictError("총 팀 수는 교구 수로 나누어떨어져야 합니다.")

    run = crud_upsert_run_basics(db, target_year, total_team_count, gyogu_count)
    return _to_run_response(run, target_year)


def _run_assignment_algorithm(
    population: List[Tuple[Member, MemberProfile]],
    exclusions: List,
    companions: List,
    total_team_count: int,
    gyogu_count: int,
    random_seed: int,
) -> List[dict]:
    """§4-2 배치 알고리즘 — `팀배치_1번모듈.py` 이식. 순서를 지켜야 결과가 재현된다.

    ① 제외 명단 그대로 배치 (preCount 누적) → ② 동반배치 묶음 압축(대표 성별·등급으로 층화)
    → ③ 셔플 → ④ (성별×등급) groupby → ⑤ teamIndex 라운드로빈(조합 사이 리셋 금지, 꽉 찬 팀은 건너뜀)
    → ⑥ teamIndex → (gyogu, team) 변환.
    """
    teams_per_gyogu = total_team_count // gyogu_count

    excluded_by_member = {e.member_id: e for e in exclusions}
    companion_no_by_member = {c.member_id: c.companion_no for c in companions}

    pop_by_id = {m.member_id: (m, p) for m, p in population}
    excluded_ids = {mid for mid in excluded_by_member if mid in pop_by_id}
    pool_ids = [mid for mid in pop_by_id if mid not in excluded_ids]

    total_assignable = len(excluded_ids) + len(pool_ids)
    capacity = math.ceil(total_assignable / total_team_count) if total_team_count else 0

    occupied = [0] * total_team_count

    def idx_of(gyogu: int, team: int) -> int:
        return (gyogu - 1) * teams_per_gyogu + (team - 1)

    def gyogu_team_of(idx: int) -> Tuple[int, int]:
        return idx // teams_per_gyogu + 1, idx % teams_per_gyogu + 1

    rows: Dict[int, dict] = {}

    # ① 제외 명단 — 지정된 (gyogu, team) 에 그대로 앉히고 preCount 누적
    for mid in excluded_ids:
        exclusion = excluded_by_member[mid]
        idx = idx_of(exclusion.gyogu, exclusion.team)
        if 0 <= idx < total_team_count:
            occupied[idx] += 1
        rows[mid] = {
            "member_id": mid, "gyogu": exclusion.gyogu, "team": exclusion.team,
            "group_no": 0, "companion_no": None, "is_excluded": 1, "is_manual": 0,
        }

    # ② 동반배치 묶음을 하나의 단위로 압축
    bundles: Dict[int, List[int]] = {}
    units: List[Tuple[Tuple[str, str], Optional[int], List[int]]] = []
    for mid in pool_ids:
        companion_no = companion_no_by_member.get(mid)
        if companion_no is None:
            member, profile = pop_by_id[mid]
            key = (member.gender, profile.attendance_grade or "")
            units.append((key, None, [mid]))
        else:
            bundles.setdefault(companion_no, []).append(mid)

    for companion_no, member_ids in bundles.items():
        rep_id = min(member_ids)  # 대표 — 성별·등급 층화 기준
        member, profile = pop_by_id[rep_id]
        key = (member.gender, profile.attendance_grade or "")
        units.append((key, companion_no, sorted(member_ids)))

    # ③ random_seed 로 셔플
    rng = random.Random(random_seed)
    rng.shuffle(units)

    # ④ (성별 × 등급) 조합별 groupby — 안정 정렬이라 그룹 내 셔플 순서는 유지된다
    units.sort(key=lambda u: u[0])

    # ⑤ 라운드로빈 — teamIndex 는 조합 사이에서도 리셋하지 않는다
    team_idx = 0
    for _key, companion_no, member_ids in units:
        attempts = 0
        while occupied[team_idx] >= capacity and attempts < total_team_count:
            team_idx = (team_idx + 1) % total_team_count
            attempts += 1
        gyogu, team = gyogu_team_of(team_idx)
        for mid in member_ids:
            rows[mid] = {
                "member_id": mid, "gyogu": gyogu, "team": team,
                "group_no": 0, "companion_no": companion_no,
                "is_excluded": 0, "is_manual": 0,
            }
        occupied[team_idx] += len(member_ids)
        team_idx = (team_idx + 1) % total_team_count

    return list(rows.values())


def svc_run_assignment(db: Session, target_year: int) -> TeamAssignmentRunResultResponse:
    """배치 실행 — 기존 결과를 덮어쓴다 (§4-3 `/run`)."""
    if target_year < MIN_TARGET_YEAR or target_year > MAX_TARGET_YEAR:
            raise ConflictError(
                f"연도는 {MIN_TARGET_YEAR}~{MAX_TARGET_YEAR} 범위여야 합니다."
            )
    
    _assert_not_committed(db, target_year)

    run = crud_get_run(db, target_year)
    total_team_count = run.total_team_count if run else DEFAULT_TOTAL_TEAM_COUNT
    gyogu_count = run.gyogu_count if run else DEFAULT_GYOGU_COUNT
    if total_team_count <= 0 or gyogu_count <= 0 or total_team_count % gyogu_count != 0:
        raise ConflictError("총 팀 수는 교구 수로 나누어떨어져야 합니다.")

    snapshot_rows = crud_get_report_year_snapshot(db, target_year - 1)
    population = [(m, p) for m, p in snapshot_rows if m.deleted_at is None]
    exclusions = crud_get_exclusions(db, target_year)
    companions = crud_get_companions(db, target_year)

    random_seed = random.randint(1, 2**31 - 1)
    result_rows = _run_assignment_algorithm(
        population, exclusions, companions, total_team_count, gyogu_count, random_seed,
    )

    crud_replace_results(db, target_year, result_rows)
    if run is None:
        crud_upsert_run_basics(db, target_year, total_team_count, gyogu_count)
    crud_mark_run_assigned(db, target_year, random_seed)

    return svc_get_result(db, target_year)


def svc_get_result(db: Session, target_year: int) -> TeamAssignmentRunResultResponse:
    run_response = svc_get_run(db, target_year)
    counts = svc_get_counts(db, target_year)
    results = crud_get_results(db, target_year)

    member_index = _member_index(db, target_year)  # target_year - 1 시점 스냅샷 = 배치 전 소속("기존 소속")
    leader_map = get_leader_map(db)

    rows: List[TeamAssignmentResultRow] = []
    for r in sorted(results, key=lambda x: (x.gyogu, x.team, x.member_id)):
        entry = member_index.get(r.member_id)
        member = entry[0] if entry else db.query(Member).filter(Member.member_id == r.member_id).first()
        prev_profile = entry[1] if entry else None
        rows.append(TeamAssignmentResultRow(
            member_id=r.member_id,
            name=member.name if member else "알 수 없음",
            gender=member.gender if member else None,
            generation=member.generation if member else None,
            phone_number=member.phone_number if member else None,
            birthdate=member.birthdate if member else None,
            attendance_grade=prev_profile.attendance_grade if prev_profile else None,
            member_type=prev_profile.member_type if prev_profile else None,
            plt_status=prev_profile.plt_status if prev_profile else None,
            school_work=member.school_work if member else None,
            major=member.major if member else None,
            v8pid=member.v8pid if member else None,
            enrolled_at=member.enrolled_at if member else None,
            leader_names=resolve_leader_names(prev_profile.leader_ids, leader_map) if prev_profile else [],
            prev_gyogu=prev_profile.gyogu if prev_profile else None,
            prev_team=prev_profile.team if prev_profile else None,
            prev_group_no=prev_profile.group_no if prev_profile else None,
            gyogu=r.gyogu, team=r.team, group_no=r.group_no,
            companion_no=r.companion_no,
            is_excluded=bool(r.is_excluded),
            is_manual=bool(r.is_manual),
        ))

    return TeamAssignmentRunResultResponse(run=run_response, counts=counts, rows=rows)


def svc_move_member(db: Session, target_year: int, member_id: int, gyogu: int, team: int) -> None:
    """팀 이동 — is_manual=1 로 표시한다 (§4-4). 사전 배치 인원도 대상이 될 수 있다."""
    _assert_not_committed(db, target_year)

    run = crud_get_run(db, target_year)
    if run is None or run.status == "draft":
        raise ConflictError("배치를 먼저 실행해야 합니다.")

    result = crud_update_result_team(db, target_year, member_id, gyogu, team)
    if result is None:
        raise ConflictError("배치 결과에 없는 인원입니다.")


def svc_commit_assignment(db: Session, target_year: int) -> TeamAssignmentCommitResponse:
    """소견서 완료 + 교적 이관 (§4-5) — 하나의 트랜잭션으로 묶는다."""
    run = crud_get_run(db, target_year)
    if run is None or run.status == "draft":
        raise ConflictError("배치가 실행된 회차만 완료할 수 있습니다.")
    if run.status == "committed":
        raise TeamAssignmentCommittedError()

    results = crud_get_results(db, target_year)
    member_index = _member_index(db, target_year)  # 직전 프로필 — member_type 등 승계 원본

    commit_date = datetime.date(target_year, 1, 1)

    created = 0
    for r in results:
        entry = member_index.get(r.member_id)
        prev_profile = entry[1] if entry else None
        crud_insert_profile(
            db,
            member_id=r.member_id,
            year=commit_date,
            gyogu=r.gyogu,
            team=r.team,
            group_no=0,
            member_type=prev_profile.member_type if prev_profile else "새가족",
            leader_ids=prev_profile.leader_ids if prev_profile else None,
            attendance_grade=prev_profile.attendance_grade if prev_profile else None,
            plt_status=prev_profile.plt_status if prev_profile else None,
        )
        created += 1

    crud_close_opinion_report(db, target_year - 1)
    updated_run = crud_mark_run_committed(db, run)  # 위 변경들과 한 트랜잭션으로 commit

    return TeamAssignmentCommitResponse(
        run=_to_run_response(updated_run, target_year), profile_rows_created=created,
    )
