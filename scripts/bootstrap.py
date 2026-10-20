"""
Bootstrap de la Fase 3 para Trebol4Devop.

Se ejecuta con:
    docker compose exec -T odoo odoo shell -c /etc/odoo/odoo.conf \
        -d Trebol4Devop --no-http < scripts/bootstrap.py

Hace lo siguiente:
  1. Resetea la clave del administrador para la demo.
  2. Crea el usuario API que utiliza el bridge.
  3. Crea usuarios portal de demostración para clientes de Fase 2.
  4. Carga stock inicial en WH/Stock.
  5. Configura descripciones, política de facturación e imágenes.
  6. Asegura un diario bancario para pagos simulados.
  7. Cancela los pedidos/facturas de prueba con montos irreales.
"""

import base64
import glob
import os

from odoo import fields

print("== Bootstrap Fase 3: Trebol4Devop ==")

company = env.company
admin = env.ref("base.user_admin", raise_if_not_found=False)
if admin:
    admin.write({"login": "admin", "password": "admin"})
    print("· Clave del administrador restablecida (admin / admin)")

# ── 1. Usuario API del bridge ────────────────────────────────────────
group_ids = [
    env.ref("base.group_user").id,
    env.ref("base.group_partner_manager").id,
    env.ref("sales_team.group_sale_manager").id,
    env.ref("stock.group_stock_manager").id,
    env.ref("account.group_account_manager").id,
]

api_user = env["res.users"].search([("login", "=", "ecommerce_api")], limit=1)
api_vals = {
    "name": "E-commerce API",
    "login": "ecommerce_api",
    "password": "TrebolApi2026!",
    "email": "ecommerce@trebol4devop.com",
    "company_id": company.id,
    "company_ids": [(6, 0, [company.id])],
    "groups_id": [(6, 0, group_ids)],
}
if api_user:
    api_user.write(api_vals)
else:
    api_user = env["res.users"].create(api_vals)
print("· Usuario API listo: ecommerce_api")

# ── 2. Usuarios portal de demostración ───────────────────────────────
portal_group = env.ref("base.group_portal")
demo_members = [
    (9, "cmendoza@tecnoguate.com.gt"),
    (11, "sestrada@fintechnorte.gt"),
    (17, "gorellana@agrosanrafael.com.gt"),
]

for partner_id, login in demo_members:
    partner = env["res.partner"].browse(partner_id).exists()
    if not partner:
        print("  ! No existe el partner %s" % partner_id)
        continue
    if not partner.email:
        partner.email = login
    user = env["res.users"].search([("login", "=", login)], limit=1)
    vals = {
        "name": partner.name,
        "login": login,
        "password": "Demo1234",
        "partner_id": partner.id,
        "company_id": company.id,
        "company_ids": [(6, 0, [company.id])],
        "groups_id": [(6, 0, [portal_group.id])],
    }
    if user:
        user.write(vals)
    else:
        env["res.users"].create(vals)
    print("· Usuario portal: %s / Demo1234" % login)

# ── 3. Stock inicial y configuración de productos ────────────────────
stock_location = env.ref("stock.stock_location_stock")
products = env["product.product"].search(
    [
        ("sale_ok", "=", True),
        ("active", "=", True),
        ("default_code", "!=", False),
    ]
)

descriptions = {
    "Sitios Web": "Diseño y desarrollo de sitios web profesionales, responsivos y optimizados para conversión.",
    "Apps Móviles": "Aplicación móvil nativa o multiplataforma, con soporte, publicación y mantenimiento.",
    "Mantenimiento Mensual": "Plan de mantenimiento preventivo y correctivo para mantener tu plataforma estable y segura.",
    "Licencias de Módulos": "Licencia de uso de módulo especializado, con actualizaciones y soporte técnico.",
    "Servicios Adicionales": "Servicio profesional especializado para potenciar la seguridad, velocidad e integración de tu negocio.",
}

updated = 0
for product in products:
    category = product.categ_id.name or "Servicios Adicionales"
    description = descriptions.get(category, descriptions["Servicios Adicionales"])
    vals = {
        "invoice_policy": "order",
        "sale_ok": True,
        "purchase_ok": False,
    }
    if not product.description_sale:
        vals["description_sale"] = description
    if not product.description:
        vals["description"] = description
    product.write(vals)

    current = product.with_context(
        location=stock_location.id,
        lot_stock_id=stock_location.id,
    ).qty_available
    if current < 100:
        env["stock.quant"]._update_available_quantity(
            product, stock_location, 100 - current
        )
    updated += 1

print("· %s productos configurados con 100 unidades en WH/Stock" % updated)

# ── 4. Imágenes de producto ──────────────────────────────────────────
image_dir = "/mnt/assets/products"
image_count = 0
for product in products:
    code = product.default_code
    if not code:
        continue
    matches = glob.glob(os.path.join(image_dir, "%s.*" % code))
    matches = [m for m in matches if m.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))]
    if not matches:
        continue
    with open(matches[0], "rb") as image_file:
        product.image_1920 = base64.b64encode(image_file.read())
    image_count += 1
print("· %s imágenes cargadas en Odoo" % image_count)

# ── 5. Diario bancario para pagos simulados ──────────────────────────
bank_journal = env["account.journal"].search(
    [("type", "=", "bank"), ("company_id", "=", company.id)], limit=1
)
if not bank_journal:
    bank_journal = env["account.journal"].create(
        {
            "name": "Banco Trebol4Devop",
            "code": "BNK",
            "type": "bank",
            "company_id": company.id,
            "currency_id": company.currency_id.id,
        }
    )
    print("· Diario bancario creado: BNK")
else:
    print("· Diario bancario existente: %s" % bank_journal.name)

# ── 6. Limpieza de datos de prueba irreales ──────────────────────────
for order in env["sale.order"].search([("name", "in", ["S00004", "S00005"])]):
    try:
        for invoice in order.invoice_ids:
            if invoice.state == "posted":
                invoice.button_draft()
            if invoice.state == "draft":
                invoice.button_cancel()
        print("· Facturas de prueba canceladas: %s" % order.name)
    except Exception as error:  # noqa: BLE001
        print("  ! No se pudieron cancelar las facturas de %s: %s" % (order.name, error))

# Los pedidos de prueba tienen entregas ya realizadas, por lo que action_cancel
# no siempre es posible. Se fuerzan a cancelado para limpiar la demo y el BI.
env.cr.execute(
    "UPDATE sale_order SET state = 'cancel' WHERE name IN ('S00004', 'S00005')"
)
env.cr.execute(
    """
    UPDATE stock_picking
       SET state = 'cancel'
     WHERE id IN (
        SELECT sm.picking_id
          FROM stock_move sm
          JOIN sale_order_line sol ON sol.id = sm.sale_line_id
          JOIN sale_order so ON so.id = sol.order_id
         WHERE so.name IN ('S00004', 'S00005')
     )
    """
)
print("· Pedidos de prueba S00004 y S00005 marcados como cancelados")

env.cr.commit()
print("== Bootstrap completado ==")
