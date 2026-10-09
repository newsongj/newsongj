"""XML-level editing of the fixed Sunday-report template.

The template is edited part by part so its styles, charts and print setup survive.
Only the gyogu sheets are copied; every copy gets its own drawing and charts.
"""
import posixpath
import re
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZIP_DEFLATED, ZipFile

NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
CHART_NS = "http://schemas.openxmlformats.org/drawingml/2006/chart"
_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
_WORKSHEET_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"
_DRAWING_TYPE = "application/vnd.openxmlformats-officedocument.drawing+xml"
_CHART_TYPE = "application/vnd.openxmlformats-officedocument.drawingml.chart+xml"
_WORKSHEET_REL = f"{_REL_NS}/worksheet"

ET.register_namespace("x", NS)
ET.register_namespace("r", _REL_NS)
ET.register_namespace("c", CHART_NS)
ET.register_namespace("a", "http://schemas.openxmlformats.org/drawingml/2006/main")

CellValue = str | int | float | None


def get_cell(sheet: ET.Element, address: str) -> ET.Element:
    cell = sheet.find(f".//{{{NS}}}sheetData/{{{NS}}}row/{{{NS}}}c[@r='{address}']")
    if cell is None:
        raise ValueError(f"Sunday report v1 template is missing {address}")
    return cell


def set_cell(sheet: ET.Element, address: str, value: CellValue) -> None:
    """Write a plain value, dropping any template formula in the cell."""
    cell = get_cell(sheet, address)
    # Preserve the template's existing cell style and coordinates.
    for child in list(cell):
        cell.remove(child)
    if value is None:
        cell.attrib.pop("t", None)
    elif isinstance(value, str):
        cell.set("t", "inlineStr")
        ET.SubElement(ET.SubElement(cell, f"{{{NS}}}is"), f"{{{NS}}}t").text = value
    else:
        cell.set("t", "n")
        ET.SubElement(cell, f"{{{NS}}}v").text = str(value)


def set_number(sheet: ET.Element, address: str, value: int) -> None:
    """Keep an existing formula, but replace its stale cached result.

    Use this only when the formula's inputs are filled with the same data;
    the template recalculates on open and would otherwise show other numbers.
    """
    cell = get_cell(sheet, address)
    if cell.find(f"{{{NS}}}f") is None:
        set_cell(sheet, address, value)
        return
    cell.set("t", "n")
    cached = cell.find(f"{{{NS}}}v")
    if cached is None:
        cached = ET.SubElement(cell, f"{{{NS}}}v")
    cached.text = str(value)


def set_names(sheet: ET.Element, addresses: list[str], names: list[str]) -> None:
    """One name per cell; names beyond the template's slots share the last cell."""
    if len(names) > len(addresses):
        names = [*names[:len(addresses) - 1], ", ".join(names[len(addresses) - 1:])]
    for index, address in enumerate(addresses):
        set_cell(sheet, address, names[index] if index < len(names) else None)


def copy_style(sheet: ET.Element, source: str, target: str) -> None:
    get_cell(sheet, target).set("s", get_cell(sheet, source).get("s"))


def fit_row_lines(sheet: ET.Element, row: int, lines: int, line_height: float = 14.0) -> None:
    """Grow a fixed-height row so that multi-line name cells are not clipped."""
    element = sheet.find(f".//{{{NS}}}sheetData/{{{NS}}}row[@r='{row}']")
    if element is None:
        raise ValueError(f"Sunday report v1 template is missing row {row}")
    needed = lines * line_height + 6
    if needed > float(element.get("ht", 0)):
        element.set("ht", str(needed))
        element.set("customHeight", "1")


def set_page_footer(sheet: ET.Element, page: int, total: int) -> None:
    footer = sheet.find(f"{{{NS}}}headerFooter/{{{NS}}}oddFooter")
    if footer is not None:
        footer.text = f"&C{page} / {total}"


