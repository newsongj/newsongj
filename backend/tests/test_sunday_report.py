import datetime
from io import BytesIO
from xml.etree import ElementTree as ET
from zipfile import ZipFile

import pytest

from app.models import AttendanceRecord, Member, MemberProfile
from app.services.sunday_report import TEMPLATE_PATH, XLSX_MEDIA_TYPE


URL = "/api/attendance/dashboard/sunday-report"
MENU = "admin.gyojeok.attendance_dashboard"
DATE = "2026-09-05"
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def checkpoint(response):
    assert response.status_code == 200, response.text if response.status_code != 200 else ""
    with ZipFile(BytesIO(response.content)) as file:
        assert file.testzip() is None
        sheet = ET.fromstring(file.read("xl/worksheets/sheet1.xml"))
    cell = sheet.find(".//s:c[@r='E64']/s:v", NS)
    return float(cell.text), sheet


@pytest.fixture
def report_records(db):
    for i, (gyogu, team, status, newcomer) in enumerate([
        (1, 1, "PRESENT", False), (1, 1, "PRESENT", True),
        (1, 1, "ABSENT", False), (1, 2, "PRESENT", False),
        (2, 1, "PRESENT", False),
    ]):
        member = Member(
            name=f"보고서테스트{i}", gender="남", generation=46,
            enrolled_at=None if newcomer else datetime.datetime(2026, 1, 1),
        )
        db.add(member)
        db.flush()
        db.add(MemberProfile(
            member_id=member.member_id, updated_at=datetime.date(2026, 5, 1),
            member_type="새가족" if newcomer else "토요예배",
            gyogu=gyogu, team=team, group_no=1,
        ))
        db.add(AttendanceRecord(
            member_id=member.member_id, worship_date=datetime.date.fromisoformat(DATE),
            status=status, checked_at=datetime.datetime(2026, 9, 5, 12),
        ))
        db.add(AttendanceRecord(
            member_id=member.member_id, worship_date=datetime.date(2026, 8, 29),
            status="PRESENT", checked_at=datetime.datetime(2026, 8, 29, 12),
        ))
    db.commit()


@pytest.mark.parametrize("filters,expected", [
    ({}, 4), ({"gyogu_no": 1}, 3), ({"gyogu_no": 1, "team_no": 1}, 2),
    ({"gyogu_no": 2, "team_no": 2}, 0),
])
def test_report_download_uses_dashboard_population(client, report_records, filters, expected):
    params = {"date": DATE, **filters}
    response = client.get(URL, params=params)
    actual, sheet = checkpoint(response)
    dashboard = client.get("/api/attendance/dashboard", params={"period_unit": "weekly", **params})
    assert dashboard.status_code == 200
    assert actual == dashboard.json()["kpi"]["all"]["present"] == expected
    assert response.headers["content-type"] == XLSX_MEDIA_TYPE
    assert "attachment; filename*=UTF-8''" in response.headers["content-disposition"]
    assert DATE in response.headers["content-disposition"]
    assert response.headers["cache-control"] == "no-store"
    assert "가상 데이터" in sheet.find(".//s:c[@r='A3']/s:is/s:t", NS).text
    scope = sheet.find(".//s:c[@r='F64']/s:is/s:t", NS).text
    assert DATE in scope
    assert (f"{filters['gyogu_no']}교구" if filters.get("gyogu_no") else "전체 교구") in scope


def test_export_preserves_template_charts_styles_and_cached_formulas(client, report_records):
    original = TEMPLATE_PATH.read_bytes()
    result = client.get(URL, params={"date": DATE})
    checkpoint(result)
    with ZipFile(BytesIO(original)) as template, ZipFile(BytesIO(result.content)) as exported:
        assert template.namelist() == exported.namelist()
        for part in template.namelist():
            if part != "xl/worksheets/sheet1.xml":
                assert exported.read(part) == template.read(part), part
        book = ET.fromstring(exported.read("xl/workbook.xml"))
        assert len(book.find("s:sheets", NS)) == 9
    assert TEMPLATE_PATH.read_bytes() == original
    # A subsequent request cannot reuse another request's count or alter the template.
    empty = client.get(URL, params={"date": "2026-09-12"})
    assert checkpoint(empty)[0] == 0
    assert TEMPLATE_PATH.read_bytes() == original


@pytest.mark.parametrize("params", [
    {}, {"date": "invalid"}, {"date": "2026-09-06"},
    {"date": DATE, "team_no": 1}, {"date": DATE, "gyogu_no": 0},
])
def test_report_rejects_invalid_filters(client, params):
    response = client.get(URL, params=params)
    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/json")


def test_report_requires_login_and_dashboard_menu(anonymous_client, auth_headers):
    assert anonymous_client.get(URL, params={"date": DATE}).status_code == 401
    headers = auth_headers(["admin.gyojeok.members"])
    assert anonymous_client.get(URL, params={"date": DATE}, headers=headers).status_code == 403


@pytest.mark.parametrize("scope,filters,allowed", [
    ("team", {"gyogu_no": 1, "team_no": 1}, True),
    ("team", {"gyogu_no": 1, "team_no": 2}, False),
    ("team", {}, False), ("gyogu", {"gyogu_no": 1}, True),
    ("gyogu", {"gyogu_no": 2}, False),
    ("group", {"gyogu_no": 1, "team_no": 1}, False),
    ("member", {"gyogu_no": 1, "team_no": 1}, False),
])
def test_report_cannot_expand_account_scope(anonymous_client, auth_headers, scope, filters, allowed):
    headers = auth_headers([MENU], data_scope=scope, gyogu=1, team=1, group_no=1)
    response = anonymous_client.get(URL, params={"date": DATE, **filters}, headers=headers)
    assert response.status_code == (200 if allowed else 403)
