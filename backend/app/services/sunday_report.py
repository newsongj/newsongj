"""Populate the Sunday-report template without changing its layout."""
import datetime
from collections.abc import Callable
from pathlib import Path
from xml.etree import ElementTree as ET

from sqlalchemy.orm import Session

from app.services.sunday_report_data import (
    EDUCATION_WEEKS,
    GENERATIONS,
    GYOGU,
    TEAMS,
    SundayReportData,
    WeekAttendance,
    load_sunday_report_data,
)
from app.services.sunday_report_workbook import (
    CHART_NS,
    NS,
    CellValue,
    TemplatePackage,
    copy_style,
    fit_row_lines,
    get_cell,
    refresh_chart,
    set_cell,
    set_names,
    set_number,
    set_page_footer,
)


TEMPLATE_PATH = Path(__file__).resolve().parents[1] / "assets/reports/sunday_report_v1.xlsx"
XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
# Template sheet numbers (1-based) laid out for a single gyogu; they are filled once per gyogu.
GYOGU_SHEETS = (3, 4, 9)
# Sheet 9 rows under each team column: (category, first row offset, row count).
# The template's 주일 registration row has no data source, so it stays empty.
_NEWCOMER_ROWS = (
    ("등록", 0, 2), (None, 2, 2),
    *((f"교육{week}", 2 + 2 * week, 2) for week in EDUCATION_WEEKS),
    ("모임", 12, 2), ("결석", 14, 3), ("등반현장", 17, 3), ("등반결석", 20, 4),
)
_NEWCOMER_SUMMARY = (
    ("C", ("등록",)), ("D", tuple(f"교육{week}" for week in EDUCATION_WEEKS)),
    ("E", ("모임",)), ("F", ("결석",)), ("G", ("등반현장",)), ("H", ("등반결석",)),
)

ChartValues = dict[str, CellValue]


def _excel_date(value: datetime.date) -> int:
    return (value - datetime.date(1899, 12, 30)).days


def _short_date(value: datetime.date) -> str:
    return f"{value.month}/{value.day}"


def _lines(names: list[str]) -> str | None:
    return "\n".join(names) or None


def _team_change(week: WeekAttendance, previous: WeekAttendance, gyogu: int, increase: bool) -> str:
    changes = [(team, week.teams[gyogu, team] - previous.teams[gyogu, team]) for team in TEAMS]
    candidate = max(changes, key=lambda item: item[1]) if increase else min(changes, key=lambda item: item[1])
    if (candidate[1] <= 0 if increase else candidate[1] >= 0):
        return "없음"
    return f"{candidate[0]}팀 ({candidate[1]:+d})"


def _team_names(data: SundayReportData, gyogu: int, team: int, generation: int | None = None,
                newcomers: bool = False) -> list[str]:
    return [
        member.name for member in data.present
        if member.gyogu == gyogu and member.team == team
        and (generation is None or member.generation == generation)
        and (not newcomers or member.is_newcomer)
    ]


def _fill_first_sheet(sheet: ET.Element, data: SundayReportData, scope: str) -> ChartValues:
    current, previous = data.weeks[-1], data.weeks[-2]
    set_cell(sheet, "A3", "출석 DB 반영 · 2025·2024년 비교값 100 고정 · 래사랑·방문자 미정")
    for address in ("I1", "A9"):
        set_number(sheet, address, _excel_date(current.date))
    set_cell(sheet, "R1", f"{current.date.year}년")
    set_cell(sheet, "S1", "2025년")
    set_cell(sheet, "T1", "2024년")

    chart_values: ChartValues = {}
    for row, week in enumerate(data.weeks, start=2):
        chart_values[f"N{row}"] = _short_date(week.date)
        set_cell(sheet, f"N{row}", chart_values[f"N{row}"])
        for column, value in zip("OPQRST", (*[week.gyogu_total(g) for g in GYOGU], week.total, 100, 100)):
            set_number(sheet, f"{column}{row}", value)
            chart_values[f"{column}{row}"] = value

    for column, gyogu in zip("CDE", GYOGU):
        set_number(sheet, f"{column}9", current.gyogu_total(gyogu))
        set_number(sheet, f"{column}10", current.gyogu_total(gyogu) - previous.gyogu_total(gyogu))
    set_number(sheet, "B9", current.total)
    set_number(sheet, "B10", current.total - previous.total)
    # The template links these to the generation and newcomer sheets, whose
    # totals follow different rules; plain values keep Excel from recalculating them away.
    for column, generation in zip("FG", GENERATIONS):
        set_cell(sheet, f"{column}9", current.generations[generation])
        set_cell(sheet, f"{column}10", current.generations[generation] - previous.generations[generation])
    set_cell(sheet, "H9", current.newcomers)
    set_cell(sheet, "H10", current.newcomers - previous.newcomers)
    set_cell(sheet, "I9", data.enrolled_this_week)
    set_cell(sheet, "I10", data.enrolled_this_week - data.enrolled_previous_week)
    for address in ("B39", "B57"):
        set_cell(sheet, address, None)
    for column, grade in (("J", "A"), ("K", "B"), ("L", "C")):
        set_number(sheet, f"{column}9", current.grades[grade])
        set_number(sheet, f"{column}10", current.grades[grade] - previous.grades[grade])
    for gyogu, column in zip(GYOGU, ("E", "G", "I")):
        set_number(sheet, f"{column}49", current.gyogu_total(gyogu) - previous.gyogu_total(gyogu))
        set_cell(sheet, f"{column}51", _team_change(current, previous, gyogu, True))
        set_cell(sheet, f"{column}53", _team_change(current, previous, gyogu, False))

    # Keep the previous prototype checkpoint for a quick reconciliation.
    set_cell(sheet, "B64", "실제 출석(명)")
    set_number(sheet, "E64", current.total)
    set_cell(sheet, "F64", f"{current.date.isoformat()} · {scope}")
    merges = sheet.find(f"{{{NS}}}mergeCells")
    if merges is None:
        raise ValueError("Sunday report v1 template has no merged-cell definitions")
    existing = {item.get("ref") for item in merges}
    for address in ("B64:D64", "F64:K64"):
        if address not in existing:
            ET.SubElement(merges, f"{{{NS}}}mergeCell", ref=address)
    merges.set("count", str(len(merges)))
    return chart_values


