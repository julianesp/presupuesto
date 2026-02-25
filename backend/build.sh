#!/usr/bin/env bash
# Script de build para Render
set -o errexit

pip install -r requirements.txt

# Ejecutar migraciones de Alembic
alembic upgrade head

echo "✅ Build completado - Migraciones ejecutadas"
