import { Router } from "express";
import { asyncHandler } from "../async-handler.js";
import { searchRead } from "../odoo/client.js";

export const catalogRouter = Router();

type ProductRow = {
  id: number;
  name: string;
  default_code: string;
  list_price: number;
  categ_id: [number, string] | false;
  description_sale: string | false;
};

catalogRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
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
        "categ_id",
        "description_sale",
      ],
      { order: "default_code asc", limit: 200 },
    );

    res.json({
      ok: true,
      data: products.map((product) => ({
        sku: product.default_code,
        name: product.name,
        price: product.list_price,
        category: product.categ_id ? product.categ_id[1] : "Servicios",
        description: product.description_sale || "",
      })),
    });
  }),
);
