import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config.js";

export type AuthedRequest = Request & {
  memberEmail?: string;
};

export function requireBridgeKey(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const provided =
    req.header("x-bridge-key") ??
    req.header("authorization")?.replace(/^Bearer\s+/i, "");

  if (!provided || provided !== config.bridgeKey) {
    res.status(401).json({ ok: false, error: "Credencial del bridge inválida" });
    return;
  }
  next();
}

/**
 * Token firmado para el portal propio. Permite que el cliente vea sus datos
 * sin exponer la llave del bridge en el navegador.
 */
export function signPortalToken(
  email: string,
  ttlMs = 7 * 24 * 60 * 60 * 1000,
): string {
  const expires = Date.now() + ttlMs;
  const payload = `${email.trim().toLowerCase()}:${expires}`;
  const signature = crypto
    .createHmac("sha256", config.portalSecret)
    .update(payload)
    .digest("base64url");
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

export function verifyPortalToken(token: string): string {
  const decoded = Buffer.from(token, "base64url").toString("utf8");
  const parts = decoded.split(":");
  if (parts.length !== 3) throw new Error("Token de portal inválido");

  const [email, rawExpires, signature] = parts;
  const payload = `${email}:${rawExpires}`;
  const expected = crypto
    .createHmac("sha256", config.portalSecret)
    .update(payload)
    .digest("base64url");

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    throw new Error("Firma de portal inválida");
  }

  if (Number(rawExpires) < Date.now()) {
    throw new Error("La sesión del portal expiró");
  }

  return email;
}

export function requireMember(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): void {
  const bridgeKey =
    req.header("x-bridge-key") ??
    req.header("authorization")?.replace(/^Bearer\s+/i, "");

  if (bridgeKey && bridgeKey === config.bridgeKey) {
    const email = req.header("x-member-email")?.trim().toLowerCase();
    if (!email) {
      res.status(400).json({ ok: false, error: "Falta el correo del miembro" });
      return;
    }
    req.memberEmail = email;
    next();
    return;
  }

  const bearer = req.header("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (bearer) {
    try {
      req.memberEmail = verifyPortalToken(bearer);
      next();
      return;
    } catch (error) {
      res.status(401).json({
        ok: false,
        error: error instanceof Error ? error.message : "Sesión inválida",
      });
      return;
    }
  }

  res.status(401).json({ ok: false, error: "Debes iniciar sesión en el portal" });
}
