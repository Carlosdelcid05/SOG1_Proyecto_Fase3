# Wix ↔ Odoo — Trebol4Devop Fase 3

El sitio Wix funciona como **vitrina y catálogo**. El **checkout** y el
**portal de clientes** corren en el bridge para que el proyecto funcione con el
**plan gratuito de Wix** (sin Wix Payments ni plan Premium).

```
Wix (catálogo, carrito, tienda)
  └── botón "Ejecutar pago en Trebol4Devop"
          │
          ▼
Bridge /checkout  →  Odoo (sale.order + factura + pago)
Bridge /portal    →  Odoo (cotizaciones, pedidos, facturas, PDFs)
```

## 1. Requisitos

- Cuenta Wix (el plan gratuito es suficiente).
- **Wix Stores** instalado (catálogo y carrito).
- **Wix Área personal** instalado (opcional, para login de miembros).
- Bridge + Odoo corriendo y un túnel HTTPS (Cloudflare Tunnel).
- No se necesita Wix Payments.

## 2. Levantar bridge y túnel

```bash
docker compose up -d db odoo bridge
curl http://localhost:4000/health

docker compose --profile tunnel up -d tunnel
docker compose logs -f tunnel | grep trycloudflare.com
```

Copia la URL `https://algo.trycloudflare.com`. Se usa para:

- Checkout: `https://TU-TUNEL.trycloudflare.com/checkout`
- Portal: `https://TU-TUNEL.trycloudflare.com/portal`

## 3. Configurar Wix

### 3.1 Moneda e impuestos

1. **Configuración → Configuración de la tienda → Moneda**: GTQ.
2. **Configuración → Impuestos**: Guatemala, IVA 12 %, precios con impuesto
   incluido.
3. **Envío**: los productos son servicios; usa envío gratis o entrega digital.

### 3.2 Catálogo

El CSV oficial está en `wix/catalog/productos_wix.csv` y las imágenes en
`assets/products/`.

```bash
python3 scripts/generate_images.py --base-url https://TU-TUNEL.trycloudflare.com
```

En Wix: **Tienda → Productos → Más acciones → Importar → Subir CSV**. El campo
`sku` debe coincidir exactamente con el `default_code` de Odoo.

### 3.3 Botón de checkout

En la **Página del carrito** de Wix:

1. Agrega un botón con el texto **Ejecutar pago en Trebol4Devop**.
2. En **Enlace → Dirección web**, pega:

```
https://TU-TUNEL.trycloudflare.com/checkout?back=https%3A%2F%2Fcarlosdelcidramire.wixsite.com%2Fmy-site-1
```

3. Elige **Nueva pestaña** y publica el sitio.
4. Si cambia el túnel, actualiza la URL del botón.

El checkout propio incluye catálogo, carrito, datos del cliente, IVA 12 %,
pago simulado y transferencia bancaria. Al confirmar crea el pedido en Odoo,
genera la factura y muestra los PDFs y el enlace al portal.

### 3.4 Portal

Abre `https://TU-TUNEL.trycloudflare.com/portal` o usa el enlace que aparece al
confirmar un pedido. El acceso de demo es:

- Correo: el correo del cliente (ej. `cliente.wix.demo@example.com`).
- Código: `trebol2026` (configurable con `PORTAL_ACCESS_CODE`).

## 4. Velo (opcional)

El checkout/portal propios **no requieren Velo**. Si quieres usar el carrito
local de Velo en lugar del catálogo del bridge, el código está en:

- `wix/public/cart.js` — carrito en `localStorage`.
- `wix/pages/Tienda.js` — catálogo con repeater y botón “Agregar”.
- `wix/pages/Carrito.js` — carrito y botón “Finalizar compra”.
- `wix/pages/Producto.js` — botón de carrito en la página de producto.
- `wix/pages/masterPage.js` — contador del carrito en el header.

Para usarlo, activa **Dev Mode** en el editor, pega los archivos y crea los
elementos con los IDs indicados al inicio de cada archivo. El checkout se abre
con `getCheckoutUrl()` de `backend/portal.jsw`.

## 5. Secretos (solo si usas eventos nativos de Wix)

En **Dev Mode → Secrets Manager**:

| Nombre | Valor |
|---|---|
| `BRIDGE_URL` | URL del túnel, sin slash final |
| `BRIDGE_KEY` | Igual a `BRIDGE_API_KEY` del `.env` |

Los eventos `wixStores_onNewOrder` / `wixStores_onOrderPaid` están en
`wix/backend/events.js`. No son necesarios para el checkout propio, pero se
mantienen para pedidos creados con el carrito nativo de Wix.

## 6. Probar

```bash
python3 scripts/e2e_test.py
```

Prueba catálogo, checkout, idempotencia, cotización, pedido Wix, factura y PDFs.
También puedes probar manualmente:

1. `https://TU-TUNEL.trycloudflare.com/checkout`
2. Agrega un producto y confirma con pago simulado.
3. Descarga el pedido/factura PDF.
4. Abre el portal con el enlace de confirmación.

## 7. Limitaciones

- El plan gratuito de Wix no permite checkout nativo; el checkout es propio.
- Wix Payments no está disponible en Guatemala.
- La factura fiscal oficial es la de Odoo.
- El túnel gratuito cambia de URL al reiniciarse.
- El catálogo se importa como productos físicos con envío gratis.
- El portal de demo usa correo + código; para producción se recomienda SSO.
