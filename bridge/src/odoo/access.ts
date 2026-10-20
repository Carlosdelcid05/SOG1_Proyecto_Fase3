import { searchCount } from "./client.js";
import {
  commercialPartnerId,
  findPartnerByEmail,
  type OdooPartner,
} from "./partners.js";

export class AccessError extends Error {
  readonly status = 403;
  constructor(message = "No tiene acceso a este documento") {
    super(message);
    this.name = "AccessError";
  }
}

export class NotFoundError extends Error {
  readonly status = 404;
  constructor(message = "Documento no encontrado") {
    super(message);
    this.name = "NotFoundError";
  }
}

export async function getPartnerOrThrow(email: string): Promise<OdooPartner> {
  if (!email) throw new AccessError("Falta el correo del miembro");
  const partner = await findPartnerByEmail(email);
  if (!partner) throw new NotFoundError("No existe un cliente con ese correo");
  return partner;
}

export async function assertOrderOwnership(
  orderId: number,
  email: string,
): Promise<OdooPartner> {
  const partner = await getPartnerOrThrow(email);
  const commercialId = commercialPartnerId(partner);
  const count = await searchCount("sale.order", [
    ["id", "=", orderId],
    ["partner_id.commercial_partner_id", "=", commercialId],
  ]);
  if (!count) throw new AccessError("El pedido no pertenece a este cliente");
  return partner;
}

export async function assertInvoiceOwnership(
  invoiceId: number,
  email: string,
): Promise<OdooPartner> {
  const partner = await getPartnerOrThrow(email);
  const commercialId = commercialPartnerId(partner);
  const count = await searchCount("account.move", [
    ["id", "=", invoiceId],
    ["partner_id.commercial_partner_id", "=", commercialId],
    ["move_type", "=", "out_invoice"],
  ]);
  if (!count) throw new AccessError("La factura no pertenece a este cliente");
  return partner;
}
