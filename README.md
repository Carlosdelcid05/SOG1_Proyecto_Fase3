# Trebol4Devop — Fase 3 · E-commerce Wix + ERP/CRM Odoo

Proyecto de **Sistemas Organizacionales y Gerenciales 1** (USAC, 2S 2026).

La Fase 3 integra un sitio **Wix** con **Odoo 16** (ventas, inventario,
facturación y CRM) mediante un **bridge** en Node.js/TypeScript.

El sitio Wix funciona en **plan gratuito**: Wix se usa como vitrina/catálogo y
el **checkout y el portal propios** se sirven desde el bridge para no depender
de Wix Payments ni de un plan Premium.

```
Cliente
  │
  ▼
Wix (catálogo + carrito + tienda)
  │  enlace al checkout propio
  ▼
Bridge Node/TypeScript (Express)
  ├── /checkout   ← carrito, datos del cliente, pago simulado/transferencia
  ├── /portal     ← cotizaciones, pedidos, facturas y PDFs
  │  JSON-RPC
  ▼
Odoo 16 + PostgreSQL 14
```

## Qué incluye

- Catálogo de **30 productos** con imágenes de marca, SKU sincronizado con Odoo, filtros avanzados y vista de detalle extendido.
- **Checkout propio** en `/checkout` con catálogo integrado, carrito, datos del cliente,
  IVA 12 % incluido y tres métodos de pago: pago simulado (demo), transferencia bancaria y contra entrega.
- **Facturación oficial** automática en Odoo (con vista previa antes de confirmar y descarga de PDFs de pedido y factura).
- **Agendamiento de citas** técnicas en `/agendar-cita` conectado directamente con Odoo CRM (`crm.lead`).
- **Atención por WhatsApp** con botón flotante en todo el sitio y mensajes contextuales (+502 2300-0000).
- **Cotizaciones** creadas desde Wix y aceptadas desde el portal.
- **Portal de clientes** en `/portal`: resumen, cotizaciones, pedidos, facturas
  y perfil, con token firmado.
- **Integración CRM**: cada pedido, cotización o cita genera una oportunidad y deja
  trazabilidad en el chatter.
- **Inventario**: stock inicial de 100 unidades por producto y reserva al vender.
- **Metabase** opcional en Docker para los reportes de BI.

## Estado actual (21/10/2026)

| Componente | Estado |
|---|---|
| Odoo 16 + base Fase 2 + módulo e-commerce | Funcionando |
| Bridge Wix ↔ Odoo | Funcionando y probado end-to-end (40 verificaciones) |
| 30 productos, imágenes y CSV para Wix | Importados en Wix con detalles y especificaciones |
| Checkout propio | Funcionando: carrito, pedido, factura, vista previa y 3 métodos de pago |
| Portal propio | Funcionando: login, resumen, cotizaciones, pedidos, facturas, PDFs |
| Agendar cita técnica | Funcionando integrado a CRM Odoo (`crm.lead`) |
| Canales de WhatsApp | Funcionando (+502 2300-0000) flotante y contextual |
| Sitio Wix | Publicado en `carlosdelcidramire.wixsite.com/my-site-1` |
| Plan Wix | **Gratuito** (sin checkout nativo; se usa el checkout propio) |

El sitio Wix ya está publicado con el catálogo y el botón **Ejecutar pago en
Trebol4Devop**, que abre el checkout del bridge. El portal se abre desde el
checkout o directamente en `/portal`.

## Datos de demostración incluidos

| Documento | Cliente | Estado |
|---|---|---|
| S00007 | Fintech Soluciones del Norte | Cotización pendiente |
| S00008 | Corporación TecnoGuate | Cotización pendiente |
| S00009 | AgroExportadora San Rafael | Pedido pagado |
| S00010 | Corporación TecnoGuate | Pedido pagado |
| S00011 | Fintech Soluciones del Norte | Pedido pendiente de pago (para probar “Simular pago”) |

## Inicio rápido

### 1. Requisitos

- Docker + Docker Compose
- Python 3 (para scripts de imágenes/CSV)
- Cuenta Wix (funciona con el plan gratuito; no se usa Wix Payments)

### 2. Levantar el backend

```bash
cp .env.example .env
docker compose up -d --build db odoo bridge
curl http://localhost:4000/health
```

La primera vez, PostgreSQL restaura `db/trebol4devop.dump` y Odoo instala el
módulo `trebol4devop_ecommerce`.

### 3. Cargar datos de demostración

