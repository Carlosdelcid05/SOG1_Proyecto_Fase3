#!/usr/bin/env python3
"""Prueba end-to-end del bridge Wix ↔ Odoo.

Requiere el stack levantado:
    docker compose up -d db odoo bridge
    python3 scripts/e2e_test.py
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request

BASE = os.getenv("BRIDGE_URL", "http://localhost:4000").rstrip("/")
KEY = os.getenv("BRIDGE_KEY", "trebol-bridge-dev-key")
EMAIL = os.getenv("E2E_EMAIL", "cmendoza@tecnoguate.com.gt")

passed: list[str] = []


def call(
    method: str,
    path: str,
    body: dict | None = None,
    email: str | None = None,
    raw: bool = False,
    token: str | None = None,
):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {} if token else {"x-bridge-key": KEY}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if data is not None:
        headers["Content-Type"] = "application/json"
    if email:
        headers["x-member-email"] = email

    request = urllib.request.Request(
        f"{BASE}{path}", data=data, headers=headers, method=method
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            payload = response.read()
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise AssertionError(f"{method} {path} → HTTP {error.code}: {detail}") from error

    if raw:
        return payload
    parsed = json.loads(payload.decode("utf-8"))
    if not parsed.get("ok"):
        raise AssertionError(f"{method} {path} → {parsed}")
    return parsed


def check(name: str, condition: bool, detail: str = "") -> None:
    if not condition:
        raise AssertionError(f"FALLÓ: {name} {detail}")
    passed.append(name)
    print(f"✓ {name}")


def main() -> None:
    print(f"Bridge: {BASE}")

    health = call("GET", "/health")
    check("Odoo responde", health.get("odoo") == "up", str(health))

    login = call(
        "POST",
        "/api/portal/login",
        {"email": EMAIL, "code": os.getenv("PORTAL_ACCESS_CODE", "trebol2026")},
    )["data"]
    check("Login del portal", bool(login.get("token")), str(login))
    token_summary = call("GET", "/api/portal/summary", token=login["token"])["data"]
    check("Token del portal autoriza", bool(token_summary.get("customer")), str(token_summary))

    catalog = call("GET", "/api/catalog")["data"]
    check("Catálogo con 30 productos", len(catalog) == 30, f"→ {len(catalog)}")
    check("SKU presente", bool(catalog[0].get("sku")))

    # Checkout público (carrito propio, sin Wix Payments).
    public_catalog = call("GET", "/api/checkout/products")["data"]
    check("Catálogo público del checkout", len(public_catalog) == 30, str(len(public_catalog)))
    check("Producto con imagen", bool(public_catalog[0].get("image")))

    checkout_id = f"e2e-checkout-{int(time.time() * 1000)}"
    checkout_email = f"checkout.{int(time.time())}@example.com"
    checkout = call(
        "POST",
        "/api/checkout/orders",
        {
            "checkoutId": checkout_id,
            "customer": {
                "name": "Cliente Checkout E2E",
                "email": checkout_email,
                "phone": "+502 5555-0000",
                "company": "Checkout Demo S.A.",
                "vat": "1234567-8",
            },
            "items": [{"sku": "WEB-BAS-01", "quantity": 2}],
            "paymentMethod": "simulated",
            "notes": "Pedido generado por e2e_test.py",
        },
    )["data"]
    check("Checkout crea pedido", bool(checkout.get("orderId")), str(checkout))
    check("Checkout queda pagado", checkout.get("stage") == "paid", str(checkout))
    check("Checkout genera factura", len(checkout.get("invoices", [])) >= 1)
    check("Checkout devuelve PDF", bool(checkout.get("orderPdfUrl")))

    replay = call(
        "POST",
        "/api/checkout/orders",
        {
            "checkoutId": checkout_id,
            "customer": {
                "name": "Cliente Checkout E2E",
                "email": checkout_email,
                "phone": "+502 5555-0000",
            },
            "items": [{"sku": "WEB-BAS-01", "quantity": 2}],
            "paymentMethod": "simulated",
        },
    )["data"]
    check("Checkout es idempotente", replay.get("replayed") is True, str(replay))
    check("No duplica el pedido", replay.get("orderId") == checkout.get("orderId"))

    quote = call(
        "POST",
        "/api/wix/quote-request",
        {
            "email": EMAIL,
            "name": "Prueba E2E",
            "company": "Corporacion TecnoGuate S.A.",
            "items": [{"sku": "WEB-BAS-01", "quantity": 2}],
            "notes": "Cotización generada por e2e_test.py",
        },
    )
    check("Cotización creada", bool(quote.get("orderId")), str(quote))

    detail = call("GET", f"/api/portal/quotes/{quote['orderId']}", email=EMAIL)["data"]
    check("Detalle de cotización", detail["name"] == quote["orderName"])
    check("Cotización aceptable", detail["canAccept"] is True)

    accepted = call(
        "POST", f"/api/portal/quotes/{quote['orderId']}/accept", {}, email=EMAIL
    )["data"]
    check("Cotización convertida en pedido", accepted["stage"] == "invoiced", str(accepted))
    check("Factura generada", len(accepted["invoiceIds"]) >= 1)

    wix_id = f"wix-e2e-{int(time.time())}"
    order_payload = {
        "order": {
            "id": wix_id,
            "number": f"WX-{wix_id}",
            "buyerInfo": {
                "email": EMAIL,
                "firstName": "Carlos",
                "lastName": "Mendoza",
            },
            "lineItems": [
                {
                    "sku": "WEB-ECO-04",
                    "name": "Tienda E-commerce Básica",
                    "quantity": 1,
                    "price": 990,
                }
            ],
            "totals": {"total": 990},
            "currency": "GTQ",
        }
    }

    created = call("POST", "/api/wix/order-created", order_payload)
    check("Pedido Wix creado en Odoo", created["created"] is True, str(created))

    paid = call("POST", "/api/wix/order-paid", order_payload)
    check("Pedido Wix pagado", paid["paid"] is True)

    orders = call("GET", "/api/portal/orders", email=EMAIL)["data"]
    order = next((row for row in orders if row["id"] == created["orderId"]), None)
    check("Pedido visible en portal", order is not None)
    check("Estado pagado", order["stage"] == "Pagado", str(order))

    invoices = call("GET", "/api/portal/invoices", email=EMAIL)["data"]
    invoice = next(
        (row for row in invoices if row["name"] in order["invoices"][0]["name"]),
        None,
    )
    check("Factura visible en portal", invoice is not None)
    check("Factura pagada", invoice["paymentState"] == "paid", str(invoice))

    token = call(
        "POST",
        "/api/portal/pdf-token",
        {"type": "invoice", "id": invoice["id"]},
        email=EMAIL,
    )["data"]
    pdf = call("GET", token["url"].replace(BASE, ""), raw=True)
    check("PDF de factura generado", pdf.startswith(b"%PDF"), f"→ {len(pdf)} bytes")

    print(f"\n{len(passed)} pruebas superadas. Flujo Wix → Odoo → Portal OK.")


if __name__ == "__main__":
    main()
