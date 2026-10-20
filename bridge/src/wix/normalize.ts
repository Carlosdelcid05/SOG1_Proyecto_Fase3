export type WixLine = {
  sku: string;
  name: string;
  quantity: number;
  price?: number;
};

export type NormalizedWixOrder = {
  id: string;
  number: string;
  email: string;
  customerName: string;
  phone?: string;
  company?: string;
  vat?: string;
  street?: string;
  city?: string;
  currency?: string;
  total?: number;
  note?: string;
  lines: WixLine[];
  raw: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" ? (value as Record<string, any>) : {};
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const parsed = typeof value === "string" ? Number(value) : value;
    if (typeof parsed === "number" && Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

/**
 * Wix puede entregar el pedido en varias formas:
 *  - { data: { order: {...} } }
 *  - { data: {...} }  (el pedido directo)
 *  - { order: {...} }
 *  - { ... }          (el pedido directo)
 */
export function extractWixOrder(body: unknown): Record<string, any> {
  const root = asRecord(body);
  const data = asRecord(root.data);
  return asRecord(data.order ?? root.order ?? data ?? root);
}

export function normalizeWixOrder(body: unknown): NormalizedWixOrder {
  const order = extractWixOrder(body);
  const buyer = asRecord(
    order.buyerInfo ?? order.billingInfo ?? order.contactDetails,
  );
  const shipping = asRecord(order.shippingInfo ?? order.shippingAddress);

  const rawLines = (order.lineItems ?? order.line_items ?? []) as any[];
  const lines: WixLine[] = rawLines
    .map((line) => {
      const item = asRecord(line);
      const catalog = asRecord(item.catalogReference);
      const options = asRecord(catalog.options);
      const product = asRecord(item.productName);
      const priceData = asRecord(item.priceData);

      const sku = firstString(
        item.sku,
        catalog.sku,
        options.sku,
        item.productId,
        item.catalogItemId,
      );
      const name = firstString(
        item.name,
        item.productName,
        product.original,
        product.translated,
        item.description,
      );
      const quantity = firstNumber(item.quantity, item.qty) ?? 1;
      const price = firstNumber(
        item.price,
        item.priceData?.price,
        priceData.price,
        item.unitPrice,
      );

      return { sku, name, quantity, price };
    })
    .filter((line) => line.sku || line.name);

  return {
    id: firstString(order.id, order._id, order.orderId, order.number),
    number: firstString(order.number, order.orderNumber, order.id),
    email: firstString(
      buyer.email,
      buyer.contactDetails?.email,
      order.email,
      order.customerEmail,
    ).toLowerCase(),
    customerName: firstString(
      buyer.name,
      [buyer.firstName, buyer.lastName].filter(Boolean).join(" "),
      buyer.contactDetails?.firstName
        ? `${buyer.contactDetails.firstName} ${buyer.contactDetails.lastName ?? ""}`
        : "",
      order.customerName,
      "Cliente Wix",
    ),
    phone: firstString(buyer.phone, buyer.contactDetails?.phones?.[0]) || undefined,
    company: firstString(buyer.company, buyer.companyName) || undefined,
    vat: firstString(buyer.vat, buyer.taxId, order.vat) || undefined,
    street: firstString(
      shipping.addressLine,
      shipping.addressLine1,
      buyer.address,
    ) || undefined,
    city: firstString(shipping.city, buyer.city) || undefined,
    currency: firstString(order.currency, order.currencyCode) || undefined,
    total: firstNumber(order.totals?.total, order.total, order.priceSummary?.total?.amount),
    note: firstString(order.buyerNote, order.note, order.customerNote) || undefined,
    lines,
    raw: order,
  };
}
