"""GET /api/opinion/my-targets — 사용자 페이지 담당 대상자 목록 (OPINION_USERPAGE_APISPEC.md §3-1)."""
import datetime
import json

import pytest

import app.models as models
from app.core.security import verify_token
from app.main import app

YEAR = 2026


@pytest.fixture
def login_as():
    """주어진 member_id + user.opinion 메뉴를 가진 토큰으로 로그인한 것처럼 만든다."""
    def _login(member_id, menus=("user.opinion",)):
        app.dependency_overrides[verify_token] = lambda: {
            "sub": str(member_id), "member_id": member_id, "menus": list(menus),
        }
    yield _login
    app.dependency_overrides[verify_token] = lambda: {"sub": "test"}


@pytest.fixture
def leaders(db):
    # SQLite 는 SMALLINT PK 를 autoincrement 하지 않으므로 id 를 직접 준다
    ids = {"임원단": 1, "팀장": 2, "그룹장": 3}
    for name, leader_id in ids.items():
        db.add(models.Leader(leader_id=leader_id, leader_name=name))
    db.commit()
    return ids


def _seed_custom(db, **overrides):
    values = dict(
        report_year=YEAR, theme="하나님의 열심이 이루시리라",
        end_date=datetime.date(YEAR, 12, 15), guide_text="사실에 근거해 작성해 주세요.",
        member_fields=json.dumps(["name", "gyogu"]),
        input_fields=json.dumps(["current_status", "general_opinion"]),
        is_active=1, is_open=1,
    )
    values.update(overrides)
    db.add(models.OpinionReportCustom(**values))
    db.commit()


def _seed_member(db, name, gyogu=1, team=1, group_no=1, leader_ids=None, deleted=False):
    member = models.Member(
        name=name, gender="남", generation=15,
        enrolled_at=datetime.datetime(2020, 1, 1),
        deleted_at=datetime.datetime(2026, 5, 1) if deleted else None,
    )
    db.add(member)
    db.flush()
    db.add(models.MemberProfile(
        member_id=member.member_id, updated_at=datetime.date(YEAR, 1, 1),
        member_type="주일예배", gyogu=gyogu, team=team, group_no=group_no,
        leader_ids=json.dumps([str(x) for x in leader_ids]) if leader_ids else None,
    ))
    db.commit()
    return member.member_id


def _get(client):
    return client.get("/api/opinion/my-targets", params={"report_year": YEAR})


def _names(response):
    return [t["name"] for t in response.json()["targets"]]


def test_team_leader_sees_whole_team_except_self(client, db, leaders, login_as):
    _seed_custom(db)
    tl = _seed_member(db, "팀장님", leader_ids=[leaders["팀장"]])
    _seed_member(db, "그룹장님", group_no=1, leader_ids=[leaders["그룹장"]])
    _seed_member(db, "가팀원", group_no=2)
    _seed_member(db, "나팀원", group_no=1)
    _seed_member(db, "다른팀", team=2)
    _seed_member(db, "삭제됨", deleted=True)
    login_as(tl)

    response = _get(client)

    assert response.status_code == 200
    # gyogu → team → group_no → name 순
    assert _names(response) == ["그룹장님", "나팀원", "가팀원"]


def test_group_leader_sees_only_non_leader_members_of_own_group(client, db, leaders, login_as):
    _seed_custom(db)
    _seed_member(db, "팀장님", leader_ids=[leaders["팀장"]])
    gl = _seed_member(db, "그룹장님", group_no=1, leader_ids=[leaders["그룹장"]])
    _seed_member(db, "다른그룹장", group_no=1, leader_ids=[leaders["그룹장"]])
    _seed_member(db, "같은그룹", group_no=1)
    _seed_member(db, "다른그룹", group_no=2)
    login_as(gl)

    assert _names(_get(client)) == ["같은그룹"]


