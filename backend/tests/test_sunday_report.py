import datetime
import re
from io import BytesIO
from xml.etree import ElementTree as ET
from zipfile import ZipFile

import pytest

from app.models import AttendanceRecord, Leader, Member, MemberProfile
from app.services.sunday_report import TEMPLATE_PATH, XLSX_MEDIA_TYPE
from app.services.sunday_report_workbook import set_names


URL = "/api/attendance/dashboard/sunday-report"
MENU = "admin.gyojeok.attendance_dashboard"
DATE = "2026-09-05"
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
CHART_NS = {"c": "http://schemas.openxmlformats.org/drawingml/2006/chart"}


def cell_value(sheet, address):
    cell = sheet.find(f".//s:c[@r='{address}']", NS)
    assert cell is not None, address
    value = cell.find("s:v", NS)
    if value is not None:
        return value.text
    inline = cell.find("s:is/s:t", NS)
    return inline.text if inline is not None else None


REL_ID = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


def _rel_targets(file, part):
    folder, name = part.rsplit("/", 1)
    rels = f"{folder}/_rels/{name}.rels"
    if rels not in file.namelist():
        return {}
    return {rel.get("Id"): rel.get("Target").lstrip("/") for rel in ET.fromstring(file.read(rels))}


def workbook_sheets(file):
    """Sheet name -> worksheet part, in workbook order."""
    book = ET.fromstring(file.read("xl/workbook.xml"))
    targets = _rel_targets(file, "xl/workbook.xml")
    return {sheet.get("name"): targets[sheet.get(REL_ID)] for sheet in book.find("s:sheets", NS)}


def chart_parts(file, sheet_part):
    return [
        chart
        for drawing in _rel_targets(file, sheet_part).values()
        for chart in _rel_targets(file, drawing).values()
    ]


def assert_workbook_consistent(file):
    """Every formula, print area and chart points at an existing sheet, and chart caches match cells."""
    sheets = workbook_sheets(file)
    content_types = file.read("[Content_Types].xml").decode("utf-8-sig")
    book = ET.fromstring(file.read("xl/workbook.xml"))
    areas = {int(item.get("localSheetId")): item.text for item in book.iter(f"{{{NS['s']}}}definedName")}
    assert sorted(areas) == list(range(len(sheets)))
    for index, (name, part) in enumerate(sheets.items()):
        assert areas[index].startswith(f"'{name}'!")
        assert f'PartName="/{part}"' in content_types
        root = ET.fromstring(file.read(part))
        for formula in root.iter(f"{{{NS['s']}}}f"):
            for referenced in re.findall(r"'([^']+)'!", formula.text or ""):
                assert referenced in sheets, (name, formula.text)
        for chart_part in chart_parts(file, part):
            assert f'PartName="/{chart_part}"' in content_types
            chart = ET.fromstring(file.read(chart_part))
            for ref in [*chart.iter(f"{{{CHART_NS['c']}}}numRef"), *chart.iter(f"{{{CHART_NS['c']}}}strRef")]:
                source = ref.find("c:f", CHART_NS).text
                match = re.fullmatch(r"'([^']+)'!\$([A-Z]+)\$(\d+):\$\2\$(\d+)", source)
                assert match and match.group(1) == name, source
                expected = [
                    cell_value(root, f"{match.group(2)}{row}")
                    for row in range(int(match.group(3)), int(match.group(4)) + 1)
                ]
                cached = [point.find("c:v", CHART_NS).text for point in ref.iter(f"{{{CHART_NS['c']}}}pt")]
                assert cached == expected, source


def download(client, **params):
    response = client.get(URL, params={"date": DATE, **params})
    assert response.status_code == 200, response.text
    file = ZipFile(BytesIO(response.content))
    return file, {name: ET.fromstring(file.read(part)) for name, part in workbook_sheets(file).items()}


