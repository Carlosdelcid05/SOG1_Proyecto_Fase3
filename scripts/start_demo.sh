#!/usr/bin/env bash
# Levanta el stack, asegura el túnel de Cloudflare y deja los enlaces listos
# para pegar en Wix. También actualiza el CSV del catálogo con la URL activa.
#
# Uso:
#   bash scripts/start_demo.sh          # stack + túnel + enlaces
#   bash scripts/start_demo.sh url      # solo imprime la URL activa
#   bash scripts/start_demo.sh --no-csv # no regenera el CSV
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ACTION="${1:-start}"
SKIP_CSV="${SKIP_CSV:-0}"
# Si ya tienes una URL fija (Tailscale Funnel, ngrok, Cloudflare Named Tunnel,
# VPS), pásala aquí y el script no arranca el túnel rápido:
#   STABLE_URL=https://mi-pc.tail1234.ts.net make start
EXTERNAL_URL="${STABLE_URL:-${BRIDGE_EXTERNAL_URL:-}}"
# Si .env ya tiene una URL fija (no trycloudflare, no localhost), respetarla.
if [ -z "${EXTERNAL_URL}" ] && [ -f .env ]; then
  ENV_URL="$(grep -E '^BRIDGE_PUBLIC_URL=' .env 2>/dev/null | cut -d= -f2- || true)"
  case "${ENV_URL}" in
    https://*)
      case "${ENV_URL}" in
        *trycloudflare.com*) ;;
        *) EXTERNAL_URL="${ENV_URL}" ;;
      esac
      ;;
  esac
fi
if [ "${ACTION}" = "--no-csv" ]; then
  ACTION="start"
  SKIP_CSV=1
fi

compose() {
  docker compose "$@"
}

extract_url() {
  local cid started
  cid="$(docker ps -aq -f name='^trebol_tunnel$' | head -n1)"
  if [ -z "${cid}" ]; then
    return 0
  fi

  # Leer solo los logs del arranque actual del contenedor. Si no, el último
  # trycloudflare.com de un arranque anterior se confunde con la URL vigente.
  started="$(docker inspect -f '{{.State.StartedAt}}' "${cid}" 2>/dev/null || true)"
  if [ -n "${started}" ]; then
    docker logs --since "${started}" "${cid}" 2>&1 \
      | grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' \
      | tail -n1 || true
  else
    docker logs --tail=500 "${cid}" 2>&1 \
      | grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' \
      | tail -n1 || true
  fi
}

wait_for_url() {
  local url=""
  # Cloudflare puede tardar ~30-60 s en publicar la URL del quick tunnel.
  for _ in $(seq 1 45); do
    url="$(extract_url)"
    if [ -n "${url}" ]; then
      printf '%s\n' "${url}"
      return 0
    fi
    sleep 2
  done
  return 1
}

wait_for_health() {
  for _ in $(seq 1 90); do
    if curl -fsS --max-time 5 http://localhost:4000/health 2>/dev/null \
      | grep -q '"odoo":"up"'; then
      return 0
    fi
    sleep 2
  done
  return 1
}

health_curl() {
  local url="$1"
  # El resolver local puede cachear un NXDOMAIN mientras Cloudflare ya publicó
  # el registro A. DoH consulta DNS público y evita falsos negativos.
  if curl --doh-url https://cloudflare-dns.com/dns-query -fsS --max-time 10 \
    "${url}/health" 2>/dev/null | grep -q '"odoo":"up"'; then
    return 0
  fi
  curl -fsS --max-time 10 "${url}/health" 2>/dev/null | grep -q '"odoo":"up"'
}

tunnel_is_reachable() {
  local url="$1"
  # El DNS/edge de Cloudflare puede tardar en propagar la URL nueva.
  for _ in $(seq 1 45); do
    if health_curl "${url}"; then
      return 0
    fi
    sleep 2
  done
  return 1
}

