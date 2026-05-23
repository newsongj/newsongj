import datetime

import app.models as models


def _add_member(
    db,
    *,
    name: str,
    member_type: str,
    enrolled_at: datetime.datetime | None,
    profile_date: datetime.date = datetime.date(2026, 5, 1),
):
    member = models.Member(
        name=name,
        gender="여",
        generation=46,
        enrolled_at=enrolled_at,
    )
    db.add(member)
    db.flush()
    db.add(models.MemberProfile(
        member_id=member.member_id,
        updated_at=profile_date,
        member_type=member_type,
        gyogu=1,
        team=1,
        group_no=1,
    ))
    db.commit()
    return member


def _newcomer_attendance_body(member_id: int, worship_date: str = "2026-05-02"):
    return {
        "worship_date": worship_date,
        "records": [
            {"member_id": member_id, "status": "PRESENT", "absent_reason": None},
        ],
    }


def test_newcomer_attendance_batch_saves_unenrolled_newcomer(client, db):
    newcomer = _add_member(
        db,
        name="미등반출석",
        member_type="새가족",
        enrolled_at=None,
    )

    response = client.post(
        "/api/attendance/newcomers/records/batch",
        json=_newcomer_attendance_body(newcomer.member_id),
    )

    assert response.status_code == 200
    assert response.json() == {"saved_count": 1}

    record = (
        db.query(models.AttendanceRecord)
        .filter(
            models.AttendanceRecord.member_id == newcomer.member_id,
            models.AttendanceRecord.worship_date == datetime.date(2026, 5, 2),
        )
        .one()
    )
    assert record.status == "PRESENT"


def test_newcomer_attendance_batch_rejects_regular_member(client, db):
    regular = _add_member(
        db,
        name="일반멤버",
        member_type="토요예배",
        enrolled_at=datetime.datetime(2026, 1, 1),
    )

    response = client.post(
        "/api/attendance/newcomers/records/batch",
        json=_newcomer_attendance_body(regular.member_id),
    )

    assert response.status_code == 400
    assert "미등반 새가족이 아닌 멤버" in response.json()["detail"]
    assert db.query(models.AttendanceRecord).count() == 0


def test_newcomer_attendance_batch_uses_worship_date_before_enrolled_at(client, db):
    newcomer = _add_member(
        db,
        name="등반전출석",
        member_type="새가족",
        enrolled_at=datetime.datetime(2026, 5, 10, 12, 0),
    )

    before_enroll = client.post(
        "/api/attendance/newcomers/records/batch",
        json=_newcomer_attendance_body(newcomer.member_id, "2026-05-02"),
    )
    after_enroll = client.post(
        "/api/attendance/newcomers/records/batch",
        json=_newcomer_attendance_body(newcomer.member_id, "2026-05-16"),
    )

    assert before_enroll.status_code == 200
    assert before_enroll.json() == {"saved_count": 1}
    assert after_enroll.status_code == 400
    assert "미등반 새가족이 아닌 멤버" in after_enroll.json()["detail"]


def test_newcomer_attendance_does_not_enter_regular_attendance_or_dashboard(client, db):
    newcomer = _add_member(
        db,
        name="집계제외새가족",
        member_type="새가족",
        enrolled_at=None,
    )
    save_response = client.post(
        "/api/attendance/newcomers/records/batch",
        json=_newcomer_attendance_body(newcomer.member_id),
    )
    assert save_response.status_code == 200

    records_response = client.get(
        "/api/attendance/records",
        params={
            "worship_date": "2026-05-02",
            "gyogu_no": 1,
            "page": 1,
            "page_size": 20,
        },
    )
    assert records_response.status_code == 200
    assert records_response.json()["meta"]["total_items"] == 0

    dashboard_response = client.get(
        "/api/attendance/dashboard",
        params={"period_unit": "weekly", "date": "2026-05-02"},
    )
    assert dashboard_response.status_code == 200
    assert dashboard_response.json()["kpi"]["all"] == {"present": 0.0, "total": 0.0}
