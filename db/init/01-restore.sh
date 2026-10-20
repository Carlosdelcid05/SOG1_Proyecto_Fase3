#!/bin/bash
set -e

echo "[init] Restaurando base Trebol4Devop desde el dump de Fase 2..."
pg_restore \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --no-owner \
  --role "$POSTGRES_USER" \
  --verbose \
  /dump/trebol4devop.dump

echo "[init] Base restaurada correctamente."
