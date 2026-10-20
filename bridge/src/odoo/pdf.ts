import crypto from "node:crypto";
import { config } from "../config.js";

let cachedSession: { id: string; at: number } | null = null;
const SESSION_TTL_MS = 30 * 60 * 1000;

export async function getSessionId(force = false): Promise<string> {
  if (!force && cachedSession && Date.now() - cachedSession.at < SESSION_TTL_MS) {
    return cachedSession.id;
  }

  const response = await fetch(`${config.odooUrl}/web/session/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: {
        db: config.odooDb,
        login: config.odooLogin,
        password: config.odooPassword,
      },
      id: 1,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`No se pudo autenticar la sesión de Odoo (${response.status})`);
  }

  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie") ?? ""];
  const cookie = setCookies
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .find((value) => value.startsWith("session_id="));

  if (!cookie) {
    throw new Error("Odoo no devolvió la cookie session_id");
  }

  const sessionId = cookie.split(";")[0].replace("session_id=", "");
  cachedSession = { id: sessionId, at: Date.now() };
  return sessionId;
}

export async function fetchPdf(
  report: string,
  recordId: number,
): Promise<{ buffer: Buffer; contentType: string }> {
  let sessionId = await getSessionId();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(
      `${config.odooUrl}/report/pdf/${report}/${recordId}`,
      {
        headers: { Cookie: `session_id=${sessionId}` },
        redirect: "manual",
        signal: AbortSignal.timeout(60_000),
      },
    );

    if (response.status === 401 || response.status === 303 || response.status === 302) {
      sessionId = await getSessionId(true);
      continue;
    }

    if (!response.ok) {
      throw new Error(`Odoo no pudo generar el PDF (${response.status})`);
    }

    const contentType = response.headers.get("content-type") ?? "application/pdf";
    if (contentType.includes("text/html")) {
      sessionId = await getSessionId(true);
      continue;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return { buffer, contentType };
  }

  throw new Error("No se pudo obtener el PDF después de reautenticar la sesión");
}

export function signPdfToken(
  type: "order" | "invoice",
  recordId: number,
  email: string,
  ttlMs = 10 * 60 * 1000,
): string {
  const expires = Date.now() + ttlMs;
  const payload = `${type}:${recordId}:${email.toLowerCase()}:${expires}`;
  const signature = crypto
    .createHmac("sha256", config.portalSecret)
    .update(payload)
    .digest("base64url");
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

export function verifyPdfToken(token: string): {
  type: "order" | "invoice";
  recordId: number;
  email: string;
} {
  const decoded = Buffer.from(token, "base64url").toString("utf8");
  const parts = decoded.split(":");
  if (parts.length !== 5) throw new Error("Token de PDF inválido");

  const [type, rawId, email, rawExpires, signature] = parts;
  const payload = `${type}:${rawId}:${email}:${rawExpires}`;
  const expected = crypto
    .createHmac("sha256", config.portalSecret)
    .update(payload)
    .digest("base64url");

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    throw new Error("Firma de PDF inválida");
  }

  if (Number(rawExpires) < Date.now()) {
    throw new Error("El enlace del PDF expiró");
  }

  if (type !== "order" && type !== "invoice") {
    throw new Error("Tipo de PDF inválido");
  }

  return { type, recordId: Number(rawId), email };
}
