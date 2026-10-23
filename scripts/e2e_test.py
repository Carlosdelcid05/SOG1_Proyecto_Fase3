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

    product_with_desc = next(
        (p for p in public_catalog if p.get("description") and len(p["description"]) > 100),
        None,
    )
    check(
        "Detalle de producto con descripción enriquecida",
        product_with_desc is not None
        and ("<ul>" in product_with_desc["description"] or "Características principales" in product_with_desc["description"]),
        str(product_with_desc.get("sku") if product_with_desc else "ninguno"),
    )

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

    # Pedido contra entrega (queda facturado, no pagado)
    cod_checkout_id = f"e2e-cod-{int(time.time() * 1000)}"
    cod_email = f"cod.{int(time.time())}@example.com"
    cod_vat = "9876543-2"
    cod_payload = {
        "checkoutId": cod_checkout_id,
        "customer": {
            "name": "Cliente Contra Entrega E2E",
            "email": cod_email,
            "phone": "+502 4444-1111",
            "company": "Distribuidora del Valle S.A.",
            "vat": cod_vat,
            "street": "Avenida Reforma 12-01, Zona 10",
            "city": "Guatemala",
        },
        "items": [{"sku": "WEB-COR-02", "quantity": 1}],
        "paymentMethod": "contra_entrega",
        "notes": "Entrega en horario de oficina",
    }
    cod = call("POST", "/api/checkout/orders", cod_payload)["data"]
    check("Contra entrega crea pedido", bool(cod.get("orderId")), str(cod))
    check("Contra entrega queda facturado", cod.get("stage") == "invoiced", str(cod))
    check("Contra entrega registra método", cod.get("paymentMethod") == "contra_entrega", str(cod))
    check(
        "Contra entrega etiqueta método",
        "contra entrega" in str(cod.get("paymentMethodLabel", "")).lower(),
        str(cod.get("paymentMethodLabel")),
    )
    check("Contra entrega tiene factura", len(cod.get("invoices", [])) >= 1)
    check(
        "Factura contra entrega pendiente de pago",
        cod["invoices"][0].get("paymentState") not in ("paid", "in_payment"),
        str(cod["invoices"][0]),
    )
    check(
        "Contra entrega registra NIT",
        cod.get("billing", {}).get("nit") == cod_vat,
        str(cod.get("billing")),
    )
    diff_tax = abs(
        (cod.get("amountUntaxed", 0) + cod.get("amountTax", 0))
        - cod.get("amountTotal", 0)
    )
    check("Cuadre fiscal de totales (IVA)", diff_tax <= 0.02, f"diff={diff_tax:.4f}")

    cod_replay = call("POST", "/api/checkout/orders", cod_payload)["data"]
    check("Contra entrega es idempotente", cod_replay.get("replayed") is True, str(cod_replay))
    check("Contra entrega no duplica el pedido", cod_replay.get("orderId") == cod.get("orderId"))

    # Agendamiento de citas técnicas
    now_ts = int(time.time() * 1000)
    apt_payload = {
        "name": "Carlos Mendoza",
        "email": EMAIL,
        "phone": "+502 2300-1111",
        "company": "Corporación TecnoGuate",
        "date": "2026-11-15",
        "time": "10:30",
        "reason": f"Consultoría ERP Fase 3 {now_ts}",
        "notes": "Prueba E2E de cita técnica",
    }
    apt = call("POST", "/api/checkout/appointment", apt_payload)["data"]
    check("Cita agendada crea lead en Odoo", bool(apt.get("leadId")), str(apt))
    check("Cita devuelve nombre de lead", bool(apt.get("leadName")), str(apt))
    check("Cita devuelve referencia única", bool(apt.get("reference")), str(apt))

    apt_replay = call("POST", "/api/checkout/appointment", apt_payload)["data"]
    check(
        "Cita es idempotente",
        apt_replay.get("leadId") == apt.get("leadId")
        and apt_replay.get("reference") == apt.get("reference"),
        str(apt_replay),
    )

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
