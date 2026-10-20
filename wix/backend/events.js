// backend/events.js
// Eventos de pedidos de Wix Stores / Wix eCommerce.
//
// Wix puede entregar el evento sin las líneas del pedido. Para los eventos
// legacy se enriquece el payload leyendo la colección Stores/Orders.
// También se registran los eventos nuevos de wix-ecom-backend; si ambos se
// disparan, el bridge es idempotente por x_wix_order_id.

import wixData from "wix-data";
import { callBridge } from "./bridge";

async function enrichLegacyOrder(event) {
  const orderId =
    event?.orderId || event?.data?.orderId || event?.data?.id || event?.id;

  if (!orderId) return event;

  try {
    const order = await wixData.get("Stores/Orders", orderId, {
      suppressAuth: true,
    });
    if (!order) return event;

    return {
      order: {
        ...order,
        ...event,
        id: orderId,
        lineItems: event.lineItems || order.lineItems || [],
      },
    };
  } catch (error) {
    console.error("[trebol] No se pudo leer Stores/Orders:", error.message);
    return event;
  }
}

async function forward(path, event) {
  try {
    const response = await callBridge(path, { body: event });
    console.log(`[trebol] ${path}`, JSON.stringify(response));
    return response;
  } catch (error) {
    console.error(`[trebol] Error en ${path}:`, error.message);
    throw error;
  }
}

// ── Eventos legacy de Wix Stores ─────────────────────────────────────
export async function wixStores_onNewOrder(event) {
  return forward("/api/wix/order-created", await enrichLegacyOrder(event));
}

export async function wixStores_onOrderPaid(event) {
  return forward("/api/wix/order-paid", await enrichLegacyOrder(event));
}

export async function wixStores_onOrderCanceled(event) {
  return forward("/api/wix/order-canceled", await enrichLegacyOrder(event));
}

// ── Eventos nuevos de Wix eCommerce ──────────────────────────────────
// Verifica los nombres exactos en Dev Mode → Events. Si tu sitio no los
// muestra, puedes eliminar este bloque y usar solo los eventos legacy.
export async function wixEcom_onOrderApproved(event) {
  return forward("/api/wix/order-created", event);
}

export async function wixEcom_onOrderTransactionsUpdated(event) {
  const status =
    event?.data?.paymentStatus ||
    event?.data?.order?.paymentStatus ||
    event?.paymentStatus;

  if (String(status).toUpperCase() !== "PAID") {
    console.log("[trebol] Transacción no pagada; se ignora.", status);
    return { ok: true, skipped: true };
  }

  return forward("/api/wix/order-paid", event);
}

export async function wixEcom_onOrderCanceled(event) {
  return forward("/api/wix/order-canceled", event);
}
