"""Crear tablas tenants y users

Revision ID: 001
Revises:
Create Date: 2026-02-20
"""
from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("nombre", sa.String(300), nullable=False),
        sa.Column("nit", sa.String(25), nullable=False, unique=True),
        sa.Column("codigo_dane", sa.String(20), nullable=True),
        sa.Column("vigencia_actual", sa.Integer, nullable=False, server_default="2026"),
        sa.Column("estado", sa.String(20), nullable=False, server_default="ACTIVO"),
        sa.Column("fecha_creacion", sa.String(20), nullable=False),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("email", sa.String(200), nullable=False, unique=True),
        sa.Column("nombre", sa.String(300), nullable=False),
        sa.Column("cargo", sa.String(100), nullable=True),
        sa.Column("rol", sa.String(20), nullable=False, server_default="CONSULTA"),
        sa.Column("activo", sa.Boolean, nullable=False, server_default="1"),
        sa.Column("fecha_creacion", sa.String(20), nullable=False),
    )
    op.create_index("ix_users_tenant", "users", ["tenant_id"])


def downgrade() -> None:
    op.drop_index("ix_users_tenant", table_name="users")
    op.drop_table("users")
    op.drop_table("tenants")