def add_member(db, name, gyogu=1, team=1, generation=46, profiles=(("토요예배", "2026-01-01"),),
               registered_at=None, enrolled_at=None, status=None, edu_week=None, leader_ids=None):
    member = Member(
        name=name, gender="남", generation=generation, registered_at=registered_at, enrolled_at=enrolled_at,
    )
    db.add(member)
    db.flush()
    for member_type, updated_at in profiles:
        db.add(MemberProfile(
            member_id=member.member_id, updated_at=datetime.date.fromisoformat(updated_at),
            member_type=member_type, gyogu=gyogu, team=team, group_no=1, leader_ids=leader_ids,
        ))
    if status:
        db.add(AttendanceRecord(
            member_id=member.member_id, worship_date=datetime.date.fromisoformat(DATE),
            status=status, edu_week=edu_week, checked_at=datetime.datetime(2026, 9, 5, 12),
        ))
    return member


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
    assert "가상 데이터" not in sheet.find(".//s:c[@r='A3']/s:is/s:t", NS).text
    scope = sheet.find(".//s:c[@r='F64']/s:is/s:t", NS).text
    assert DATE in scope
    assert (f"{filters['gyogu_no']}교구" if filters.get("gyogu_no") else "전체 교구") in scope
    assert cell_value(sheet, "B9") == str(expected)
    assert cell_value(sheet, "I9") == "0"  # 픽스처에는 등반자가 없다


def test_first_two_sheets_use_four_weeks_and_no_dummy_counts(client, report_records):
    response = client.get(URL, params={"date": DATE})
    with ZipFile(BytesIO(response.content)) as file:
        first = ET.fromstring(file.read("xl/worksheets/sheet1.xml"))
        second = ET.fromstring(file.read("xl/worksheets/sheet2.xml"))
        chart = ET.fromstring(file.read("xl/drawings/charts/chart1.xml"))

    assert [cell_value(first, f"N{row}") for row in range(2, 6)] == ["8/15", "8/22", "8/29", "9/5"]
    assert [cell_value(second, f"{col}4") for col in "DEFG"] == ["46249", "46256", "46263", "46270"]
    assert [cell_value(second, f"{col}5") for col in "DEFG"] == ["0", "0", "3", "2"]
    assert cell_value(second, "H5") == "-1"
    assert cell_value(second, "G17") == "3"
    assert cell_value(second, "G31") == "1"
    assert cell_value(second, "G45") == "0"
    assert cell_value(second, "G47") == "0"
    assert cell_value(second, "G49") == "0"
    assert cell_value(second, "G50") == "4"
    assert cell_value(first, "B9") == "4"
    assert cell_value(first, "B10") == "-1"
    assert cell_value(first, "G9") == "4"  # 46기
    assert cell_value(first, "H9") == "1"  # 미등반 새가족 포함
    assert cell_value(first, "E51") == "없음"
    assert cell_value(first, "E53") == "1팀 (-1)"
    assert [cell_value(first, f"{col}2") for col in "ST"] == ["100", "100"]
    for series in chart.findall(".//c:ser", CHART_NS):
        value_ref = series.find("c:val/c:numRef", CHART_NS)
        source = value_ref.find("c:f", CHART_NS).text
        points = [point.find("c:v", CHART_NS).text for point in value_ref.findall("c:numCache/c:pt", CHART_NS)]
        if "$R$2:$R$5" in source:
            assert points == ["0", "0", "5", "4"]
        if "$S$2:$S$5" in source or "$T$2:$T$5" in source:
            assert points == ["100"] * 4