```bash
docker compose exec -T odoo odoo shell -c /etc/odoo/odoo.conf \
  -d Trebol4Devop --no-http < scripts/bootstrap.py
docker compose restart odoo bridge
```

Esto crea:

| Recurso | Valor |
|---|---|
| Administrador Odoo | `admin` / `admin` |
| Usuario API | `ecommerce_api` / `TrebolApi2026!` |
| Portal TecnoGuate | `cmendoza@tecnoguate.com.gt` |
| Portal Fintech | `sestrada@fintechnorte.gt` |
| Portal AgroExportadora | `gorellana@agrosanrafael.com.gt` |
| Cliente de prueba del checkout | `cliente.wix.demo@example.com` |

El portal propio usa el código de acceso `trebol2026` (configurable con
`PORTAL_ACCESS_CODE`). Odoo queda en <http://localhost:8069>.

### 4. Exponer el bridge a Wix

El comando recomendado hace todo y te muestra los enlaces listos para pegar:

```bash
make start
```

Levanta PostgreSQL, Odoo y el bridge, espera el healthcheck, inicia el túnel,
guarda la URL en `.env`, regenera el CSV del catálogo y escribe
`wix/TUNEL_ACTUAL.md` con los enlaces. También imprime los pasos exactos para
Wix. Para consultar solo la URL activa:

```bash
make url
```

Con la URL activa se abren:

- `https://TU-TUNEL.trycloudflare.com/checkout` → checkout propio.
- `https://TU-TUNEL.trycloudflare.com/portal` → portal de clientes.
- `https://TU-TUNEL.trycloudflare.com/agendar-cita` → citas.

El túnel rápido de Cloudflare cambia de URL al reiniciar el contenedor o apagar
la PC. `make start` automatiza la actualización local, pero para una URL fija
revisa [`docs/tunel-estable.md`](docs/tunel-estable.md) (Tailscale Funnel,
ngrok, Cloudflare Named Tunnel o VPS).

> **Esta instalación ya usa Tailscale Funnel:** `https://carlos.tail30045d.ts.net`.
> El botón del carrito y “Agendar Cita” en Wix ya fueron publicados con esa URL.
> `make start` detecta la URL fija en `.env` y no vuelve a crear el túnel rápido.

### 5. Probar sin Wix

```bash
python3 scripts/e2e_test.py
# o
bash scripts/simulate_wix_order.sh
```

El e2e prueba login del portal, catálogo, checkout, idempotencia, contra entrega,
detalle de producto enriquecido, agendamiento de citas CRM, cotización,
pedido Wix, factura y PDFs (40 verificaciones).

## Estructura

```
.
├── bridge/                 # API Node/TypeScript Wix ↔ Odoo
│   ├── public/checkout.html      # checkout propio (carrito + pago)
│   ├── public/portal.html        # portal de clientes
│   ├── public/appointment.html   # formulario de citas (sin Velo)
│   └── src/routes/checkout.ts    # endpoints públicos del checkout
├── odoo/addons/
│   └── trebol4devop_ecommerce/   # módulo Odoo (campos + lógica)
├── wix/
│   ├── backend/            # Velo: bridge.jsw, portal.jsw, events.js
│   ├── pages/              # Velo: páginas del portal y cotización
│   ├── catalog/            # CSV de importación a Wix
│   └── README.md           # guía paso a paso en Wix
├── scripts/
│   ├── bootstrap.py        # usuarios, stock, imágenes, pagos
│   ├── generate_images.py  # 30 imágenes + CSV de Wix
│   ├── e2e_test.py         # prueba end-to-end
│   └── simulate_wix_order.sh
├── db/                     # dump + filestore de Fase 2
├── assets/products/        # imágenes PNG/WebP de los 30 productos
├── docs/manual-usuario/    # capturas y material del manual de usuario
├── docs/tunel-estable.md   # Tailscale/ngrok/Cloudflare/VPS para URL fija
├── docker-compose.yml
├── Dockerfile.odoo
└── Makefile
```

## Comandos

```bash
make start       # stack + túnel + enlaces para Wix (recomendado)
make url         # muestra la URL activa del túnel
make up          # db + odoo + bridge (sin túnel)
make tunnel      # alias de make start
make test        # prueba end-to-end
make simulate    # simula un pedido de Wix
make seed-demo   # carga cotizaciones/pedidos de demostración
make catalog     # regenera imágenes y CSV (BASE_URL=https://...)
make dump        # exporta la base actual
make logs        # logs de todos los servicios
make down        # detiene los contenedores
```