def _range_addresses(formula: str) -> list[str]:
    match = re.fullmatch(r"'[^']+'!\$([A-Z]+)\$(\d+):\$\1\$(\d+)", formula or "")
    if match is None:
        raise ValueError("Sunday report chart source differs from the v1 template")
    column, first, last = match.group(1), int(match.group(2)), int(match.group(3))
    return [f"{column}{row}" for row in range(first, last + 1)]


def refresh_chart(chart: ET.Element, values: dict[str, CellValue]) -> None:
    """Replace every series cache with the values just written to its source cells."""
    ns = {"c": CHART_NS}
    for tag, cache_tag in (("strRef", "strCache"), ("numRef", "numCache")):
        for ref in chart.iter(f"{{{CHART_NS}}}{tag}"):
            addresses = _range_addresses(ref.findtext("c:f", namespaces=ns))
            points = ref.findall(f"c:{cache_tag}/c:pt", ns)
            if len(points) != len(addresses) or any(a not in values for a in addresses):
                raise ValueError("Sunday report chart cache differs from the v1 template")
            for point, address in zip(points, addresses):
                point.find("c:v", ns).text = str(values[address])


def _rels_part(part: str) -> str:
    folder, name = posixpath.split(part)
    return f"{folder}/_rels/{name}.rels"


def _resolve(source_part: str, target: str) -> str:
    if target.startswith("/"):
        return target[1:]
    return posixpath.normpath(posixpath.join(posixpath.dirname(source_part), target))


def _relationships(rels: bytes) -> list[tuple[str, str]]:
    """(Id, raw Target) pairs of a relationships part."""
    return [(rel.get("Id"), rel.get("Target")) for rel in ET.fromstring(rels)]


def _targets(rels: bytes, source_part: str) -> list[str]:
    return [_resolve(source_part, target) for _, target in _relationships(rels)]


def _append_xml(document: bytes, closing_tag: str, items: list[str]) -> bytes:
    text = document.decode("utf-8-sig")
    if closing_tag not in text:
        raise ValueError(f"Sunday report template part has no {closing_tag}")
    return text.replace(closing_tag, "".join(items) + closing_tag).encode()


@dataclass
class SheetEntry:
    name: str
    part: str
    rel_id: str
    sheet_id: int
    print_area: str | None


