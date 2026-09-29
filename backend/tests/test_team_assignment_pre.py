import datetime

import pytest

import app.models as models
from app.core.security import verify_token
from app.main import app

TARGET_YEAR = 2027  # population snapshot = target_year - 1 = 2026


@pytest.fixture(autouse=True)
def _admin_menu_override():
    app.dependency_overrides[verify_token] = lambda: {
        "sub": "1", "member_id": 999, "menus": ["admin.opinion.pre_assignment"],
    }
    yield
    app.dependency_overrides[verify_token] = lambda: {"sub": "test"}


def _seed_member(db, name, member_type="주일예배", deleted=False):
    member = models.Member(
        name=name, gender="남", generation=15,
        enrolled_at=datetime.datetime(2020, 1, 1),
        deleted_at=datetime.datetime(2026, 6, 1) if deleted else None,
    )
    db.add(member)
    db.flush()
    db.add(models.MemberProfile(
        member_id=member.member_id, updated_at=datetime.date(2026, 1, 1),
        member_type=member_type, gyogu=1, team=1, group_no=1,
    ))
    db.commit()
    return member.member_id


def test_get_run_returns_defaults_when_none_exists(client, db):
    response = client.get("/api/opinion/team-assignment", params={"target_year": TARGET_YEAR})

    assert response.status_code == 200
    body = response.json()
    assert body["target_year"] == TARGET_YEAR
    assert body["total_team_count"] == 36
    assert body["gyogu_count"] == 3
    assert body["status"] == "draft"


def test_exclusions_round_trip_with_member_info(client, db):
    member_id = _seed_member(db, "김민준")

    put_res = client.put(
        "/api/opinion/team-assignment/exclusions",
        json={"target_year": TARGET_YEAR, "items": [
            {"member_id": member_id, "gyogu": 2, "team": 5, "reason": "임원단 사전배치"},
        ]},
    )
    assert put_res.status_code == 200

    get_res = client.get(
        "/api/opinion/team-assignment/exclusions", params={"target_year": TARGET_YEAR},
    )
    assert get_res.status_code == 200
    items = get_res.json()
    assert len(items) == 1
    assert items[0]["gyogu"] == 2
    assert items[0]["team"] == 5
    assert items[0]["reason"] == "임원단 사전배치"
    assert items[0]["member"]["member_id"] == member_id
    assert items[0]["member"]["name"] == "김민준"


def test_exclusions_put_fully_replaces_previous_list(client, db):
    a = _seed_member(db, "A")
    b = _seed_member(db, "B")

    client.put(
        "/api/opinion/team-assignment/exclusions",
        json={"target_year": TARGET_YEAR, "items": [{"member_id": a, "gyogu": 1, "team": 1, "reason": None}]},
    )
    client.put(
        "/api/opinion/team-assignment/exclusions",
        json={"target_year": TARGET_YEAR, "items": [{"member_id": b, "gyogu": 1, "team": 2, "reason": None}]},
    )

    items = client.get(
        "/api/opinion/team-assignment/exclusions", params={"target_year": TARGET_YEAR},
    ).json()
    assert [it["member"]["member_id"] for it in items] == [b]


def test_companions_round_trip(client, db):
    a = _seed_member(db, "동반A")
    b = _seed_member(db, "동반B")

    put_res = client.put(
        "/api/opinion/team-assignment/companions",
        json={"target_year": TARGET_YEAR, "pairs": [
            {"companion_no": 1, "member_id": a},
            {"companion_no": 1, "member_id": b},
        ]},
    )
    assert put_res.status_code == 200

    groups = client.get(
        "/api/opinion/team-assignment/companions", params={"target_year": TARGET_YEAR},
    ).json()
    assert len(groups) == 1
    assert groups[0]["companion_no"] == 1
    assert {m["member_id"] for m in groups[0]["members"]} == {a, b}


def test_exclusion_rejects_member_already_in_companion(client, db):
    a = _seed_member(db, "겹침A")
    b = _seed_member(db, "겹침B")
    client.put(
        "/api/opinion/team-assignment/companions",
        json={"target_year": TARGET_YEAR, "pairs": [
            {"companion_no": 1, "member_id": a}, {"companion_no": 1, "member_id": b},
        ]},
    )

    response = client.put(
        "/api/opinion/team-assignment/exclusions",
        json={"target_year": TARGET_YEAR, "items": [{"member_id": a, "gyogu": 1, "team": 1, "reason": None}]},
    )
    assert response.status_code == 400


def test_companion_rejects_member_already_excluded(client, db):
    a = _seed_member(db, "제외A")
    client.put(
        "/api/opinion/team-assignment/exclusions",
        json={"target_year": TARGET_YEAR, "items": [{"member_id": a, "gyogu": 1, "team": 1, "reason": None}]},
    )

    response = client.put(
        "/api/opinion/team-assignment/companions",
        json={"target_year": TARGET_YEAR, "pairs": [
            {"companion_no": 1, "member_id": a}, {"companion_no": 1, "member_id": _seed_member(db, "짝")},
        ]},
    )
    assert response.status_code == 400


def test_duplicate_member_in_exclusion_payload_rejected(client, db):
    a = _seed_member(db, "중복A")
    response = client.put(
        "/api/opinion/team-assignment/exclusions",
        json={"target_year": TARGET_YEAR, "items": [
            {"member_id": a, "gyogu": 1, "team": 1, "reason": None},
            {"member_id": a, "gyogu": 1, "team": 2, "reason": None},
        ]},
    )
    assert response.status_code == 400


def test_committed_run_rejects_puts(client, db):
    db.add(models.TeamAssignmentRun(
        target_year=TARGET_YEAR, total_team_count=36, gyogu_count=3,
        status="committed",
    ))
    db.commit()

    ex_res = client.put(
        "/api/opinion/team-assignment/exclusions",
        json={"target_year": TARGET_YEAR, "items": []},
    )
    assert ex_res.status_code == 409

    comp_res = client.put(
        "/api/opinion/team-assignment/companions",
        json={"target_year": TARGET_YEAR, "pairs": []},
    )
    assert comp_res.status_code == 409


def test_counts_arithmetic(client, db):
    newcomer_id = _seed_member(db, "새가족이", member_type="새가족")
    regular_ids = [_seed_member(db, f"일반{i}") for i in range(4)]
    _seed_member(db, "삭제됨", deleted=True)

    excluded_id = regular_ids[0]
    companion_ids = regular_ids[1:3]

    client.put(
        "/api/opinion/team-assignment/exclusions",
        json={"target_year": TARGET_YEAR, "items": [
            {"member_id": excluded_id, "gyogu": 1, "team": 1, "reason": None},
        ]},
    )
    client.put(
        "/api/opinion/team-assignment/companions",
        json={"target_year": TARGET_YEAR, "pairs": [
            {"companion_no": 1, "member_id": companion_ids[0]},
            {"companion_no": 1, "member_id": companion_ids[1]},
        ]},
    )

    counts = client.get(
        "/api/opinion/team-assignment/counts", params={"target_year": TARGET_YEAR},
    ).json()

    assert counts["total"] == 5  # newcomer + 4 regular, 삭제됨 제외
    assert counts["newcomer"] == 1
    assert counts["regular"] == 4
    assert counts["excluded"] == 1
    assert counts["companion"] == 2
    assert counts["random"] == counts["total"] - counts["companion"] - counts["excluded"]
    assert counts["total"] == counts["random"] + counts["companion"] + counts["excluded"]
    assert counts["total"] == counts["newcomer"] + counts["regular"]