def test_executive_is_counted_once_and_grades_follow_present_record(client, db):
    db.add(Leader(leader_id=1, leader_name="임원단"))
    db.add(Leader(leader_id=2, leader_name="팀장"))
    for i, (name, roles, status) in enumerate([
        ("임원", '["1"]', "PRESENT"),
        ("팀장님", '["2"]', "PRESENT"),
        ("결석자", None, "ABSENT"),
    ]):
        member = Member(name=name, gender="남", generation=45)
        db.add(member)
        db.flush()
        db.add(MemberProfile(
            member_id=member.member_id, updated_at=datetime.date(2026, 1, 1),
            member_type="토요예배", gyogu=1, team=1, group_no=1,
            leader_ids=roles, attendance_grade="A",
        ))
        db.add(AttendanceRecord(
            member_id=member.member_id, worship_date=datetime.date.fromisoformat(DATE),
            status=status, checked_at=datetime.datetime(2026, 9, 5, 12),
        ))
    db.commit()
    response = client.get(URL, params={"date": DATE})
    with ZipFile(BytesIO(response.content)) as file:
        first = ET.fromstring(file.read("xl/worksheets/sheet1.xml"))
        second = ET.fromstring(file.read("xl/worksheets/sheet2.xml"))
    assert cell_value(second, "C5") == "팀장님"
    assert cell_value(second, "G5") == "1"
    assert cell_value(second, "G47") == "1"
    assert cell_value(second, "G50") == "2"
    assert cell_value(first, "B9") == "2"
    assert cell_value(first, "J9") == "2"


def test_gyogu_export_keeps_template_parts_and_renames_gyogu_sheets(client, report_records):
    original = TEMPLATE_PATH.read_bytes()
    result = client.get(URL, params={"date": DATE, "gyogu_no": 1})
    checkpoint(result)
    with ZipFile(BytesIO(original)) as template, ZipFile(BytesIO(result.content)) as exported:
        assert template.namelist() == exported.namelist()
        for part in template.namelist():
            if not part.startswith(("xl/worksheets/sheet", "xl/drawings/charts/")) and part != "xl/workbook.xml":
                assert exported.read(part) == template.read(part), part
        sheets = workbook_sheets(exported)
        assert list(sheets) == [
            "01_주일보고", "02_전체출석", "03_교구별그래프_1교구", "04_교구수합_1교구",
            "05_45기명단", "06_45기추이", "07_46기명단", "08_46기추이", "09_새가족현황_1교구",
        ]
        headcount_sheet = ET.fromstring(exported.read("xl/worksheets/sheet2.xml"))
        label = headcount_sheet.find(".//s:c[@r='A51']/s:v", NS)
        assert label is not None and label.text == "뉴송예배 실제수 인원"
        for address in ("D51", "E51", "F51", "G51", "H51"):
            cell = headcount_sheet.find(f".//s:c[@r='{address}']", NS)
            assert cell is not None and len(cell) == 0 and "s" in cell.attrib
        assert_workbook_consistent(exported)
    assert TEMPLATE_PATH.read_bytes() == original


def test_full_export_copies_gyogu_sheets_with_their_own_charts(client, report_records):
    original = TEMPLATE_PATH.read_bytes()
    result = client.get(URL, params={"date": DATE})
    checkpoint(result)
    with ZipFile(BytesIO(result.content)) as exported:
        assert exported.testzip() is None
        sheets = workbook_sheets(exported)
        assert list(sheets) == [
            "01_주일보고", "02_전체출석",
            *(f"03_교구별그래프_{g}교구" for g in (1, 2, 3)),
            *(f"04_교구수합_{g}교구" for g in (1, 2, 3)),
            "05_45기명단", "06_45기추이", "07_46기명단", "08_46기추이",
            *(f"09_새가족현황_{g}교구" for g in (1, 2, 3)),
        ]
        assert_workbook_consistent(exported)
        graph = {g: ET.fromstring(exported.read(sheets[f"03_교구별그래프_{g}교구"])) for g in (1, 2)}
        assert cell_value(graph[1], "A1") == "〈 1교구 〉"
        assert [cell_value(graph[1], f"V{row}") for row in range(3, 7)] == ["0", "0", "3", "2"]
        assert cell_value(graph[2], "A1") == "〈 2교구 〉"
        assert [cell_value(graph[2], f"V{row}") for row in range(3, 7)] == ["0", "0", "1", "1"]
        charts = {g: chart_parts(exported, sheets[f"03_교구별그래프_{g}교구"]) for g in (1, 2)}
        assert len(charts[1]) == len(charts[2]) == 12 and not set(charts[1]) & set(charts[2])
        summary = ET.fromstring(exported.read(sheets["04_교구수합_1교구"]))
        assert cell_value(summary, "E5") == "1교구"
        assert [cell_value(summary, f"{col}6") for col in "AB"] == ["3", "2"]
        assert summary.find(".//s:c[@r='A6']/s:f", NS) is None
        footer = ET.fromstring(exported.read(sheets["09_새가족현황_3교구"])).find(".//s:oddFooter", NS)
        assert footer.text == "&C15 / 15"
    assert TEMPLATE_PATH.read_bytes() == original


