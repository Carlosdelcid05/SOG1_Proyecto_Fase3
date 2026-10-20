{
    "name": "Trebol4Devop E-commerce Bridge",
    "summary": "Puente entre la tienda Wix y el ERP/CRM de Odoo",
    "description": """
Módulo puente para la Fase 3 del proyecto Trebol4Devop.

Expone campos de trazabilidad en pedidos y cotizaciones originados en la
tienda Wix, y centraliza la lógica transaccional que utiliza el bridge:

* Confirmación de cotización web y generación/publicación de factura.
* Creación y actualización automática de la oportunidad en CRM.
* Registro del pago cuando Wix confirma la transacción.
* Cálculo del estado logístico/financiero que se muestra en el portal.
""",
    "version": "16.0.1.0.0",
    "category": "Sales/Sales",
    "author": "Trebol4Devop",
    "website": "https://github.com/Trebol4Devop",
    "license": "LGPL-3",
    "depends": [
        "sale_management",
        "sale_stock",
        "sale_crm",
        "account",
    ],
    "data": [
        "views/sale_order_views.xml",
    ],
    "installable": True,
    "application": False,
}
