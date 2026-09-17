"""Authentication and object-scope contracts, including visible known failures."""
from datetime import date, datetime, timedelta, timezone

import bcrypt
import pytest
from jose import jwt

from app.core.config import settings
from app.models import (
    Member, MemberProfile, PatientRoomApplication, PolicyAccess, PolicyAccessMenu,
    RetreatCustom, RetreatResponse, SuspendedMealApplication, UserAccount,
)


@pytest.mark.parametrize("authorization", [None, "Bearer not-a-jwt", "Basic abc"])
def test_protected_endpoint_rejects_missing_or_invalid_token(anonymous_client, authorization):
    headers = {"Authorization": authorization} if authorization else {}
    response = anonymous_client.get("/api/v1/me", headers=headers)
    assert response.status_code == 401


def test_expired_token_is_rejected(anonymous_client, auth_headers):
    headers = auth_headers(["admin.authority.accounts"], exp=datetime.now(timezone.utc) - timedelta(seconds=1))
    assert anonymous_client.get("/api/admin/accounts", headers=headers).status_code == 401


def test_token_with_wrong_signature_is_rejected(anonymous_client):
    token = jwt.encode({"sub": "1", "menus": ["admin.authority.accounts"]}, "another-test-key", algorithm="HS256")
    response = anonymous_client.get("/api/admin/accounts", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


@pytest.mark.parametrize("menus", [[], ["user.vehicle"], ["admin.gyojeok.members"]])
def test_account_management_requires_its_own_menu(anonymous_client, auth_headers, menus):
    response = anonymous_client.get("/api/admin/accounts", headers=auth_headers(menus))
    assert response.status_code == 403


def test_account_management_accepts_matching_menu(anonymous_client, auth_headers):
    response = anonymous_client.get("/api/admin/accounts", headers=auth_headers(["admin.authority.accounts"]))
    assert response.status_code == 200
    assert response.json() == []


@pytest.fixture
def login_account(db):
    policy = PolicyAccess(policy_name="test research policy")
    db.add(policy)
    db.flush()
    db.add(PolicyAccessMenu(policy_id=policy.policy_id, menu_key="user.research"))
    account = UserAccount(
        login_id="test-account", password=bcrypt.hashpw(b"test-password", bcrypt.gensalt()).decode(),
        policy_id=policy.policy_id, data_scope="all", is_active=1,
    )
    db.add(account)
    db.commit()
    return account


def test_login_issues_token_with_database_policy(anonymous_client, login_account):
    response = anonymous_client.post("/api/auth/login", json={"login_id": "test-account", "password": "test-password"})
    assert response.status_code == 200
    payload = jwt.decode(response.json()["token"], settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    assert payload["sub"] == str(login_account.account_id)
    assert payload["menus"] == ["user.research"]
    assert payload["data_scope"] == "all"
    denied = anonymous_client.get("/api/admin/accounts", headers={"Authorization": f"Bearer {response.json()['token']}"})
    assert denied.status_code == 403


@pytest.mark.parametrize("inactive", [False, True])
def test_login_rejects_wrong_password_or_inactive_account(anonymous_client, db, login_account, inactive):
    if inactive:
        login_account.is_active = 0
        db.commit()
    response = anonymous_client.post("/api/auth/login", json={
        "login_id": "test-account", "password": "test-password" if inactive else "wrong-password",
    })
    assert response.status_code == 401


@pytest.fixture
def retreat_members(db):
    db.add(RetreatCustom(retreat_name="test retreat", start_date=date(2026, 7, 1), end_date=date(2026, 7, 4)))
    result = []
    for index, (gyogu, team, group_no) in enumerate([(1, 1, 1), (1, 1, 2), (1, 2, 1), (2, 1, 1)]):
        member = Member(name=f"test member {index}", gender="남", generation=40, enrolled_at=datetime(2026, 1, 1))
        db.add(member)
        db.flush()
        db.add(MemberProfile(member_id=member.member_id, updated_at=date(2026, 1, 1),
                             member_type="토요예배", gyogu=gyogu, team=team, group_no=group_no))
        result.append(member.member_id)
    db.commit()
    return result


@pytest.mark.parametrize("scope,expected_indices", [("team", [0, 1]), ("group", [0])])
def test_research_list_cannot_expand_scope_with_query_parameters(
    anonymous_client, auth_headers, retreat_members, scope, expected_indices,
):
    headers = auth_headers(["user.research"], data_scope=scope, gyogu=1, team=1, group_no=1)
    response = anonymous_client.get("/api/retreat/research/members?gyogu=2&team=2", headers=headers)
    assert response.status_code == 200
    assert {row["member_id"] for row in response.json()} == {retreat_members[i] for i in expected_indices}


WRITES = [
    ("research", "user.research", {"day1_attendance": "참석"}),
    ("suspended-meal", "user.suspended_meal", {"meal_count": 1, "fee_support": False, "applicant_reason": "test"}),
    ("patient-room", "user.patient_room", {"applicant_reason": "test"}),
]
WRITE_MODELS = {
    "research": RetreatResponse,
    "suspended-meal": SuspendedMealApplication,
    "patient-room": PatientRoomApplication,
}


def _stored_response(db, resource, member_id):
    # Observe the API's committed transaction, including under MariaDB REPEATABLE READ.
    db.rollback()
    return db.query(WRITE_MODELS[resource]).filter_by(member_id=member_id).one_or_none()


def _assert_body_persisted(row, body):
    assert row is not None
    for field, expected in body.items():
        assert getattr(row, field) == expected


@pytest.mark.parametrize("resource,menu,body", WRITES)
def test_retreat_write_rejects_wrong_menu(anonymous_client, auth_headers, retreat_members, db, resource, menu, body):
    headers = auth_headers(["user.vehicle"], data_scope="team", gyogu=1, team=1)
    response = anonymous_client.put(f"/api/retreat/{resource}/response/{retreat_members[0]}", headers=headers, json=body)
    assert response.status_code == 403
    assert _stored_response(db, resource, retreat_members[0]) is None


@pytest.mark.parametrize("resource,menu,body", WRITES)
def test_retreat_write_accepts_member_inside_scope(anonymous_client, auth_headers, retreat_members, db, resource, menu, body):
    headers = auth_headers([menu], data_scope="team", gyogu=1, team=1)
    response = anonymous_client.put(f"/api/retreat/{resource}/response/{retreat_members[0]}", headers=headers, json=body)
    assert response.status_code == 200
    _assert_body_persisted(_stored_response(db, resource, retreat_members[0]), body)


class MissingScopeEnforcement(AssertionError):
    """Only the known successful out-of-scope write is an expected failure."""


@pytest.mark.xfail(
    strict=True, raises=MissingScopeEnforcement,
    reason="Known gap: retreat PUT checks menu but does not enforce target member scope. Remove xfail after the fix.",
)
@pytest.mark.parametrize("resource,menu,body", WRITES)
def test_retreat_write_rejects_member_outside_scope(anonymous_client, auth_headers, retreat_members, db, resource, menu, body):
    headers = auth_headers([menu], data_scope="team", gyogu=1, team=1)
    response = anonymous_client.put(f"/api/retreat/{resource}/response/{retreat_members[2]}", headers=headers, json=body)
    if response.status_code == 200:
        _assert_body_persisted(_stored_response(db, resource, retreat_members[2]), body)
        raise MissingScopeEnforcement(f"Out-of-scope {resource} write returned 200 and persisted the request.")
    assert response.status_code == 403, response.text
    assert _stored_response(db, resource, retreat_members[2]) is None
