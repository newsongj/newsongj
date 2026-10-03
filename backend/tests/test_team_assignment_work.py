import datetime

import pytest

import app.models as models
from app.core.security import verify_token
from app.main import app

TARGET_YEAR = 2027  # population snapshot = target_year - 1 = 2026


@pytest.fixture(autouse=True)
def _admin_menu_override():
    app.dependency_overrides[verify_token] = lambda: {
        "sub": "1", "member_id": 999,
        "menus": ["admin.opinion.team_assignment", "admin.opinion.pre_assignment"],
    }
    yield
    app.dependency_overrides[verify_token] = lambda: {"sub": "test"}


def _seed_member(db, name, member_type="주일예배", grade="A", gender="남", deleted=False):
    member = models.Member(
        name=name, gender=gender, generation=15,
        enrolled_at=datetime.datetime(2020, 1, 1),
        deleted_at=datetime.datetime(2026, 6, 1) if deleted else None,
    )
    db.add(member)
    db.flush()
    db.add(models.MemberProfile(
        member_id=member.member_id, updated_at=datetime.date(2026, 1, 1),
        member_type=member_type, attendance_grade=grade, gyogu=1, team=1, group_no=1,
        leader_ids='["1"]',
    ))
    db.commit()
    return member.member_id


def _seed_population(db, count):
    return [_seed_member(db, f"멤버{i}") for i in range(count)]


def test_basics_rejects_non_divisible_team_count(client, db):
    response = client.put(
        "/api/opinion/team-assignment/basics",
        json={"target_year": TARGET_YEAR, "total_team_count": 10, "gyogu_count": 3},
    )
    assert response.status_code == 400