def test_export_does_not_reuse_previous_request(client, report_records):
    original = TEMPLATE_PATH.read_bytes()
    checkpoint(client.get(URL, params={"date": DATE}))
    # A subsequent request cannot reuse another request's count or alter the template.
    empty = client.get(URL, params={"date": "2026-09-12"})
    assert checkpoint(empty)[0] == 0
    assert TEMPLATE_PATH.read_bytes() == original


def test_first_sheet_cells_linked_to_dummy_sheets_are_plain_values(client, report_records):
    # Excel recalculates on open (fullCalcOnLoad), so a kept formula would replace the DB value.
    _, sheets = download(client)
    first = sheets["01_주일보고"]
    for address in ("F9", "G9", "H9", "I9", "F10", "G10", "H10", "I10"):
        assert first.find(f".//s:c[@r='{address}']/s:f", NS) is None, address


def test_generation_sheets_list_present_members_with_executives_in_their_team(client, db):
    db.add(Leader(leader_id=1, leader_name="임원단"))
    add_member(db, "나사오", gyogu=2, team=3, generation=45, status="PRESENT")
    add_member(db, "가사오", gyogu=2, team=3, generation=45, status="PRESENT")
    add_member(db, "임원사오", gyogu=2, team=3, generation=45, status="PRESENT", leader_ids='["1"]')
    add_member(db, "결석사오", gyogu=2, team=3, generation=45, status="ABSENT")
    add_member(db, "사륙", gyogu=2, team=4, generation=46, status="PRESENT")
    db.commit()
    _, sheets = download(client)

    assert cell_value(sheets["02_전체출석"], "G21") == "2"  # 임원단은 별도 행
    assert cell_value(sheets["02_전체출석"], "G47") == "1"
    roster = sheets["05_45기명단"]
    assert [cell_value(roster, f"D{row}") for row in range(27, 31)] == ["가사오", "나사오", "임원사오", None]
    assert cell_value(roster, "D34") == "3" and roster.find(".//s:c[@r='D34']/s:f", NS) is None
    assert cell_value(roster, "D6") == "3" and cell_value(roster, "B6") == "3"
    trend = sheets["06_45기추이"]
    assert cell_value(trend, "A19") == "2교구"
    assert [cell_value(trend, f"{col}21") for col in "DEFGH"] == ["0", "0", "0", "3", "3"]
    assert cell_value(trend, "G46") == "3"
    assert cell_value(sheets["01_주일보고"], "F9") == "3"
    assert cell_value(sheets["07_46기명단"], "E27") == "사륙"
    summary = sheets["04_교구수합_2교구"]
    assert cell_value(summary, "K8") == "가사오\n나사오\n임원사오"
    assert cell_value(summary, "L8") == "3"
    assert cell_value(summary, "M8") is None
    assert cell_value(summary, "M9") == "사륙"


