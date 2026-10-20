import { read, searchCount, searchRead, write } from "./client.js";
import {
  assertInvoiceOwnership,
  assertOrderOwnership,
  getPartnerOrThrow,
} from "./access.js";
import { commercialPartnerId, type OdooPartner } from "./partners.js";

type Many2One = [number, string] | false;

type SaleOrderRow = {
  id: number;
  name: string;
  date_order: string;
  validity_date: string | false;
  amount_total: number;
  state: string;
  x_web_stage: string | false;
  x_wix_order_number: string | false;
  invoice_ids: number[];
  picking_ids: number[];
  currency_id: Many2One;
};

type PickingRow = {
  id: number;
  name: string;
  state: string;
  picking_type_id: Many2One;
  scheduled_date: string | false;
};

type InvoiceRow = {
  id: number;
  name: string;
  invoice_date: string | false;
  invoice_date_due: string | false;
  amount_total: number;
  amount_residual: number;
  payment_state: string;
  state: string;
  currency_id: Many2One;
};

function money(value: number, symbol = "Q"): string {
  return `${symbol} ${value.toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

async function currencySymbol(): Promise<string> {
  const rows = await searchRead<{ currency_id: Many2One }>(
    "res.company",
    [],
    ["currency_id"],
    { limit: 1 },
  );
  if (rows[0]?.currency_id) {
    const currencies = await read<{ symbol: string }>(
      "res.currency",
      [rows[0].currency_id[0]],
      ["symbol"],
    );
    if (currencies[0]?.symbol) return currencies[0].symbol;
  }
  return "Q";
}

function orderStage(order: SaleOrderRow): string {
  const map: Record<string, string> = {
    quotation: "Pendiente de pago",
    confirmed: "Confirmado",
    preparing: "En preparación",
    delivered: "Entregado",
    invoiced: "Facturado",
    paid: "Pagado",
    cancelled: "Cancelado",
  };
  return map[String(order.x_web_stage)] ?? "Confirmado";
}

function invoiceStatus(paymentState: string): string {
  const map: Record<string, string> = {
    paid: "Pagada",
    in_payment: "En pago",
    partial: "Pago parcial",
    not_paid: "Pendiente",
    reversed: "Reversada",
    invoicing_legacy: "Histórica",
  };
  return map[paymentState] ?? paymentState;
}

async function pickingsById(ids: number[]): Promise<PickingRow[]> {
  if (!ids.length) return [];
  return read<PickingRow>("stock.picking", ids, [
    "id",
    "name",
    "state",
    "picking_type_id",
    "scheduled_date",
  ]);
}

async function invoicesById(ids: number[]): Promise<InvoiceRow[]> {
  if (!ids.length) return [];
  return read<InvoiceRow>("account.move", ids, [
    "id",
    "name",
    "invoice_date",
    "invoice_date_due",
    "amount_total",
    "amount_residual",
    "payment_state",
    "state",
    "currency_id",
  ]);
}

export async function getSummary(email: string) {
  const partner = await getPartnerOrThrow(email);
  const commercialId = commercialPartnerId(partner);
  const symbol = await currencySymbol();

  const [quoteCount, orderCount, invoices] = await Promise.all([
    searchCount("sale.order", [
      ["partner_id.commercial_partner_id", "=", commercialId],
      ["x_quote_request", "=", true],
      ["state", "in", ["draft", "sent"]],
    ]),
    searchCount("sale.order", [
      ["partner_id.commercial_partner_id", "=", commercialId],
      ["x_ecommerce", "=", true],
      ["state", "in", ["draft", "sent", "sale", "done"]],
    ]),
    searchRead<InvoiceRow>(
      "account.move",
      [
        ["partner_id.commercial_partner_id", "=", commercialId],
        ["move_type", "=", "out_invoice"],
        ["state", "=", "posted"],
      ],
      ["id", "amount_residual", "payment_state"],
    ),
  ]);

  const pending = invoices.filter(
    (invoice) => !["paid", "in_payment"].includes(invoice.payment_state),
  );
  const amountDue = pending.reduce(
    (total, invoice) => total + invoice.amount_residual,
    0,
  );

  return {
    customer: {
      id: partner.id,
      name: partner.name,
      email: partner.email || email,
      company: partner.is_company
        ? partner.name
        : partner.parent_id
          ? partner.parent_id[1]
          : null,
    },
    quotes: quoteCount,
    orders: orderCount,
    pendingInvoices: pending.length,
    amountDue,
    amountDueLabel: money(amountDue, symbol),
    currency: symbol,
    whatsapp: "+502 2300-0000",
  };
}

export async function listQuotes(email: string) {
  const partner = await getPartnerOrThrow(email);
  const commercialId = commercialPartnerId(partner);
  const symbol = await currencySymbol();

  const rows = await searchRead<SaleOrderRow>(
    "sale.order",
    [
      ["partner_id.commercial_partner_id", "=", commercialId],
      ["x_quote_request", "=", true],
      ["state", "in", ["draft", "sent", "sale", "cancel"]],
    ],
    [
      "id",
      "name",
      "date_order",
      "validity_date",
      "amount_total",
      "state",
      "x_web_stage",
      "currency_id",
    ],
    { order: "date_order desc", limit: 100 },
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    date: row.date_order,
    validUntil: row.validity_date,
    total: row.amount_total,
    totalLabel: money(row.amount_total, symbol),
    state: row.state === "sale" ? "Aprobada" : row.state === "cancel" ? "Cancelada" : "Pendiente",
    canAccept: ["draft", "sent"].includes(row.state),
  }));
}

export async function listOrders(email: string) {
  const partner = await getPartnerOrThrow(email);
  const commercialId = commercialPartnerId(partner);
  const symbol = await currencySymbol();

  const rows = await searchRead<SaleOrderRow>(
    "sale.order",
    [
      ["partner_id.commercial_partner_id", "=", commercialId],
      ["x_ecommerce", "=", true],
      ["state", "in", ["draft", "sent", "sale", "done"]],
    ],
    [
      "id",
      "name",
      "date_order",
      "amount_total",
      "state",
      "x_web_stage",
      "x_wix_order_number",
      "invoice_ids",
      "picking_ids",
      "currency_id",
    ],
    { order: "date_order desc", limit: 100 },
  );

  const pickings = await pickingsById(rows.flatMap((row) => row.picking_ids));
  const invoices = await invoicesById(rows.flatMap((row) => row.invoice_ids));
  const pickingMap = new Map(pickings.map((p) => [p.id, p]));
  const invoiceMap = new Map(invoices.map((i) => [i.id, i]));

  return rows.map((row) => {
    const rowPickings = row.picking_ids
      .map((id) => pickingMap.get(id))
      .filter(Boolean) as PickingRow[];
    const rowInvoices = row.invoice_ids
      .map((id) => invoiceMap.get(id))
      .filter(Boolean) as InvoiceRow[];

    return {
      id: row.id,
      name: row.name,
      wixNumber: row.x_wix_order_number || null,
      date: row.date_order,
      total: row.amount_total,
      totalLabel: money(row.amount_total, symbol),
      stage: orderStage(row),
      stageCode: row.x_web_stage || "confirmed",
      canSimulatePayment: !["paid", "cancelled"].includes(
        String(row.x_web_stage),
      ),
      delivery: rowPickings.map((p) => ({
        name: p.name,
        state: p.state,
      })),
      invoices: rowInvoices.map((invoice) => ({
        id: invoice.id,
        name: invoice.name,
        status: invoiceStatus(invoice.payment_state),
        amount: invoice.amount_total,
        amountLabel: money(invoice.amount_total, symbol),
      })),
    };
  });
}

export async function listInvoices(email: string) {
  const partner = await getPartnerOrThrow(email);
  const commercialId = commercialPartnerId(partner);
  const symbol = await currencySymbol();

  const rows = await searchRead<InvoiceRow>(
    "account.move",
    [
      ["partner_id.commercial_partner_id", "=", commercialId],
      ["move_type", "=", "out_invoice"],
      ["state", "=", "posted"],
    ],
    [
      "id",
      "name",
      "invoice_date",
      "invoice_date_due",
      "amount_total",
      "amount_residual",
      "payment_state",
      "state",
      "currency_id",
    ],
    { order: "invoice_date desc", limit: 100 },
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    date: row.invoice_date,
    dueDate: row.invoice_date_due,
    total: row.amount_total,
    totalLabel: money(row.amount_total, symbol),
    residual: row.amount_residual,
    residualLabel: money(row.amount_residual, symbol),
    status: invoiceStatus(row.payment_state),
    paymentState: row.payment_state,
    canPay: !["paid", "in_payment"].includes(row.payment_state),
  }));
}

export async function getQuoteDetail(orderId: number, email: string) {
  await assertOrderOwnership(orderId, email);
  const symbol = await currencySymbol();

  const orders = await read<SaleOrderRow & { order_line: number[]; note: string | false }>(
    "sale.order",
    [orderId],
    [
      "id",
      "name",
      "date_order",
      "validity_date",
      "amount_total",
      "state",
      "x_web_stage",
      "order_line",
      "note",
    ],
  );
  const order = orders[0];
  const lines = await read<{
    id: number;
    name: string;
    product_id: Many2One;
    product_uom_qty: number;
    price_unit: number;
    price_subtotal: number;
    price_total: number;
  }>("sale.order.line", order.order_line, [
    "id",
    "name",
    "product_id",
    "product_uom_qty",
    "price_unit",
    "price_subtotal",
    "price_total",
  ]);

  return {
    id: order.id,
    name: order.name,
    date: order.date_order,
    validUntil: order.validity_date,
    total: order.amount_total,
    totalLabel: money(order.amount_total, symbol),
    state: order.state,
    canAccept: ["draft", "sent"].includes(order.state),
    note: order.note || null,
    lines: lines.map((line) => ({
      name: line.name,
      quantity: line.product_uom_qty,
      unitPrice: line.price_unit,
      unitPriceLabel: money(line.price_unit, symbol),
      subtotal: line.price_subtotal,
      subtotalLabel: money(line.price_subtotal, symbol),
    })),
  };
}

export async function getOrderDetail(orderId: number, email: string) {
  const partner = await getPartnerOrThrow(email);
  await assertOrderOwnership(orderId, email);
  const symbol = await currencySymbol();
  const commercialId = commercialPartnerId(partner);

  const rows = await searchRead<SaleOrderRow & { order_line: number[] }>(
    "sale.order",
    [
      ["id", "=", orderId],
      ["partner_id.commercial_partner_id", "=", commercialId],
    ],
    [
      "id",
      "name",
      "date_order",
      "amount_total",
      "state",
      "x_web_stage",
      "x_wix_order_number",
      "invoice_ids",
      "picking_ids",
      "order_line",
    ],
    { limit: 1 },
  );
  const order = rows[0];
  const lines = await read<{
    id: number;
    name: string;
    product_uom_qty: number;
    price_unit: number;
    price_subtotal: number;
  }>("sale.order.line", order.order_line, [
    "id",
    "name",
    "product_uom_qty",
    "price_unit",
    "price_subtotal",
  ]);
  const pickings = await pickingsById(order.picking_ids);
  const invoices = await invoicesById(order.invoice_ids);

  return {
    id: order.id,
    name: order.name,
    wixNumber: order.x_wix_order_number || null,
    date: order.date_order,
    total: order.amount_total,
    totalLabel: money(order.amount_total, symbol),
    stage: orderStage(order),
    stageCode: order.x_web_stage || "confirmed",
    lines: lines.map((line) => ({
      name: line.name,
      quantity: line.product_uom_qty,
      unitPriceLabel: money(line.price_unit, symbol),
      subtotalLabel: money(line.price_subtotal, symbol),
    })),
    delivery: pickings.map((p) => ({
      name: p.name,
      state: p.state,
      scheduledDate: p.scheduled_date,
    })),
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      name: invoice.name,
      status: invoiceStatus(invoice.payment_state),
      amountLabel: money(invoice.amount_total, symbol),
    })),
    canSimulatePayment: [
      "quotation",
      "confirmed",
      "preparing",
      "delivered",
      "invoiced",
    ].includes(String(order.x_web_stage)),
  };
}

export async function getInvoiceDetail(invoiceId: number, email: string) {
  await assertInvoiceOwnership(invoiceId, email);
  const symbol = await currencySymbol();
  const rows = await read<InvoiceRow>(
    "account.move",
    [invoiceId],
    [
      "id",
      "name",
      "invoice_date",
      "invoice_date_due",
      "amount_total",
      "amount_residual",
      "payment_state",
      "state",
    ],
  );
  const invoice = rows[0];
  return {
    id: invoice.id,
    name: invoice.name,
    date: invoice.invoice_date,
    dueDate: invoice.invoice_date_due,
    total: invoice.amount_total,
    totalLabel: money(invoice.amount_total, symbol),
    residual: invoice.amount_residual,
    residualLabel: money(invoice.amount_residual, symbol),
    status: invoiceStatus(invoice.payment_state),
    paymentState: invoice.payment_state,
  };
}

export async function getProfile(email: string) {
  const partner = await getPartnerOrThrow(email);
  return {
    id: partner.id,
    name: partner.name,
    email: partner.email || email,
    phone: partner.phone || "",
    vat: partner.vat || "",
    street: partner.street || "",
    city: partner.city || "",
    isCompany: partner.is_company,
    company: partner.is_company
      ? partner.name
      : partner.parent_id
        ? partner.parent_id[1]
        : "",
  };
}

export async function updateProfile(
  email: string,
  input: Partial<{
    name: string;
    phone: string;
    vat: string;
    street: string;
    city: string;
  }>,
) {
  const partner = await getPartnerOrThrow(email);
  const values: Record<string, unknown> = {};
  if (input.name?.trim()) values.name = input.name.trim();
  if (input.phone !== undefined) values.phone = input.phone.trim();
  if (input.vat !== undefined) values.vat = input.vat.trim();
  if (input.street !== undefined) values.street = input.street.trim();
  if (input.city !== undefined) values.city = input.city.trim();

  if (Object.keys(values).length) {
    await write("res.partner", [partner.id], values);
  }

  return getProfile(email);
}

export type { OdooPartner };
