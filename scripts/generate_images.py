#!/usr/bin/env python3
"""Genera las imágenes de marca de los 30 productos de Trebol4Devop.

Salida:
  assets/products/<CODIGO>.png   (1200x900, para Odoo y Wix)
  assets/products/<CODIGO>.webp  (800x600, para la tienda)
"""

from __future__ import annotations

import argparse
import csv
import html
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "products"
OUT.mkdir(parents=True, exist_ok=True)

PRODUCTS = [
    ("WEB-BAS-01", "Landing Page Express", "Sitios Web", 250),
    ("WEB-COR-02", "Web Corporativa PYME", "Sitios Web", 550),
    ("WEB-CAT-03", "Catálogo Digital Interactivo", "Sitios Web", 750),
    ("WEB-ECO-04", "Tienda E-commerce Básica", "Sitios Web", 990),
    ("WEB-ECO-05", "Tienda E-commerce Avanzada B2B", "Sitios Web", 1600),
    ("WEB-POR-06", "Portal Educativo / LMS", "Sitios Web", 1850),
    ("APP-CAT-01", "App Móvil Catálogo (Android)", "Apps Móviles", 850),
    ("APP-ECO-02", "App Móvil E-commerce Multiplataforma", "Apps Móviles", 1900),
    ("APP-RES-03", "App de Reservas y Citas", "Apps Móviles", 1200),
    ("APP-DEL-04", "App de Pedidos y Delivery", "Apps Móviles", 2400),
    ("APP-INT-05", "App Móvil de Gestión Interna", "Apps Móviles", 1400),
    ("APP-FID-06", "App de Fidelización de Clientes", "Apps Móviles", 1100),
    ("MAN-PLA-01", "Mantenimiento Preventivo Web Silver", "Mantenimiento Mensual", 65),
    ("MAN-PLA-02", "Mantenimiento Correctivo Web Gold", "Mantenimiento Mensual", 120),
    ("MAN-PLA-03", "Mantenimiento Integral Platinum", "Mantenimiento Mensual", 220),
    ("MAN-APP-04", "Mantenimiento de Apps Móviles Standard", "Mantenimiento Mensual", 150),
    ("MAN-BDD-05", "Soporte y Mantenimiento de Base de Datos", "Mantenimiento Mensual", 180),
    ("MAN-SEC-06", "Póliza de Seguridad y Parcheo Anti-Malware", "Mantenimiento Mensual", 95),
    ("LIC-FAC-01", "Licencia Módulo Facturación Electrónica", "Licencias de Módulos", 190),
    ("LIC-INV-02", "Licencia Módulo Inventario Multibodega", "Licencias de Módulos", 220),
    ("LIC-CRM-03", "Licencia Módulo Automatización CRM", "Licencias de Módulos", 175),
    ("LIC-POS-04", "Licencia Módulo Punto de Venta (POS)", "Licencias de Módulos", 250),
    ("LIC-PAS-05", "Conector Pasarela de Pagos Local", "Licencias de Módulos", 140),
    ("LIC-REP-06", "Módulo de Reportes Contables Avanzados", "Licencias de Módulos", 160),
    ("SRV-AUD-01", "Auditoría de Ciberseguridad Web", "Servicios Adicionales", 350),
    ("SRV-OPT-02", "Optimización de Velocidad Web (PageSpeed)", "Servicios Adicionales", 180),
    ("SRV-MIG-03", "Migración de Plataforma y Servidores", "Servicios Adicionales", 290),
    ("SRV-API-04", "Desarrollo de Integración API a Medida", "Servicios Adicionales", 400),
    ("SRV-CAP-05", "Paquete de Capacitación Empresarial", "Servicios Adicionales", 150),
    ("SRV-SEO-06", "Paquete de Posicionamiento SEO On-Page", "Servicios Adicionales", 210),
]

PALETTES = {
    "Sitios Web": ("#052e2b", "#059669", "#34d399", "globe"),
    "Apps Móviles": ("#0b1e3a", "#2563eb", "#60a5fa", "phone"),
    "Mantenimiento Mensual": ("#2b1a05", "#d97706", "#fbbf24", "gear"),
    "Licencias de Módulos": ("#23103a", "#7c3aed", "#c4b5fd", "key"),
    "Servicios Adicionales": ("#2a0d1c", "#e11d48", "#fda4af", "spark"),
}

