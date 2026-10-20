import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../async-handler.js";
import { signPortalToken } from "../auth.js";
import { config } from "../config.js";
import { searchRead } from "../odoo/client.js";
import { createCheckoutOrder } from "../odoo/orders.js";
import { signPdfToken } from "../odoo/pdf.js";

export const checkoutRouter = Router();

type ProductRow = {
  id: number;
  name: string;
  default_code: string;
  list_price: number;
  qty_available: number;
  categ_id: [number, string] | false;
  description_sale: string | false;
};

function baseUrl(req: Request): string {
  const proto = req.header("x-forwarded-proto") ?? req.protocol;
  const host = req.header("x-forwarded-host") ?? req.get("host");
  return host ? `${proto}://${host}` : config.publicUrl;
}

// Límite simple en memoria para evitar que el checkout público llene Odoo de
// pedidos basura. En producción se reemplaza por un rate limiter distribuido.
const buckets = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 30;

function clientIp(req: Request): string {
  const forwarded = req.header("x-forwarded-for") ?? "";
  return (
    forwarded.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "desconocido"
  );
}

function checkoutRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const ip = clientIp(req);
  const now = Date.now();
  const recent = (buckets.get(ip) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    res.status(429).json({
      ok: false,
      error: "Demasiadas solicitudes. Intenta de nuevo en unos minutos.",
    });
    return;
  }
  recent.push(now);
  buckets.set(ip, recent);
  next();
}

checkoutRouter.get("/config", (_req, res) => {
  res.json({
    ok: true,
    data: {
      storeName: "Trebol4Devop",
      currency: "GTQ",
      taxRate: 0.12,
      demoMode: config.demoMode,
      freeShipping: true,
      bank: {
        name: "Banco Industrial",
        accountName: "Trebol4Devop S.A.",
        accountNumber: "000-000000-0",
        instructions:
          "Realiza una transferencia bancaria y envía el comprobante a pagos@trebol4devop.com indicando tu número de pedido.",
      },
      contact: {
        email: "pagos@trebol4devop.com",
        whatsapp: "+502 2300-0000",
      },
    },
  });
});

checkoutRouter.get(
  "/products",
  asyncHandler(async (req, res) => {
    const products = await searchRead<ProductRow>(
      "product.product",
      [
        ["sale_ok", "=", true],
        ["active", "=", true],
        ["default_code", "!=", false],
      ],
      [
        "id",
        "name",
        "default_code",
        "list_price",
        "qty_available",
        "categ_id",
        "description_sale",
      ],
      { order: "default_code asc", limit: 200 },
    );

    const host = baseUrl(req);
    res.json({
      ok: true,
      data: products.map((product) => ({
        sku: product.default_code,
        name: product.name,
        price: product.list_price,
        stock: Math.max(0, Math.floor(product.qty_available)),
        category: product.categ_id ? product.categ_id[1] : "Servicios",
        description: product.description_sale || "",
        image: `${host}/assets/products/${encodeURIComponent(product.default_code)}.png`,
      })),
    });
  }),
);

const orderSchema = z.object({
  checkoutId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{8,80}$/, "Identificador de checkout inválido"),
  customer: z.object({
    name: z.string().trim().min(2).max(160),
    email: z.string().trim().email().max(160),
    company: z.string().trim().max(160).optional(),
    vat: z.string().trim().max(40).optional(),
    phone: z.string().trim().min(6).max(40),
    street: z.string().trim().max(200).optional(),
    city: z.string().trim().max(120).optional(),
  }),
  items: z
    .array(
      z.object({
        sku: z.string().trim().min(1).max(60),
        quantity: z.number().int().positive().max(999),
      }),
    )
    .min(1)
    .max(50),
  paymentMethod: z.enum(["simulated", "transfer"]),
  notes: z.string().trim().max(2000).optional(),
});

checkoutRouter.post(
  "/orders",
  checkoutRateLimit,
  asyncHandler(async (req, res) => {
    const input = orderSchema.parse(req.body);

    if (input.paymentMethod === "simulated" && !config.demoMode) {
      res.status(403).json({
        ok: false,
        error:
          "El pago simulado está deshabilitado. Selecciona transferencia bancaria.",
      });
      return;
    }

    const result = await createCheckoutOrder({
      checkoutId: input.checkoutId,
      customer: input.customer,
      items: input.items,
      paymentMethod: input.paymentMethod,
      notes: input.notes,
    });

    const email = input.customer.email.trim().toLowerCase();
    const host = baseUrl(req);

    res.status(result.replayed ? 200 : 201).json({
      ok: true,
      data: {
        ...result,
        paymentMethod: input.paymentMethod,
        portalUrl: `${host}/portal?token=${encodeURIComponent(
          signPortalToken(email),
        )}`,
        orderPdfUrl: `${host}/api/pdf/order/${result.orderId}?token=${encodeURIComponent(
          signPdfToken("order", result.orderId, email),
        )}`,
        invoices: result.invoices.map((invoice) => ({
          ...invoice,
          pdfUrl: `${host}/api/pdf/invoice/${invoice.id}?token=${encodeURIComponent(
            signPdfToken("invoice", invoice.id, email),
          )}`,
        })),
      },
    });
  }),
);