print_wix_steps() {
  local url="$1"
  local site="${WIX_SITE_URL:-https://carlosdelcidramire.wixsite.com/my-site-1}"
  local back checkout

  back="$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "${site}" 2>/dev/null || true)"
  checkout="${url}/checkout"
  if [ -n "${back}" ]; then
    checkout="${checkout}?back=${back}"
  fi

  cat <<EOF

============================================================
  BRIDGE LISTO — copia estos valores en Wix
============================================================
  URL base:      ${url}
  Checkout:      ${checkout}
  Portal:        ${url}/portal
  Agendar cita:  ${url}/agendar-cita
  WhatsApp:      https://wa.me/50223000000

  Wix Editor:
  1. Botón del carrito → Enlace → ${checkout}
  2. Página "Agendar Cita" → Enlace → ${url}/agendar-cita
  3. Secrets Manager (solo si usas Velo):
       BRIDGE_URL = ${url}
       BRIDGE_KEY = trebol-bridge-dev-key
  4. Si cambiaste imágenes del catálogo:
       Tienda → Productos → Importar → wix/catalog/productos_wix.csv
       (marcar "sobrescribir productos con el mismo SKU")
  5. Publicar el sitio.

EOF
  if [ -n "${EXTERNAL_URL}" ]; then
    cat <<EOF
  Nota: URL externa fija. Si la PC se apaga, el sitio deja de
  responder; para disponibilidad 24/7 usa un VPS.
============================================================
EOF
  else
    cat <<EOF
  Nota: esta URL es del túnel rápido y cambia si reinicias el
  contenedor "tunnel" o apagas la PC. Para una URL fija revisa:
  docs/tunel-estable.md
============================================================
EOF
  fi
}

