import { config } from "../config.js";

type JsonRpcResponse<T> = {
  jsonrpc: "2.0";
  id: number | null;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: { name?: string; message?: string; debug?: string };
  };
};

export class OdooError extends Error {
  readonly code: number;
  readonly detail?: string;

  constructor(message: string, code = 0, detail?: string) {
    super(message);
    this.name = "OdooError";
    this.code = code;
    this.detail = detail;
  }
}

let requestId = 0;
let cachedUid: number | null = null;

async function rpc<T>(
  service: string,
  method: string,
  args: unknown[],
): Promise<T> {
  const response = await fetch(`${config.odooUrl}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: { service, method, args },
      id: ++requestId,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new OdooError(`Odoo respondió HTTP ${response.status}`, response.status);
  }

  const payload = (await response.json()) as JsonRpcResponse<T>;
  if (payload.error) {
    const detail = payload.error.data?.debug ?? payload.error.data?.message;
    throw new OdooError(
      payload.error.data?.message ?? payload.error.message,
      payload.error.code,
      detail,
    );
  }
  return payload.result as T;
}

export async function getUid(): Promise<number> {
  if (cachedUid) return cachedUid;
  const uid = await rpc<number | false>("common", "login", [
    config.odooDb,
    config.odooLogin,
    config.odooPassword,
  ]);
  if (!uid) {
    throw new OdooError("No se pudo autenticar el usuario API en Odoo");
  }
  cachedUid = uid;
  return uid;
}

export async function executeKw<T>(
  model: string,
  method: string,
  args: unknown[] = [],
  kwargs: Record<string, unknown> = {},
): Promise<T> {
  const uid = await getUid();
  return rpc<T>("object", "execute_kw", [
    config.odooDb,
    uid,
    config.odooPassword,
    model,
    method,
    args,
    kwargs,
  ]);
}

export async function searchRead<T = Record<string, unknown>>(
  model: string,
  domain: unknown[],
  fields: string[],
  options: { limit?: number; offset?: number; order?: string } = {},
): Promise<T[]> {
  return executeKw<T[]>(model, "search_read", [domain, fields], options);
}

export async function searchCount(
  model: string,
  domain: unknown[],
): Promise<number> {
  return executeKw<number>(model, "search_count", [domain]);
}

export async function read<T = Record<string, unknown>>(
  model: string,
  ids: number[],
  fields: string[],
): Promise<T[]> {
  return executeKw<T[]>(model, "read", [ids, fields]);
}

export async function create(
  model: string,
  values: Record<string, unknown>,
): Promise<number> {
  return executeKw<number>(model, "create", [values]);
}

export async function write(
  model: string,
  ids: number[],
  values: Record<string, unknown>,
): Promise<boolean> {
  return executeKw<boolean>(model, "write", [ids, values]);
}
