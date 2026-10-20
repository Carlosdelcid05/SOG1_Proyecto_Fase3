#!/bin/bash
set -e

# Base de metadatos para Metabase (perfil "bi").
if ! psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='metabase'" | grep -q 1; then
  createdb -U "$POSTGRES_USER" metabase
  echo "[init] Base metabase creada."
fi