def test_mapped_writer_sees_only_mapping_targets(client, db, leaders, login_as):
    _seed_custom(db)
    # 팀장 + 임원단 매핑 → 매핑 대상자만 보이고 자기 팀원은 안 보인다 (배타)
    writer = _seed_member(db, "임원팀장", leader_ids=[leaders["팀장"], leaders["임원단"]])
    _seed_member(db, "자기팀원")
    target = _seed_member(db, "매핑대상", gyogu=2, team=3, leader_ids=[leaders["임원단"]])
    db.add(models.OpinionReportMapping(report_year=YEAR, writer_member_id=writer, target_member_id=target))
    db.add(models.OpinionReportMapping(report_year=YEAR, writer_member_id=writer, target_member_id=writer))
    db.commit()
    login_as(writer)

    assert _names(_get(client)) == ["매핑대상"]


def test_response_carries_settings_and_written_state(client, db, leaders, login_as):
    _seed_custom(db)
    tl = _seed_member(db, "팀장님", leader_ids=[leaders["팀장"]])
    written = _seed_member(db, "작성됨")
    _seed_member(db, "미작성")
    db.add(models.MemberOpinionReport(
        member_id=written, report_year=YEAR, current_status="성장 중",
        updated_at=datetime.datetime(YEAR, 11, 5, 14, 20, 0, 482000),
    ))
    db.commit()
    login_as(tl)

    body = _get(client).json()

    assert body["report_year"] == YEAR
    assert body["theme"] == "하나님의 열심이 이루시리라"
    assert body["end_date"] == "2026-12-15"
    assert body["guide_text"] == "사실에 근거해 작성해 주세요."
    assert body["member_fields"] == ["name", "gyogu"]
    assert body["input_fields"] == ["current_status", "general_opinion"]
    by_name = {t["name"]: t for t in body["targets"]}
    assert by_name["작성됨"]["is_written"] is True
    assert by_name["작성됨"]["updated_at"].startswith("2026-11-05T14:20:00.482")
    assert by_name["미작성"]["is_written"] is False
    assert by_name["미작성"]["updated_at"] is None
    assert "companions" not in by_name["작성됨"]


def test_no_assignment_returns_empty_list_200(client, db, leaders, login_as):
    _seed_custom(db)
    plain = _seed_member(db, "일반팀원")
    _seed_member(db, "옆사람")
    login_as(plain)

    response = _get(client)

    assert response.status_code == 200
    assert response.json()["targets"] == []


@pytest.mark.parametrize("overrides", [None, {"is_active": 0}, {"is_open": 0}])
def test_closed_report_year_returns_403(client, db, leaders, login_as, overrides):
    if overrides is not None:
        _seed_custom(db, **overrides)
    tl = _seed_member(db, "팀장님", leader_ids=[leaders["팀장"]])
    login_as(tl)

    response = _get(client)

    assert response.status_code == 403


def test_without_user_opinion_menu_returns_403(client, db, leaders, login_as):
    _seed_custom(db)
    tl = _seed_member(db, "팀장님", leader_ids=[leaders["팀장"]])
    login_as(tl, menus=("user.vehicle",))

    assert _get(client).status_code == 403


# ── GET /api/opinion/my-reports/:memberId (§3-2) ──────────────────────────────

def _get_report(client, member_id):
    return client.get(f"/api/opinion/my-reports/{member_id}", params={"report_year": YEAR})


def test_my_report_returns_member_info_and_saved_content(client, db, leaders, login_as):
    _seed_custom(db)
    tl = _seed_member(db, "팀장님", leader_ids=[leaders["팀장"]])
    gl = _seed_member(db, "그룹장님", leader_ids=[leaders["그룹장"]])
    db.add(models.MemberOpinionReport(
        member_id=gl, report_year=YEAR, current_status="성장 중", general_opinion="성실함",
        updated_at=datetime.datetime(YEAR, 11, 5, 14, 20, 0, 482000),
    ))
    db.commit()
    login_as(tl)

    response = _get_report(client, gl)

    assert response.status_code == 200
    body = response.json()
    assert body["member_id"] == gl
    assert body["updated_at"].startswith("2026-11-05T14:20:00.482")
    assert body["current_status"] == "성장 중"
    assert body["general_opinion"] == "성실함"
    assert body["special_opinion"] is None
    member = body["member"]
    assert member["name"] == "그룹장님"
    assert member["leader_names"] == ["그룹장"]
    assert len(member) == 15
    assert "companions" not in body and "writers" not in body


