import { create, executeKw, read, searchRead } from "./client.js";
import { assertOrderOwnership, NotFoundError } from "./access.js";
import { findOrCreatePartner, type PartnerInput } from "./partners.js";
import {
  normalizeWixOrder,
  type NormalizedWixOrder,
  type WixLine,
} from "../wix/normalize.js";

export type ProductRef = {
  id: number;
  name: string;
  default_code: string | false;
  list_price: number;
};

export type QuoteItem = { sku: string; quantity: number };

const productCache = new Map<string, ProductRef>();

export async function resolveProductBySku(sku: string): Promise<ProductRef> {
  const clean = sku.trim();
  if (!clean) throw new NotFoundError("El SKU del producto está vacío");

  const cached = productCache.get(`${clean}|`.toLowerCase());
  if (cached) return cached;

  const rows = await searchRead<ProductRef>(
    "product.product",
    [
      ["default_code", "=", clean],
      ["sale_ok", "=", true],
      ["active", "=", true],
    ],
    ["id", "name", "default_code", "list_price"],
    { limit: 1 },
  );

  if (!rows.length) {
    throw new NotFoundError(`No existe en Odoo el producto con SKU "${clean}"`);
  }

  productCache.set(`${clean}|`.toLowerCase(), rows[0]);
  return rows[0];
}

