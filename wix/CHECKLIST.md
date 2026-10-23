# Checklist de implementación en Wix

Guía detallada: [`README.md`](README.md).

> **Plan gratuito:** el checkout, el portal, los filtros avanzados y el
> agendamiento de citas viven en el bridge. En Wix solo se usan funciones
> gratuitas del editor y enlaces externos. No se requiere Wix Payments,
> Wix Bookings ni plan Premium. La sección Velo es opcional.

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

- [x] `/checkout` sirve catálogo integrado, carrito, datos del cliente y facturación.
- [x] Tres métodos de pago soportados: `simulated` (demo), `transfer` (transferencia bancaria) y `contra_entrega` (pago al recibir).
- [x] Modal de vista previa de factura antes de confirmar (cálculo de Subtotal e IVA 12 %).
- [x] Crea `sale.order` en Odoo, confirma, factura y (si es simulado) registra el pago.
- [x] Devuelve PDFs oficiales de pedido/factura y enlace directo al portal.
- [x] Botón **Ejecutar pago en Trebol4Devop** en la página del carrito de Wix.
- [x] Enlace del botón apunta a `/checkout?back=...`.
- [x] Menú **Tienda** del sitio apunta directamente al checkout del Funnel.
- [ ] Botón nativo **“Realizar compra”** de Wix: el editor Harmony no expone un toggle para ocultarlo; las páginas de producto quedaron fuera de la navegación principal. Para ocultarlo del todo hace falta Velo/CSS o deshabilitar la página de producto.
- [x] Probado end-to-end con idempotencia y trazabilidad CRM.

## Portal propio

- [x] `/portal` con login por correo + código (`trebol2026`).
- [x] Resumen (KPIs), cotizaciones, pedidos, facturas y perfil.
- [x] Aceptar cotización en línea y simular pago para pedidos facturados.
- [x] Descarga de PDFs de facturas con token firmado de corta duración.
- [x] Enlace al portal desde la confirmación del checkout.

## Cambios visuales en Wix Editor

> **Aplicado y publicado el 21/10/2026 desde el editor Wix Harmony (plan gratuito):**
> se eliminó el botón “Inicia tu plan”, el placeholder “Título 2” y el bloque
> completo de suscripción del footer. También se publicó la URL fija de
> **Tailscale Funnel** (`https://carlos.tail30045d.ts.net`) en el botón del
> carrito y en “Agendar Cita”. El resto de enlaces/beneficios visuales sigue
> pendiente y se detalla abajo.

- [x] **Punto 1 y 17 — Eliminar "Inicia tu plan":**
  - [x] Seleccionar y borrar el botón `#btnIniciaPlan` del Header en el editor.
  - [x] Verificado en el sitio publicado: el botón ya no aparece.
  - [ ] Quitar enlaces hacia `#contact`.
  - [ ] Publicar cambios (en `masterPage.js` `#btnIniciaPlan` se oculta defensivamente).
- [ ] **Punto 2 — Ancla y comportamiento de "Acerca de":**
  - [ ] Renombrar el ancla de la sección de `#Section 10` a `#acerca-de`.
  - [ ] Vincular el ítem "Acerca de" del menú hacia `#acerca-de`.
  - [ ] Asignar ID `#lnkAcercaDe` al enlace del menú si es personalizado.
- [ ] **Punto 3 y 10 — Footer sin suscripción y con enlaces útiles:**
  - [x] Eliminar bloque y formulario de suscripción (`#formSubscribe`, `#btnSubscribe`, `#inpSubscribeEmail`). Verificado en el sitio publicado.
  - [ ] Agregar enlaces útiles: `#lnkTienda`, `#lnkCheckout`, `#lnkPortal`, `#lnkCita`, `#lnkWhatsApp`.
  - [ ] Configurar descripción corporativa breve en `#txtFooterDescripcion`.
- [x] **Punto 5 — Eliminar placeholder "Título 2":**
  - [x] Borrar en el editor la caja de texto residual debajo de Sobre Trebol4Devop (`#txtTitulo2`). Verificado en el sitio publicado.
  - [ ] Verificar que no queden cajas vacías ni placeholders en Home ni en Acerca de.
- [ ] **Punto 6 — Fondos limpios de marca:**
  - [ ] Cambiar fondos de plantilla por colores planos corporativos:
    - `#0b3d3b` (Verde principal) en Hero y Footer.
    - `#ffffff` en sección Acerca de.
    - `#f1f8f4` en sección Soluciones / Tecnología.
    - `#d8a24a` para acentos.
  - [ ] Asignar IDs de sección: `#sectionHero`, `#sectionAcerca`, `#sectionTecnologia`, `#sectionFooter`.
- [ ] **Punto 7 — Botones "Saber más":**
  - [ ] Conectar `#btnSaberMas` (Hero) hacia `#acerca-de`.
  - [ ] Conectar `#btnSaberMas2` (Intermedio) hacia `#technology` o `/tecnologia`.
  - [ ] Conectar `#btnConocerMas` (Funciones/Servicios) hacia `/tienda`.
  - [ ] Ningún botón debe apuntar al ancla obsoleta `#contact`.
- [ ] **Punto 8 — Video corporativo:**
  - [ ] En los ajustes de `#videoPlayer` / `#videoFondo`: Loop = Off, Muted = On, Controls = Off.
  - [ ] Agregar capa transparente `#videoOverlay` sobre el video para bloquear clics accidentales.
