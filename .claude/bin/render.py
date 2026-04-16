#!/usr/bin/env python3
"""
.claude/bin/render.py — MD AUTOGEN 블록 렌더러

4개 SSoT에서 데이터를 읽어 MD 파일의 AUTOGEN 마커 블록을 재생성한다.
- .claude/skills/*/SKILL.md   → skill-list
- .claude/settings.json + hooks/*.sh  → hook-list
- backend/app/models/__init__.py      → schema:{tablename}
- FastAPI OpenAPI                     → endpoints:{prefix}

블록 밖은 절대 건드리지 않음. 블록이 없는 파일은 조용히 skip.
표준 라이브러리만 사용.
"""

from __future__ import annotations

import argparse
import ast
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Callable

# ────────────────────────────────────────────────────────────────────────────
# 경로 상수
# ────────────────────────────────────────────────────────────────────────────

ROOT = Path("/Users/dos2004/Desktop/newsongj")
CLAUDE_DIR = ROOT / ".claude"
SKILLS_DIR = CLAUDE_DIR / "skills"
HOOKS_DIR = CLAUDE_DIR / "hooks"
SETTINGS_JSON = CLAUDE_DIR / "settings.json"
MODELS_FILE = ROOT / "backend" / "app" / "models" / "__init__.py"
MDS_DIR = ROOT / "MDs"
HARNESS_MD = MDS_DIR / "reference" / "harness.md"
DB_SCHEMA_MD = MDS_DIR / "reference" / "db-schema.md"
SPECS_DIR = MDS_DIR / "specs"

OPENAPI_URL = "http://localhost:8000/openapi.json"
OPENAPI_HTTP_TIMEOUT = 2.0

# AUTOGEN 마커 정규식 — 시작/끝 이름이 일치해야 한다
AUTOGEN_BLOCK_RE = re.compile(
    r"<!-- AUTOGEN:START name=([^\s>]+) -->\n(.*?)\n<!-- AUTOGEN:END name=\1 -->",
    re.DOTALL,
)

# ────────────────────────────────────────────────────────────────────────────
# skill-list 렌더
# ────────────────────────────────────────────────────────────────────────────

FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---", re.DOTALL)


def parse_frontmatter(text: str) -> dict[str, str]:
    """간단한 YAML 프론트매터 파서 (key: value 한 줄짜리만 지원)."""
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}
    data: dict[str, str] = {}
    for line in m.group(1).splitlines():
        if ":" not in line:
            continue
        k, _, v = line.partition(":")
        data[k.strip()] = v.strip()
    return data


def collect_skills() -> list[tuple[str, str]]:
    """(name, description) 리스트. 이름 알파벳 정렬."""
    results: list[tuple[str, str]] = []
    if not SKILLS_DIR.is_dir():
        return results
    for skill_md in sorted(SKILLS_DIR.glob("*/SKILL.md")):
        fm = parse_frontmatter(skill_md.read_text(encoding="utf-8"))
        name = fm.get("name") or skill_md.parent.name
        desc = fm.get("description", "")
        if len(desc) > 80:
            desc = desc[:80]
        results.append((name, desc))
    results.sort(key=lambda x: x[0])
    return results


def render_skill_list() -> str:
    skills = collect_skills()
    lines = ["| 커맨드 | 설명 |", "|--------|------|"]
    for name, desc in skills:
        lines.append(f"| `/{name}` | {desc} |")
    return "\n".join(lines)


# ────────────────────────────────────────────────────────────────────────────
# hook-list 렌더
# ────────────────────────────────────────────────────────────────────────────


def parse_hook_header(hook_path: Path) -> tuple[str, str]:
    """
    훅 스크립트 첫 20라인 내에서 `# name — event — 역할` 포맷을 찾아 (event, role) 반환.
    포맷 없으면 ("", "") 반환 → 호출자가 파일명 기반으로 기본값 생성.
    대시는 em-dash(—) 또는 일반 dash(-, --) 모두 허용.
    """
    try:
        with hook_path.open("r", encoding="utf-8") as f:
            head = [next(f, "") for _ in range(20)]
    except OSError:
        return "", ""

    dash_re = re.compile(r"\s+[—–\-]{1,2}\s+")
    for line in head:
        stripped = line.strip()
        if not stripped.startswith("#"):
            continue
        # '#' 제거
        body = stripped.lstrip("#").strip()
        parts = dash_re.split(body, maxsplit=2)
        if len(parts) == 3:
            # parts[0] = name, parts[1] = event, parts[2] = 역할
            return parts[1].strip(), parts[2].strip()
    return "", ""


