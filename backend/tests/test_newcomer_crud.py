"""미등반 새가족 전용 CRUD 도메인 — 생성/수정/삭제/등반처리 회귀 테스트."""
import datetime


def _newcomer_body(name="새사람", **overrides):
    body = {
        "name": name, "gender": "남", "generation": 21,
        "phone_number": None, "v8pid": None, "birthdate": None,
        "school_work": None, "major": None,
        "gyogu": 1, "team": 1, "group_no": 1,
    }
    body.update(overrides)
    return body


def test_create_newcomer_succeeds(client, db):
    r = client.post("/api/v1/gyojeok/members/newcomers", json=_newcomer_body())
    assert r.status_code == 201
    nid = r.json()["member_id"]

    # 새가족 목록에 등장
    r2 = client.get("/api/v1/gyojeok/members/newcomers", params={"year": datetime.date.today().year})
    types = {m["member_type"] for m in r2.json()["items"]}
    assert "새가족" in types

    # 일반 목록에는 없음
    r3 = client.get("/api/v1/gyojeok/members", params={"year": datetime.date.today().year})
    assert nid not in {m["member_id"] for m in r3.json()["items"]}


def test_create_newcomer_does_not_set_enrolled_at(client, db):
    r = client.post("/api/v1/gyojeok/members/newcomers", json=_newcomer_body(name="등반전"))
    nid = r.json()["member_id"]

    from app.models import Member
    m = db.query(Member).filter(Member.member_id == nid).first()
    assert m.enrolled_at is None  # 등반 전이라 NULL


def test_update_newcomer_succeeds(client, seed_members):
    _, newcomer_id = seed_members
    body = _newcomer_body(name="수정됨", phone_number="01011112222")
    r = client.put(f"/api/v1/gyojeok/members/newcomers/{newcomer_id}", json=body)
    assert r.status_code == 200


def test_update_newcomer_on_regular_member_returns_404(client, seed_members):
    regular_id, _ = seed_members
    r = client.put(f"/api/v1/gyojeok/members/newcomers/{regular_id}", json=_newcomer_body())
    assert r.status_code == 404


def test_delete_newcomer_succeeds(client, seed_members):
    _, newcomer_id = seed_members
    r = client.delete(f"/api/v1/gyojeok/members/newcomers/{newcomer_id}")
    assert r.status_code == 200

    # 새가족 목록에서 사라짐
    r2 = client.get("/api/v1/gyojeok/members/newcomers", params={"year": datetime.date.today().year})
    assert newcomer_id not in {m["member_id"] for m in r2.json()["items"]}


def test_delete_newcomer_on_regular_member_returns_404(client, seed_members):
    regular_id, _ = seed_members
    r = client.delete(f"/api/v1/gyojeok/members/newcomers/{regular_id}")
    assert r.status_code == 404


def test_enroll_newcomer_promotes_to_regular(client, seed_members, db):
    _, newcomer_id = seed_members
    enrolled = "2026-05-01T10:00:00"
    r = client.put(
        f"/api/v1/gyojeok/members/{newcomer_id}/enroll",
        json={"enrolled_at": enrolled, "member_type": "토요예배"},
    )
    assert r.status_code == 200

    # 새가족 목록에서 사라짐
    r2 = client.get("/api/v1/gyojeok/members/newcomers", params={"year": datetime.date.today().year})
    assert newcomer_id not in {m["member_id"] for m in r2.json()["items"]}

    # 일반 목록에 등장
    r3 = client.get("/api/v1/gyojeok/members", params={"year": datetime.date.today().year})
    item = next((m for m in r3.json()["items"] if m["member_id"] == newcomer_id), None)
    assert item is not None
    assert item["member_type"] == "토요예배"

    # enrolled_at 세팅됨
    from app.models import Member
    m = db.query(Member).filter(Member.member_id == newcomer_id).first()
    assert m.enrolled_at is not None


def test_enroll_on_regular_member_returns_404(client, seed_members):
    regular_id, _ = seed_members
    r = client.put(
        f"/api/v1/gyojeok/members/{regular_id}/enroll",
        json={"enrolled_at": "2026-05-01T10:00:00"},
    )
    assert r.status_code == 404


def test_enroll_default_member_type_is_saturday_worship(client, seed_members):
    """body에 member_type 미지정 시 default '토요예배'."""
    _, newcomer_id = seed_members
    r = client.put(
        f"/api/v1/gyojeok/members/{newcomer_id}/enroll",
        json={"enrolled_at": "2026-05-01T10:00:00"},
    )
    assert r.status_code == 200

    r2 = client.get("/api/v1/gyojeok/members", params={"year": datetime.date.today().year})
    item = next((m for m in r2.json()["items"] if m["member_id"] == newcomer_id), None)
    assert item["member_type"] == "토요예배"