ICONS = {
    "globe": """
      <circle cx="0" cy="0" r="62" fill="none" stroke="white" stroke-width="5"/>
      <ellipse cx="0" cy="0" rx="62" ry="24" fill="none" stroke="white" stroke-width="5"/>
      <ellipse cx="0" cy="0" rx="24" ry="62" fill="none" stroke="white" stroke-width="5"/>
      <line x1="-70" y1="0" x2="70" y2="0" stroke="white" stroke-width="5"/>
    """,
    "phone": """
      <rect x="-34" y="-62" width="68" height="124" rx="14" fill="none" stroke="white" stroke-width="5"/>
      <line x1="-12" y1="-46" x2="12" y2="-46" stroke="white" stroke-width="5" stroke-linecap="round"/>
      <circle cx="0" cy="44" r="6" fill="white"/>
    """,
    "gear": """
      <circle cx="0" cy="0" r="24" fill="none" stroke="white" stroke-width="6"/>
      <g stroke="white" stroke-width="7" stroke-linecap="round">
        <line x1="0" y1="-60" x2="0" y2="-40"/><line x1="0" y1="40" x2="0" y2="60"/>
        <line x1="-60" y1="0" x2="-40" y2="0"/><line x1="40" y1="0" x2="60" y2="0"/>
        <line x1="-43" y1="-43" x2="-29" y2="-29"/><line x1="29" y1="29" x2="43" y2="43"/>
        <line x1="43" y1="-43" x2="29" y2="-29"/><line x1="-29" y1="29" x2="-43" y2="43"/>
      </g>
    """,
    "key": """
      <circle cx="-18" cy="-18" r="30" fill="none" stroke="white" stroke-width="6"/>
      <line x1="4" y1="4" x2="66" y2="66" stroke="white" stroke-width="7" stroke-linecap="round"/>
      <line x1="38" y1="38" x2="56" y2="20" stroke="white" stroke-width="7" stroke-linecap="round"/>
      <line x1="52" y1="52" x2="70" y2="34" stroke="white" stroke-width="7" stroke-linecap="round"/>
    """,
    "spark": """
      <path d="M0 -66 L16 -16 L66 0 L16 16 L0 66 L-16 16 L-66 0 L-16 -16 Z"
            fill="none" stroke="white" stroke-width="5" stroke-linejoin="round"/>
      <circle cx="0" cy="0" r="10" fill="white"/>
    """,
}


def wrap(text: str, width: int = 22) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if len(candidate) <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines[:3]


