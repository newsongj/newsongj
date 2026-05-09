from decimal import Decimal

from app.crud.attendance_rate import compute_grade
from app.models import MemberProfile


def _regular_member_body(name="출석등급멤버", attendance_grade="E"):
    return {
        "name": name,
        "gender": "남",
        "generation": 21,
        "phone_number": None,
        "birthdate": None,
        "gyogu": 1,
        "team": 1,
        "group_no": 1,
        "leader_ids": None,
        "member_type": "토요예배",
        "attendance_grade": attendance_grade,
        "plt_status": None,
        "v8pid": None,
        "school_work": None,
        "major": None,
    }


def test_create_member_accepts_and_persists_attendance_grade_e(client, db):
    response = client.post(
        "/api/v1/gyojeok/members",
        json=_regular_member_body(attendance_grade="E"),
    )

    assert response.status_code == 201
    member_id = response.json()["member_id"]

    profile = (
        db.query(MemberProfile)
        .filter(MemberProfile.member_id == member_id)
        .order_by(MemberProfile.updated_at.desc(), MemberProfile.profile_id.desc())
        .limit(1)
        .one()
    )
    assert profile.attendance_grade == "E"


def test_update_member_accepts_and_persists_attendance_grade_e(client, seed_members, db):
    member_id, _ = seed_members

    response = client.put(
        f"/api/v1/gyojeok/members/{member_id}",
        json=_regular_member_body(name="출석등급수정", attendance_grade="E"),
    )

    assert response.status_code == 200

    profile = (
        db.query(MemberProfile)
        .filter(MemberProfile.member_id == member_id)
        .order_by(MemberProfile.updated_at.desc(), MemberProfile.profile_id.desc())
        .limit(1)
        .one()
    )
    assert profile.attendance_grade == "E"


def test_compute_grade_uses_e_below_20_percent():
    assert compute_grade(Decimal("80.00")) == "A"
    assert compute_grade(Decimal("60.00")) == "B"
    assert compute_grade(Decimal("40.00")) == "C"
    assert compute_grade(Decimal("20.00")) == "D"
    assert compute_grade(Decimal("19.99")) == "E"