- [ ] **WhatsApp en todo el sitio:**
  - [ ] Agregar botón flotante fijado en pantalla con ID `#btnWhatsApp`.
  - [ ] Configurar enlace hacia `https://wa.me/50223000000?text=...`.
- [x] **Botón “Agendar Cita” enlazado al bridge:**
  - [x] El botón del home apunta a `https://carlos.tail30045d.ts.net/agendar-cita`.
  - [ ] (Opcional) Crear una página nativa `/agendar-cita` en Wix con los elementos `#inpNombre`, `#inpEmail`, `#inpTelefono`, `#inpEmpresa`, `#inpFecha`, `#inpHora`, `#ddlMotivo`, `#txtNotas`, `#btnAgendar`, `#txtEstado`, `#loaderCita`.
- [ ] **Carrito lateral sin truncamiento:**
  - [ ] Configurar contenedor con ancho mínimo de 380 px – 420 px.
  - [ ] Configurar auto-expand en `#txtName` y precios sin altura fija.
  - [ ] Verificar espaciado y legibilidad vertical en móvil.
- [ ] **Reimportación de Catálogo y Secretos:**
  - [ ] Reimportar `wix/catalog/productos_wix.csv` marcando sobrescribir productos existentes por SKU.
  - [ ] En Secrets Manager, actualizar `BRIDGE_URL` (URL HTTPS del túnel actual) y `BRIDGE_KEY`.

## Módulos y páginas Velo (Dev Mode)

### Scripts de páginas (`wix/pages/`)
- [ ] `masterPage.js` — Guard `#btnIniciaPlan`, fondos de marca, footer y WhatsApp flotante.
- [ ] `Home.js` — Botones `#btnSaberMas`, video `#videoPlayer` / `#videoOverlay`, limpieza `#txtTitulo2`.
- [ ] `Tecnologia.js` — Pestañas `#btnTab1..#btnTab3`, `#boxTab1..#boxTab3`, scroll suave `#technology`.
- [ ] `AcercaDe.js` — Enlace `#lnkAcercaDe`, scroll a `#acerca-de`, reveal animado `#txtAcercaTexto`.
- [ ] `AgendarCita.js` — Formulario de citas, validación de fecha/hora y consumo de `requestAppointment()`.
- [ ] `Tienda.js` — Filtros combinables:
  - [ ] Búsqueda: `#txtSearch`
  - [ ] Categoría dinámica: `#ddlCategory`
  - [ ] Rango de precio: `#txtMinPrice`, `#txtMaxPrice`
  - [ ] Orden: `#ddlSort`
  - [ ] Limpiar: `#btnClearFilters`
  - [ ] Contador y estado: `#txtResultCount`, `#txtEmpty`
  - [ ] Repeater: `#repeaterProducts` (`#imgProduct`, `#txtName`, `#txtCategory`, `#txtPrice`, `#txtSku`, `#btnAdd`)
- [ ] `Carrito.js` — `#repeaterCart`, `#txtSubtotal`, `#txtTax`, `#txtTotal`, `#btnCheckout`, tooltips para nombres.
- [ ] `Producto.js` — Integración con carrito propio mediante `#btnAddCart`.
- [ ] `Cotizacion.js` — Solicitud de cotización conectada a CRM Odoo.
- [ ] Páginas del portal: `MiCuenta.js`, `MiPerfil.js`, `MisCotizaciones.js`, `MisPedidos.js`, `MisFacturas.js`.

### Scripts públicos y backend (`wix/public/` y `wix/backend/`)
- [ ] `public/cart.js` pegado en Dev Mode → Public.
- [ ] `backend/bridge.jsw` pegado en Dev Mode → Backend (incluye `callBridge`, `getBridgePublicUrl`, `requestAppointment`).
- [ ] `backend/portal.jsw` pegado en Dev Mode → Backend.
- [ ] `backend/events.js` pegado en Dev Mode → Backend.
- [ ] Secretos en **Secrets Manager**: `BRIDGE_URL` y `BRIDGE_KEY`.

## Pruebas

- [x] `python3 scripts/e2e_test.py` → 40 verificaciones superadas.
- [x] Catálogo con 30 productos y descripciones técnicas enriquecidas.
- [x] Checkout crea pedido con pago simulado (`stage === "paid"`).
- [x] Checkout crea pedido contra entrega (`stage === "invoiced"` y pago pendiente).
- [x] Checkout es idempotente en ambos métodos.
- [x] Cuadre contable de IVA (12 %) exacto.
- [x] Agendamiento de citas técnicas crea lead en CRM Odoo con referencia única e idempotente.
- [x] Portal muestra pedido, factura y PDF.
- [x] Cotización web se convierte en pedido y factura.
- [x] Sitio publicado en Wix.

## Demo

- [ ] Odoo abierto en <http://localhost:8069>.
- [ ] Túnel activo y enlace del botón actualizado.
- [ ] Portal: `cliente.wix.demo@example.com` / código `trebol2026`.
- [ ] Usuarios demo: `cmendoza@tecnoguate.com.gt`,
      `sestrada@fintechnorte.gt`, `gorellana@agrosanrafael.com.gt`.
- [ ] Pedido pagado para mostrar en el portal.
- [ ] Cotización pendiente para mostrar el flujo de aceptación.
