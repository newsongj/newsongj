import datetime
from decimal import Decimal

import app.models as models
from app.crud.attendance_rate import update_rates_for_members


def test_team_scope_attendance_records_preserve_each_group_no(client, db):
    worship_date = datetime.date(2026, 5, 2)
    profile_date = datetime.date(2026, 5, 1)

    group_one = models.Member(
        name="1그룹지체",
        gender="남",
        generation=21,
        enrolled_at=datetime.datetime(2026, 1, 1),
    )
    group_two = models.Member(
        name="2그룹지체",
        gender="여",
        generation=22,
        enrolled_at=datetime.datetime(2026, 1, 1),
    )
    db.add_all([group_one, group_two])
    db.flush()

    db.add_all([
        models.MemberProfile(
            member_id=group_one.member_id,
            updated_at=profile_date,
            member_type="토요예배",
            gyogu=1,
            team=1,
            group_no=1,
        ),
        models.MemberProfile(
            member_id=group_two.member_id,
            updated_at=profile_date,
            member_type="토요예배",
            gyogu=1,
            team=1,
            group_no=2,
        ),
    ])
    db.commit()

    response = client.get(
        "/api/attendance/records",
        params={
            "worship_date": worship_date.isoformat(),
            "gyogu_no": 1,
            "team_no": 1,
            "page": 1,
            "page_size": 100,
        },
    )

    assert response.status_code == 200
    items_by_name = {item["name"]: item for item in response.json()["items"]}

    assert items_by_name["1그룹지체"]["gyogu"] == 1
    assert items_by_name["1그룹지체"]["team"] == 1
    assert items_by_name["1그룹지체"]["group_no"] == 1
    assert items_by_name["2그룹지체"]["gyogu"] == 1
    assert items_by_name["2그룹지체"]["team"] == 1
    assert items_by_name["2그룹지체"]["group_no"] == 2


def test_get_attendance_records_rejects_non_saturday(client):
    response = client.get(
        "/api/attendance/records",
        params={
            "worship_date": "2026-05-03",
            "gyogu_no": 1,
            "page": 1,
            "page_size": 20,
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "worship_date는 토요일이어야 합니다."


def test_batch_save_attendance_rejects_non_saturday(client, seed_members):
    regular_id, _ = seed_members

    response = client.post(
        "/api/attendance/records/batch",
        json={
            "worship_date": "2026-05-03",
            "records": [
                {"member_id": regular_id, "status": "PRESENT", "absent_reason": None},
            ],
        },
    )

    assert response.status_code == 422
    assert "worship_date는 토요일이어야 합니다." in str(response.json()["detail"])


def test_monthly_dashboard_ignores_non_saturday_records(client, db):
    member = models.Member(
        name="평일오염방어",
        gender="남",
        generation=46,
        enrolled_at=datetime.datetime(2026, 1, 1),
    )
    db.add(member)
    db.flush()
    db.add(models.MemberProfile(
        member_id=member.member_id,
        updated_at=datetime.date(2026, 5, 1),
        member_type="토요예배",
        gyogu=1,
        team=1,
        group_no=1,
    ))
    db.add_all([
        models.AttendanceRecord(
            worship_date=datetime.date(2026, 5, 2),
            member_id=member.member_id,
            status="ABSENT",
            absent_reason="기타",
            checked_at=datetime.datetime(2026, 5, 2, 10, 0),
        ),
        models.AttendanceRecord(
            worship_date=datetime.date(2026, 5, 3),
            member_id=member.member_id,
            status="PRESENT",
            absent_reason=None,
            checked_at=datetime.datetime(2026, 5, 3, 10, 0),
        ),
    ])
    db.commit()

    response = client.get(
        "/api/attendance/dashboard",
        params={"period_unit": "monthly", "date": "2026-05"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["kpi"]["all"] == {"present": 0.0, "total": 1.0}


def test_weekly_dashboard_rejects_non_saturday(client):
    response = client.get(
        "/api/attendance/dashboard",
        params={"period_unit": "weekly", "date": "2026-05-03"},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "weekly: date는 토요일이어야 합니다 (예: 2026-01-03)."


def test_attendance_rate_ignores_non_saturday_records(db):
    member = models.Member(
        name="출석률오염방어",
        gender="여",
        generation=46,
        enrolled_at=datetime.datetime(2026, 5, 1),
    )
    db.add(member)
    db.flush()
    profile = models.MemberProfile(
        member_id=member.member_id,
        updated_at=datetime.date(2026, 5, 1),
        member_type="토요예배",
        gyogu=1,
        team=1,
        group_no=1,
    )
    db.add(profile)
    db.add(models.AttendanceRecord(
        worship_date=datetime.date(2026, 5, 3),
        member_id=member.member_id,
        status="PRESENT",
        absent_reason=None,
        checked_at=datetime.datetime(2026, 5, 3, 10, 0),
    ))
    db.commit()

    update_rates_for_members(db, {member.member_id: datetime.date(2026, 5, 1)}, datetime.date(2026, 5, 9))
    db.flush()
    db.refresh(profile)

    assert profile.attendance_rate == Decimal("0.00")
    assert profile.attendance_grade == "E"
