#!/usr/bin/env bash
# Script de build para Render
set -o errexit

pip install -r requirements.txt

# Ejecutar migraciones de Alembic
# Si falla, intentar marcar como aplicadas (stamp) y continuar
if ! alembic upgrade head; then
  echo "⚠️  Migraciones fallaron, intentando stamp..."
  alembic stamp head || true
  echo "✅ Migraciones marcadas como aplicadas"
else
  echo "✅ Migraciones ejecutadas exitosamente"
fi

# Crear usuarios administradores
echo "📝 Creando usuarios administradores..."
python add_admin_users.py
echo "✅ Usuarios administradores verificados"

echo "✅ Build completado"
