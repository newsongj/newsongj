import datetime

import pytest

from app.core.security import verify_token
from app.main import app
from app.models import Member, MemberProfile, OpinionReportCustom, TeamAssignmentRun
from app.services.team_assignment import _assign_units, _build_units, _seeded_shuffle


# ── 알고리즘 단위 테스트 (DB 없이) ─────────────────────────────────────────────

def _row(member_id, gender="남", grade="A"):
    return {"member_id": member_id, "gender": gender, "attendance_grade": grade}


def test_seeded_shuffle_is_deterministic_for_same_seed():
    items = list(range(10))
    assert _seeded_shuffle(items, 12345) == _seeded_shuffle(items, 12345)


def test_companion_group_becomes_single_unit_assigned_together():
    pool = [_row(1, "남", "A"), _row(2, "남", "A"), _row(3, "여", "B")]
    pairs = [(1, 1), (1, 2)]  # companion_no=1 에 member 1, 2

    units = _build_units(pool, pairs)
    companion_unit = next(u for u in units if u["companion_no"] == 1)
    assert {m["member_id"] for m in companion_unit["members"]} == {1, 2}
    assert len(units) == 2  # 묶음 1개 + 개인 1명

    rows = _assign_units(units, total_team_count=4, gyogu_count=2, seed=42)
    by_member = {r["member_id"]: (r["gyogu"], r["team"]) for r in rows}
    assert by_member[1] == by_member[2]


def test_team_index_does_not_reset_between_gender_grade_buckets():
    """teamIndex는 (성별×등급) bucket 경계에서 리셋되지 않아야 한다 — 핵심 불변 조건."""
    pool = [_row(1, "남", "A"), _row(2, "남", "A"), _row(3, "남", "B")]
    units = _build_units(pool, [])
    rows = _assign_units(units, total_team_count=3, gyogu_count=1, seed=1)

    teams = {r["member_id"]: r["team"] for r in rows}
    # bucket "남-A" 2명 + "남-B" 1명, 총 3팀 — 리셋 없으면 서로 다른 팀에 분산되어야 함
    assert len(set(teams.values())) == 3


def test_stratified_round_robin_balances_across_teams():
    pool = [_row(i, "남" if i % 2 == 0 else "여", "A") for i in range(1, 21)]
    units = _build_units(pool, [])
    rows = _assign_units(units, total_team_count=4, gyogu_count=2, seed=7)

    counts: dict[tuple, int] = {}
    for r in rows:
        key = (r["gyogu"], r["team"])
        counts[key] = counts.get(key, 0) + 1
    assert len(counts) == 4
    assert max(counts.values()) - min(counts.values()) <= 1


# ── API 통합 테스트 ────────────────────────────────────────────────────────────

TARGET_YEAR = 2027
PREV_PROFILE_DATE = datetime.date(TARGET_YEAR - 1, 1, 1)


@pytest.fixture
def auth_admin():
    """require_menu('admin.opinion.team_assignment') 통과용 인증 override."""
    app.dependency_overrides[verify_token] = lambda: {
        "sub": "test", "menus": ["admin.opinion.team_assignment"],
    }
    yield
    app.dependency_overrides[verify_token] = lambda: {"sub": "test"}


@pytest.fixture
def target_pool(db):
    """target_year-1 기준 활성 + 비리더 멤버 4명 (성별×등급 다양) 시드."""
    specs = [
        ("김남A", "남", "A"),
        ("이남B", "남", "B"),
        ("박여A", "여", "A"),
        ("최여B", "여", "B"),
    ]
    member_ids = []
    for name, gender, grade in specs:
        member = Member(name=name, gender=gender, generation=20)
        db.add(member)
        db.flush()
        db.add(MemberProfile(
            member_id=member.member_id, updated_at=PREV_PROFILE_DATE,
            member_type="토요예배", gyogu=1, team=1, group_no=1,
            attendance_grade=grade, leader_ids=None,
        ))
        member_ids.append(member.member_id)
    db.add(OpinionReportCustom(
        report_year=TARGET_YEAR - 1,
        member_fields="[]", input_fields="[]", is_active=1,
    ))
    db.commit()
    return member_ids


def test_run_assignment_persists_result_for_all_target_members(client, target_pool, auth_admin):
    response = client.post("/api/opinion/team-assignment/run", json={"target_year": TARGET_YEAR})

    assert response.status_code == 200
    body = response.json()
    assert body["run"]["status"] == "assigned"
    assert body["target_count"] == len(target_pool)
    assert {row["member_id"] for row in body["rows"]} == set(target_pool)
    assert all(row["is_manual"] is False for row in body["rows"])


