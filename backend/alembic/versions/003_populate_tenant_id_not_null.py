"""Poblar tenant_id con datos existentes y hacer NOT NULL

Revision ID: 003
Revises: 002
Create Date: 2026-02-20

Script MANUAL: no autogenerado.
Crea el tenant inicial con los datos de la tabla config existente,
luego asigna ese tenant a todos los registros existentes,
luego hace NOT NULL (solo PostgreSQL).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None

DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001"

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
    conn = op.get_bind()

    # 1. Obtener datos del tenant desde la config existente
    nombre_row = conn.execute(
        text("SELECT valor FROM config WHERE clave = 'institucion'")
    ).fetchone()
    nit_row = conn.execute(
        text("SELECT valor FROM config WHERE clave = 'nit_institucion'")
    ).fetchone()
    vigencia_row = conn.execute(
        text("SELECT valor FROM config WHERE clave = 'vigencia'")
    ).fetchone()

    nombre = (nombre_row[0] if nombre_row and nombre_row[0] else "Institución Principal")
    nit = (nit_row[0] if nit_row and nit_row[0] else "000000000-0")
    vigencia = int(vigencia_row[0]) if vigencia_row and vigencia_row[0] else 2026

    # 2. Insertar tenant default si no existe
    existing = conn.execute(
        text("SELECT id FROM tenants WHERE id = :id"),
        {"id": DEFAULT_TENANT_ID},
    ).fetchone()

    if not existing:
        conn.execute(
            text(
                "INSERT INTO tenants (id, nombre, nit, vigencia_actual, estado, fecha_creacion) "
                "VALUES (:id, :nombre, :nit, :vigencia, 'ACTIVO', date('now'))"
            ),
            {"id": DEFAULT_TENANT_ID, "nombre": nombre, "nit": nit, "vigencia": vigencia},
        )

    # 3. Insertar usuario admin inicial si no existe
    admin_exists = conn.execute(
        text("SELECT id FROM users WHERE email = 'admin@localhost'")
    ).fetchone()
    if not admin_exists:
        conn.execute(
            text(
                "INSERT INTO users (tenant_id, email, nombre, rol, activo, fecha_creacion) "
                "VALUES (:tid, 'admin@localhost', 'Administrador', 'ADMIN', 1, date('now'))"
            ),
            {"tid": DEFAULT_TENANT_ID},
        )

    # 4. Poblar tenant_id en todas las tablas
    for tabla in TABLAS:
        conn.execute(
            text(f"UPDATE {tabla} SET tenant_id = :tid WHERE tenant_id IS NULL"),
            {"tid": DEFAULT_TENANT_ID},
        )

    # 5. Hacer NOT NULL en PostgreSQL
    # (SQLite no soporta ALTER COLUMN; en dev la DB se recrea con create_all)
    dialect = conn.dialect.name
    if dialect == "postgresql":
        for tabla in TABLAS:
            op.alter_column(tabla, "tenant_id", nullable=False)


def downgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name

    # Revertir NOT NULL en PostgreSQL
    if dialect == "postgresql":
        for tabla in TABLAS:
            op.alter_column(tabla, "tenant_id", nullable=True)

    # Limpiar tenant_id de todas las tablas
    for tabla in TABLAS:
        conn.execute(text(f"UPDATE {tabla} SET tenant_id = NULL"))

    # Eliminar user y tenant default
    conn.execute(text("DELETE FROM users WHERE email = 'admin@localhost'"))
    conn.execute(text("DELETE FROM tenants WHERE id = :id"), {"id": DEFAULT_TENANT_ID})
