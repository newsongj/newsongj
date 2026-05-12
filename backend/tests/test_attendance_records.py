import datetime

import app.models as models


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