def _fill_team_table(
    sheet: ET.Element,
    data: SundayReportData,
    count: Callable[[WeekAttendance, int, int], int],
    note: str,
) -> list[int]:
    """Fill the shared 3-gyogu x 12-team layout of sheets 2, 6 and 8; return weekly totals."""
    set_number(sheet, "A1", _excel_date(data.weeks[-1].date))
    set_cell(sheet, "A3", note)
    totals = [0] * len(data.weeks)
    for gyogu, start_row, total_row, header_row in ((1, 5, 17, 4), (2, 19, 31, 18), (3, 33, 45, 32)):
        set_cell(sheet, f"A{start_row}", f"{gyogu}교구")
        for team in TEAMS:
            row = start_row + team - 1
            values = [count(week, gyogu, team) for week in data.weeks]
            set_cell(sheet, f"C{row}", data.team_leaders.get((gyogu, team)))
            for column, value in zip("DEFG", values):
                set_number(sheet, f"{column}{row}", value)
            set_number(sheet, f"H{row}", values[-1] - values[-2])
        for index, (column, week) in enumerate(zip("DEFG", data.weeks)):
            gyogu_total = sum(count(week, gyogu, team) for team in TEAMS)
            totals[index] += gyogu_total
            set_number(sheet, f"{column}{header_row}", _excel_date(week.date))
            set_number(sheet, f"{column}{total_row}", gyogu_total)
        set_number(
            sheet, f"H{total_row}",
            sum(count(data.weeks[-1], gyogu, team) - count(data.weeks[-2], gyogu, team) for team in TEAMS),
        )
    return totals


def _fill_second_sheet(sheet: ET.Element, data: SundayReportData) -> None:
    _fill_team_table(
        sheet, data, lambda week, gyogu, team: week.teams[gyogu, team],
        "출석 DB 기준 · 보정 인원 0 · 실제수 인원은 별도 계수",
    )
    for column, week in zip("DEFG", data.weeks):
        set_number(sheet, f"{column}46", sum(week.gyogu_total(g) for g in GYOGU))
        set_number(sheet, f"{column}47", week.executive)
        set_number(sheet, f"{column}48", week.total)
        set_number(sheet, f"{column}49", 0)
        set_number(sheet, f"{column}50", week.total)
        set_cell(sheet, f"{column}51", None)
    set_number(sheet, "H50", data.weeks[-1].total - data.weeks[-2].total)
    set_cell(sheet, "H51", None)


def _fill_generation_trend(sheet: ET.Element, data: SundayReportData, generation: int) -> None:
    totals = _fill_team_table(
        sheet, data, lambda week, gyogu, team: week.generation_teams[generation, gyogu, team],
        "출석 DB 기준 · 임원단은 본인 팀에 포함",
    )
    for column, total in zip("DEFG", totals):
        set_number(sheet, f"{column}46", total)
    set_number(sheet, "H46", totals[-1] - totals[-2])


