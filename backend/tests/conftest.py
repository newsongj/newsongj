"""테스트 공용 fixture — SQLite in-memory + FastAPI TestClient.

production 코드(`app.core.database`)의 engine/SessionLocal을 import 시점에 SQLite로
교체하므로, app.main이 로드될 때 `Base.metadata.create_all`이 SQLite에 적용된다.
"""
import os
import datetime
import pytest

# config.py의 BaseSettings가 .env 못 찾아도 통과하도록 더미 환경변수
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASSWORD", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "3306")
os.environ.setdefault("DB_NAME", "test")

from sqlalchemy import create_engine, BigInteger
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# SQLite는 BIGINT autoincrement를 지원하지 않으므로 INTEGER로 컴파일
@compiles(BigInteger, "sqlite")
def _bigint_to_integer(element, compiler, **kw):
    return "INTEGER"


import app.core.database as _db

_test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,  # in-memory DB가 connection 별로 분리되지 않게 단일 connection 강제
)
_TestSession = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)

# 모듈 속성 교체 — 이후 import되는 코드가 이 engine/SessionLocal을 본다
_db.engine = _test_engine
_db.SessionLocal = _TestSession

from app.main import app  # noqa: E402  — 위 monkey-patch 이후여야 함
import app.models as models  # noqa: E402, F401  — Base 등록
from app.core.security import verify_token  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

# 테스트는 인증 우회 (JWT 발급/검증은 별도 auth 테스트에서 다룬다)
app.dependency_overrides[verify_token] = lambda: {"sub": "test"}


@pytest.fixture(scope="session", autouse=True)
def _setup_schema():
    """전체 테스트 세션 1회 — SQLite에 스키마 생성."""
    _db.Base.metadata.create_all(bind=_test_engine)
    yield
    _db.Base.metadata.drop_all(bind=_test_engine)


@pytest.fixture
def db():
    """함수별 세션 — 각 테스트가 끝나면 모든 테이블 비움."""
    session = _TestSession()
    try:
        yield session
    finally:
        session.close()
        # 테이블 비우기 (스키마는 유지)
        with _test_engine.begin() as conn:
            for tbl in reversed(_db.Base.metadata.sorted_tables):
                conn.execute(tbl.delete())


@pytest.fixture
def client():
    """FastAPI TestClient — get_db는 production SessionLocal(=교체된 SQLite) 사용."""
    return TestClient(app)


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
