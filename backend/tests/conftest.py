"""Isolated test DB and real JWT authentication; never use backend/.env values.

Default SQLite is in-memory. The verification launcher can select a disposable
MariaDB on the internal Docker network; arbitrary database URLs are not accepted.
"""
import os
import datetime
import pytest

# Override inherited values as well as .env defaults before importing settings.
os.environ.update({
    "APP_ENV": "test",
    "DB_USER": "test",
    "DB_PASSWORD": "isolated-test-only",
    "DB_HOST": "127.0.0.1",
    "DB_PORT": "1",
    "DB_NAME": "newsongj_test",
    "FRONTEND_URL": "http://testserver",
    "BACKEND_URL": "http://testserver",
    "JWT_SECRET_KEY": "newsongj-tests-only-never-production",
    "JWT_ALGORITHM": "HS256",
    "JWT_EXPIRE_HOURS": "1",
})

from sqlalchemy import create_engine, BigInteger, event
from sqlalchemy.engine import Engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# SQLite는 BIGINT autoincrement를 지원하지 않으므로 INTEGER로 컴파일
@compiles(BigInteger, "sqlite")
def _bigint_to_integer(element, compiler, **kw):
    return "INTEGER"


import app.core.database as _db

_database = os.environ.get("NEWSONGJ_TEST_DATABASE", "sqlite")
if _database == "sqlite":
    _test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
elif _database == "mariadb":
    _test_engine = create_engine(
        "mysql+pymysql://root:isolated-test-only@test-db:3306/newsongj_test",
        pool_pre_ping=True,
    )
else:
    raise RuntimeError("Unsupported test database; use the isolated verification launcher.")
_TestSession = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)


@event.listens_for(Engine, "do_connect")
def _reject_other_engines(dialect, connection_record, connection_args, connection_params):
    # do_connect runs before opening a DBAPI connection (engine_connect is later).
    if dialect is not _test_engine.dialect:
        raise RuntimeError("Tests may connect only to the isolated test engine.")

# 모듈 속성 교체 — 이후 import되는 코드가 이 engine/SessionLocal을 본다
_db.engine = _test_engine
_db.SessionLocal = _TestSession

from app.main import app  # noqa: E402  — 위 monkey-patch 이후여야 함
import app.models as models  # noqa: E402, F401  — Base 등록
from app.core.config import settings  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from jose import jwt  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _setup_schema():
    """전체 테스트 세션 1회 — 격리 DB에 스키마 생성."""
    _db.Base.metadata.create_all(bind=_test_engine)
    yield
    _db.Base.metadata.drop_all(bind=_test_engine)


@pytest.fixture(autouse=True)
def db():
    """함수별 세션 — 각 테스트가 끝나면 모든 테이블 비움.

    API는 별도 세션에서 commit한다. API 호출 후 DB를 검증할 때 db.rollback()으로
    이 세션의 기존 읽기 트랜잭션을 끝내야 MariaDB REPEATABLE READ에서도 새 값을 본다.
    """
    session = _TestSession()
    try:
        yield session
    finally:
        session.close()
        # 테이블 비우기 (스키마는 유지)
        with _test_engine.begin() as conn:
            for tbl in reversed(_db.Base.metadata.sorted_tables):
                conn.execute(tbl.delete())
        app.dependency_overrides.clear()


@pytest.fixture
def auth_headers():
    """Sign a real JWT with only the menu/scope claims requested by each test."""
    def build(menus=(), **claims):
        payload = {
            "sub": "1", "menus": list(menus), "data_scope": "all",
            "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1),
            **claims,
        }
        token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return {"Authorization": f"Bearer {token}"}
    return build


@pytest.fixture
def anonymous_client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def client(auth_headers):
    """Existing gyojeok tests have explicit gyojeok permissions, not an auth bypass."""
    headers = auth_headers([
        "admin.gyojeok.members", "admin.gyojeok.deleted_members",
        "admin.gyojeok.newcomers", "admin.gyojeok.attendance",
        "admin.gyojeok.attendance_dashboard",
    ])
    with TestClient(app, headers=headers) as test_client:
        yield test_client


@pytest.fixture
def seed_members(db):
    """일반 멤버 1명 + 새가족 1명 시드. (regular_id, newcomer_id) 반환."""
    today = datetime.date(2026, 5, 1)

    regular = models.Member(name="홍길동", gender="남", generation=20, enrolled_at=datetime.datetime(2026, 1, 1))
    newcomer = models.Member(name="새가족이", gender="여", generation=20, enrolled_at=datetime.datetime(2026, 1, 1))
    db.add_all([regular, newcomer])
    db.flush()

    db.add(models.MemberProfile(
        member_id=regular.member_id, updated_at=today,
        member_type="토요예배", gyogu=1, team=1, group_no=1,
    ))
    db.add(models.MemberProfile(
        member_id=newcomer.member_id, updated_at=today,
        member_type="새가족", gyogu=1, team=1, group_no=1,
    ))
    db.commit()
    return regular.member_id, newcomer.member_id
