#!/usr/bin/env python3
"""Run a clean backend snapshot without production env files or database access.

Default: Docker with no network, or macOS sandbox-exec + uv when Docker is off.
MariaDB mode uses an ephemeral Docker database on an internal-only network.
Dependency installation may use the network; application/test execution cannot
reach external networks. No application modules are imported by this launcher.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import uuid

BACKEND = Path(__file__).resolve().parents[1]


def run(command: list[str], **kwargs) -> subprocess.CompletedProcess:
    return subprocess.run(command, check=False, **kwargs)


def docker_available() -> bool:
    if not shutil.which("docker"):
        return False
    try:
        return run(["docker", "info"], capture_output=True, timeout=10).returncode == 0
    except subprocess.TimeoutExpired:
        return False


def snapshot(destination: Path) -> None:
    # Allowlist only source/tests/dependency manifests. Never copy backend/.env,
    # workbooks, local DB files, private harness files, or the repository root.
    for name in ("app", "tests"):
        source = BACKEND / name
        if source.is_symlink() or any(p.is_symlink() for p in source.rglob("*")):
            raise RuntimeError(f"Symlinks are not allowed in the test snapshot: {name}")
        shutil.copytree(source, destination / name, ignore=shutil.ignore_patterns(
            ".env*", "__pycache__", "*.pyc", ".pytest_cache", "*.db", "*.sqlite*"
        ))
    for name in ("requirements.txt", "requirements-dev.txt", "pytest.ini"):
        source = BACKEND / name
        if source.is_symlink():
            raise RuntimeError(f"Symlinks are not allowed in the test snapshot: {name}")
        shutil.copyfile(source, destination / name)


def pytest_command(args: argparse.Namespace) -> list[str]:
    command = ["python", "-B", "-m", "pytest", "-p", "no:cacheprovider", "-ra"]
    if args.keyword:
        command += ["-k", args.keyword]
    return command + (args.targets or ["tests"])


def validate_targets(targets: list[str]) -> None:
    for target in targets:
        path = Path(target.split("::", 1)[0])
        if path.is_absolute() or ".." in path.parts or not path.parts or path.parts[0] != "tests":
            raise ValueError("Test targets must be relative to backend/tests (for example tests/test_member_bulk.py).")
        if not (BACKEND / path).exists():
            raise ValueError(f"Test target does not exist: {path}")


def run_sandbox(workspace: Path, args: argparse.Namespace) -> int:
    if sys.platform != "darwin" or not shutil.which("sandbox-exec") or not shutil.which("uv"):
        raise RuntimeError("SQLite tests need Docker, or macOS sandbox-exec and uv. No unisolated fallback.")
    if args.database != "sqlite":
        raise RuntimeError("MariaDB tests require Docker; SQLite cannot substitute for MariaDB validation.")
    task_env = {key: os.environ[key] for key in ("PATH", "LANG", "LC_ALL") if key in os.environ}
    task_env.update({"PYTHONDONTWRITEBYTECODE": "1", "PYTEST_DISABLE_PLUGIN_AUTOLOAD": "1"})
    # Install dependencies before entering the network sandbox. Only a temporary
    # venv is modified; neither subprocess imports application modules.
    venv = workspace / ".venv"
    bootstrap = run(["uv", "--no-config", "venv", "--python", "3.11", str(venv)],
                    cwd=workspace, env=task_env)
    if bootstrap.returncode:
        raise RuntimeError("Could not create a temporary Python environment; no tests executed.")
    interpreter = str(venv / "bin" / "python")
    installed = run([
        "uv", "--no-config", "pip", "install", "--python", interpreter,
        "-r", str(workspace / "requirements-dev.txt"),
    ], cwd=workspace, env=task_env)
    if installed.returncode:
        raise RuntimeError("Could not prepare test dependencies; no tests executed.")
    task_env.update({"TMPDIR": str(workspace), "PYTHONPATH": str(workspace)})
    escaped_workspace = str(workspace.resolve()).replace("\\", "\\\\").replace('"', '\\"')
    profile = (
        '(version 1) (allow default) (deny network*) (deny file-write*) '
        f'(allow file-write* (subpath "{escaped_workspace}") (literal "/dev/null"))'
    )
    # Check kernel enforcement before any application code executes.
    probe = (
        "import errno,socket,sys\n"
        "try:\n s=socket.socket(); s.connect(('127.0.0.1',9))\n"
        "except OSError as e:\n sys.exit(0 if e.errno in (errno.EPERM,errno.EACCES) else 1)\n"
        "sys.exit(1)\n"
    )
    prefix = ["sandbox-exec", "-p", profile, interpreter, "-B"]
    check = run(prefix + ["-c", probe], cwd=workspace, env=task_env)
    if check.returncode:
        raise RuntimeError("Network sandbox verification failed; no application code executed.")
    print("[verify] macOS sandbox / SQLite / network denied / clean source snapshot", flush=True)
    return run(prefix + pytest_command(args)[2:], cwd=workspace, env=task_env).returncode


def run_docker(workspace: Path, args: argparse.Namespace) -> int:
    dockerfile = workspace / "Dockerfile.verify"
    dockerfile.write_text(
        "FROM python:3.11-slim\nWORKDIR /workspace\n"
        "COPY requirements.txt requirements-dev.txt ./\n"
        "RUN pip install --no-cache-dir -r requirements-dev.txt\n"
    )
    # Docker build also receives only dependency files, not application/env data.
    (workspace / ".dockerignore").write_text(
        "*\n!Dockerfile.verify\n!requirements.txt\n!requirements-dev.txt\n"
    )
    image_file = workspace / "test-image-id"
    build = run(["docker", "build", "-f", str(dockerfile), "--iidfile", str(image_file), str(workspace)])
    if build.returncode:
        raise RuntimeError("Could not build test image; no tests executed.")
    image_id = image_file.read_text().strip()
    if not image_id.startswith("sha256:"):
        raise RuntimeError("Docker did not return an immutable test image ID.")
    suffix = uuid.uuid4().hex[:12]
    test_name, db_name, network = (f"newsongj-verify-{kind}-{suffix}" for kind in ("test", "db", "net"))
    database_env: list[str] = []
    network_created = False
    try:
        if args.database == "mariadb":
            # Pull before joining the internal network. No published ports or
            # production volumes/credentials; /var/lib/mysql disappears on exit.
            if run(["docker", "pull", "mariadb:10.11"]).returncode:
                raise RuntimeError("Could not prepare disposable MariaDB image.")
            if run(["docker", "network", "create", "--internal", network], stdout=subprocess.DEVNULL).returncode:
                raise RuntimeError("Could not create isolated database network.")
            network_created = True
            started = run([
                "docker", "run", "--detach", "--rm", "--name", db_name,
                "--network", network, "--network-alias", "test-db",
                "--tmpfs", "/var/lib/mysql:rw", "-e", "MARIADB_ROOT_PASSWORD=isolated-test-only",
                "-e", "MARIADB_DATABASE=newsongj_test", "mariadb:10.11",
            ], stdout=subprocess.DEVNULL)
            if started.returncode:
                raise RuntimeError("Could not start disposable MariaDB.")
            deadline = time.monotonic() + 60
            while True:
                ready = run(["docker", "exec", db_name, "healthcheck.sh", "--connect", "--innodb_initialized"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if ready.returncode == 0:
                    break
                if time.monotonic() >= deadline:
                    raise RuntimeError("Disposable MariaDB did not become ready in 60 seconds.")
                time.sleep(1)
            database_env = ["-e", "NEWSONGJ_TEST_DATABASE=mariadb"]
        # TemporaryDirectory is mode 0700. Match its owner so Linux bind mounts
        # remain readable with all capabilities dropped, without widening access.
        owner = workspace.stat()
        command = [
            "docker", "run", "--rm", "--name", test_name,
            "--user", f"{owner.st_uid}:{owner.st_gid}",
            "--network", network if network_created else "none", "--read-only",
            "--cap-drop=ALL", "--security-opt=no-new-privileges", "--tmpfs", "/tmp:rw,nosuid",
            "--mount", f"type=bind,source={workspace},target=/workspace,readonly",
            "--workdir", "/workspace", "-e", "PYTHONDONTWRITEBYTECODE=1",
            "-e", "PYTEST_DISABLE_PLUGIN_AUTOLOAD=1", "-e", "PYTHONPATH=/workspace",
        ] + database_env + [image_id] + pytest_command(args)
        print(f"[verify] Docker / {args.database} / external network denied / clean source snapshot", flush=True)
        return run(command).returncode
    finally:
        for name in (test_name, db_name):
            run(["docker", "rm", "-f", name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if network_created:
            run(["docker", "network", "rm", network], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main() -> int:
    def interrupt(signum, frame):
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, interrupt)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runtime", choices=("auto", "docker", "sandbox"), default="auto")
    parser.add_argument("--database", choices=("sqlite", "mariadb"), default="sqlite")
    parser.add_argument("-k", "--keyword")
    parser.add_argument("targets", nargs="*")
    args = parser.parse_args()
    try:
        validate_targets(args.targets)
        runtime = args.runtime
        if runtime == "auto":
            runtime = "docker" if docker_available() else "sandbox"
        if runtime == "docker" and not docker_available():
            raise RuntimeError("Docker is unavailable; no containers were started and no tests executed.")
        with tempfile.TemporaryDirectory(prefix="newsongj-verify-") as temporary:
            workspace = Path(temporary).resolve()
            snapshot(workspace)
            code = run_docker(workspace, args) if runtime == "docker" else run_sandbox(workspace, args)
        print(f"[verify] {'PASS' if code == 0 else 'FAIL'} (pytest exit={code}; inspect xfail/skip summary separately)")
        return code if code >= 0 else 1
    except (OSError, RuntimeError, ValueError) as error:
        print(f"[verify] NOT RUN: {error}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("[verify] INTERRUPTED", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
