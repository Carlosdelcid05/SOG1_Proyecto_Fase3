import crypto from "node:crypto";
import { executeKw } from "./client.js";

export type AppointmentInput = {
  name: string;
  email: string;
  phone: string;
  company?: string;
  date: string;
  time: string;
  reason: string;
  notes?: string;
};

export type AppointmentResult = {
  leadId: number;
  leadName: string;
  reference: string;
};

type OdooAppointmentResponse = {
  lead_id: number;
  lead_name: string;
  reference: string;
};

/**
 * Registra o recupera una cita en Odoo (crm.lead) de manera idempotente.
 */
export async function createAppointment(
  input: AppointmentInput,
): Promise<AppointmentResult> {
  const normEmail = input.email.trim().toLowerCase();
  const normDate = input.date.trim();
  const normTime = input.time.trim();
  const normReason = input.reason.trim().toLowerCase();

  const hash = crypto
    .createHash("sha256")
    .update(`${normEmail}|${normDate}|${normTime}|${normReason}`)
    .digest("hex")
    .slice(0, 12);
  const reference = `APT-${hash}`;

  const payload = {
    name: input.name.trim(),
    email: normEmail,
    phone: input.phone.trim(),
    company: input.company?.trim() || "",
    date: normDate,
    time: normTime,
    reason: input.reason.trim(),
    notes: input.notes?.trim() || "",
    reference,
  };

  const res = await executeKw<
    OdooAppointmentResponse | OdooAppointmentResponse[]
  >("crm.lead", "action_web_create_appointment", [payload]);

  const record = Array.isArray(res) ? res[0] : res;
  if (!record || !record.lead_id) {
    throw new Error("No se pudo registrar la cita en Odoo");
  }

  return {
    leadId: record.lead_id,
    leadName: record.lead_name,
    reference: record.reference || reference,
  };
}