def test_run_assignment_rejected_when_already_committed(client, db, target_pool, auth_admin):
    db.add(TeamAssignmentRun(target_year=TARGET_YEAR, status="committed"))
    db.commit()

    response = client.post("/api/opinion/team-assignment/run", json={"target_year": TARGET_YEAR})

    assert response.status_code == 400


def test_move_member_marks_row_as_manual(client, db, target_pool, auth_admin):
    client.post("/api/opinion/team-assignment/run", json={"target_year": TARGET_YEAR})
    member_id = target_pool[0]

    response = client.put("/api/opinion/team-assignment/move", json={
        "target_year": TARGET_YEAR, "member_id": member_id, "gyogu": 2, "team": 5,
    })

    assert response.status_code == 200
    result = client.get(
        "/api/opinion/team-assignment/result", params={"target_year": TARGET_YEAR}
    ).json()
    row = next(r for r in result["rows"] if r["member_id"] == member_id)
    assert row["gyogu"] == 2 and row["team"] == 5 and row["is_manual"] is True


def test_get_run_returns_virtual_default_before_any_save(client, auth_admin):
    response = client.get("/api/opinion/team-assignment", params={"target_year": TARGET_YEAR})
    assert response.status_code == 200
    body = response.json()
    assert body == {
        "target_year": TARGET_YEAR, "total_team_count": 36, "gyogu_count": 3,
        "random_seed": None, "status": "draft", "assigned_at": None, "committed_at": None,
    }


def test_save_basics_persists_and_is_reflected_in_get_run(client, auth_admin):
    save = client.put("/api/opinion/team-assignment/basics", json={
        "target_year": TARGET_YEAR, "total_team_count": 12, "gyogu_count": 2,
    })
    assert save.status_code == 200

    run = client.get("/api/opinion/team-assignment", params={"target_year": TARGET_YEAR}).json()
    assert run["total_team_count"] == 12
    assert run["gyogu_count"] == 2
    assert run["status"] == "draft"


def test_companions_round_trip_and_grouping(client, target_pool, auth_admin):
    a, b, c, _ = target_pool
    save = client.put("/api/opinion/team-assignment/companions", json={
        "target_year": TARGET_YEAR,
        "pairs": [
            {"companion_no": 1, "member_id": a},
            {"companion_no": 1, "member_id": b},
            {"companion_no": 2, "member_id": c},
        ],
    })
    assert save.status_code == 200

    companions = client.get(
        "/api/opinion/team-assignment/companions", params={"target_year": TARGET_YEAR}
    ).json()
    assert len(companions) == 2
    group1 = next(g for g in companions if g["companion_no"] == 1)
    assert {m["member_id"] for m in group1["members"]} == {a, b}


def test_commit_requires_assignment_first(client, target_pool, auth_admin):
    response = client.post("/api/opinion/team-assignment/commit", json={"target_year": TARGET_YEAR})
    assert response.status_code == 400


def test_commit_carries_over_profile_and_deactivates_opinion_round(client, db, target_pool, auth_admin):
    client.post("/api/opinion/team-assignment/run", json={"target_year": TARGET_YEAR})

    response = client.post("/api/opinion/team-assignment/commit", json={"target_year": TARGET_YEAR})
    assert response.status_code == 200

    member_id = target_pool[0]
    new_profile = (
        db.query(MemberProfile)
        .filter(
            MemberProfile.member_id == member_id,
            MemberProfile.updated_at == datetime.date(TARGET_YEAR, 1, 1),
        )
        .first()
    )
    assert new_profile is not None
    assert new_profile.member_type == "토요예배"  # 원 프로필에서 이월

    custom = (
        db.query(OpinionReportCustom)
        .filter(OpinionReportCustom.report_year == TARGET_YEAR - 1)
        .first()
    )
    assert custom.is_active == 0

    run = db.query(TeamAssignmentRun).filter(TeamAssignmentRun.target_year == TARGET_YEAR).first()
    assert run.status == "committed"

    # 재확정 거부 — 프로필 중복 이관 방지
    second = client.post("/api/opinion/team-assignment/commit", json={"target_year": TARGET_YEAR})
    assert second.status_code == 400
