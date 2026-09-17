"""Fill the live-data checkpoint without reserializing charts or workbook styles.

This is a download prototype: every other number/name remains dummy data.
The fixed v1 template reserves row 64 of its first worksheet for the checkpoint.
"""
import datetime
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from sqlalchemy.orm import Session

from app.services.dashboard import build_kpi_response


TEMPLATE_PATH = Path(__file__).resolve().parents[1] / "assets/reports/sunday_report_v1.xlsx"
XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
_SHEET_PART = "xl/worksheets/sheet1.xml"
_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"

ET.register_namespace("x", _NS)
ET.register_namespace("r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")


def _set_cell(sheet: ET.Element, address: str, value: str | float) -> None:
    cell = sheet.find(f".//{{{_NS}}}sheetData/{{{_NS}}}row/{{{_NS}}}c[@r='{address}']")
    if cell is None:
        raise ValueError(f"Sunday report v1 template is missing {address}")
    # Preserve the template's existing cell style and coordinates.
    for child in list(cell):
        cell.remove(child)
    if isinstance(value, str):
        cell.set("t", "inlineStr")
        ET.SubElement(ET.SubElement(cell, f"{{{_NS}}}is"), f"{{{_NS}}}t").text = value
    else:
        cell.set("t", "n")
        ET.SubElement(cell, f"{{{_NS}}}v").text = str(value)


def build_sunday_report(
    db: Session,
    report_date: datetime.date,
    gyogu_no: int | None,
    team_no: int | None,
) -> bytes:
    # Exactly the same single-week population and filters as the dashboard card.
    kpi = build_kpi_response(db, report_date, report_date, gyogu_no, team_no)
    scope = f"{gyogu_no}교구" if gyogu_no is not None else "전체 교구"
    scope += f" · {team_no}팀" if team_no is not None else " · 전체 팀"
    output = BytesIO()
    with ZipFile(TEMPLATE_PATH) as template, ZipFile(output, "w") as result:
        sheet = ET.fromstring(template.read(_SHEET_PART))
        _set_cell(sheet, "A3", "연동 테스트 · 실제 데이터는 맨 아래 확인 칸만 적용 · 나머지는 가상 데이터")
        _set_cell(sheet, "B64", "실제 출석(명)")
        _set_cell(sheet, "E64", kpi.all.present)
        _set_cell(sheet, "F64", f"{report_date.isoformat()} · {scope}")
        merges = sheet.find(f"{{{_NS}}}mergeCells")
        if merges is None:
            raise ValueError("Sunday report v1 template has no merged-cell definitions")
        for address in ("B64:D64", "F64:K64"):
            ET.SubElement(merges, f"{{{_NS}}}mergeCell", ref=address)
        merges.set("count", str(len(merges)))
        changed_sheet = ET.tostring(sheet, encoding="utf-8", xml_declaration=True)
        for part in template.infolist():
            result.writestr(part, changed_sheet if part.filename == _SHEET_PART else template.read(part))
    return output.getvalue()
