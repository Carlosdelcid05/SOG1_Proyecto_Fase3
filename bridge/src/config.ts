import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  odooUrl: required("ODOO_URL", "http://localhost:8069").replace(/\/+$/, ""),
  odooDb: required("ODOO_DB", "Trebol4Devop"),
  odooLogin: required("ODOO_API_LOGIN", "ecommerce_api"),
  odooPassword: required("ODOO_API_PASSWORD", "TrebolApi2026!"),
  bridgeKey: required("BRIDGE_API_KEY", "trebol-bridge-dev-key"),
  portalSecret: required("PORTAL_TOKEN_SECRET", "trebol-portal-dev-secret"),
  portalAccessCode: process.env.PORTAL_ACCESS_CODE ?? "trebol2026",
  publicUrl: (process.env.BRIDGE_PUBLIC_URL ?? "http://localhost:4000").replace(/\/+$/, ""),
  demoMode: (process.env.DEMO_MODE ?? "true").toLowerCase() === "true",
};
