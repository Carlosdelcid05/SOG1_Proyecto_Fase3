import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../async-handler.js";
import { requireMember, type AuthedRequest } from "../auth.js";
import { config } from "../config.js";
import {
  getInvoiceDetail,
  getOrderDetail,
  getProfile,
  getQuoteDetail,
  getSummary,
  listInvoices,
  listOrders,
  listQuotes,
  updateProfile,
} from "../odoo/portal.js";
import { acceptQuote, simulatePayment } from "../odoo/orders.js";
import {
  assertInvoiceOwnership,
  assertOrderOwnership,
  getPartnerOrThrow,
} from "../odoo/access.js";
import { signPdfToken } from "../odoo/pdf.js";
import { signPortalToken } from "../auth.js";

export const portalRouter = Router();

const loginAttempts = new Map<string, number[]>();
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX = 40;

function loginRateLimit(req: Request, res: Response, next: () => void): void {
  const ip =
    (req.header("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "desconocido";
  const now = Date.now();
  const recent = (loginAttempts.get(ip) ?? []).filter(
    (time) => now - time < LOGIN_WINDOW_MS,
  );
  if (recent.length >= LOGIN_MAX) {
    res.status(429).json({
      ok: false,
      error: "Demasiados intentos. Espera unos minutos.",
    });
    return;
  }
  recent.push(now);
  loginAttempts.set(ip, recent);
  next();
}

const loginSchema = z.object({
  email: z.string().trim().email().max(160),
  code: z.string().trim().min(1).max(120),
});

/**
 * Acceso al portal propio. El código es una medida simple para la demo
 * académica; en producción se reemplaza por Wix Members o un proveedor SSO.
 */
portalRouter.post(
  "/login",
  loginRateLimit,
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body ?? {});
    if (input.code !== config.portalAccessCode) {
      res.status(401).json({ ok: false, error: "Código de acceso incorrecto" });
      return;
    }

    const partner = await getPartnerOrThrow(input.email);
    const token = signPortalToken(partner.email || input.email);
    res.json({
      ok: true,
      data: {
        token,
        email: partner.email || input.email,
        name: partner.name,
        expiresIn: 7 * 24 * 60 * 60,
      },
    });
  }),
);

portalRouter.use(requireMember);

function emailOf(req: Request): string {
  return (req as AuthedRequest).memberEmail as string;
}

function idOf(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error("ID inválido");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  return id;
}

function baseUrl(req: Request): string {
  const proto = req.header("x-forwarded-proto") ?? req.protocol;
  const host = req.header("x-forwarded-host") ?? req.get("host");
  return host ? `${proto}://${host}` : config.publicUrl;
}

portalRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    res.json({ ok: true, data: await getSummary(emailOf(req)) });
  }),
);

portalRouter.get(
  "/quotes",
  asyncHandler(async (req, res) => {
    res.json({ ok: true, data: await listQuotes(emailOf(req)) });
  }),
);

portalRouter.get(
  "/quotes/:id",
  asyncHandler(async (req, res) => {
    res.json({
      ok: true,
      data: await getQuoteDetail(idOf(req), emailOf(req)),
    });
  }),
);

portalRouter.post(
  "/quotes/:id/accept",
  asyncHandler(async (req, res) => {
    res.json({
      ok: true,
      data: await acceptQuote(idOf(req), emailOf(req)),
    });
  }),
);

portalRouter.get(
  "/orders",
  asyncHandler(async (req, res) => {
    res.json({ ok: true, data: await listOrders(emailOf(req)) });
  }),
);

portalRouter.get(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    res.json({
      ok: true,
      data: await getOrderDetail(idOf(req), emailOf(req)),
    });
  }),
);

portalRouter.post(
  "/orders/:id/simulate-payment",
  asyncHandler(async (req, res) => {
    if (!config.demoMode) {
      res.status(403).json({
        ok: false,
        error: "El pago simulado está deshabilitado en este entorno",
      });
      return;
    }
    res.json({
      ok: true,
      data: await simulatePayment(idOf(req), emailOf(req)),
    });
  }),
);

portalRouter.get(
  "/invoices",
  asyncHandler(async (req, res) => {
    res.json({ ok: true, data: await listInvoices(emailOf(req)) });
  }),
);

portalRouter.get(
  "/invoices/:id",
  asyncHandler(async (req, res) => {
    res.json({
      ok: true,
      data: await getInvoiceDetail(idOf(req), emailOf(req)),
    });
  }),
);

portalRouter.get(
  "/profile",
  asyncHandler(async (req, res) => {
    res.json({ ok: true, data: await getProfile(emailOf(req)) });
  }),
);

const profileSchema = z.object({
  name: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
  vat: z.string().trim().max(40).optional(),
  street: z.string().trim().max(200).optional(),
  city: z.string().trim().max(120).optional(),
});

portalRouter.put(
  "/profile",
  asyncHandler(async (req, res) => {
    const input = profileSchema.parse(req.body ?? {});
    res.json({ ok: true, data: await updateProfile(emailOf(req), input) });
  }),
);

const pdfSchema = z.object({
  type: z.enum(["order", "invoice"]),
  id: z.number().int().positive(),
});

portalRouter.post(
  "/pdf-token",
  asyncHandler(async (req, res) => {
    const input = pdfSchema.parse(req.body);
    if (input.type === "order") {
      await assertOrderOwnership(input.id, emailOf(req));
    } else {
      await assertInvoiceOwnership(input.id, emailOf(req));
    }
    const token = signPdfToken(input.type, input.id, emailOf(req));
    res.json({
      ok: true,
      data: {
        url: `${baseUrl(req)}/api/pdf/${input.type}/${input.id}?token=${encodeURIComponent(token)}`,
        expiresIn: 600,
      },
    });
  }),
);
