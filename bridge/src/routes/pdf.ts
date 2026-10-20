import { Router, type Request } from "express";
import { asyncHandler } from "../async-handler.js";
import { assertInvoiceOwnership, assertOrderOwnership } from "../odoo/access.js";
import { fetchPdf, verifyPdfToken } from "../odoo/pdf.js";

export const pdfRouter = Router();

function tokenOf(req: Request): string {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) {
    const error = new Error("Falta el token del PDF");
    (error as Error & { status?: number }).status = 401;
    throw error;
  }
  return token;
}

pdfRouter.get(
  "/order/:id",
  asyncHandler(async (req, res) => {
    const token = verifyPdfToken(tokenOf(req));
    const id = Number(req.params.id);
    if (token.type !== "order" || token.recordId !== id) {
      res.status(403).json({ ok: false, error: "El token no corresponde al pedido" });
      return;
    }
    await assertOrderOwnership(id, token.email);
    const pdf = await fetchPdf("sale.report_saleorder", id);
    res.setHeader("Content-Type", pdf.contentType);
    res.setHeader("Content-Disposition", `inline; filename="pedido-${id}.pdf"`);
    res.send(pdf.buffer);
  }),
);

pdfRouter.get(
  "/invoice/:id",
  asyncHandler(async (req, res) => {
    const token = verifyPdfToken(tokenOf(req));
    const id = Number(req.params.id);
    if (token.type !== "invoice" || token.recordId !== id) {
      res.status(403).json({ ok: false, error: "El token no corresponde a la factura" });
      return;
    }
    await assertInvoiceOwnership(id, token.email);
    const pdf = await fetchPdf("account.report_invoice", id);
    res.setHeader("Content-Type", pdf.contentType);
    res.setHeader("Content-Disposition", `inline; filename="factura-${id}.pdf"`);
    res.send(pdf.buffer);
  }),
);