def _fill_generation_list(sheet: ET.Element, data: SundayReportData, generation: int) -> None:
    set_number(sheet, "A1", _excel_date(data.weeks[-1].date))
    set_cell(sheet, "A3", "출석 DB 기준 · 기준일 출석자 · 임원단은 본인 팀에 포함")
    total = 0
    for gyogu, total_column in zip(GYOGU, "CDE"):
        base = 8 + 18 * (gyogu - 1)
        set_cell(sheet, f"A{base + 1}", f"{gyogu}교구")
        gyogu_total = 0
        for header, teams in ((base, TEAMS[:6]), (base + 9, TEAMS[6:])):
            for column, team in zip("BCDEFG", teams):
                names = _team_names(data, gyogu, team, generation)
                set_names(sheet, [f"{column}{row}" for row in range(header + 1, header + 8)], names)
                # A value, not COUNTA: overflowing names share one cell.
                set_cell(sheet, f"{column}{header + 8}", len(names))
                gyogu_total += len(names)
        set_number(sheet, f"{total_column}6", gyogu_total)
        total += gyogu_total
    set_number(sheet, "B6", total)


def _fill_graph_sheet(sheet: ET.Element, data: SundayReportData, gyogu: int) -> ChartValues:
    current = data.weeks[-1]
    set_cell(sheet, "A1", f"〈 {gyogu}교구 〉")
    set_cell(sheet, "A3", f"{current.date:%Y.%m.%d} · 출석 DB 기준 · 래사랑 미정")
    chart_values: ChartValues = {}
    for team in TEAMS:
        row = 6 + 15 * ((team - 1) // 3)
        name_column, count_column, note_column = (("A", "C", "D"), ("G", "I", "J"), ("M", "O", "P"))[(team - 1) % 3]
        enrolled = len(data.enrolled.get((gyogu, team), []))
        set_cell(sheet, f"{name_column}{row}", data.team_leaders.get((gyogu, team)))
        set_cell(sheet, f"{count_column}{row}", current.teams[gyogu, team])
        set_cell(
            sheet, f"{note_column}{row}",
            f"등반자 : {enrolled}명    누적[{data.enrolled_this_year[gyogu, team]}]",
        )
        set_cell(sheet, f"{note_column}{row + 1}", None)
        # The template highlights 래사랑 rows of its dummy teams; 래사랑 is undecided, so use the plain row style.
        first = ord(note_column)
        for column in (chr(first), chr(first + 1), chr(first + 2)):
            copy_style(sheet, f"{column}{row}", f"{column}{row + 1}")
        header = 2 + 6 * (team - 1)
        for chart_row, week in enumerate(data.weeks, start=header + 1):
            values = {
                f"U{chart_row}": _short_date(week.date),
                f"V{chart_row}": week.teams[gyogu, team],
                f"W{chart_row}": week.gyogu_total(gyogu) / len(TEAMS),
            }
            for address, value in values.items():
                set_cell(sheet, address, value)
            chart_values.update(values)
    return chart_values


def _fill_summary_sheet(sheet: ET.Element, data: SundayReportData, gyogu: int) -> None:
    previous, current = data.weeks[-2], data.weeks[-1]
    title = f"{gyogu}교구 인원 수합"
    set_cell(sheet, "A1", title)
    set_cell(sheet, "E4", title)
    set_cell(sheet, "E5", f"{gyogu}교구")
    set_cell(sheet, "A2", f"{current.date:%Y.%m.%d} · 출석 DB 기준 · 래사랑·방문자 미정")
    # The template marks dummy teams that have newcomers (O6) or 래사랑; plain rows look like H6.
    newcomer_style, plain_style = get_cell(sheet, "O6").get("s"), get_cell(sheet, "H6").get("s")
    totals = dict.fromkeys("ABCFJLNP", 0)
    for team in TEAMS:
        row = 5 + team
        enrolled = data.enrolled.get((gyogu, team), [])
        lists = {
            "K": _team_names(data, gyogu, team, GENERATIONS[0]),
            "M": _team_names(data, gyogu, team, GENERATIONS[1]),
            "O": _team_names(data, gyogu, team, newcomers=True),
        }
        values = {
            "A": previous.teams[gyogu, team], "B": current.teams[gyogu, team],
            "C": current.teams[gyogu, team] - previous.teams[gyogu, team], "F": current.teams[gyogu, team],
            "J": len(enrolled), "L": len(lists["K"]), "N": len(lists["M"]), "P": len(lists["O"]),
        }
        for column, value in values.items():
            # The template points A/B/L/N at other sheets' 2교구 rows and counts J by
            # non-empty cells, so those become values; C and F only reference this row.
            (set_number if column in "CF" else set_cell)(sheet, f"{column}{row}", value)
            totals[column] += value
        set_cell(sheet, f"G{row}", None)
        set_cell(sheet, f"H{row}", None)
        set_cell(sheet, f"I{row}", _lines(enrolled))
        for column, names in lists.items():
            set_cell(sheet, f"{column}{row}", _lines(names))
        get_cell(sheet, f"G{row}").set("s", plain_style)
        for column in "OP":
            get_cell(sheet, f"{column}{row}").set("s", newcomer_style if lists["O"] else plain_style)
        fit_row_lines(sheet, row, max(len(names) for names in (enrolled, *lists.values())))
    for column, total in totals.items():
        set_number(sheet, f"{column}18", total)


def _fill_newcomer_sheet(sheet: ET.Element, data: SundayReportData, gyogu: int) -> None:
    set_number(sheet, "A1", _excel_date(data.weeks[-1].date))
    set_cell(sheet, "A3", "기준일 미등반 새가족 + 이번 주 등반자 · 등록 경로 미구분(뉴송 줄)")
    status = data.newcomer_status
    column_totals = dict.fromkeys("CDEFGHI", 0)
    for row, row_gyogu in enumerate(GYOGU, start=6):
        row_total = 0
        for column, categories in _NEWCOMER_SUMMARY:
            count = sum(
                len(status.get((row_gyogu, team, category), []))
                for team in TEAMS for category in categories
            )
            set_cell(sheet, f"{column}{row}", count)
            column_totals[column] += count
            row_total += count
        set_number(sheet, f"I{row}", row_total)
        column_totals["I"] += row_total
    for column, total in column_totals.items():
        set_number(sheet, f"{column}9", total)

    for first_row, teams in ((12, TEAMS[:6]), (37, TEAMS[6:])):
        set_cell(sheet, f"A{first_row}", f"{gyogu}교구")
        for column, team in zip("DEFGHI", teams):
            for category, offset, size in _NEWCOMER_ROWS:
                names = status.get((gyogu, team, category), []) if category else []
                addresses = [f"{column}{first_row + offset + index}" for index in range(size)]
                set_names(sheet, addresses, names)


def _label_current_year(chart: ET.Element, year: int) -> None:
    ns = {"c": CHART_NS}
    for series in chart.findall(".//c:ser", ns):
        source = series.findtext("c:val/c:numRef/c:f", namespaces=ns) or ""
        title = series.find("c:tx/c:v", ns)
        if source.endswith("$R$2:$R$5") and title is not None:
            title.text = f"{year}년"


def build_sunday_report(
    db: Session,
    report_date: datetime.date,
    gyogu_no: int | None,
    team_no: int | None,
) -> bytes:
    data = load_sunday_report_data(db, report_date, gyogu_no, team_no)
    scope = f"{gyogu_no}교구" if gyogu_no is not None else "전체 교구"
    scope += f" · {team_no}팀" if team_no is not None else " · 전체 팀"
    gyogus = (gyogu_no,) if gyogu_no is not None else GYOGU

    package = TemplatePackage(TEMPLATE_PATH)
    fillers: dict[int, Callable[[ET.Element, int], ChartValues | None]] = {
        1: lambda sheet, _: _fill_first_sheet(sheet, data, scope),
        2: lambda sheet, _: _fill_second_sheet(sheet, data),
        3: lambda sheet, gyogu: _fill_graph_sheet(sheet, data, gyogu),
        4: lambda sheet, gyogu: _fill_summary_sheet(sheet, data, gyogu),
        5: lambda sheet, _: _fill_generation_list(sheet, data, GENERATIONS[0]),
        6: lambda sheet, _: _fill_generation_trend(sheet, data, GENERATIONS[0]),
        7: lambda sheet, _: _fill_generation_list(sheet, data, GENERATIONS[1]),
        8: lambda sheet, _: _fill_generation_trend(sheet, data, GENERATIONS[1]),
        9: lambda sheet, gyogu: _fill_newcomer_sheet(sheet, data, gyogu),
    }
    if len(package.sheets) != len(fillers):
        raise ValueError("Sunday report v1 template must have nine sheets")

    order = []
    for number, entry in enumerate(list(package.sheets), start=1):
        if number not in GYOGU_SHEETS:
            order.append((entry, number, None))
            continue
        # Copy the untouched template sheet before renaming; chart formulas carry the sheet name.
        base_name = entry.name
        copies = [entry, *(package.clone_sheet(entry) for _ in gyogus[1:])]
        for copy, gyogu in zip(copies, gyogus):
            package.rename(copy, f"{base_name}_{gyogu}교구")
            order.append((copy, number, gyogu))

    for page, (entry, number, gyogu) in enumerate(order, start=1):
        sheet = package.read_xml(entry.part)
        chart_values = fillers[number](sheet, gyogu)
        set_page_footer(sheet, page, len(order))
        package.write_xml(entry.part, sheet)
        for chart_part in package.charts_of(entry.part):
            chart = package.read_xml(chart_part)
            refresh_chart(chart, chart_values or {})
            _label_current_year(chart, report_date.year)
            package.write_xml(chart_part, chart)
    return package.save([entry for entry, _, _ in order])
