"""Agregar tenant_id nullable a las 15 tablas de negocio

Revision ID: 002
Revises: 001
Create Date: 2026-02-20

NOTA: Esta migración solo aplica a producción (PostgreSQL).
En desarrollo (SQLite) la base de datos se recrea desde cero con create_all.
"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None

# Tablas de negocio que necesitan tenant_id
TABLAS = [
    "rubros_gastos",
    "rubros_ingresos",
    "cdp",
    "rp",
    "obligacion",
    "pago",
    "recaudo",
    "reconocimiento",
    "terceros",
    "cuentas_bancarias",
    "pac",
    "config",
    "modificaciones_presupuestales",
    "detalle_modificacion",
    "conceptos",
]


def upgrade() -> None:
    for tabla in TABLAS:
        op.add_column(
            tabla,
            sa.Column(
                "tenant_id",
                sa.String(36),
                sa.ForeignKey("tenants.id"),
                nullable=True,  # Nullable inicialmente para no romper datos existentes
            ),
        )
        op.create_index(f"ix_{tabla}_tenant", tabla, ["tenant_id"])


def downgrade() -> None:
    for tabla in reversed(TABLAS):
        op.drop_index(f"ix_{tabla}_tenant", table_name=tabla)
        op.drop_column(tabla, "tenant_id")
