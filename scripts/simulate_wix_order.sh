#!/usr/bin/env bash
# Simula el ciclo de un pedido de Wix contra el bridge local.
# Uso: bash scripts/simulate_wix_order.sh
set -euo pipefail

BRIDGE_URL="${BRIDGE_URL:-http://localhost:4000}"
BRIDGE_KEY="${BRIDGE_KEY:-trebol-bridge-dev-key}"
EMAIL="${EMAIL:-cmendoza@tecnoguate.com.gt}"
WIX_ID="wix-demo-$(date +%s)"

payload=$(cat <<JSON
{
  "order": {
    "id": "${WIX_ID}",
    "number": "WX-${WIX_ID}",
    "buyerInfo": {
      "email": "${EMAIL}",
      "firstName": "Carlos",
      "lastName": "Mendoza",
      "phone": "+502 5555-5555"
    },
    "lineItems": [
      { "sku": "WEB-ECO-04", "name": "Tienda E-commerce Básica", "quantity": 1, "price": 990 }
    ],
    "totals": { "total": 990 },
    "currency": "GTQ"
  }
}
JSON
)

echo "== 1. Pedido creado en Wix =="
curl -sS -X POST "${BRIDGE_URL}/api/wix/order-created" \
  -H 'Content-Type: application/json' \
  -H "x-bridge-key: ${BRIDGE_KEY}" \
  -d "${payload}" | python3 -m json.tool

echo "== 2. Pago confirmado en Wix =="
curl -sS -X POST "${BRIDGE_URL}/api/wix/order-paid" \
  -H 'Content-Type: application/json' \
  -H "x-bridge-key: ${BRIDGE_KEY}" \
  -d "${payload}" | python3 -m json.tool

echo "== 3. Resumen del portal =="
curl -sS "${BRIDGE_URL}/api/portal/summary" \
  -H "x-bridge-key: ${BRIDGE_KEY}" \
  -H "x-member-email: ${EMAIL}" | python3 -m json.tool

echo "== 4. Últimos pedidos =="
curl -sS "${BRIDGE_URL}/api/portal/orders" \
  -H "x-bridge-key: ${BRIDGE_KEY}" \
  -H "x-member-email: ${EMAIL}" | python3 -m json.tool

echo "== 5. Facturas =="
curl -sS "${BRIDGE_URL}/api/portal/invoices" \
  -H "x-bridge-key: ${BRIDGE_KEY}" \
  -H "x-member-email: ${EMAIL}" | python3 -m json.tool

echo "Listo. Pedido Wix: ${WIX_ID}"