write_wix_file() {
  local url="$1"
  local site="${WIX_SITE_URL:-https://carlosdelcidramire.wixsite.com/my-site-1}"
  local back checkout
  back="$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "${site}" 2>/dev/null || true)"
  checkout="${url}/checkout"
  if [ -n "${back}" ]; then
    checkout="${checkout}?back=${back}"
  fi

  cat > wix/TUNEL_ACTUAL.md <<EOF
# URL actual del bridge

Actualizado: $(date '+%Y-%m-%d %H:%M:%S %Z')

| Recurso | URL |
|---|---|
| Bridge | ${url} |
| Checkout | ${checkout} |
| Portal | ${url}/portal |
| Agendar cita | ${url}/agendar-cita |
| WhatsApp | https://wa.me/50223000000 |

## Pegar en Wix

1. **Botón del carrito** → Enlace: \`${checkout}\`
2. **Agendar Cita** → Enlace: \`${url}/agendar-cita\`
3. **Secrets Manager** (solo Velo):
   - \`BRIDGE_URL\` = \`${url}\`
   - \`BRIDGE_KEY\` = \`trebol-bridge-dev-key\`
4. **Catálogo**: reimportar \`wix/catalog/productos_wix.csv\` si cambiaron las imágenes.
5. **Publicar**.

> Si usas el túnel rápido, esta URL cambia al reiniciar el contenedor o
> apagar la PC: vuelve a ejecutar \`make start\` y actualiza los enlaces.
> Con una URL externa fija (Tailscale, ngrok, Cloudflare Named Tunnel o VPS)
> no cambia; solo asegúrate de que el equipo esté encendido.
EOF
}

case "${ACTION}" in
  url|--url-only|-u)
    if [ -n "${EXTERNAL_URL}" ]; then
      URL="${EXTERNAL_URL%/}"
      if ! health_curl "${URL}"; then
        echo "URL externa: ${URL}" >&2
        echo "Pero no responde. Revisa el túnel/servidor." >&2
        exit 1
      fi
      printf '%s\n' "${URL}"
      exit 0
    fi
    if ! docker ps --format '{{.Names}}' | grep -qx 'trebol_tunnel'; then
      echo "El túnel está detenido. Ejecuta: make start" >&2
      exit 1
    fi
    URL="$(extract_url)"
    if [ -z "${URL}" ]; then
      echo "Todavía no hay URL en los logs. Espera unos segundos o ejecuta: make start" >&2
      exit 1
    fi
    if ! health_curl "${URL}"; then
      echo "URL en logs: ${URL}" >&2
      echo "Pero no responde todavía. Revisa: docker compose --profile tunnel logs tunnel" >&2
      exit 1
    fi
    printf '%s\n' "${URL}"
    exit 0
    ;;
  start|"")
    ;;
  *)
    echo "Acción no reconocida: ${ACTION}" >&2
    echo "Uso: bash scripts/start_demo.sh [start|url] [--no-csv]" >&2
    exit 2
    ;;
esac

echo "== 1/4 Levantando PostgreSQL, Odoo y bridge =="
compose up -d db odoo bridge

if ! wait_for_health; then
  echo "Odoo o el bridge no respondieron a tiempo." >&2
  compose ps
  exit 1
fi

if [ -n "${EXTERNAL_URL}" ]; then
  echo "== 2/4 Usando URL externa fija =="
  URL="${EXTERNAL_URL%/}"
  if ! tunnel_is_reachable "${URL}"; then
    echo "La URL externa ${URL} no responde." >&2
    case "${URL}" in
      *.ts.net)
        echo "Verifica Tailscale Funnel con: tailscale funnel status" >&2
        echo "Si está apagado: tailscale funnel --bg 4000" >&2
        ;;
      *)
        echo "Revisa ngrok/Cloudflare/VPS y vuelve a intentar." >&2
        ;;
    esac
    exit 1
  fi
else
  echo "== 2/4 Asegurando túnel de Cloudflare =="
  compose --profile tunnel up -d tunnel

  URL="$(wait_for_url || true)"
  if [ -z "${URL}" ]; then
    echo "No apareció la URL en los logs; reiniciando el túnel..." >&2
    compose --profile tunnel restart tunnel
    URL="$(wait_for_url || true)"
  fi
  if [ -z "${URL}" ]; then
    echo "No se pudo obtener la URL del túnel. Últimos logs:" >&2
    compose --profile tunnel logs --tail=80 tunnel
    exit 1
  fi

  if ! tunnel_is_reachable "${URL}"; then
    echo "La URL ${URL} no respondió; reiniciando el túnel..." >&2
    compose --profile tunnel restart tunnel
    URL="$(wait_for_url || true)"
    if [ -z "${URL}" ] || ! tunnel_is_reachable "${URL}"; then
      echo "El túnel no quedó accesible. Revisa: docker compose --profile tunnel logs tunnel" >&2
      exit 1
    fi
  fi
fi

echo "== 3/4 Guardando la URL para el bridge =="
if [ ! -f .env ]; then
  cp .env.example .env
fi
OLD_URL="$(grep -E '^BRIDGE_PUBLIC_URL=' .env 2>/dev/null | cut -d= -f2- || true)"
if grep -qE '^BRIDGE_PUBLIC_URL=' .env; then
  sed -i.bak "s|^BRIDGE_PUBLIC_URL=.*|BRIDGE_PUBLIC_URL=${URL}|" .env
  rm -f .env.bak
else
  printf '\nBRIDGE_PUBLIC_URL=%s\n' "${URL}" >> .env
fi
if [ "${OLD_URL}" != "${URL}" ]; then
  compose up -d --no-deps bridge >/dev/null
  if ! wait_for_health; then
    echo "El bridge no volvió a responder después de reiniciarse." >&2
    compose logs --tail=40 bridge
    exit 1
  fi
fi

echo "== 4/4 Actualizando catálogo local =="
if [ "${SKIP_CSV}" != "1" ] && command -v python3 >/dev/null 2>&1; then
  python3 scripts/generate_images.py --csv-only --base-url "${URL}" >/dev/null
  echo "CSV actualizado: wix/catalog/productos_wix.csv"
else
  echo "CSV no regenerado (usa --no-csv o instala python3)."
fi

write_wix_file "${URL}"
print_wix_steps "${URL}"
