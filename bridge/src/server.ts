import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import pinoHttpImport from "pino-http";
import { ZodError } from "zod";
import { config } from "./config.js";
import { getUid, OdooError } from "./odoo/client.js";
import { requireBridgeKey } from "./auth.js";
import { wixRouter } from "./routes/wix.js";
import { portalRouter } from "./routes/portal.js";
import { pdfRouter } from "./routes/pdf.js";
import { catalogRouter } from "./routes/catalog.js";
import { checkoutRouter } from "./routes/checkout.js";

const app = express();

// pino-http usa export=; se normaliza para ESM + TypeScript.
const pinoHttp: any = (pinoHttpImport as any).default ?? pinoHttpImport;

app.disable("x-powered-by");
app.use(express.json({ limit: "4mb" }));
app.use(
  pinoHttp({
    level: process.env.LOG_LEVEL ?? "info",
    redact: {
      paths: [
        "req.headers['x-bridge-key']",
        "req.headers.authorization",
        "req.headers['x-member-email']",
      ],
      remove: true,
    },
  }),
);

app.get("/", (_req, res) => {
  res.json({
    name: "Trebol4Devop Wix Bridge",
    version: "1.0.0",
    endpoints: [
      "POST /api/wix/order-created",
      "POST /api/wix/order-paid",
      "POST /api/wix/order-canceled",
      "POST /api/wix/quote-request",
      "GET  /api/portal/summary",
      "GET  /api/portal/quotes",
      "GET  /api/portal/orders",
      "GET  /api/portal/invoices",
      "POST /api/portal/pdf-token",
      "GET  /checkout",
      "GET  /api/checkout/products",
      "POST /api/checkout/orders",
      "GET  /portal",
      "POST /api/portal/login",
    ],
  });
});

app.get("/health", async (_req, res) => {
  try {
    const uid = await getUid();
    res.json({ ok: true, odoo: "up", uid });
  } catch (error) {
    res.status(503).json({
      ok: false,
      odoo: "down",
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});

// Imágenes públicas SOLO para que Wix las descargue al importar el catálogo.
app.use(
  "/assets",
  express.static("/assets", {
    maxAge: "1h",
    fallthrough: true,
    index: false,
  }),
);

// Checkout público: no usa el checkout de Wix para poder operar en plan gratis.
app.get("/checkout", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "checkout.html"));
});
app.get("/checkout/", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "checkout.html"));
});
app.get("/portal", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "portal.html"));
});
app.get("/portal/", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "portal.html"));
});
app.use("/api/checkout", checkoutRouter);

app.use("/api/wix", requireBridgeKey, wixRouter);
app.use("/api/portal", portalRouter);
app.use("/api/catalog", requireBridgeKey, catalogRouter);
app.use("/api/pdf", pdfRouter);

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: "Ruta no encontrada" });
});

app.use(
  (error: unknown, req: Request, res: Response, _next: NextFunction): void => {
    const requestId = (req as Request & { id?: string }).id;

    if (error instanceof ZodError) {
      res.status(400).json({
        ok: false,
        error: "Datos inválidos",
        details: error.flatten(),
        requestId,
      });
      return;
    }

    const status =
      (error as Error & { status?: number }).status ??
      (error instanceof OdooError ? 502 : 500);

    const message =
      error instanceof Error ? error.message : "Error interno del bridge";

    req.log?.error({ err: error }, "Error procesando solicitud");

    res.status(status).json({
      ok: false,
      error: message,
      ...(config.demoMode && error instanceof OdooError && error.detail
        ? { detail: error.detail }
        : {}),
      requestId,
    });
  },
);

app.listen(config.port, "0.0.0.0", () => {
  console.log(
    `Trebol4Devop Wix Bridge escuchando en http://0.0.0.0:${config.port}`,
  );
  console.log(`Odoo: ${config.odooUrl} · DB: ${config.odooDb}`);
  console.log(`Modo demo: ${config.demoMode ? "activado" : "desactivado"}`);
});
