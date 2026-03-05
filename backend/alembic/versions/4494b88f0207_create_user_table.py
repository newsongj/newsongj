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
