# Alembic 복구 가이드

현재 프로젝트에서 Alembic을 제거했습니다. 필요 시 아래 내용으로 복구하세요.

---

## 복구 절차

### 1. requirements.txt
`backend/requirements.txt`에 아래 줄 주석 해제:
```
alembic
```

### 2. 디렉토리 구조 재생성
```
backend/
├── alembic.ini
└── alembic/
    ├── README
    ├── env.py
    ├── script.py.mako
    └── versions/
        ├── 4494b88f0207_create_user_table.py
        ├── 305f55a4b586_add_email_column.py
        ├── 0e52dcd41fe3_add_age_column.py
        └── 956818a4a339_update_user_table.py
```

---

## 파일 원본

### `backend/alembic.ini`
```ini
[alembic]
script_location = %(here)s/alembic
prepend_sys_path = .
path_separator = os

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARNING
handlers = console
qualname =

[logger_sqlalchemy]
level = WARNING
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

---

### `backend/alembic/README`
```
Generic single-database configuration.
```

---

### `backend/alembic/env.py`
```python
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import os
from dotenv import load_dotenv

# app/core/database.py의 Base를 인식시켜야 autogenerate가 동작함
from app.core.database import Base
import app.models  # noqa: F401 - Base에 테이블 등록을 위해 import 필요

load_dotenv()

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# .env에서 DB URL 동적으로 구성
_port = os.getenv('DB_PORT', '3306')
DB_URL = f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{_port}/{os.getenv('DB_NAME')}"
config.set_main_option("sqlalchemy.url", DB_URL)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

---

### `backend/alembic/script.py.mako`
```mako
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

# revision identifiers, used by Alembic.
revision: str = ${repr(up_revision)}
down_revision: Union[str, Sequence[str], None] = ${repr(down_revision)}
branch_labels: Union[str, Sequence[str], None] = ${repr(branch_labels)}
depends_on: Union[str, Sequence[str], None] = ${repr(depends_on)}


def upgrade() -> None:
    """Upgrade schema."""
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    """Downgrade schema."""
    ${downgrades if downgrades else "pass"}
```

---

## 마이그레이션 히스토리 (versions/)

### `4494b88f0207_create_user_table.py`
```python
"""create user table

Revision ID: 4494b88f0207
Revises:
Create Date: 2026-03-05 14:09:35.045693

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '4494b88f0207'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_user_id'), 'user', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_id'), table_name='user')
    op.drop_table('user')
```

---

### `305f55a4b586_add_email_column.py`
```python
"""add email column

Revision ID: 305f55a4b586
Revises: 4494b88f0207
Create Date: 2026-03-05

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '305f55a4b586'
down_revision: Union[str, Sequence[str], None] = '4494b88f0207'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('user', sa.Column('email', sa.String(length=200), nullable=True))


def downgrade() -> None:
    op.drop_column('user', 'email')
```

---

### `0e52dcd41fe3_add_age_column.py`
```python
"""add age column

Revision ID: 0e52dcd41fe3
Revises: 305f55a4b586
Create Date: 2026-03-05 07:42:07.307250

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0e52dcd41fe3'
down_revision: Union[str, Sequence[str], None] = '305f55a4b586'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('user', sa.Column('age', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('user', 'age')
```

---

### `956818a4a339_update_user_table.py`
```python
"""update user table

Revision ID: 956818a4a339
Revises: 0e52dcd41fe3
Create Date: 2026-03-07 04:00:47.317267

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision: str = '956818a4a339'
down_revision: Union[str, Sequence[str], None] = '0e52dcd41fe3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('user', sa.Column('birth', sa.Date(), nullable=True))
    op.drop_index(op.f('ix_user_id'), table_name='user')
    op.drop_column('user', 'email')
    op.drop_column('user', 'age')


def downgrade() -> None:
    op.add_column('user', sa.Column('age', mysql.INTEGER(display_width=11), autoincrement=False, nullable=True))
    op.add_column('user', sa.Column('email', mysql.VARCHAR(length=200), nullable=True))
    op.create_index(op.f('ix_user_id'), 'user', ['id'], unique=False)
    op.drop_column('user', 'birth')
```

---

## CI/CD 흔적

### `.github/workflows/deploy.yml` — 138번째 줄 (현재 주석 상태)

`docker-compose up -d` 직후, `docker image prune -f` 직전에 위치:

```yaml
            cd ~/newsongj
            docker-compose pull
            docker-compose up -d

            # docker-compose exec -T backend sh -c "until alembic upgrade head; do echo 'Waiting for DB...'; sleep 3; done"

            docker image prune -f
```

복구 시 주석 해제하면 배포 후 자동으로 마이그레이션이 실행됨.
`ci.yml`에는 alembic 관련 코드 없음.
