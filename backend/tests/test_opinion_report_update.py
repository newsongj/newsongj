import datetime

import pytest

import app.models as models
from app.core.security import verify_token
from app.main import app


@pytest.fixture(autouse=True)
def _admin_menu_override():
    """이 파일의 테스트는 admin.opinion.dashboard 메뉴 + member_id를 가진 토큰으로 가정한다."""
    app.dependency_overrides[verify_token] = lambda: {
        "sub": "1", "member_id": 999, "menus": ["admin.opinion.dashboard"],
    }
    yield
    app.dependency_overrides[verify_token] = lambda: {"sub": "test"}


def _seed_member(db, name="김민준"):
    member = models.Member(
        name=name, gender="남", generation=15,
        enrolled_at=datetime.datetime(2020, 1, 1),
    )
    db.add(member)
    db.flush()
    db.add(models.MemberProfile(
        member_id=member.member_id, updated_at=datetime.date(2026, 1, 1),
        member_type="주일예배", gyogu=1, team=1, group_no=1,
    ))
    db.commit()
    return member.member_id


def test_create_report_when_none_exists(client, db):
    member_id = _seed_member(db)

    response = client.put(
        f"/api/opinion/reports/{member_id}",
        params={"report_year": 2026},
        json={"base_updated_at": None, "current_status": "신앙 성장 중", "general_opinion": "잘함"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["current_status"] == "신앙 성장 중"
    assert body["general_opinion"] == "잘함"
    assert body["updated_at"] is not None

    report = db.query(models.MemberOpinionReport).filter(
        models.MemberOpinionReport.member_id == member_id,
    ).first()
    assert report is not None
    assert report.current_status == "신앙 성장 중"


def test_update_existing_report_keeps_unset_fields(client, db):
    member_id = _seed_member(db)
    report = models.MemberOpinionReport(
        member_id=member_id, report_year=2026,
        current_status="정체", general_opinion="원래 소견",
    )
    db.add(report)
    db.commit()
    base_updated_at = report.updated_at.isoformat()

    response = client.put(
        f"/api/opinion/reports/{member_id}",
        params={"report_year": 2026},
        json={"base_updated_at": base_updated_at, "current_status": "신앙 성장 중"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["current_status"] == "신앙 성장 중"
    # general_opinion은 요청에 없었으므로 기존 값 유지
    assert body["general_opinion"] == "원래 소견"


def test_stale_base_updated_at_returns_409_with_conflict_payload(client, db):
    member_id = _seed_member(db)
    report = models.MemberOpinionReport(
        member_id=member_id, report_year=2026, current_status="정체",
    )
    db.add(report)
    db.commit()

    stale = (report.updated_at - datetime.timedelta(seconds=5)).isoformat()

    response = client.put(
        f"/api/opinion/reports/{member_id}",
        params={"report_year": 2026},
        json={"base_updated_at": stale, "current_status": "신앙 성장 중"},
    )

    assert response.status_code == 409
    body = response.json()
    assert body["detail"] == "conflict"
    assert "current_updated_at" in body
    assert body["is_self"] is False


def test_short_field_over_length_limit_returns_400(client, db):
    member_id = _seed_member(db)

    response = client.put(
        f"/api/opinion/reports/{member_id}",
        params={"report_year": 2026},
        json={"base_updated_at": None, "current_status": "가" * 21},
    )

    assert response.status_code == 400


def test_long_field_over_length_limit_returns_400(client, db):
    member_id = _seed_member(db)

    response = client.put(
        f"/api/opinion/reports/{member_id}",
        params={"report_year": 2026},
        json={"base_updated_at": None, "general_opinion": "가" * 20001},
    )

    assert response.status_code == 400


def test_unknown_member_returns_404(client, db):
    response = client.put(
        "/api/opinion/reports/999999",
        params={"report_year": 2026},
        json={"base_updated_at": None, "current_status": "신앙 성장 중"},
    )

    assert response.status_code == 404


def test_admin_update_does_not_touch_writer_table(client, db):
    member_id = _seed_member(db)

    response = client.put(
        f"/api/opinion/reports/{member_id}",
        params={"report_year": 2026},
        json={"base_updated_at": None, "current_status": "신앙 성장 중"},
    )
    assert response.status_code == 200

    writers = db.query(models.MemberOpinionReportWriter).all()
    assert writers == []