async function resolveProduct(line: WixLine): Promise<ProductRef> {
  const key = `${line.sku}|${line.name}`.toLowerCase();
  const cached = productCache.get(key);
  if (cached) return cached;

  let rows: ProductRef[] = [];
  if (line.sku) {
    rows = await searchRead<ProductRef>(
      "product.product",
      [["default_code", "=", line.sku]],
      ["id", "name", "default_code", "list_price"],
      { limit: 1 },
    );
  }

  if (!rows.length && line.name) {
    rows = await searchRead<ProductRef>(
      "product.product",
      [["name", "=ilike", line.name]],
      ["id", "name", "default_code", "list_price"],
      { limit: 1 },
    );
  }

  if (!rows.length) {
    throw new NotFoundError(
      `No existe en Odoo el producto con SKU "${line.sku}" ni nombre "${line.name}"`,
    );
  }

  productCache.set(key, rows[0]);
  return rows[0];
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildLineCommand(
  product: ProductRef,
  line: WixLine,
): [number, number, Record<string, unknown>] {
  const values: Record<string, unknown> = {
    product_id: product.id,
    product_uom_qty: Math.max(1, Math.round(line.quantity)),
    name: line.name || product.name,
  };

  // Si Wix aplicó un descuento o un precio distinto, lo respetamos.
  if (
    typeof line.price === "number" &&
    Math.abs(line.price - product.list_price) > 0.01
  ) {
    values.price_unit = line.price;
  }

  return [0, 0, values];
}

async function buildOrderLines(lines: WixLine[]) {
  if (!lines.length) {
    throw new Error("El pedido de Wix no contiene líneas válidas");
  }
  const commands: [number, number, Record<string, unknown>][] = [];
  for (const line of lines) {
    const product = await resolveProduct(line);
    commands.push(buildLineCommand(product, line));
  }
  return commands;
}

export async function findWixOrder(wixOrderId: string) {
  const rows = await searchRead<{
    id: number;
    name: string;
    state: string;
    x_web_stage: string;
  }>(
    "sale.order",
    [["x_wix_order_id", "=", wixOrderId]],
    ["id", "name", "state", "x_web_stage"],
    { limit: 1 },
  );
  return rows[0] ?? null;
}

async function confirmAndPay(orderId: number) {
  await executeKw("sale.order", "action_web_confirm_and_invoice", [[orderId]]);
  await executeKw("sale.order", "action_web_register_payment", [[orderId]]);
}

export async function createWixOrder(
  payload: unknown,
  options: { paid: boolean },
) {
  const order = normalizeWixOrder(payload);
  if (!order.id) {
    throw new Error("El evento de Wix no incluye el ID del pedido");
  }

  const existing = await findWixOrder(order.id);
  if (existing) {
    if (options.paid) {
      await confirmAndPay(existing.id);
    }
    return {
      created: false,
      orderId: existing.id,
      orderName: existing.name,
      wixOrderId: order.id,
      state: existing.state,
    };
  }

  const partner = await findOrCreatePartner({
    email: order.email,
    name: order.customerName,
    phone: order.phone,
    company: order.company,
    vat: order.vat,
    street: order.street,
    city: order.city,
  });

  const lines = await buildOrderLines(order.lines);

  let orderId: number;
  try {
    orderId = await create("sale.order", {
      partner_id: partner.id,
      order_line: lines,
      origin: `Wix ${order.number}`,
      client_order_ref: `WIX-${order.id}`,
      x_ecommerce: true,
      x_quote_request: false,
      x_wix_order_id: order.id,
      x_wix_order_number: order.number,
      x_channel: "wix",
      note: order.note ? `Nota del cliente: ${order.note}` : false,
    });
  } catch (error) {
    // Si otro evento creó el pedido al mismo tiempo, se reutiliza.
    const concurrent = await findWixOrder(order.id);
    if (concurrent) {
      return {
        created: false,
        orderId: concurrent.id,
        orderName: concurrent.name,
        wixOrderId: order.id,
        state: concurrent.state,
      };
    }
    throw error;
  }

  if (options.paid) {
    await confirmAndPay(orderId);
  } else {
    await executeKw("sale.order", "action_web_create_quote_opportunity", [
      [orderId],
    ]);
  }

  const created = await searchRead<{
    id: number;
    name: string;
    state: string;
    x_web_stage: string;
  }>(
    "sale.order",
    [["id", "=", orderId]],
    ["id", "name", "state", "x_web_stage"],
    { limit: 1 },
  );

  return {
    created: true,
    orderId,
    orderName: created[0]?.name,
    wixOrderId: order.id,
    state: created[0]?.state,
    stage: created[0]?.x_web_stage,
  };
}

export async function markWixOrderPaid(payload: unknown) {
  const order = normalizeWixOrder(payload);
  if (!order.id) throw new Error("El evento de Wix no incluye el ID del pedido");

  const existing = await findWixOrder(order.id);
  if (!existing) {
    return createWixOrder(payload, { paid: true });
  }

  await confirmAndPay(existing.id);
  return {
    orderId: existing.id,
    orderName: existing.name,
    wixOrderId: order.id,
    paid: true,
  };
}

export async function cancelWixOrder(payload: unknown) {
  const order = normalizeWixOrder(payload);
  if (!order.id) throw new Error("El evento de Wix no incluye el ID del pedido");

  const existing = await findWixOrder(order.id);
  if (!existing) {
    return { orderId: null, wixOrderId: order.id, cancelled: false };
  }

  await executeKw("sale.order", "action_web_cancel", [[existing.id]]);
  return {
    orderId: existing.id,
    orderName: existing.name,
    wixOrderId: order.id,
    cancelled: true,
  };
}

export type QuoteRequest = {
  email: string;
  name?: string;
  company?: string;
  vat?: string;
  phone?: string;
  street?: string;
  city?: string;
  notes?: string;
  items: QuoteItem[];
};

export async function createQuote(input: QuoteRequest) {
  if (!input.items?.length) {
    throw new Error("La cotización no contiene productos");
  }

  const partner = await findOrCreatePartner({
    email: input.email,
    name: input.name,
    phone: input.phone,
    company: input.company,
    vat: input.vat,
    street: input.street,
    city: input.city,
  });

  const lines = await buildOrderLines(
    input.items.map((item) => ({
      sku: item.sku,
      name: "",
      quantity: item.quantity,
    })),
  );

  const validity = new Date();
  validity.setDate(validity.getDate() + 15);

  const orderId = await create("sale.order", {
    partner_id: partner.id,
    order_line: lines,
    origin: "Cotización Wix",
    x_ecommerce: false,
    x_quote_request: true,
    x_channel: "wix",
    validity_date: formatDate(validity),
    note: input.notes ? `Solicitud del cliente: ${input.notes}` : false,
  });

  await executeKw("sale.order", "action_web_create_quote_opportunity", [[orderId]]);

  const created = await searchRead<{
    id: number;
    name: string;
    amount_total: number;
    state: string;
  }>(
    "sale.order",
    [["id", "=", orderId]],
    ["id", "name", "amount_total", "state"],
    { limit: 1 },
  );

  return {
    orderId,
    orderName: created[0]?.name,
    amountTotal: created[0]?.amount_total,
    state: created[0]?.state,
  };
}

export async function acceptQuote(orderId: number, email: string) {
  await assertOrderOwnership(orderId, email);
  await executeKw("sale.order", "action_web_confirm_and_invoice", [[orderId]]);

  const rows = await searchRead<{
    id: number;
    name: string;
    x_web_stage: string;
    invoice_ids: number[];
  }>(
    "sale.order",
    [["id", "=", orderId]],
    ["id", "name", "x_web_stage", "invoice_ids"],
    { limit: 1 },
  );

  return {
    orderId,
    orderName: rows[0]?.name,
    stage: rows[0]?.x_web_stage,
    invoiceIds: rows[0]?.invoice_ids ?? [],
  };
}

export async function simulatePayment(orderId: number, email: string) {
  await assertOrderOwnership(orderId, email);
  await executeKw("sale.order", "action_web_confirm_and_invoice", [[orderId]]);
  await executeKw("sale.order", "action_web_register_payment", [[orderId]]);

  const rows = await searchRead<{
    id: number;
    name: string;
    x_web_stage: string;
    invoice_ids: number[];
  }>(
    "sale.order",
    [["id", "=", orderId]],
    ["id", "name", "x_web_stage", "invoice_ids"],
    { limit: 1 },
  );

  return {
    orderId,
    orderName: rows[0]?.name,
    stage: rows[0]?.x_web_stage,
    invoiceIds: rows[0]?.invoice_ids ?? [],
    simulated: true,
  };
}

export type CheckoutPaymentMethod =
  | "simulated"
  | "transfer"
  | "contra_entrega";

export type CheckoutOrderInput = {
  checkoutId: string;
  customer: PartnerInput;
  items: QuoteItem[];
  paymentMethod: CheckoutPaymentMethod;
  notes?: string;
};

type CheckoutOrderRow = {
  id: number;
  name: string;
  state: string;
  x_web_stage: string | false;
  x_payment_method: string | false;
  amount_total: number;
  amount_tax: number;
  amount_untaxed: number;
  currency_id: [number, string] | false;
  invoice_ids: number[];
  partner_id: [number, string] | false;
};

type CheckoutInvoiceRow = {
  id: number;
  name: string;
  invoice_date: string | false;
  amount_total: number;
  amount_residual: number;
  payment_state: string;
  state: string;
};

function invoicePaymentLabel(paymentState: string): string {
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

export function paymentMethodLabel(
  method: string | false | undefined,
): string {
  const map: Record<string, string> = {
    simulated: "Pago simulado",
    transfer: "Transferencia bancaria",
    contra_entrega: "Pago contra entrega",
  };
  return (typeof method === "string" && map[method]) || "No especificado";
}

export function checkoutStageLabel(
  stage: string,
  paymentMethod?: string | false,
): string {
  if (stage === "paid") return "Pagado";
  if (stage === "invoiced") {
    if (paymentMethod === "contra_entrega") {
      return "Facturado · pago contra entrega";
    }
    if (paymentMethod === "transfer") {
      return "Facturado · transferencia pendiente";
    }
    return "Facturado";
  }
  const map: Record<string, string> = {
    quotation: "Pendiente de pago",
    confirmed: "Confirmado",
    preparing: "En preparación",
    delivered: "Entregado",
    invoiced: "Facturado",
    paid: "Pagado",
    cancelled: "Cancelado",
  };
  return map[stage] ?? stage;
}

async function buildCheckoutResult(orderId: number) {
  const rows = await read<CheckoutOrderRow>("sale.order", [orderId], [
    "id",
    "name",
    "state",
    "x_web_stage",
    "x_payment_method",
    "amount_total",
    "amount_tax",
    "amount_untaxed",
    "currency_id",
    "invoice_ids",
    "partner_id",
  ]);
  const order = rows[0];
  if (!order) throw new Error("No se pudo leer el pedido recién creado");

  const invoices = order.invoice_ids.length
    ? await read<CheckoutInvoiceRow>("account.move", order.invoice_ids, [
        "id",
        "name",
        "invoice_date",
        "amount_total",
        "amount_residual",
        "payment_state",
        "state",
      ])
    : [];

  let currencyCode = "GTQ";
  let currencySymbol = "Q";
  if (order.currency_id) {
    const currencies = await read<{ name: string; symbol: string }>(
      "res.currency",
      [order.currency_id[0]],
      ["name", "symbol"],
    );
    currencyCode = currencies[0]?.name ?? currencyCode;
    currencySymbol = currencies[0]?.symbol ?? currencySymbol;
  }

  let billing = {
    name: "",
    nit: "CF",
    address: "",
    city: "",
  };

  if (order.partner_id) {
    const partners = await read<{
      name: string;
      vat: string | false;
      street: string | false;
      city: string | false;
    }>("res.partner", [order.partner_id[0]], ["name", "vat", "street", "city"]);
    const p = partners[0];
    if (p) {
      billing = {
        name: p.name || "",
        nit: p.vat && p.vat.trim() ? p.vat.trim() : "CF",
        address: p.street || "",
        city: p.city || "",
      };
    }
  }

  const payMethod = (order.x_payment_method || undefined) as
    | CheckoutPaymentMethod
    | undefined;

  return {
    orderId: order.id,
    orderName: order.name,
    state: order.state,
    stage: order.x_web_stage || "confirmed",
    stageLabel: checkoutStageLabel(
      order.x_web_stage || "confirmed",
      order.x_payment_method,
    ),
    paymentMethod: payMethod,
    paymentMethodLabel: paymentMethodLabel(order.x_payment_method),
    amountTotal: order.amount_total,
    amountTax: order.amount_tax,
    amountUntaxed: order.amount_untaxed,
    currency: currencyCode,
    currencySymbol,
    billing,
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      name: invoice.name,
      date: invoice.invoice_date,
      total: invoice.amount_total,
      residual: invoice.amount_residual,
      paymentState: invoice.payment_state,
      status: invoicePaymentLabel(invoice.payment_state),
      paid: ["paid", "in_payment"].includes(invoice.payment_state),
    })),
  };
}