class TemplatePackage:
    def __init__(self, path: Path):
        with ZipFile(path) as template:
            self._infos = template.infolist()
            self.parts = {info.filename: template.read(info) for info in self._infos}
        self._added: list[str] = []
        self._content_types: list[str] = []
        self._workbook_rels: list[str] = []
        book = ET.fromstring(self.parts["xl/workbook.xml"])
        by_id = {
            rel_id: _resolve("xl/workbook.xml", target)
            for rel_id, target in _relationships(self.parts["xl/_rels/workbook.xml.rels"])
        }
        areas = {
            int(item.get("localSheetId")): item.text.split("!", 1)[1]
            for item in book.iter(f"{{{NS}}}definedName")
            if item.get("name") == "_xlnm.Print_Area"
        }
        self.sheets = [
            SheetEntry(
                sheet.get("name"), by_id[sheet.get(f"{{{_REL_NS}}}id")],
                sheet.get(f"{{{_REL_NS}}}id"), int(sheet.get("sheetId")), areas.get(index),
            )
            for index, sheet in enumerate(book.find(f"{{{NS}}}sheets"))
        ]

    def read_xml(self, part: str) -> ET.Element:
        return ET.fromstring(self.parts[part])

    def write_xml(self, part: str, element: ET.Element) -> None:
        self.parts[part] = ET.tostring(element, encoding="utf-8", xml_declaration=True)

    def charts_of(self, sheet_part: str) -> list[str]:
        charts = []
        for drawing in self._related(sheet_part):
            charts.extend(self._related(drawing))
        return charts

    def _related(self, part: str) -> list[str]:
        rels = self.parts.get(_rels_part(part))
        return _targets(rels, part) if rels is not None else []

    def _next_part(self, pattern: str) -> str:
        number = 1
        while pattern.format(number) in self.parts:
            number += 1
        return pattern.format(number)

    def _add(self, part: str, data: bytes, content_type: str | None = None) -> None:
        self.parts[part] = data
        self._added.append(part)
        if content_type is not None:
            self._content_types.append(f'<Override PartName="/{part}" ContentType="{content_type}" />')

    def _copy_with_related(self, source: str, pattern: str, content_type: str) -> str:
        """Copy a part and, recursively, the drawing/chart parts it points to."""
        copy = self._next_part(pattern)
        self._add(copy, self.parts[source], content_type)
        rels = self.parts.get(_rels_part(source))
        if rels is None:
            return copy
        text = rels.decode("utf-8-sig")
        for _, target in _relationships(rels):
            original = _resolve(source, target)
            if original.startswith("xl/drawings/charts/"):
                related = self._copy_with_related(original, "xl/drawings/charts/chart{}.xml", _CHART_TYPE)
            elif original.startswith("xl/drawings/"):
                related = self._copy_with_related(original, "xl/drawings/drawing{}.xml", _DRAWING_TYPE)
            else:
                raise ValueError(f"Sunday report cannot copy related part {original}")
            text = text.replace(f'Target="{target}"', f'Target="/{related}"')
        self._add(_rels_part(copy), text.encode())
        return copy

    def clone_sheet(self, entry: SheetEntry) -> SheetEntry:
        part = self._copy_with_related(entry.part, "xl/worksheets/sheet{}.xml", _WORKSHEET_TYPE)
        rel_id = f"RSundayReport{len(self._workbook_rels) + 1}"
        self._workbook_rels.append(
            f'<Relationship Type="{_WORKSHEET_REL}" Target="/{part}" Id="{rel_id}" />'
        )
        sheet_id = max(sheet.sheet_id for sheet in self.sheets) + len(self._workbook_rels)
        return SheetEntry(entry.name, part, rel_id, sheet_id, entry.print_area)

    def rename(self, entry: SheetEntry, name: str) -> None:
        for chart in self.charts_of(entry.part):
            self.parts[chart] = self.parts[chart].replace(
                f"'{entry.name}'!".encode(), f"'{name}'!".encode(),
            )
        entry.name = name

    def _write_workbook(self, order: list[SheetEntry]) -> None:
        book = self.read_xml("xl/workbook.xml")
        sheets = book.find(f"{{{NS}}}sheets")
        for sheet in list(sheets):
            sheets.remove(sheet)
        for entry in order:
            ET.SubElement(sheets, f"{{{NS}}}sheet", {
                "name": entry.name, "sheetId": str(entry.sheet_id), f"{{{_REL_NS}}}id": entry.rel_id,
            })
        names = book.find(f"{{{NS}}}definedNames")
        if names is not None:
            for item in [item for item in names if item.get("name") == "_xlnm.Print_Area"]:
                names.remove(item)
            for index, entry in enumerate(order):
                if entry.print_area:
                    area = ET.SubElement(names, f"{{{NS}}}definedName", {
                        "name": "_xlnm.Print_Area", "localSheetId": str(index),
                    })
                    area.text = f"'{entry.name}'!{entry.print_area}"
        self.write_xml("xl/workbook.xml", book)

    def save(self, order: list[SheetEntry]) -> bytes:
        self._write_workbook(order)
        if self._content_types:
            self.parts["[Content_Types].xml"] = _append_xml(
                self.parts["[Content_Types].xml"], "</Types>", self._content_types,
            )
        if self._workbook_rels:
            self.parts["xl/_rels/workbook.xml.rels"] = _append_xml(
                self.parts["xl/_rels/workbook.xml.rels"], "</Relationships>", self._workbook_rels,
            )
        output = BytesIO()
        with ZipFile(output, "w", ZIP_DEFLATED) as result:
            for info in self._infos:
                result.writestr(info, self.parts[info.filename])
            for part in self._added:
                result.writestr(part, self.parts[part])
        return output.getvalue()
