import datetime
import json

import pytest

import app.models as models
from app.core.security import verify_token
from app.main import app

YEAR = 2026


@pytest.fixture(autouse=True)
def _admin_menu_override():
    app.dependency_overrides[verify_token] = lambda: {
        "sub": "1", "member_id": 999, "menus": ["admin.opinion.settings"],
    }
    yield
    app.dependency_overrides[verify_token] = lambda: {"sub": "test"}


@pytest.fixture
def leaders(db):
    # SQLite는 SMALLINT PK를 자동 증가시키지 않으므로 id를 직접 준다
    rows = {"임원단": 1, "팀장": 2, "그룹장": 3}
    for name, leader_id in rows.items():
        db.add(models.Leader(leader_id=leader_id, leader_name=name))
    db.commit()
    return rows


def _seed_member(db, name, leader_ids=(), deleted=False):
    member = models.Member(
        name=name, gender="남", generation=15, phone_number=None,
        enrolled_at=datetime.datetime(2020, 1, 1),
        deleted_at=datetime.datetime(2026, 6, 1) if deleted else None,
    )
    db.add(member)
    db.flush()
    member.phone_number = f"010-0000-{member.member_id:04d}"
    db.add(models.MemberProfile(
        member_id=member.member_id, updated_at=datetime.date(2026, 1, 1),
        member_type="주일예배", gyogu=1, team=2, group_no=3,
        leader_ids=json.dumps([str(x) for x in leader_ids]),
    ))
    db.commit()
    return member.member_id


def _body(**overrides):
    body = {
        "report_year": YEAR,
        "theme": "하나님의 열심이 이루시리라",
        "start_date": "2026-11-01",
        "end_date": "2026-12-15",
        "guide_text": "사실에 근거해 작성해 주세요.",
        "is_open": True,
        "member_fields": ["name", "gyogu"],
        "input_fields": ["current_status", "general_opinion"],
        "mappings": [],
    }
    body.update(overrides)
    return body


def test_get_returns_defaults_when_not_created(client):
    res = client.get("/api/opinion/settings", params={"report_year": YEAR})

    assert res.status_code == 200
    body = res.json()
    assert body["exists"] is False
    assert body["is_active"] is True
    assert body["is_open"] is True
    assert body["theme"] is None
    assert "attendance_rate" not in body["member_fields"]
    assert len(body["input_fields"]) == 9


def test_save_creates_then_updates_settings(client, db):
    res = client.put("/api/opinion/settings", json=_body(
        member_fields=["gyogu", "name", "gyogu"],  # 순서·중복은 서버가 정리한다
    ))
    assert res.status_code == 200

    body = client.get("/api/opinion/settings", params={"report_year": YEAR}).json()
    assert body["exists"] is True
    assert body["is_active"] is True
    assert body["theme"] == "하나님의 열심이 이루시리라"
    assert body["start_date"] == "2026-11-01"
    assert body["member_fields"] == ["name", "gyogu"]
    assert body["input_fields"] == ["current_status", "general_opinion"]

    res = client.put("/api/opinion/settings", json=_body(is_open=False, theme="  "))
    assert res.status_code == 200
    body = client.get("/api/opinion/settings", params={"report_year": YEAR}).json()
    assert body["is_open"] is False
    assert body["theme"] is None
    assert db.query(models.OpinionReportCustom).count() == 1


def test_save_rejected_when_round_completed(client, db):
    db.add(models.OpinionReportCustom(report_year=YEAR, is_active=0, is_open=0))
    db.commit()

    res = client.put("/api/opinion/settings", json=_body())

    assert res.status_code == 409


@pytest.mark.parametrize("overrides", [
    {"start_date": "2026-12-16", "end_date": "2026-12-15"},
    {"input_fields": []},
    {"input_fields": ["current_status_etc"]},          # 부모 없는 기타설명란
    {"input_fields": ["unknown_field"]},
    {"member_fields": ["enrolled_at"]},                # 의도적으로 제외된 키
    {"theme": "가" * 201},
    {"guide_text": "가" * 501},
])
def test_save_validation_returns_400(client, overrides):
    res = client.put("/api/opinion/settings", json=_body(**overrides))

    assert res.status_code == 400


def test_mappings_round_trip_grouped_by_writer(client, db, leaders):
    exec_id = leaders["임원단"]
    writer = _seed_member(db, "회장", [exec_id])
    t1 = _seed_member(db, "국장A", [exec_id, leaders["팀장"]])
    t2 = _seed_member(db, "국장B", [exec_id])

    res = client.put("/api/opinion/settings", json=_body(mappings=[
        {"writer_member_id": writer, "target_member_id": t1},
        {"writer_member_id": writer, "target_member_id": t2},
        {"writer_member_id": writer, "target_member_id": t2},  # 중복 쌍은 하나로
        {"writer_member_id": t1, "target_member_id": t2},
    ]))
    assert res.status_code == 200

    groups = client.get("/api/opinion/mappings", params={"report_year": YEAR}).json()
    assert [g["writer"]["member_id"] for g in groups] == [writer, t1]
    assert [t["member_id"] for t in groups[0]["targets"]] == [t1, t2]
    assert groups[0]["writer"]["gyogu"] == 1
    assert groups[0]["writer"]["phone_number"] == f"010-0000-{writer:04d}"
    assert groups[1]["targets"][0]["member_id"] == t2

    # 전체 대체 — 빈 배열이면 매핑이 모두 사라진다
    client.put("/api/opinion/settings", json=_body(mappings=[]))
    assert client.get("/api/opinion/mappings", params={"report_year": YEAR}).json() == []


def test_mapping_rejects_self_and_non_executive(client, db, leaders):
    exec_id = leaders["임원단"]
    writer = _seed_member(db, "회장", [exec_id])
    team_leader = _seed_member(db, "팀장", [leaders["팀장"]])
    deleted_exec = _seed_member(db, "탈퇴임원", [exec_id], deleted=True)

    for pair in (
        {"writer_member_id": writer, "target_member_id": writer},
        {"writer_member_id": writer, "target_member_id": team_leader},
        {"writer_member_id": writer, "target_member_id": deleted_exec},
        {"writer_member_id": writer, "target_member_id": 99999},
    ):
        res = client.put("/api/opinion/settings", json=_body(mappings=[pair]))
        assert res.status_code == 400, pair

    # 검증 실패 시 설정도 저장되지 않는다
    assert db.query(models.OpinionReportCustom).count() == 0


def test_dashboard_menu_can_read_settings_but_not_write(client):
    app.dependency_overrides[verify_token] = lambda: {
        "sub": "1", "member_id": 999, "menus": ["admin.opinion.dashboard"],
    }

    assert client.get("/api/opinion/settings", params={"report_year": YEAR}).status_code == 200
    assert client.put("/api/opinion/settings", json=_body()).status_code == 403
    assert client.get("/api/opinion/mappings", params={"report_year": YEAR}).status_code == 403