/**
 * Crea un pedido desde el checkout propio (carrito de Wix + página /checkout).
 *
 * El checkout vive fuera de Wix para no depender del plan Premium. Odoo sigue
 * siendo la fuente de verdad: aquí se crea el sale.order, se confirma, se
 * factura y, si el modo demo está activo, se registra el pago simulado.
 */
export async function createCheckoutOrder(input: CheckoutOrderInput) {
  if (!input.items?.length) {
    throw new Error("El carrito está vacío");
  }

  const reference = `WEB-${input.checkoutId}`;
  const email = input.customer.email.trim().toLowerCase();

  const existingRows = await searchRead<{
    id: number;
    name: string;
    state: string;
    partner_id: [number, string] | false;
  }>(
    "sale.order",
    [["client_order_ref", "=", reference]],
    ["id", "name", "state", "partner_id"],
    { limit: 1 },
  );

  if (existingRows.length) {
    const existing = existingRows[0];
    if (existing.partner_id) {
      const partners = await read<{ email: string | false }>(
        "res.partner",
        [existing.partner_id[0]],
        ["email"],
      );
      if (
        String(partners[0]?.email || "").trim().toLowerCase() !== email
      ) {
        const conflict = new Error(
          "El identificador de checkout ya fue utilizado por otro correo",
        );
        (conflict as Error & { status?: number }).status = 409;
        throw conflict;
      }
    }

    // Si un intento anterior falló a mitad de camino, se completa sin duplicar.
    await executeKw("sale.order", "action_web_confirm_and_invoice", [
      [existing.id],
    ]);
    if (input.paymentMethod === "simulated") {
      await executeKw("sale.order", "action_web_register_payment", [
        [existing.id],
      ]);
    }

    return {
      replayed: true,
      ...(await buildCheckoutResult(existing.id)),
    };
  }

  const partner = await findOrCreatePartner({
    ...input.customer,
    email,
  });

  const lines = await buildOrderLines(
    input.items.map((item) => ({
      sku: item.sku,
      name: "",
      quantity: item.quantity,
    })),
  );

  const orderId = await create("sale.order", {
    partner_id: partner.id,
    order_line: lines,
    origin: "Checkout Wix (carrito propio)",
    client_order_ref: reference,
    x_ecommerce: true,
    x_quote_request: false,
    x_wix_order_number: reference,
    x_channel: "wix",
    x_payment_method: input.paymentMethod,
    note: input.notes ? `Nota del cliente: ${input.notes}` : false,
  });

  await executeKw("sale.order", "action_web_confirm_and_invoice", [[orderId]]);

  if (input.paymentMethod === "simulated") {
    await executeKw("sale.order", "action_web_register_payment", [[orderId]]);
  }

  return {
    replayed: false,
    ...(await buildCheckoutResult(orderId)),
  };
}

export type { NormalizedWixOrder };
