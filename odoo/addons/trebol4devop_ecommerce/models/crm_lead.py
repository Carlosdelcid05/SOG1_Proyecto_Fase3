from odoo import api, fields, models
from odoo.exceptions import UserError


class CrmLead(models.Model):
    _inherit = "crm.lead"

    x_appointment_ref = fields.Char(
        string="Referencia de cita web",
        copy=False,
        index=True,
        readonly=True,
        help="Identificador único para idempotencia de citas agendadas desde la web.",
    )

    def init(self):
        self.env.cr.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS crm_lead_x_appointment_ref_uniq
                ON crm_lead (x_appointment_ref)
             WHERE x_appointment_ref IS NOT NULL
            """
        )

    @api.model
    def action_web_create_appointment(self, payload):
        """Crea o reutiliza una oportunidad CRM originada desde el agendamiento web.

        Es idempotente mediante x_appointment_ref.
        """
        if not isinstance(payload, dict):
            raise UserError("El payload de la cita debe ser un objeto válido.")

        ref = payload.get("reference")
        if not ref:
            raise UserError("La cita no incluye una referencia válida.")

        existing = self.search([("x_appointment_ref", "=", ref)], limit=1)
        if existing:
            return {
                "lead_id": existing.id,
                "lead_name": existing.name,
                "reference": ref,
            }

        name = "Cita: %s - %s" % (
            payload.get("reason", "Consulta"),
            payload.get("name", "Cliente"),
        )
        description = (
            "<p><b>Cita agendada desde la web</b></p>"
            "<ul>"
            "<li><b>Cliente:</b> %s</li>"
            "<li><b>Correo:</b> %s</li>"
            "<li><b>Teléfono:</b> %s</li>"
            "<li><b>Empresa:</b> %s</li>"
            "<li><b>Fecha:</b> %s</li>"
            "<li><b>Hora:</b> %s</li>"
            "<li><b>Motivo:</b> %s</li>"
            "<li><b>Notas adicionales:</b> %s</li>"
            "</ul>"
            % (
                payload.get("name", ""),
                payload.get("email", ""),
                payload.get("phone", ""),
                payload.get("company", "") or "No especificada",
                payload.get("date", ""),
                payload.get("time", ""),
                payload.get("reason", ""),
                payload.get("notes", "") or "Ninguna",
            )
        )

        vals = {
            "name": name,
            "type": "opportunity",
            "contact_name": payload.get("name", ""),
            "email_from": payload.get("email", ""),
            "phone": payload.get("phone", ""),
            "partner_name": payload.get("company", "") or False,
            "description": description,
            "x_appointment_ref": ref,
        }

        email = (payload.get("email") or "").strip().lower()
        if email:
            partner = self.env["res.partner"].search(
                [("email", "=ilike", email)], limit=1
            )
            if partner:
                vals["partner_id"] = partner.id

        try:
            lead = self.create(vals)
        except Exception:
            existing = self.search([("x_appointment_ref", "=", ref)], limit=1)
            if existing:
                return {
                    "lead_id": existing.id,
                    "lead_name": existing.name,
                    "reference": ref,
                }
            raise

        lead.message_post(
            body=(
                "<p>Cita agendada para el <b>%s</b> a las <b>%s</b>.</p>"
                "<p><b>Motivo:</b> %s</p>"
                % (
                    payload.get("date", ""),
                    payload.get("time", ""),
                    payload.get("reason", ""),
                )
            )
        )

        return {
            "lead_id": lead.id,
            "lead_name": lead.name,
            "reference": ref,
        }
