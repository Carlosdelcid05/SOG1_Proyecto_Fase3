#!/usr/bin/env bash
# Carga datos de demostración realistas para la presentación.
# Ejecutar después de scripts/bootstrap.py y con el bridge levantado.
set -euo pipefail

BRIDGE_URL="${BRIDGE_URL:-http://localhost:4000}"
BRIDGE_KEY="${BRIDGE_KEY:-trebol-bridge-dev-key}"

post() {
  local path="$1"
  local body="$2"
  curl -sS -X POST "${BRIDGE_URL}${path}" \
    -H 'Content-Type: application/json' \
    -H "x-bridge-key: ${BRIDGE_KEY}" \
    -d "${body}"
}

echo "== Cotización pendiente: Fintech Soluciones del Norte =="
post /api/wix/quote-request '{
  "email": "sestrada@fintechnorte.gt",
  "name": "Licda. Sofia Estrada",
  "company": "Fintech Soluciones del Norte",
  "items": [{ "sku": "LIC-CRM-03", "quantity": 2 }],
  "notes": "Cotización solicitada desde el sitio web."
}' | python3 -m json.tool

echo "== Cotización pendiente: Corporación TecnoGuate =="
post /api/wix/quote-request '{
  "email": "cmendoza@tecnoguate.com.gt",
  "name": "Ing. Carlos Mendoza",
  "company": "Corporacion TecnoGuate S.A.",
  "items": [{ "sku": "WEB-COR-02", "quantity": 1 }],
  "notes": "Renovación del sitio corporativo."
}' | python3 -m json.tool

echo "== Pedido pagado: AgroExportadora San Rafael =="
WIX_ID="wix-demo-agro-$(date +%s)"
ORDER=$(cat <<JSON
{
  "order": {
    "id": "${WIX_ID}",
    "number": "WX-${WIX_ID}",
    "buyerInfo": {
      "email": "gorellana@agrosanrafael.com.gt",
      "firstName": "Inga. Gabriela",
      "lastName": "Orellana",
      "phone": "+502 7951-2244"
    },
    "lineItems": [
      { "sku": "WEB-ECO-05", "name": "Tienda E-commerce Avanzada B2B", "quantity": 1, "price": 1600 }
    ],
    "totals": { "total": 1600 },
    "currency": "GTQ"
  }
}
JSON
)
post /api/wix/order-created "${ORDER}" | python3 -m json.tool
post /api/wix/order-paid "${ORDER}" | python3 -m json.tool

echo "== Pedido pagado: Corporación TecnoGuate =="
WIX_ID="wix-demo-tecno-$(date +%s)"
ORDER=$(cat <<JSON
{
  "order": {
    "id": "${WIX_ID}",
    "number": "WX-${WIX_ID}",
    "buyerInfo": {
      "email": "cmendoza@tecnoguate.com.gt",
      "firstName": "Ing. Carlos",
      "lastName": "Mendoza",
      "phone": "+502 2455-8890"
    },
    "lineItems": [
      { "sku": "APP-ECO-02", "name": "App Móvil E-commerce Multiplataforma", "quantity": 1, "price": 1900 }
    ],
    "totals": { "total": 1900 },
    "currency": "GTQ"
  }
}
JSON
)
post /api/wix/order-created "${ORDER}" | python3 -m json.tool
post /api/wix/order-paid "${ORDER}" | python3 -m json.tool

echo "Datos de demostración cargados."