## Endpoints del bridge

| Método | Ruta | Uso |
|---|---|---|
| `GET` | `/health` | Estado de Odoo |
| `GET` | `/checkout` | Checkout propio (HTML) |
| `GET` | `/api/checkout/config` | Configuración pública (moneda, IVA 12 %, datos bancarios, WhatsApp) |
| `GET` | `/api/checkout/products` | Catálogo público con detalle y descripciones enriquecidas |
| `POST` | `/api/checkout/orders` | Crear pedido, facturar y registrar método (`simulated`, `transfer`, `contra_entrega`) |
| `POST` | `/api/checkout/appointment` | Agendar cita técnica (crea lead/oportunidad en CRM Odoo) |
| `GET` | `/agendar-cita` | Formulario público de citas (HTML, sin Velo) |
| `GET` | `/portal` | Portal de clientes (HTML) |
| `POST` | `/api/portal/login` | Login del portal (correo + código) |
| `GET` | `/api/catalog` | Catálogo para el formulario de cotización |
| `POST` | `/api/wix/order-created` | Pedido creado en Wix |
| `POST` | `/api/wix/order-paid` | Pedido pagado en Wix |
| `POST` | `/api/wix/order-canceled` | Pedido cancelado |
| `POST` | `/api/wix/quote-request` | Cotización desde Wix |
| `GET` | `/api/portal/summary` | KPIs del cliente |
| `GET` | `/api/portal/quotes` | Cotizaciones |
| `POST` | `/api/portal/quotes/:id/accept` | Aceptar cotización |
| `GET` | `/api/portal/orders` | Pedidos |
| `POST` | `/api/portal/orders/:id/simulate-payment` | Pago simulado |
| `GET` | `/api/portal/invoices` | Facturas |
| `POST` | `/api/portal/pdf-token` | URL firmada de PDF |
| `GET` | `/api/pdf/{order,invoice}/:id` | PDF de Odoo |

`/api/checkout` y `/api/portal/login` son públicos (con límite de solicitudes).
Los demás endpoints de `/api/portal` aceptan un **token Bearer** del portal o
`x-bridge-key` + `x-member-email` (uso interno de Velo). `/api/wix` y
`/api/catalog` requieren `x-bridge-key`.

## Flujo de demostración

1. Cliente entra al sitio Wix y revisa el catálogo con filtros combinables o detalle enriquecido.
2. Pulsa **Ejecutar pago en Trebol4Devop** (carrito de Wix).
3. Se abre `/checkout`: elige productos, completa sus datos y puede abrir la
   **vista previa de factura** con cálculo de IVA 12 %.
4. Paga con **pago simulado**, **transferencia bancaria** o **contra entrega**:
   - `simulated`: Se confirma, factura y registra el cobro automáticamente en Odoo.
   - `transfer` o `contra_entrega`: Queda confirmado y facturado con cobro pendiente en Odoo.
5. El cliente recibe los enlaces de **pedido en PDF**, **factura en PDF** y de **portal**.
6. En `/portal` consulta resumen, cotizaciones, pedidos, facturas y perfil.
7. **Agendar Cita** → En `/agendar-cita`, el cliente solicita una reunión técnica;
   Odoo CRM genera una oportunidad (`crm.lead`) con fecha, hora y trazabilidad.
8. **Solicitar Cotización** → Odoo crea cotización + oportunidad; se acepta en
   el portal y se convierte en pedido + factura.

## Limitaciones

- Wix Payments no está disponible en Guatemala: se usa pago manual/simulado.
- El plan gratuito de Wix no permite checkout nativo; por eso el checkout vive
  en el bridge y se abre desde el botón del carrito.
- La factura fiscal oficial es la de Odoo; el recibo de Wix no la sustituye.
- El túnel rápido gratuito cambia de URL al reiniciarse; `make start` actualiza
  el `.env`, el CSV y te muestra los enlaces para Wix. Para una URL fija usa
  [`docs/tunel-estable.md`](docs/tunel-estable.md).
- La sincronización de stock Odoo → Wix es manual en esta versión.
- Wix no permite importar productos digitales por CSV; se importan como
  físicos con envío gratuito.
- El portal propio usa correo + código de acceso para la demo. Para producción
  se recomienda SSO/Wix Members o un proveedor de identidad.

## Créditos

Trebol4Devop — USAC, Facultad de Ingeniería, 2026.