def test_my_report_before_writing_is_all_null(client, db, leaders, login_as):
    _seed_custom(db)
    tl = _seed_member(db, "팀장님", leader_ids=[leaders["팀장"]])
    target = _seed_member(db, "미작성")
    login_as(tl)

    body = _get_report(client, target).json()

    assert body["updated_at"] is None
    assert body["current_status"] is None
    assert body["general_opinion"] is None


@pytest.mark.parametrize("who", ["self", "other_team", "mapped_away"])
def test_my_report_not_assigned_returns_403(client, db, leaders, login_as, who):
    _seed_custom(db)
    tl = _seed_member(db, "팀장님", leader_ids=[leaders["팀장"]])
    other = _seed_member(db, "다른팀", team=2)
    exec_writer = _seed_member(db, "임원", gyogu=2, leader_ids=[leaders["임원단"]])
    mapped = _seed_member(db, "매핑된팀원")
    db.add(models.OpinionReportMapping(report_year=YEAR, writer_member_id=exec_writer, target_member_id=mapped))
    db.commit()
    login_as(tl)

    target = {"self": tl, "other_team": other, "mapped_away": mapped}[who]
    response = _get_report(client, target)

    assert response.status_code == 403
    assert response.json()["detail"] == "담당 대상자가 아닙니다."


def test_my_report_closed_year_returns_403(client, db, leaders, login_as):
    _seed_custom(db, is_open=0)
    tl = _seed_member(db, "팀장님", leader_ids=[leaders["팀장"]])
    target = _seed_member(db, "팀원")
    login_as(tl)

    response = _get_report(client, target)

    assert response.status_code == 403
    assert response.json()["detail"] == "소견서 기간이 아닙니다."


# ── PUT /api/opinion/my-reports/:memberId (§3-3) ──────────────────────────────

def _put_report(client, member_id, body):
    return client.put(f"/api/opinion/my-reports/{member_id}", params={"report_year": YEAR}, json=body)


def _writer_ids(db, member_id):
    report = db.query(models.MemberOpinionReport).filter(
        models.MemberOpinionReport.member_id == member_id,
    ).one()
    return sorted(
        w.writer_member_id for w in db.query(models.MemberOpinionReportWriter).filter(
            models.MemberOpinionReportWriter.opinion_report_id == report.opinion_report_id,
        )
    )


def test_save_creates_report_and_records_writer(client, db, leaders, login_as):
    _seed_custom(db)
    tl = _seed_member(db, "팀장님", leader_ids=[leaders["팀장"]])
    target = _seed_member(db, "팀원")
    login_as(tl)

    response = _put_report(client, target, {"base_updated_at": None, "current_status": "성장 중"})

    assert response.status_code == 200
    assert response.json()["current_status"] == "성장 중"
    assert _writer_ids(db, target) == [tl]


def test_returned_updated_at_round_trips_for_next_save(client, db, leaders, login_as):
    """응답의 updated_at 을 그대로 돌려보내면 409 가 나지 않아야 한다 (밀리초 정밀도)."""
    _seed_custom(db)
    tl = _seed_member(db, "팀장님", leader_ids=[leaders["팀장"]])
    target = _seed_member(db, "팀원")
    login_as(tl)

    first = _put_report(client, target, {"base_updated_at": None, "current_status": "1차"}).json()
    second = _put_report(client, target, {"base_updated_at": first["updated_at"], "current_status": "2차"})
    third = _put_report(client, target, {
        "base_updated_at": second.json()["updated_at"], "general_opinion": "3차",
    })

    assert second.status_code == 200
    assert third.status_code == 200
    assert third.json()["current_status"] == "2차"   # 보내지 않은 항목은 유지
    assert _writer_ids(db, target) == [tl]           # 같은 작성자는 한 줄


