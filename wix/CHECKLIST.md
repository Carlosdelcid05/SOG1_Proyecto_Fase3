# Checklist de implementación en Wix

Guía detallada: [`README.md`](README.md).

## Cuenta y tienda

- [x] Sitio Wix creado en **plan gratuito**.
- [x] **Wix Stores** agregado.
- [x] **Wix Área personal** agregado (opcional).
- [x] Moneda de la tienda: **GTQ**.
- [x] Impuesto **IVA 12 %** incluido en el precio.
- [x] Envío gratuito / servicios.
- [x] Sitio publicado en `carlosdelcidramire.wixsite.com/my-site-1`.
- [ ] Actualizar el enlace del botón si cambia el túnel.

## Catálogo

- [x] Bridge y túnel levantados (`make up`, `make tunnel`).
- [x] CSV regenerado con la URL del túnel.
- [x] `wix/catalog/productos_wix.csv` importado en Wix.
- [x] 30 productos visibles con SKU correcto.
- [x] Colecciones creadas: Sitios Web, Apps Móviles, Mantenimiento Mensual,
      Licencias de Módulos, Servicios Adicionales.
- [ ] Reemplazar imágenes placeholder de Wix subiendo `assets/products/*.png`
      desde el Administrador de multimedia (opcional: el checkout ya usa las
      imágenes del bridge).

## Checkout propio

- [x] `/checkout` sirve catálogo, carrito, datos del cliente y pago.
- [x] Crea `sale.order` en Odoo, confirma, factura y registra pago simulado.
- [x] Devuelve PDFs y enlace al portal.
- [x] Botón **Ejecutar pago en Trebol4Devop** en la página del carrito de Wix.
- [x] Enlace del botón apunta a `/checkout?back=...`.
- [x] Probado end-to-end (pedido `S00015`, factura `INV/2026/00010`).

## Portal propio

- [x] `/portal` con login por correo + código.
- [x] Resumen, cotizaciones, pedidos, facturas y perfil.
- [x] Aceptar cotización y simular pago.
- [x] Descarga de PDFs con token firmado.
- [x] Enlace al portal desde la confirmación del checkout.

## Velo (opcional)

El checkout y el portal propios no requieren Velo. Si se usa el carrito local:

- [ ] `wix/public/cart.js` pegado.
- [ ] `wix/pages/Tienda.js` pegado y elementos con los IDs indicados.
- [ ] `wix/pages/Carrito.js` pegado.
- [ ] `wix/pages/Producto.js` y `masterPage.js` (opcional).
- [ ] `backend/bridge.jsw` y `backend/portal.jsw` pegados.
- [ ] Secretos `BRIDGE_URL` y `BRIDGE_KEY` configurados.

## Pruebas

- [x] `python3 scripts/e2e_test.py` → 25 verificaciones.
- [x] Checkout crea pedido y factura pagada.
- [x] Checkout es idempotente.
- [x] Portal muestra pedido, factura y PDF.
- [x] Cotización web se convierte en pedido.
- [x] Sitio publicado.

## Demo

- [ ] Odoo abierto en <http://localhost:8069>.
- [ ] Túnel activo y enlace del botón actualizado.
- [ ] Portal: `cliente.wix.demo@example.com` / código `trebol2026`.
- [ ] Usuarios demo: `cmendoza@tecnoguate.com.gt`,
      `sestrada@fintechnorte.gt`, `gorellana@agrosanrafael.com.gt`.
- [ ] Pedido pagado para mostrar en el portal.
- [ ] Cotización pendiente para mostrar el flujo de aceptación.