def test_enrolled_members_and_newcomer_status(client, db):
    newcomer = ("새가족", "2026-07-01")
    add_member(db, "가등반", profiles=(newcomer, ("토요예배", "2026-09-03")),
               registered_at=datetime.date(2026, 7, 1), enrolled_at=datetime.datetime(2026, 9, 3, 10),
               status="PRESENT")
    # Direct member creation also fills enrolled_at; without newcomer history it is not 등반.
    add_member(db, "직접추가", profiles=(("토요예배", "2026-09-02"),),
               enrolled_at=datetime.datetime(2026, 9, 2, 9), status="PRESENT")
    add_member(db, "상반기등반", profiles=(("새가족", "2026-01-10"), ("토요예배", "2026-03-01")),
               enrolled_at=datetime.datetime(2026, 3, 1))
    add_member(db, "지난주등반", profiles=(("새가족", "2026-06-01"), ("토요예배", "2026-08-29")),
               enrolled_at=datetime.datetime(2026, 8, 29))
    add_member(db, "신규등록", profiles=(("새가족", "2026-09-05"),),
               registered_at=datetime.date(2026, 9, 5), status="PRESENT", edu_week=1)
    add_member(db, "교육이주", profiles=(newcomer,), registered_at=datetime.date(2026, 7, 1),
               status="PRESENT", edu_week=2)
    add_member(db, "모임만", profiles=(newcomer,), registered_at=datetime.date(2026, 7, 1), status="PRESENT")
    add_member(db, "결석자", profiles=(newcomer,), registered_at=datetime.date(2026, 7, 1), status="ABSENT")
    add_member(db, "기록없음", profiles=(newcomer,), registered_at=datetime.date(2026, 7, 1))
    db.commit()
    _, sheets = download(client)

    first = sheets["01_주일보고"]
    assert cell_value(first, "I9") == "1"
    assert cell_value(first, "I10") == "0"
    assert cell_value(first, "H9") == "3"
    graph = sheets["03_교구별그래프_1교구"]
    assert cell_value(graph, "D6") == "등반자 : 1명    누적[3]"
    assert cell_value(graph, "D7") is None
    summary = sheets["04_교구수합_1교구"]
    assert cell_value(summary, "I6") == "가등반"
    assert cell_value(summary, "J6") == "1"
    assert cell_value(summary, "O6") == "\n".join(sorted(["신규등록", "교육이주", "모임만"]))
    assert cell_value(summary, "P6") == "3"
    style = lambda sheet, address: sheet.find(f".//s:c[@r='{address}']", NS).get("s")
    # Highlights follow this week's data, not the template's dummy rows.
    assert style(summary, "O6") != style(summary, "H6") == style(summary, "O7") == style(summary, "G6")
    assert style(graph, "D7") == style(graph, "D6") and style(graph, "P22") == style(graph, "P21")
    assert float(summary.find(".//s:row[@r='6']", NS).get("ht")) > 34.5

    status = sheets["09_새가족현황_1교구"]
    assert cell_value(status, "A12") == "1교구"
    assert cell_value(status, "D12") == "신규등록"
    assert cell_value(status, "D14") is None
    assert cell_value(status, "D18") == "교육이주"
    assert cell_value(status, "D24") == "모임만"
    assert [cell_value(status, f"D{row}") for row in (26, 27, 28)] == [*sorted(["결석자", "기록없음"]), None]
    assert cell_value(status, "D29") == "가등반"
    assert [cell_value(status, f"{col}6") for col in "CDEFGHI"] == ["1", "1", "1", "2", "1", "0", "6"]
    assert cell_value(status, "I9") == "6"
    assert cell_value(sheets["09_새가족현황_2교구"], "D12") is None


def test_names_beyond_template_slots_share_the_last_cell():
    sheet = ET.fromstring(
        f'<worksheet xmlns="{NS["s"]}"><sheetData><row r="1">'
        '<c r="A1"/><c r="A2"/><c r="A3"/></row></sheetData></worksheet>'
    )
    set_names(sheet, ["A1", "A2", "A3"], ["가", "나", "다", "라"])
    assert [cell_value(sheet, f"A{row}") for row in (1, 2, 3)] == ["가", "나", "다, 라"]
    set_names(sheet, ["A1", "A2", "A3"], ["가"])
    assert [cell_value(sheet, f"A{row}") for row in (1, 2, 3)] == ["가", None, None]


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