def test_team_and_group_leader_both_recorded_as_writers(client, db, leaders, login_as):
    _seed_custom(db)
    tl = _seed_member(db, "팀장님", leader_ids=[leaders["팀장"]])
    gl = _seed_member(db, "그룹장님", leader_ids=[leaders["그룹장"]])
    target = _seed_member(db, "팀원")

    login_as(gl)
    first = _put_report(client, target, {"base_updated_at": None, "current_status": "그룹장"}).json()
    login_as(tl)
    second = _put_report(client, target, {"base_updated_at": first["updated_at"], "general_opinion": "팀장"})

    assert second.status_code == 200
    assert _writer_ids(db, target) == sorted([tl, gl])


def test_save_stale_base_returns_409(client, db, leaders, login_as):
    _seed_custom(db)
    tl = _seed_member(db, "팀장님", leader_ids=[leaders["팀장"]])
    gl = _seed_member(db, "그룹장님", leader_ids=[leaders["그룹장"]])
    target = _seed_member(db, "팀원")
    login_as(gl)
    _put_report(client, target, {"base_updated_at": None, "current_status": "먼저"})

    login_as(tl)
    response = _put_report(client, target, {"base_updated_at": None, "current_status": "나중"})

    assert response.status_code == 409
    body = response.json()
    assert body["last_writer"]["member_id"] == gl
    assert body["is_self"] is False
    assert body["current_updated_at"] is not None


def test_save_base_given_but_no_report_returns_409(client, db, leaders, login_as):
    _seed_custom(db)
    tl = _seed_member(db, "팀장님", leader_ids=[leaders["팀장"]])
    target = _seed_member(db, "팀원")
    login_as(tl)

    response = _put_report(client, target, {
        "base_updated_at": "2026-11-05T14:20:00.482", "current_status": "x",
    })

    assert response.status_code == 409


def test_save_field_not_in_input_fields_returns_400(client, db, leaders, login_as):
    _seed_custom(db)  # input_fields = current_status, general_opinion
    tl = _seed_member(db, "팀장님", leader_ids=[leaders["팀장"]])
    target = _seed_member(db, "팀원")
    login_as(tl)

    response = _put_report(client, target, {"base_updated_at": None, "special_opinion": "x"})

    assert response.status_code == 400
    assert db.query(models.MemberOpinionReport).count() == 0


def test_save_short_field_over_20_chars_returns_400(client, db, leaders, login_as):
    _seed_custom(db)
    tl = _seed_member(db, "팀장님", leader_ids=[leaders["팀장"]])
    target = _seed_member(db, "팀원")
    login_as(tl)

    response = _put_report(client, target, {"base_updated_at": None, "current_status": "가" * 21})

    assert response.status_code == 400


def test_save_not_assigned_returns_403(client, db, leaders, login_as):
    _seed_custom(db)
    tl = _seed_member(db, "팀장님", leader_ids=[leaders["팀장"]])
    other = _seed_member(db, "다른팀", team=2)
    login_as(tl)

    for target in (tl, other):
        response = _put_report(client, target, {"base_updated_at": None, "current_status": "x"})
        assert response.status_code == 403
        assert response.json()["detail"] == "담당 대상자가 아닙니다."
    assert db.query(models.MemberOpinionReport).count() == 0


def test_save_closed_year_returns_403(client, db, leaders, login_as):
    _seed_custom(db, is_active=0, is_open=0)
    tl = _seed_member(db, "팀장님", leader_ids=[leaders["팀장"]])
    target = _seed_member(db, "팀원")
    login_as(tl)

    response = _put_report(client, target, {"base_updated_at": None, "current_status": "x"})

    assert response.status_code == 403
    assert response.json()["detail"] == "소견서 기간이 아닙니다."


def test_admin_save_does_not_record_writer(client, db, leaders, login_as):
    _seed_custom(db)
    target = _seed_member(db, "팀원")
    login_as(999, menus=("admin.opinion.dashboard",))

    response = client.put(
        f"/api/opinion/reports/{target}", params={"report_year": YEAR},
        json={"base_updated_at": None, "current_status": "대리"},
    )

    assert response.status_code == 200
    assert _writer_ids(db, target) == []
