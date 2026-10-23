import { create, executeKw, searchRead } from "./client.js";

export type OdooPartner = {
  id: number;
  name: string;
  email: string | false;
  phone: string | false;
  vat: string | false;
  street: string | false;
  city: string | false;
  is_company: boolean;
  commercial_partner_id: [number, string] | number;
  parent_id: [number, string] | false;
  country_id: [number, string] | false;
};

export type PartnerInput = {
  email: string;
  name?: string;
  phone?: string;
  company?: string;
  vat?: string;
  street?: string;
  city?: string;
};

let guatemalaId: number | null = null;

async function countryId(): Promise<number | null> {
  if (guatemalaId) return guatemalaId;
  const rows = await searchRead<{ id: number }>(
    "res.country",
    [["code", "=", "GT"]],
    ["id"],
    { limit: 1 },
  );
  guatemalaId = rows[0]?.id ?? null;
  return guatemalaId;
}

export async function findPartnerByEmail(
  email: string,
): Promise<OdooPartner | null> {
  if (!email) return null;
  const rows = await searchRead<OdooPartner>(
    "res.partner",
    [["email", "=ilike", email.trim()]],
    [
      "id",
      "name",
      "email",
      "phone",
      "vat",
      "street",
      "city",
      "is_company",
      "commercial_partner_id",
      "parent_id",
      "country_id",
    ],
    { limit: 1, order: "is_company asc, id asc" },
  );
  return rows[0] ?? null;
}

export function commercialPartnerId(partner: OdooPartner): number {
  return Array.isArray(partner.commercial_partner_id)
    ? partner.commercial_partner_id[0]
    : partner.commercial_partner_id;
}

export async function findOrCreatePartner(
  input: PartnerInput,
): Promise<OdooPartner> {
  const email = (input.email ?? "").trim().toLowerCase();
  if (!email) {
    throw new Error("El pedido no trae correo del comprador");
  }

  const existing = await findPartnerByEmail(email);
  if (existing) {
    const updates: Record<string, unknown> = {};

    const cleanName = input.name?.trim();
    if (cleanName && cleanName !== existing.name && !existing.is_company) {
      updates.name = cleanName;
    }

    const cleanPhone = input.phone?.trim();
    if (cleanPhone && cleanPhone !== (existing.phone || "")) {
      updates.phone = cleanPhone;
    }

    const cleanVat = input.vat?.trim();
    if (cleanVat && cleanVat !== (existing.vat || "")) {
      updates.vat = cleanVat;
    }

    const cleanStreet = input.street?.trim();
    if (cleanStreet && cleanStreet !== (existing.street || "")) {
      updates.street = cleanStreet;
    }

    const cleanCity = input.city?.trim();
    if (cleanCity && cleanCity !== (existing.city || "")) {
      updates.city = cleanCity;
    }

    const cleanCompany = input.company?.trim();
    if (cleanCompany) {
      if (existing.parent_id) {
        const parentId = existing.parent_id[0];
        const currentParentName = existing.parent_id[1];
        if (currentParentName !== cleanCompany) {
          await executeKw("res.partner", "write", [
            [parentId],
            { name: cleanCompany },
          ]);
        }
      } else {
        const companies = await searchRead<{ id: number }>(
          "res.partner",
          [
            ["name", "=ilike", cleanCompany],
            ["is_company", "=", true],
          ],
          ["id"],
          { limit: 1 },
        );
        let companyId = companies[0]?.id;
        if (!companyId) {
          const country = await countryId();
          companyId = await create("res.partner", {
            name: cleanCompany,
            is_company: true,
            vat: cleanVat || false,
            email,
            phone: cleanPhone || false,
            street: cleanStreet || false,
            city: cleanCity || false,
            country_id: country || false,
            customer_rank: 1,
          });
        }
        updates.parent_id = companyId;
      }
    }

    if (Object.keys(updates).length > 0) {
      await executeKw("res.partner", "write", [[existing.id], updates]);
      Object.assign(existing, updates);
    }
    return existing;
  }

  const country = await countryId();
  const displayName =
    input.name?.trim() ||
    [input.company?.trim(), email.split("@")[0]].filter(Boolean).join(" - ");

  if (input.company?.trim()) {
    const companies = await searchRead<{ id: number }>(
      "res.partner",
      [
        ["name", "=ilike", input.company.trim()],
        ["is_company", "=", true],
      ],
      ["id"],
      { limit: 1 },
    );

    let companyId = companies[0]?.id;
    if (!companyId) {
      companyId = await create("res.partner", {
        name: input.company.trim(),
        is_company: true,
        vat: input.vat || false,
        email,
        phone: input.phone || false,
        street: input.street || false,
        city: input.city || false,
        country_id: country || false,
        customer_rank: 1,
      });
    }

    const contactId = await create("res.partner", {
      name: displayName,
      email,
      phone: input.phone || false,
      vat: input.vat || false,
      street: input.street || false,
      city: input.city || false,
      country_id: country || false,
      parent_id: companyId,
      type: "invoice",
      customer_rank: 1,
    });

    const created = await searchRead<OdooPartner>(
      "res.partner",
      [["id", "=", contactId]],
      [
        "id",
        "name",
        "email",
        "phone",
        "vat",
        "street",
        "city",
        "is_company",
        "commercial_partner_id",
        "parent_id",
        "country_id",
      ],
      { limit: 1 },
    );
    return created[0];
  }

  const id = await create("res.partner", {
    name: displayName,
    email,
    phone: input.phone || false,
    vat: input.vat || false,
    street: input.street || false,
    city: input.city || false,
    country_id: country || false,
    is_company: false,
    customer_rank: 1,
  });

  const created = await searchRead<OdooPartner>(
    "res.partner",
    [["id", "=", id]],
    [
      "id",
      "name",
      "email",
      "phone",
      "vat",
      "street",
      "city",
      "is_company",
      "commercial_partner_id",
      "parent_id",
      "country_id",
    ],
    { limit: 1 },
  );
  return created[0];
}
