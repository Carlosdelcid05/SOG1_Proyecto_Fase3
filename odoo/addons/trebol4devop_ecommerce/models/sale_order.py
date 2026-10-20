from odoo import api, fields, models
from odoo.exceptions import UserError


class SaleOrder(models.Model):
    _inherit = "sale.order"

    x_ecommerce = fields.Boolean(
        string="Pedido web",
        copy=False,
        readonly=True,
        help="Pedido creado desde el checkout de la tienda Wix.",
    )
    x_quote_request = fields.Boolean(
        string="Cotización web",
        copy=False,
        readonly=True,
        help="Cotización solicitada desde la tienda Wix.",
    )
    x_wix_order_id = fields.Char(
        string="ID de pedido Wix",
        copy=False,
        index=True,
        readonly=True,
        help="Identificador único del pedido en Wix. Se usa para idempotencia.",
    )
    x_wix_order_number = fields.Char(
        string="Número de pedido Wix",
        copy=False,
        readonly=True,
    )
    x_channel = fields.Selection(
        selection=[
            ("wix", "Wix"),
            ("manual", "Manual"),
        ],
        string="Canal",
        default="manual",
        readonly=True,
    )
    x_web_stage = fields.Selection(
        selection=[
            ("quotation", "Cotización"),
            ("confirmed", "Confirmado"),
            ("preparing", "En preparación"),
            ("delivered", "Entregado"),
            ("invoiced", "Facturado"),
            ("paid", "Pagado"),
            ("cancelled", "Cancelado"),
        ],
        string="Estado web",
        compute="_compute_x_web_stage",
        help="Estado consolidado que se muestra en el portal del cliente.",
    )

    def init(self):
        # Evita pedidos duplicados si Wix reintenta un evento.
        self.env.cr.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS sale_order_x_wix_order_id_uniq
                ON sale_order (x_wix_order_id)
             WHERE x_wix_order_id IS NOT NULL
            """
        )

    @api.depends(
        "state",
        "picking_ids.state",
        "invoice_ids.state",
        "invoice_ids.payment_state",
    )
    def _compute_x_web_stage(self):
        for order in self:
            if order.state == "cancel":
                order.x_web_stage = "cancelled"
                continue

            posted_invoices = order.invoice_ids.filtered(
                lambda inv: inv.state == "posted" and inv.move_type == "out_invoice"
            )
            if posted_invoices:
                if all(
                    inv.payment_state in ("paid", "in_payment")
                    for inv in posted_invoices
                ):
                    order.x_web_stage = "paid"
                else:
                    order.x_web_stage = "invoiced"
                continue

            pickings = order.picking_ids.filtered(
                lambda p: p.picking_type_id.code == "outgoing"
            )
            if pickings and all(p.state == "done" for p in pickings):
                order.x_web_stage = "delivered"
            elif pickings:
                order.x_web_stage = "preparing"
            elif order.state == "sale":
                order.x_web_stage = "confirmed"
            else:
                order.x_web_stage = "quotation"

    def _web_get_stage(self, sequence):
        stage = self.env["crm.stage"].search([("sequence", "=", sequence)], limit=1)
        return stage

    def _web_create_opportunity(self, won=False):
        """Crea (o reutiliza) la oportunidad CRM vinculada al pedido."""
        self.ensure_one()
        if self.opportunity_id:
            lead = self.opportunity_id
        else:
            lead = self.env["crm.lead"].sudo().create(
                {
                    "name": "Web: %s - %s" % (self.name, self.partner_id.name or "Cliente"),
                    "type": "opportunity",
                    "partner_id": self.partner_id.id,
                    "expected_revenue": self.amount_total,
                    "description": (
                        "<p>Oportunidad generada automáticamente desde la tienda "
                        "Trebol4Devop.</p><p>Pedido: <b>%s</b></p>" % self.name
                    ),
                }
            )
            self.sudo().write({"opportunity_id": lead.id})

        stage = self.env["crm.stage"].search(
            [("is_won", "=", True)], limit=1
        ) if won else self._web_get_stage(3)
        if stage:
            lead.sudo().write({"stage_id": stage.id})

        lead.sudo().message_post(
            body=(
                "<p>Pedido web <b>%s</b> por <b>%s %s</b>.</p>"
                % (self.name, self.currency_id.symbol, "{:,.2f}".format(self.amount_total))
            )
        )
        return lead

    def _web_validate_delivery(self):
        """Valida las entregas del pedido para reflejar la salida de inventario.

        En Trebol4Devop los servicios se entregan de forma inmediata, por lo
        que la entrega se marca como realizada al confirmar la venta. Si la
        validación falla, el pedido sigue operativo y se registra la nota.
        """
        for order in self:
            for picking in order.picking_ids.filtered(
                lambda p: p.state not in ("done", "cancel")
            ):
                try:
                    picking.action_assign()
                    for move in picking.move_ids_without_package:
                        move.quantity_done = move.product_uom_qty
                    picking._action_done()
                    if picking.state == "done":
                        order.message_post(
                            body="<p>Entrega validada automáticamente: %s.</p>"
                            % picking.name
                        )
                    else:
                        order.message_post(
                            body=(
                                "<p>La entrega %s quedó en estado %s.</p>"
                                % (picking.name, picking.state)
                            )
                        )
                except Exception as error:  # noqa: BLE001
                    order.message_post(
                        body=(
                            "<p>No se pudo validar la entrega %s: %s</p>"
                            % (picking.name, error)
                        )
                    )

    def action_web_confirm_and_invoice(self):
        """Confirma el pedido, factura y marca la oportunidad como ganada.

        Es idempotente: si el pedido ya está confirmado no vuelve a confirmarlo
        y si ya existe una factura publicada no genera otra.
        """
        result = []
        for order in self:
            if order.x_wix_order_id or order.x_ecommerce:
                order.write({"x_channel": "wix", "x_ecommerce": True})
            if order.x_quote_request:
                # Una cotización aceptada pasa a ser un pedido de e-commerce.
                order.write({"x_ecommerce": True})
            if order.state in ("draft", "sent"):
                order.action_confirm()

            invoices = order.invoice_ids.filtered(
                lambda inv: inv.state == "posted" and inv.move_type == "out_invoice"
            )
            if not invoices:
                invoices = order._create_invoices()
                for invoice in invoices:
                    if invoice.state == "draft":
                        invoice.action_post()

            order._web_create_opportunity(won=True)
            order._web_validate_delivery()

            order.message_post(
                body=(
                    "<p>Pedido confirmado y facturado desde la tienda web.</p>"
                    "<p>Factura(s): %s</p>"
                    % ", ".join(invoices.mapped("name"))
                )
            )

            result.append(
                {
                    "order_id": order.id,
                    "order_name": order.name,
                    "invoice_ids": invoices.ids,
                    "invoice_names": invoices.mapped("name"),
                    "amount_total": order.amount_total,
                    "state": order.state,
                }
            )
        return result

    def action_web_create_quote_opportunity(self):
        """Crea la oportunidad de una cotización solicitada desde la web."""
        result = []
        for order in self:
            if order.x_wix_order_id or order.x_ecommerce:
                order.write({"x_channel": "wix"})
            lead = order._web_create_opportunity(won=False)
            order.message_post(
                body="<p>Cotización solicitada desde la tienda web.</p>"
            )
            result.append(
                {
                    "order_id": order.id,
                    "order_name": order.name,
                    "lead_id": lead.id,
                    "lead_name": lead.name,
                }
            )
        return result

    def action_web_register_payment(self):
        """Registra el pago de las facturas publicadas del pedido.

        Se usa cuando Wix confirma el pago (o cuando se simula el pago en el
        entorno académico). Es idempotente: ignora facturas ya pagadas.
        """
        result = []
        for order in self:
            invoices = order.invoice_ids.filtered(
                lambda inv: inv.state == "posted"
                and inv.move_type == "out_invoice"
                and inv.payment_state not in ("paid", "in_payment")
            )
            if not invoices:
                result.append(
                    {
                        "order_id": order.id,
                        "order_name": order.name,
                        "payments": [],
                        "message": "Sin facturas pendientes de pago.",
                    }
                )
                continue

            journal = self.env["account.journal"].search(
                [
                    ("type", "=", "bank"),
                    ("company_id", "=", order.company_id.id),
                ],
                limit=1,
            )
            if not journal:
                raise UserError(
                    "No existe un diario bancario configurado para registrar el pago."
                )

            wizard = (
                self.env["account.payment.register"]
                .with_context(
                    active_model="account.move",
                    active_ids=invoices.ids,
                )
                .create(
                    {
                        "journal_id": journal.id,
                        "payment_date": fields.Date.context_today(self),
                    }
                )
            )
            payments = wizard._create_payments()

            order.message_post(
                body=(
                    "<p>Pago registrado automáticamente desde la tienda Wix.</p>"
                    "<p>Factura(s): %s</p>"
                    % ", ".join(invoices.mapped("name"))
                )
            )
            result.append(
                {
                    "order_id": order.id,
                    "order_name": order.name,
                    "payment_ids": payments.ids,
                    "invoice_names": invoices.mapped("name"),
                    "payment_state": invoices[0].payment_state,
                }
            )
        return result

    def action_web_cancel(self):
        """Cancela el pedido cuando Wix reporta la cancelación."""
        result = []
        for order in self:
            if order.state not in ("cancel",):
                order.action_cancel()
                order.message_post(
                    body="<p>Pedido cancelado desde la tienda Wix.</p>"
                )
            result.append({"order_id": order.id, "state": order.state})
        return result

