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
