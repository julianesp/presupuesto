"""
Script de migración: SQLite local → PostgreSQL en Render

Uso:
    python migrate_to_production.py "postgresql://user:pass@host/dbname"

Requiere: pip install psycopg2-binary
"""
import sqlite3
import sys
import os

SQLITE_PATH = os.path.join(os.path.dirname(__file__), "backend", "presupuesto.db")

# Orden respeta claves foráneas
TABLE_ORDER = [
    "configuracion",
    "sifse_fuentes",
    "sifse_objetos",
    "rubros_gastos",
    "rubros_ingresos",
    "terceros",
    "cuentas_bancarias",
    "cdp",
    "rp",
    "obligaciones",
    "pagos",
    "recaudos",
    "modificaciones_presupuestales",
    "pac_gastos",
    "pac_ingresos",
]


def migrate(pg_url: str):
    try:
        import psycopg2
    except ImportError:
        print("Instalando psycopg2-binary...")
        os.system(f"{sys.executable} -m pip install psycopg2-binary -q")
        import psycopg2

    # Conectar a SQLite
    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    # Conectar a PostgreSQL
    pg_conn = psycopg2.connect(pg_url)
    pg_conn.autocommit = False
    pg_cur = pg_conn.cursor()

    # Obtener todas las tablas en SQLite
    sqlite_cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'alembic_version'"
    )
    available_tables = {row[0] for row in sqlite_cur.fetchall()}

    # Usar orden definido + cualquier tabla extra
    tables_to_migrate = [t for t in TABLE_ORDER if t in available_tables]
    tables_to_migrate += [t for t in available_tables if t not in TABLE_ORDER]

    total_rows = 0

    for table in tables_to_migrate:
        sqlite_cur.execute(f"SELECT * FROM {table}")
        rows = sqlite_cur.fetchall()

        if not rows:
            print(f"  {table}: vacía, saltando")
            continue

        columns = [desc[0] for desc in sqlite_cur.description]
        placeholders = ", ".join(["%s"] * len(columns))
        cols_str = ", ".join(f'"{c}"' for c in columns)
        insert_sql = (
            f'INSERT INTO "{table}" ({cols_str}) VALUES ({placeholders}) '
            f"ON CONFLICT DO NOTHING"
        )

        data = [tuple(row) for row in rows]

        try:
            pg_cur.executemany(insert_sql, data)
            pg_conn.commit()
            print(f"  {table}: {len(data)} filas migradas ✓")
            total_rows += len(data)
        except Exception as e:
            pg_conn.rollback()
            print(f"  {table}: ERROR - {e}")

    sqlite_conn.close()
    pg_conn.close()
    print(f"\nMigración completada: {total_rows} filas en total.")
    print("\n⚠️  Recuerda cambiar la contraseña de la DB en Render.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python migrate_to_production.py \"<EXTERNAL_DATABASE_URL>\"")
        sys.exit(1)

    migrate(sys.argv[1])