def test_basics_round_trip(client, db):
    response = client.put(
        "/api/opinion/team-assignment/basics",
        json={"target_year": TARGET_YEAR, "total_team_count": 12, "gyogu_count": 3},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total_team_count"] == 12
    assert body["gyogu_count"] == 3
    assert body["status"] == "draft"


def test_run_assigns_all_members_and_respects_capacity(client, db):
    _seed_population(db, 12)
    client.put(
        "/api/opinion/team-assignment/basics",
        json={"target_year": TARGET_YEAR, "total_team_count": 3, "gyogu_count": 1},
    )

    response = client.post("/api/opinion/team-assignment/run", json={"target_year": TARGET_YEAR})
    assert response.status_code == 200
    body = response.json()
    assert body["run"]["status"] == "assigned"
    assert body["run"]["random_seed"] is not None
    assert len(body["rows"]) == 12

    from collections import Counter
    team_counts = Counter((r["gyogu"], r["team"]) for r in body["rows"])
    # capacity = ceil(12/3) = 4 — no team should exceed capacity for plain individuals
    assert all(c <= 4 for c in team_counts.values())
    assert sum(team_counts.values()) == 12


def test_run_seats_exclusions_at_specified_team_and_marks_flag(client, db):
    ids = _seed_population(db, 6)
    excluded_id = ids[0]
    client.put(
        "/api/opinion/team-assignment/basics",
        json={"target_year": TARGET_YEAR, "total_team_count": 2, "gyogu_count": 1},
    )
    client.put(
        "/api/opinion/team-assignment/exclusions",
        json={"target_year": TARGET_YEAR, "items": [
            {"member_id": excluded_id, "gyogu": 1, "team": 2, "reason": "팀장 사전배치"},
        ]},
    )

    response = client.post("/api/opinion/team-assignment/run", json={"target_year": TARGET_YEAR})
    assert response.status_code == 200
    rows = {r["member_id"]: r for r in response.json()["rows"]}
    assert rows[excluded_id]["gyogu"] == 1
    assert rows[excluded_id]["team"] == 2
    assert rows[excluded_id]["is_excluded"] is True
    assert rows[excluded_id]["is_manual"] is False


def test_run_keeps_companion_bundle_in_same_team(client, db):
    ids = _seed_population(db, 8)
    a, b = ids[0], ids[1]
    client.put(
        "/api/opinion/team-assignment/basics",
        json={"target_year": TARGET_YEAR, "total_team_count": 4, "gyogu_count": 1},
    )
    client.put(
        "/api/opinion/team-assignment/companions",
        json={"target_year": TARGET_YEAR, "pairs": [
            {"companion_no": 1, "member_id": a}, {"companion_no": 1, "member_id": b},
        ]},
    )

    response = client.post("/api/opinion/team-assignment/run", json={"target_year": TARGET_YEAR})
    rows = {r["member_id"]: r for r in response.json()["rows"]}
    assert (rows[a]["gyogu"], rows[a]["team"]) == (rows[b]["gyogu"], rows[b]["team"])
    assert rows[a]["companion_no"] == 1
    assert rows[b]["companion_no"] == 1


def test_run_companion_bundle_follows_pre_assigned_seat(client, db):
    """사전 배치자가 묶음에 끼어 있으면 **묶음 전원이 그 자리를 따라간다**.

    제외 명단과 동반배치는 배타가 아니다 — 「이 사람을 여기 앉히고 묶인 사람도
    같이 보내라」가 둘을 함께 쓰는 이유다.
    """
    ids = _seed_population(db, 8)
    anchor_id, mate_id = ids[0], ids[1]
    client.put(
        "/api/opinion/team-assignment/basics",
        json={"target_year": TARGET_YEAR, "total_team_count": 4, "gyogu_count": 1},
    )
    client.put(
        "/api/opinion/team-assignment/companions",
        json={"target_year": TARGET_YEAR, "pairs": [
            {"companion_no": 1, "member_id": anchor_id},
            {"companion_no": 1, "member_id": mate_id},
        ]},
    )
    # 묶음의 한 명만 3팀에 사전 배치한다
    client.put(
        "/api/opinion/team-assignment/exclusions",
        json={"target_year": TARGET_YEAR, "items": [
            {"member_id": anchor_id, "gyogu": 1, "team": 3, "reason": "팀장 사전배치"},
        ]},
    )

    response = client.post("/api/opinion/team-assignment/run", json={"target_year": TARGET_YEAR})
    rows = {r["member_id"]: r for r in response.json()["rows"]}

    # 사전 배치자는 지정 자리에, 묶인 사람도 같은 자리로 따라온다
    assert (rows[anchor_id]["gyogu"], rows[anchor_id]["team"]) == (1, 3)
    assert (rows[mate_id]["gyogu"], rows[mate_id]["team"]) == (1, 3)

    # 묶음 번호는 양쪽 모두 남는다 (화면·PDF 가 동반배치자를 보여줘야 한다)
    assert rows[anchor_id]["companion_no"] == 1
    assert rows[mate_id]["companion_no"] == 1

    # 사전배치 배지는 실제로 제외 명단에 오른 사람에게만 붙는다
    assert rows[anchor_id]["is_excluded"] is True
    assert rows[mate_id]["is_excluded"] is False


def test_counts_do_not_double_count_overlap(client, db):
    """겹친 인원은 제외로만 센다 — total = random + companion + excluded 가 유지된다."""
    ids = _seed_population(db, 8)
    a, b = ids[0], ids[1]
    client.put(
        "/api/opinion/team-assignment/companions",
        json={"target_year": TARGET_YEAR, "pairs": [
            {"companion_no": 1, "member_id": a}, {"companion_no": 1, "member_id": b},
        ]},
    )
    client.put(
        "/api/opinion/team-assignment/exclusions",
        json={"target_year": TARGET_YEAR, "items": [
            {"member_id": a, "gyogu": 1, "team": 1, "reason": None},
        ]},
    )

    c = client.get(
        "/api/opinion/team-assignment/counts", params={"target_year": TARGET_YEAR}).json()
    assert c["excluded"] == 1            # a
    assert c["companion"] == 1           # b 만 (a 는 제외로 셌다)
    assert c["random"] + c["companion"] + c["excluded"] == c["total"]


def test_run_excludes_deleted_members(client, db):
    ids = _seed_population(db, 3)
    deleted_id = _seed_member(db, "탈퇴자", deleted=True)
    client.put(
        "/api/opinion/team-assignment/basics",
        json={"target_year": TARGET_YEAR, "total_team_count": 1, "gyogu_count": 1},
    )

    response = client.post("/api/opinion/team-assignment/run", json={"target_year": TARGET_YEAR})
    member_ids = {r["member_id"] for r in response.json()["rows"]}
    assert deleted_id not in member_ids
    assert member_ids == set(ids)


def test_result_get_matches_run_response(client, db):
    _seed_population(db, 4)
    run_res = client.post("/api/opinion/team-assignment/run", json={"target_year": TARGET_YEAR})
    result_res = client.get("/api/opinion/team-assignment/result", params={"target_year": TARGET_YEAR})
    assert result_res.status_code == 200
    assert result_res.json()["run"] == run_res.json()["run"]
    assert len(result_res.json()["rows"]) == len(run_res.json()["rows"])


def test_move_marks_manual_and_updates_team(client, db):
    ids = _seed_population(db, 4)
    client.post("/api/opinion/team-assignment/run", json={"target_year": TARGET_YEAR})

    response = client.put(
        "/api/opinion/team-assignment/move",
        json={"target_year": TARGET_YEAR, "member_id": ids[0], "gyogu": 1, "team": 99},
    )
    assert response.status_code == 200

    rows = {r["member_id"]: r for r in client.get(
        "/api/opinion/team-assignment/result", params={"target_year": TARGET_YEAR},
    ).json()["rows"]}
    assert rows[ids[0]]["team"] == 99
    assert rows[ids[0]]["is_manual"] is True


def test_move_before_run_rejected(client, db):
    member_id = _seed_member(db, "이동전")
    response = client.put(
        "/api/opinion/team-assignment/move",
        json={"target_year": TARGET_YEAR, "member_id": member_id, "gyogu": 1, "team": 1},
    )
    assert response.status_code == 400


def test_move_unknown_member_rejected(client, db):
    _seed_population(db, 2)
    client.post("/api/opinion/team-assignment/run", json={"target_year": TARGET_YEAR})
    response = client.put(
        "/api/opinion/team-assignment/move",
        json={"target_year": TARGET_YEAR, "member_id": 999999, "gyogu": 1, "team": 1},
    )
    assert response.status_code == 400


def test_commit_before_run_rejected(client, db):
    response = client.post("/api/opinion/team-assignment/commit", json={"target_year": TARGET_YEAR})
    assert response.status_code == 400


def test_commit_creates_profiles_and_closes_run(client, db):
    ids = _seed_population(db, 3)
    client.post("/api/opinion/team-assignment/run", json={"target_year": TARGET_YEAR})

    response = client.post("/api/opinion/team-assignment/commit", json={"target_year": TARGET_YEAR})
    assert response.status_code == 200
    body = response.json()
    assert body["run"]["status"] == "committed"
    assert body["profile_rows_created"] == 3

    new_profile = (
        db.query(models.MemberProfile)
        .filter(
            models.MemberProfile.member_id == ids[0],
            models.MemberProfile.updated_at == datetime.date(TARGET_YEAR, 1, 1),
        )
        .first()
    )
    assert new_profile is not None
    assert new_profile.group_no == 0
    assert new_profile.member_type == "주일예배"  # 직전 프로필에서 승계


def test_commit_is_rejected_twice(client, db):
    _seed_population(db, 2)
    client.post("/api/opinion/team-assignment/run", json={"target_year": TARGET_YEAR})
    first = client.post("/api/opinion/team-assignment/commit", json={"target_year": TARGET_YEAR})
    assert first.status_code == 200

    second = client.post("/api/opinion/team-assignment/commit", json={"target_year": TARGET_YEAR})
    assert second.status_code == 409


def test_commit_closes_opinion_report_custom(client, db):
    db.add(models.OpinionReportCustom(
        report_year=TARGET_YEAR - 1, is_active=1, is_open=1,
    ))
    db.commit()

    _seed_population(db, 2)
    client.post("/api/opinion/team-assignment/run", json={"target_year": TARGET_YEAR})
    response = client.post("/api/opinion/team-assignment/commit", json={"target_year": TARGET_YEAR})
    assert response.status_code == 200

    custom = (
        db.query(models.OpinionReportCustom)
        .filter(models.OpinionReportCustom.report_year == TARGET_YEAR - 1)
        .first()
    )
    assert custom.is_active == 0
    assert custom.is_open == 0


def test_run_move_basics_rejected_after_committed(client, db):
    _seed_population(db, 2)
    client.post("/api/opinion/team-assignment/run", json={"target_year": TARGET_YEAR})
    client.post("/api/opinion/team-assignment/commit", json={"target_year": TARGET_YEAR})

    assert client.put(
        "/api/opinion/team-assignment/basics",
        json={"target_year": TARGET_YEAR, "total_team_count": 6, "gyogu_count": 3},
    ).status_code == 409
    assert client.post(
        "/api/opinion/team-assignment/run", json={"target_year": TARGET_YEAR},
    ).status_code == 409
