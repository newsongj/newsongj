"""새가족(미등반) 정책 회귀 테스트 — `reference/newcomers.md` 정책표 검증."""


def test_list_members_excludes_newcomer(client, seed_members):
    regular_id, newcomer_id = seed_members
    r = client.get("/api/v1/gyojeok/members", params={"year": 2026, "page": 1, "page_size": 100})
    assert r.status_code == 200
    items = r.json()["items"]
    ids = {m["member_id"] for m in items}
    types = {m["member_type"] for m in items}
    assert regular_id in ids
    assert newcomer_id not in ids
    assert "새가족" not in types


def test_list_newcomers_returns_only_newcomers(client, seed_members):
    regular_id, newcomer_id = seed_members
    r = client.get("/api/v1/gyojeok/members/newcomers", params={"year": 2026, "page": 1, "page_size": 100})
    assert r.status_code == 200
    items = r.json()["items"]
    ids = {m["member_id"] for m in items}
    types = {m["member_type"] for m in items}
    assert ids == {newcomer_id}
    assert types == {"새가족"}


def test_update_newcomer_returns_404(client, seed_members):
    _, newcomer_id = seed_members
    body = {
        "name": "수정시도", "gender": "여", "generation": 20,
        "phone_number": None, "v8pid": None, "birthdate": None,
        "school_work": None, "major": None,
        "member_type": "토요예배", "gyogu": 1, "team": 1, "group_no": 1,
        "leader_ids": None, "plt_status": None,
    }
    r = client.put(f"/api/v1/gyojeok/members/{newcomer_id}", json=body)
    assert r.status_code == 404


def test_delete_newcomer_returns_404(client, seed_members):
    _, newcomer_id = seed_members
    r = client.request("DELETE", f"/api/v1/gyojeok/members/{newcomer_id}", json={"deleted_reason": "test"})
    assert r.status_code == 404


def test_create_member_with_newcomer_type_rejected(client, seed_members):
    body = {
        "name": "새가족생성시도", "gender": "남", "generation": 20,
        "phone_number": None, "v8pid": None, "birthdate": None,
        "school_work": None, "major": None,
        "member_type": "새가족", "gyogu": 1, "team": 1, "group_no": 1,
        "leader_ids": None, "plt_status": None,
    }
    r = client.post("/api/v1/gyojeok/members", json=body)
    assert r.status_code == 400
    assert "새가족" in r.json()["detail"]


def test_create_regular_member_succeeds(client, seed_members):
    body = {
        "name": "일반신규", "gender": "남", "generation": 21,
        "phone_number": None, "v8pid": None, "birthdate": None,
        "school_work": None, "major": None,
        "member_type": "토요예배", "gyogu": 1, "team": 1, "group_no": 1,
        "leader_ids": None, "plt_status": None,
    }
    r = client.post("/api/v1/gyojeok/members", json=body)
    assert r.status_code == 201
    assert "member_id" in r.json()