def load_settings_hooks() -> list[tuple[str, str, str]]:
    """
    settings.json의 hooks 키 파싱.
    반환: [(event, matcher, command_basename), ...]  순서 보존.
    """
    if not SETTINGS_JSON.is_file():
        return []
    try:
        data = json.loads(SETTINGS_JSON.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    rows: list[tuple[str, str, str]] = []
    hooks_root = data.get("hooks", {})
    for event, groups in hooks_root.items():
        if not isinstance(groups, list):
            continue
        for group in groups:
            matcher = group.get("matcher", "") if isinstance(group, dict) else ""
            for h in group.get("hooks", []) if isinstance(group, dict) else []:
                cmd = h.get("command", "") if isinstance(h, dict) else ""
                basename = os.path.basename(cmd) if cmd else ""
                rows.append((event, matcher, basename))
    return rows


def render_hook_list() -> str:
    rows = load_settings_hooks()
    lines = ["| 파일 | 이벤트 | Matcher | 역할 |", "|------|--------|---------|------|"]
    for event, matcher, basename in rows:
        role = ""
        if basename:
            hook_path = HOOKS_DIR / basename
            if hook_path.is_file():
                header_event, header_role = parse_hook_header(hook_path)
                # 헤더 주석의 event가 있으면 그것을 사용, 없으면 settings 기준 유지
                if header_role:
                    role = header_role
                if header_event and not event:
                    event = header_event
        matcher_cell = matcher if matcher else "-"
        role_cell = role if role else "-"
        file_cell = f"`{basename}`" if basename else "-"
        lines.append(f"| {file_cell} | {event} | {matcher_cell} | {role_cell} |")
    return "\n".join(lines)


# ────────────────────────────────────────────────────────────────────────────
# schema:{tablename} 렌더 (AST 파싱)
# ────────────────────────────────────────────────────────────────────────────


def _ast_unparse(node: ast.AST) -> str:
    """파이썬 3.9+ ast.unparse 래퍼 (fallback 포함)."""
    try:
        return ast.unparse(node)
    except AttributeError:  # pragma: no cover — 3.8 이하
        return repr(node)


def _column_constant(node: ast.AST) -> object:
    """AST 상수 노드를 파이썬 값으로 환원."""
    if isinstance(node, ast.Constant):
        return node.value
    return _ast_unparse(node)


def _render_column_type(type_node: ast.AST) -> str:
    """
    Column의 첫 번째 positional arg (SQLAlchemy 타입)를 문자열로.
    - String(100) → String(100)
    - Enum('A','B') → Enum('A','B')
    - BigInteger → BigInteger
    """
    if isinstance(type_node, ast.Call):
        func = _ast_unparse(type_node.func)
        args_str = ", ".join(_ast_unparse(a) for a in type_node.args)
        return f"{func}({args_str})"
    return _ast_unparse(type_node)


def _extract_column_info(call: ast.Call) -> dict[str, object]:
    """
    ast.Call (Column(...))에서 type/constraint 정보 추출.
    """
    info: dict[str, object] = {
        "type": "",
        "primary_key": False,
        "autoincrement": False,
        "nullable": None,  # None=미지정, True/False
        "unique": False,
        "default": None,
        "has_default": False,
    }
    if call.args:
        info["type"] = _render_column_type(call.args[0])
    for kw in call.keywords:
        if kw.arg == "primary_key":
            info["primary_key"] = bool(_column_constant(kw.value))
        elif kw.arg == "autoincrement":
            info["autoincrement"] = bool(_column_constant(kw.value))
        elif kw.arg == "nullable":
            info["nullable"] = bool(_column_constant(kw.value))
        elif kw.arg == "unique":
            info["unique"] = bool(_column_constant(kw.value))
        elif kw.arg == "default":
            info["default"] = _column_constant(kw.value)
            info["has_default"] = True
    return info


def _format_constraints(info: dict[str, object]) -> str:
    """컬럼 정보 dict → '타입, 제약' 문자열."""
    parts: list[str] = [str(info["type"])]
    if info["primary_key"]:
        parts.append("PRIMARY KEY")
    if info["autoincrement"]:
        parts.append("AUTO_INCREMENT")
    if info["unique"]:
        parts.append("UNIQUE")
    if info["nullable"] is False:
        parts.append("NOT NULL")
    elif info["nullable"] is True:
        parts.append("nullable")
    if info["has_default"]:
        parts.append(f"default={info['default']!r}")
    return ", ".join(parts)


def _collect_inline_comments(source: str) -> dict[int, str]:
    """
    소스의 각 라인 번호(1-indexed) → 해당 라인 인라인 주석(없으면 키 부재).
    간단한 '#' 분리 — 문자열 리터럴 내부의 '#'는 정확히 처리되지 않을 수 있으나
    SQLAlchemy Column 선언 라인에서는 안전하다.
    """
    result: dict[int, str] = {}
    for lineno, line in enumerate(source.splitlines(), start=1):
        # 라인을 따옴표 상태를 고려해 단순 파싱
        in_str: str | None = None
        i = 0
        while i < len(line):
            ch = line[i]
            if in_str:
                if ch == "\\":
                    i += 2
                    continue
                if ch == in_str:
                    in_str = None
            else:
                if ch in ("'", '"'):
                    in_str = ch
                elif ch == "#":
                    comment = line[i + 1:].strip()
                    if comment:
                        result[lineno] = comment
                    break
            i += 1
    return result


def collect_schemas() -> list[tuple[str, str, list[tuple[str, str, str]]]]:
    """
    [(class_name, table_name, [(col_name, constraints, comment), ...]), ...]
    파일에 등장하는 class 순서 그대로.
    """
    if not MODELS_FILE.is_file():
        return []
    source = MODELS_FILE.read_text(encoding="utf-8")
    tree = ast.parse(source)
    comments = _collect_inline_comments(source)

    tables: list[tuple[str, str, list[tuple[str, str, str]]]] = []
    for node in tree.body:
        if not isinstance(node, ast.ClassDef):
            continue
        tablename = ""
        columns: list[tuple[str, str, str]] = []
        for item in node.body:
            # __tablename__ 추출
            if (
                isinstance(item, ast.Assign)
                and len(item.targets) == 1
                and isinstance(item.targets[0], ast.Name)
                and item.targets[0].id == "__tablename__"
            ):
                if isinstance(item.value, ast.Constant):
                    tablename = str(item.value.value)
                continue
            # col = Column(...)
            if (
                isinstance(item, ast.Assign)
                and len(item.targets) == 1
                and isinstance(item.targets[0], ast.Name)
                and isinstance(item.value, ast.Call)
                and isinstance(item.value.func, ast.Name)
                and item.value.func.id == "Column"
            ):
                col_name = item.targets[0].id
                info = _extract_column_info(item.value)
                constraints = _format_constraints(info)
                # 인라인 주석은 Column 선언의 마지막 라인에 위치
                end_line = getattr(item, "end_lineno", item.lineno)
                comment = comments.get(end_line, "")
                columns.append((col_name, constraints, comment))
        if tablename:
            tables.append((node.name, tablename, columns))
    return tables


def render_schema_block(tablename: str) -> str | None:
    """특정 테이블 한 개만 렌더. 없으면 None."""
    for _cls, tname, cols in collect_schemas():
        if tname != tablename:
            continue
        if not cols:
            return "```\n(컬럼 없음)\n```"
        name_w = max(len(c[0]) for c in cols)
        cons_w = max(len(c[1]) for c in cols)
        lines = ["```"]
        for col_name, constraints, comment in cols:
            left = col_name.ljust(name_w)
            mid = constraints.ljust(cons_w)
            if comment:
                lines.append(f"{left}  {mid}  # {comment}")
            else:
                lines.append(f"{left}  {mid}")
        lines.append("```")
        return "\n".join(lines)
    return None


# ────────────────────────────────────────────────────────────────────────────
# endpoints:{prefix} 렌더
# ────────────────────────────────────────────────────────────────────────────


def fetch_openapi() -> dict | None:
    """
    OpenAPI JSON 획득. 순서:
      1) http://localhost:8000/openapi.json (2초)
      2) docker compose exec -T backend python -c "..."
      3) 실패 → None + stderr 경고
    """
    # 1) localhost HTTP
    try:
        with urllib.request.urlopen(OPENAPI_URL, timeout=OPENAPI_HTTP_TIMEOUT) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as e:
        print(f"[render] localhost OpenAPI 실패: {e}", file=sys.stderr)

    # 2) docker compose exec
    try:
        proc = subprocess.run(
            [
                "docker", "compose", "exec", "-T", "backend",
                "python", "-c",
                "from app.main import app; import json; print(json.dumps(app.openapi()))",
            ],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            timeout=15,
            check=True,
        )
        return json.loads(proc.stdout)
    except (subprocess.SubprocessError, json.JSONDecodeError, FileNotFoundError) as e:
        print(f"[render] docker compose exec OpenAPI 실패: {e}", file=sys.stderr)

    print("[render] OpenAPI 획득 불가 — endpoints:* 블록은 skip됩니다.", file=sys.stderr)
    return None


def classify_endpoint_prefix(path: str) -> str | None:
    """
    OpenAPI path → AUTOGEN 블록 이름의 prefix 부분.
    /api/v1/gyojeok/... → "gyojeok"
    /api/attendance/dashboard/... → "dashboard"
    /api/attendance/... → "attendance"
    /api/meta/... → "meta"
    그 외 → None (skip)
    """
    if path.startswith("/api/v1/gyojeok"):
        return "gyojeok"
    if path.startswith("/api/attendance/dashboard"):
        return "dashboard"
    if path.startswith("/api/attendance"):
        return "attendance"
    if path.startswith("/api/meta"):
        return "meta"
    return None


def collect_endpoints_by_prefix(openapi: dict) -> dict[str, list[tuple[str, str, str]]]:
    """
    {prefix: [(method, path, summary), ...]} — method·path 알파벳 정렬.
    """
    groups: dict[str, list[tuple[str, str, str]]] = {}
    paths = openapi.get("paths", {})
    for path, methods in paths.items():
        prefix = classify_endpoint_prefix(path)
        if prefix is None:
            continue
        if not isinstance(methods, dict):
            continue
        for method, op in methods.items():
            if method.lower() not in {"get", "post", "put", "patch", "delete"}:
                continue
            summary = ""
            if isinstance(op, dict):
                summary = op.get("summary", "") or ""
            groups.setdefault(prefix, []).append((method.upper(), path, summary))
    for prefix in groups:
        groups[prefix].sort(key=lambda x: (x[1], x[0]))
    return groups


def render_endpoints_block(prefix: str, openapi: dict | None) -> str | None:
    if openapi is None:
        return None
    groups = collect_endpoints_by_prefix(openapi)
    rows = groups.get(prefix, [])
    lines = ["| Method | Endpoint | Summary |", "|--------|----------|---------|"]
    for method, path, summary in rows:
        lines.append(f"| {method} | {path} | {summary} |")
    return "\n".join(lines)


# ────────────────────────────────────────────────────────────────────────────
# 블록 치환 엔진
# ────────────────────────────────────────────────────────────────────────────

# 블록 이름 → 렌더 함수(name: str) -> str | None
BlockRenderer = Callable[[str], "str | None"]


def _build_renderers(openapi: dict | None) -> dict[str, BlockRenderer]:
    """블록 이름 prefix별 렌더 함수 등록."""
    def r_skill_list(_name: str) -> str:
        return render_skill_list()

    def r_hook_list(_name: str) -> str:
        return render_hook_list()

    def r_schema(name: str) -> str | None:
        # schema:member → tablename=member
        if ":" not in name:
            return None
        _, tname = name.split(":", 1)
        return render_schema_block(tname)

    def r_endpoints(name: str) -> str | None:
        if ":" not in name:
            return None
        _, prefix = name.split(":", 1)
        return render_endpoints_block(prefix, openapi)

    return {
        "skill-list": r_skill_list,
        "hook-list": r_hook_list,
        "schema:": r_schema,
        "endpoints:": r_endpoints,
    }


def _lookup_renderer(
    renderers: dict[str, BlockRenderer], block_name: str
) -> BlockRenderer | None:
    if block_name in renderers:
        return renderers[block_name]
    for key, fn in renderers.items():
        if key.endswith(":") and block_name.startswith(key):
            return fn
    return None


def render_block(
    content: str, renderers: dict[str, BlockRenderer]
) -> tuple[str, list[str]]:
    """
    content 안의 모든 AUTOGEN 블록을 재렌더한다.
    반환: (새 content, 교체된 블록 이름 리스트).
    """
    replaced: list[str] = []

    def _sub(m: re.Match[str]) -> str:
        block_name = m.group(1)
        fn = _lookup_renderer(renderers, block_name)
        if fn is None:
            return m.group(0)
        new_inner = fn(block_name)
        if new_inner is None:
            # 렌더 불가 (예: OpenAPI 실패) → 기존 내용 보존
            return m.group(0)
        replaced.append(block_name)
        return (
            f"<!-- AUTOGEN:START name={block_name} -->\n"
            f"{new_inner}\n"
            f"<!-- AUTOGEN:END name={block_name} -->"
        )

    new_content = AUTOGEN_BLOCK_RE.sub(_sub, content)
    return new_content, replaced


# ────────────────────────────────────────────────────────────────────────────
# 타깃별 대상 파일
# ────────────────────────────────────────────────────────────────────────────


def files_for_targets(targets: set[str]) -> list[Path]:
    files: list[Path] = []
    if "harness" in targets:
        files.append(HARNESS_MD)
    if "db-schema" in targets:
        files.append(DB_SCHEMA_MD)
    if "specs" in targets and SPECS_DIR.is_dir():
        files.extend(sorted(SPECS_DIR.glob("*.md")))
    # 존재하지 않거나 AUTOGEN 블록 없는 파일은 나중에 자동 skip
    return [p for p in files if p.is_file()]


# ────────────────────────────────────────────────────────────────────────────
# 원자적 쓰기
# ────────────────────────────────────────────────────────────────────────────


def atomic_write(path: Path, content: str) -> None:
    tmp = str(path) + ".tmp"
    Path(tmp).write_text(content, encoding="utf-8")
    os.replace(tmp, str(path))


# ────────────────────────────────────────────────────────────────────────────
# 메인
# ────────────────────────────────────────────────────────────────────────────


VALID_TARGETS = {"harness", "db-schema", "specs"}


def parse_targets(arg: str | None) -> set[str]:
    if not arg:
        return set(VALID_TARGETS)
    out: set[str] = set()
    for tok in arg.split(","):
        tok = tok.strip()
        if not tok:
            continue
        if tok not in VALID_TARGETS:
            raise SystemExit(
                f"[render] 알 수 없는 target: {tok} (허용: {sorted(VALID_TARGETS)})"
            )
        out.add(tok)
    return out


def cmd_check(targets: set[str]) -> int:
    """drift 있으면 exit 1, 없으면 exit 0."""
    openapi = fetch_openapi()
    renderers = _build_renderers(openapi)

    drift_files: list[str] = []
    for path in files_for_targets(targets):
        old = path.read_text(encoding="utf-8")
        new, replaced = render_block(old, renderers)
        if not replaced:
            continue  # 블록 미존재 → skip
        if new != old:
            drift_files.append(str(path))
            print(f"[drift] {path}")
            # 간단한 블록 단위 diff 출력
            _print_block_diff(old, new)

    if drift_files:
        print(f"\n드리프트 감지: {len(drift_files)}개 파일", file=sys.stderr)
        return 1
    print("드리프트 없음 (AUTOGEN 블록 최신 또는 블록 미존재)")
    return 0


def _print_block_diff(old: str, new: str) -> None:
    """AUTOGEN 블록 단위로만 diff를 보여준다 (블록 밖은 어차피 동일)."""
    old_blocks = {m.group(1): m.group(2) for m in AUTOGEN_BLOCK_RE.finditer(old)}
    new_blocks = {m.group(1): m.group(2) for m in AUTOGEN_BLOCK_RE.finditer(new)}
    for name in sorted(set(old_blocks) | set(new_blocks)):
        o = old_blocks.get(name, "")
        n = new_blocks.get(name, "")
        if o == n:
            continue
        print(f"  --- 블록 {name} (-old / +new) ---")
        for line in o.splitlines():
            print(f"  - {line}")
        for line in n.splitlines():
            print(f"  + {line}")


def cmd_write(targets: set[str]) -> int:
    openapi = fetch_openapi()
    renderers = _build_renderers(openapi)

    changed = 0
    for path in files_for_targets(targets):
        old = path.read_text(encoding="utf-8")
        new, replaced = render_block(old, renderers)
        if not replaced:
            continue
        if new == old:
            continue
        atomic_write(path, new)
        changed += 1
        print(f"[write] {path} (블록 {len(replaced)}개 갱신: {', '.join(replaced)})")

    if changed == 0:
        print("갱신할 AUTOGEN 블록 없음")
    else:
        print(f"총 {changed}개 파일 갱신")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="render.py",
        description="MD AUTOGEN 블록 렌더러. SSoT(모델, OpenAPI, 스킬, 훅)에서 MD 파생 섹션을 재생성한다.",
    )
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true",
                      help="drift가 있으면 exit 1, 없으면 exit 0")
    mode.add_argument("--write", action="store_true",
                      help="AUTOGEN 블록을 실제로 갱신")
    parser.add_argument(
        "--targets",
        default=None,
        help=f"콤마 구분. 기본=all. 허용: {sorted(VALID_TARGETS)}",
    )
    args = parser.parse_args(argv)

    targets = parse_targets(args.targets)
    if args.check:
        return cmd_check(targets)
    if args.write:
        return cmd_write(targets)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
