import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../async-handler.js";
import {
  cancelWixOrder,
  createQuote,
  createWixOrder,
  markWixOrderPaid,
} from "../odoo/orders.js";

export const wixRouter = Router();

wixRouter.post(
  "/order-created",
  asyncHandler(async (req, res) => {
    const result = await createWixOrder(req.body, { paid: false });
    res.json({ ok: true, ...result });
  }),
);

wixRouter.post(
  "/order-paid",
  asyncHandler(async (req, res) => {
    const result = await markWixOrderPaid(req.body);
    res.json({ ok: true, ...result });
  }),
);

wixRouter.post(
  "/order-canceled",
  asyncHandler(async (req, res) => {
    const result = await cancelWixOrder(req.body);
    res.json({ ok: true, ...result });
  }),
);

const quoteSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().max(160).optional(),
  company: z.string().trim().max(160).optional(),
  vat: z.string().trim().max(40).optional(),
  phone: z.string().trim().max(40).optional(),
  street: z.string().trim().max(200).optional(),
  city: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
  items: z
    .array(
      z.object({
        sku: z.string().trim().min(1),
        quantity: z.number().int().positive().max(999),
      }),
    )
    .min(1),
});

wixRouter.post(
  "/quote-request",
  asyncHandler(async (req, res) => {
    const input = quoteSchema.parse(req.body);
    const result = await createQuote(input);
    res.json({ ok: true, ...result });
  }),
);
