"""교적/새가족 다건 상태 변경 API 회귀 테스트."""
import datetime


def _add_member(db, models, name: str, member_type: str, deleted: bool = False):
    member = models.Member(
        name=name,
        gender="남",
        generation=20,
        enrolled_at=None if member_type == "새가족" else datetime.datetime(2026, 1, 1),
    )
    if deleted:
        member.deleted_at = datetime.datetime(2026, 5, 1)
        member.deleted_reason = "기존 삭제"
    db.add(member)
    db.flush()
    db.add(models.MemberProfile(
        member_id=member.member_id,
        updated_at=datetime.date(2026, 5, 1),
        member_type=member_type,
        gyogu=1,
        team=1,
        group_no=1,
    ))
    db.commit()
    return member.member_id


def test_bulk_delete_members_succeeds_atomically(client, db):
    import app.models as models

    first_id = _add_member(db, models, "일반1", "토요예배")
    second_id = _add_member(db, models, "일반2", "토요예배")

    r = client.request(
        "DELETE",
        "/api/v1/gyojeok/members/bulk",
        json={"member_ids": [first_id, second_id], "deleted_reason": "일괄 삭제"},
    )
    assert r.status_code == 200
    assert r.json() == {"member_ids": [first_id, second_id], "count": 2}

    rows = db.query(models.Member).filter(models.Member.member_id.in_([first_id, second_id])).all()
    assert {row.deleted_reason for row in rows} == {"일괄 삭제"}
    assert all(row.deleted_at is not None for row in rows)


def test_bulk_delete_members_rolls_back_when_any_id_invalid(client, db):
    import app.models as models

    regular_id = _add_member(db, models, "일반", "토요예배")
    newcomer_id = _add_member(db, models, "새가족", "새가족")

    r = client.request(
        "DELETE",
        "/api/v1/gyojeok/members/bulk",
        json={"member_ids": [regular_id, newcomer_id], "deleted_reason": "일괄 삭제"},
    )
    assert r.status_code == 404

    db.expire_all()
    regular = db.query(models.Member).filter(models.Member.member_id == regular_id).first()
    assert regular.deleted_at is None
    assert regular.deleted_reason is None


def test_bulk_restore_members_succeeds_atomically(client, db):
    import app.models as models

    first_id = _add_member(db, models, "삭제1", "토요예배", deleted=True)
    second_id = _add_member(db, models, "삭제2", "토요예배", deleted=True)

    r = client.post("/api/v1/gyojeok/members/restore/bulk", json={"member_ids": [first_id, second_id]})
    assert r.status_code == 200
    assert r.json() == {"member_ids": [first_id, second_id], "count": 2}

    rows = db.query(models.Member).filter(models.Member.member_id.in_([first_id, second_id])).all()
    assert all(row.deleted_at is None for row in rows)
    assert all(row.deleted_reason is None for row in rows)


def test_bulk_restore_members_rolls_back_when_any_member_is_active(client, db):
    import app.models as models

    deleted_id = _add_member(db, models, "삭제", "토요예배", deleted=True)
    active_id = _add_member(db, models, "활성", "토요예배")

    r = client.post("/api/v1/gyojeok/members/restore/bulk", json={"member_ids": [deleted_id, active_id]})
    assert r.status_code == 400

    db.expire_all()
    deleted = db.query(models.Member).filter(models.Member.member_id == deleted_id).first()
    assert deleted.deleted_at is not None
    assert deleted.deleted_reason == "기존 삭제"


def test_bulk_delete_newcomers_succeeds_atomically(client, db):
    import app.models as models

    first_id = _add_member(db, models, "새가족1", "새가족")
    second_id = _add_member(db, models, "새가족2", "새가족")

    r = client.request(
        "DELETE",
        "/api/v1/gyojeok/members/newcomers/bulk",
        json={"member_ids": [first_id, second_id], "deleted_reason": "새가족 일괄 삭제"},
    )
    assert r.status_code == 200
    assert r.json() == {"member_ids": [first_id, second_id], "count": 2}

    rows = db.query(models.Member).filter(models.Member.member_id.in_([first_id, second_id])).all()
    assert {row.deleted_reason for row in rows} == {"새가족 일괄 삭제"}
    assert all(row.deleted_at is not None for row in rows)


def test_bulk_delete_newcomers_rolls_back_when_any_member_is_not_newcomer(client, db):
    import app.models as models

    newcomer_id = _add_member(db, models, "새가족", "새가족")
    regular_id = _add_member(db, models, "일반", "토요예배")

    r = client.request(
        "DELETE",
        "/api/v1/gyojeok/members/newcomers/bulk",
        json={"member_ids": [newcomer_id, regular_id], "deleted_reason": "새가족 일괄 삭제"},
    )
    assert r.status_code == 404

    db.expire_all()
    newcomer = db.query(models.Member).filter(models.Member.member_id == newcomer_id).first()
    assert newcomer.deleted_at is None
    assert newcomer.deleted_reason is None


def test_bulk_enroll_newcomers_succeeds_atomically(client, db):
    import app.models as models

    first_id = _add_member(db, models, "새가족1", "새가족")
    second_id = _add_member(db, models, "새가족2", "새가족")

    r = client.put(
        "/api/v1/gyojeok/members/newcomers/bulk/enroll",
        json={
            "member_ids": [first_id, second_id],
            "enrolled_at": "2026-05-01T10:00:00",
            "member_type": "토요예배",
        },
    )
    assert r.status_code == 200
    assert r.json() == {"member_ids": [first_id, second_id], "count": 2}

    members = db.query(models.Member).filter(models.Member.member_id.in_([first_id, second_id])).all()
    assert all(member.enrolled_at is not None for member in members)

    latest_types = []
    for member_id in [first_id, second_id]:
        latest = (
            db.query(models.MemberProfile)
            .filter(models.MemberProfile.member_id == member_id)
            .order_by(models.MemberProfile.updated_at.desc(), models.MemberProfile.profile_id.desc())
            .first()
        )
        latest_types.append(latest.member_type)
    assert latest_types == ["토요예배", "토요예배"]


def test_bulk_enroll_newcomers_rolls_back_when_any_member_is_not_newcomer(client, db):
    import app.models as models

    newcomer_id = _add_member(db, models, "새가족", "새가족")
    regular_id = _add_member(db, models, "일반", "토요예배")

    r = client.put(
        "/api/v1/gyojeok/members/newcomers/bulk/enroll",
        json={
            "member_ids": [newcomer_id, regular_id],
            "enrolled_at": "2026-05-01T10:00:00",
            "member_type": "토요예배",
        },
    )
    assert r.status_code == 404

    db.expire_all()
    newcomer = db.query(models.Member).filter(models.Member.member_id == newcomer_id).first()
    assert newcomer.enrolled_at is None
    latest = (
        db.query(models.MemberProfile)
        .filter(models.MemberProfile.member_id == newcomer_id)
        .order_by(models.MemberProfile.updated_at.desc(), models.MemberProfile.profile_id.desc())
        .first()
    )
    assert latest.member_type == "새가족"