def build_svg(code: str, name: str, category: str, price: int) -> str:
    bg, primary, accent, icon = PALETTES[category]
    lines = wrap(name)
    line_height = 58
    start_y = 470 - (len(lines) - 1) * line_height // 2
    name_svg = "".join(
        f'<text x="600" y="{start_y + i * line_height}" text-anchor="middle" '
        f'font-family="DejaVu Sans, Arial, sans-serif" font-size="48" font-weight="700" '
        f'fill="#ffffff">{html.escape(line)}</text>'
        for i, line in enumerate(lines)
    )

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{bg}"/>
      <stop offset="100%" stop-color="{primary}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="35%" r="55%">
      <stop offset="0%" stop-color="{accent}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="{accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="900" fill="url(#bg)"/>
  <rect width="1200" height="900" fill="url(#glow)"/>

  <g opacity="0.10" stroke="#ffffff" stroke-width="1">
    {''.join(f'<line x1="0" y1="{y}" x2="1200" y2="{y}"/>' for y in range(100, 900, 100))}
    {''.join(f'<line x1="{x}" y1="0" x2="{x}" y2="900"/>' for x in range(100, 1200, 100))}
  </g>

  <g transform="translate(600 300)" opacity="0.95">{ICONS[icon]}</g>

  <rect x="440" y="392" width="320" height="6" rx="3" fill="{accent}" opacity="0.85"/>

  {name_svg}

  <text x="600" y="640" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif"
        font-size="26" fill="{accent}" letter-spacing="4">{html.escape(category.upper())}</text>

  <text x="600" y="760" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif"
        font-size="34" font-weight="700" fill="#ffffff">Q {price:,.2f}</text>

  <text x="70" y="840" font-family="DejaVu Sans, Arial, sans-serif" font-size="26"
        font-weight="700" fill="#ffffff" opacity="0.95">Trebol4Devop</text>
  <text x="1130" y="840" text-anchor="end" font-family="DejaVu Sans, Arial, sans-serif"
        font-size="22" fill="{accent}" opacity="0.9">{html.escape(code)}</text>
</svg>
"""


def build_plain_description(code: str, name: str, category: str, details: dict) -> str:
    """Genera la descripción enriquecida en HTML para el catálogo Wix y Odoo."""
    item = details.get(code)
    if not item:
        return (
            f"<p>{html.escape(name)}. Servicio profesional de Trebol4Devop en la "
            f"categoría {html.escape(category)}. Incluye acompañamiento, "
            "documentación y soporte.</p>"
        )

    summary = html.escape(item.get("summary", ""))
    features = "".join(f"<li>{html.escape(f)}</li>" for f in item.get("features", []))
    delivery = html.escape(item.get("delivery", ""))
    ideal_for = html.escape(item.get("idealFor", ""))

    return (
        f"<p>{summary}</p>"
        f"<p><strong>Características principales:</strong></p>"
        f"<ul>{features}</ul>"
        f"<p><strong>Tiempo de entrega:</strong> {delivery}</p>"
        f"<p><strong>Ideal para:</strong> {ideal_for}</p>"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--base-url",
        default="",
        help="URL pública del bridge para productImageUrl (ej. https://abc.trycloudflare.com)",
    )
    parser.add_argument(
        "--csv-only",
        action="store_true",
        help="Regenera únicamente el CSV de Wix sin generar imágenes SVG/PNG/WEBP",
    )
    args = parser.parse_args()

    if not args.csv_only:
        for code, name, category, price in PRODUCTS:
            svg = build_svg(code, name, category, price)
            svg_path = OUT / f"{code}.svg"
            png_path = OUT / f"{code}.png"
            webp_path = OUT / f"{code}.webp"
            svg_path.write_text(svg, encoding="utf-8")

            subprocess.run(
                ["rsvg-convert", "-w", "1200", "-h", "900", "-o", str(png_path), str(svg_path)],
                check=True,
            )
            subprocess.run(
                ["convert", str(png_path), "-resize", "800x600", "-quality", "82", str(webp_path)],
                check=True,
            )
            svg_path.unlink()
            print(f"✓ {code} → {png_path.name} / {webp_path.name}")
        print(f"\n{len(PRODUCTS)} imágenes generadas en {OUT}")

    write_wix_csv(args.base_url.rstrip("/"))


def write_wix_csv(base_url: str) -> None:
    """Genera el CSV con el formato oficial de importación de Wix Stores."""
    target = ROOT / "wix" / "catalog" / "productos_wix.csv"
    target.parent.mkdir(parents=True, exist_ok=True)

    details_file = ROOT / "scripts" / "catalog_details.json"
    details = {}
    if details_file.exists():
        with details_file.open("r", encoding="utf-8") as df:
            details = json.load(df)

    existing_media = {}
    if target.exists():
        try:
            with target.open("r", encoding="utf-8-sig") as f:
                for row in csv.DictReader(f):
                    if row.get("sku") and row.get("media"):
                        existing_media[row["sku"]] = row["media"]
        except Exception:
            pass

    # Encabezados exactos de la plantilla oficial de Wix (import 1.773.0).
    headers = [
        "handle", "fieldType", "name", "visible", "plainDescription",
        "categorySlugs", "primaryCategorySlug", "media", "mediaAltText",
        "ribbon", "brand", "price", "strikethroughPrice", "baseUnit",
        "baseUnitMeasurement", "totalUnits", "totalUnitsMeasurement", "cost",
        "inventory", "preOrderEnabled", "preOrderMessage", "preOrderLimit",
        "sku", "barcode", "weight", "packageLength", "packageWidth",
        "packageHeight", "packageUnit",
        "productOptionName1", "productOptionType1", "productOptionChoices1",
        "productOptionName2", "productOptionType2", "productOptionChoices2",
        "productOptionName3", "productOptionType3", "productOptionChoices3",
        "productOptionName4", "productOptionType4", "productOptionChoices4",
        "productOptionName5", "productOptionType5", "productOptionChoices5",
        "productOptionName6", "productOptionType6", "productOptionChoices6",
        "modifierName1", "modifierType1", "modifierCharLimit1",
        "modifierMandatory1", "modifierDescription1",
        "modifierName2", "modifierType2", "modifierCharLimit2",
        "modifierMandatory2", "modifierDescription2",
        "modifierName3", "modifierType3", "modifierCharLimit3",
        "modifierMandatory3", "modifierDescription3",
        "modifierName4", "modifierType4", "modifierCharLimit4",
        "modifierMandatory4", "modifierDescription4",
        "modifierName5", "modifierType5", "modifierCharLimit5",
        "modifierMandatory5", "modifierDescription5",
        "modifierName6", "modifierType6", "modifierCharLimit6",
        "modifierMandatory6", "modifierDescription6",
        "modifierName7", "modifierType7", "modifierCharLimit7",
        "modifierMandatory7", "modifierDescription7",
        "modifierName8", "modifierType8", "modifierCharLimit8",
        "modifierMandatory8", "modifierDescription8",
        "modifierName9", "modifierType9", "modifierCharLimit9",
        "modifierMandatory9", "modifierDescription9",
        "modifierName10", "modifierType10", "modifierCharLimit10",
        "modifierMandatory10", "modifierDescription10",
    ]

    def slug(value: str) -> str:
        import unicodedata

        normalized = unicodedata.normalize("NFKD", value)
        ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
        return "-".join(
            part for part in "".join(
                char.lower() if char.isalnum() else " "
                for char in ascii_text
            ).split()
        )

    with target.open("w", encoding="utf-8-sig", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=headers)
        writer.writeheader()
        for code, name, category, price in PRODUCTS:
            if base_url:
                image_url = f"{base_url}/assets/products/{code}.png"
            elif code in existing_media:
                image_url = existing_media[code]
            else:
                image_url = ""

            category_slug = slug(category)
            row = {header: "" for header in headers}
            row.update(
                {
                    "handle": code.lower(),
                    "fieldType": "PRODUCT",
                    "name": name,
                    "visible": "TRUE",
                    "plainDescription": build_plain_description(code, name, category, details),
                    "categorySlugs": category_slug,
                    "primaryCategorySlug": category_slug,
                    "media": image_url,
                    "mediaAltText": name,
                    "brand": "Trebol4Devop",
                    "price": f"{price:.2f}",
                    "inventory": "100",
                    "preOrderEnabled": "FALSE",
                    "sku": code,
                }
            )
            writer.writerow(row)
    print(f"✓ CSV de Wix generado: {target}")


if __name__ == "__main__":
    main()
