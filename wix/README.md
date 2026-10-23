# Wix ↔ Odoo — Trebol4Devop Fase 3

El sitio Wix funciona como **vitrina y catálogo**. El **checkout** y el
**portal de clientes** corren en el bridge para que el proyecto funcione con el
**plan gratuito de Wix** (sin Wix Payments ni plan Premium).

```
Wix (catálogo, carrito, tienda, citas)
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
make start
```

El comando levanta PostgreSQL, Odoo y el bridge, espera el healthcheck, inicia
el túnel, guarda la URL en `.env`, regenera el CSV y escribe
`wix/TUNEL_ACTUAL.md` con los enlaces. Al final imprime exactamente qué pegar en
Wix. Para consultar solo la URL activa:

```bash
make url
```

La URL se usa para:

- Checkout: `https://TU-TUNEL.trycloudflare.com/checkout`
- Portal: `https://TU-TUNEL.trycloudflare.com/portal`
- Agendar cita: `https://TU-TUNEL.trycloudflare.com/agendar-cita`

> El túnel rápido cambia de URL al reiniciar. Para una URL fija revisa
> [`../docs/tunel-estable.md`](../docs/tunel-estable.md).
>
> **Esta instalación ya usa Tailscale Funnel:**
> `https://carlos.tail30045d.ts.net`. El botón del carrito y “Agendar Cita”
> ya están publicados con esa URL; `make start` la detecta desde `.env`.

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

> **Flujo actual:** el menú **Tienda** apunta directamente a
> `https://carlos.tail30045d.ts.net/checkout`. Así el cliente entra al catálogo
> del bridge y evita el checkout nativo de Wix, que en el plan gratuito muestra
> “No podemos aceptar pagos online”. El botón del carrito se conserva como
> respaldo.

El checkout propio incluye catálogo, carrito, datos del cliente, IVA 12 %,
pago simulado y transferencia bancaria. Al confirmar crea el pedido en Odoo,
genera la factura y muestra los PDFs y el enlace al portal.

### 3.4 Portal

Abre `https://TU-TUNEL.trycloudflare.com/portal` o usa el enlace que aparece al
confirmar un pedido. El acceso de demo es:

- Correo: el correo del cliente (ej. `cliente.wix.demo@example.com`).
- Código: `trebol2026` (configurable con `PORTAL_ACCESS_CODE`).

## 4. Velo (opcional, no requiere plan pago)

> **Plan gratuito:** el flujo transaccional (catálogo con filtros, carrito, checkout,
> portal, citas y WhatsApp contextual) vive en el **bridge**, no en Wix. Para el
> sitio Wix basta el **editor gratuito**: catálogo, botones y enlaces. Velo es
> **opcional** y solo aporta mejoras de presentación. Si tu sitio no permite
> activar Dev Mode, usa los enlaces externos:
>
> - Checkout: `https://TU-TUNEL.trycloudflare.com/checkout`
> - Portal: `https://TU-TUNEL.trycloudflare.com/portal`
> - Agendar cita: `https://TU-TUNEL.trycloudflare.com/agendar-cita`
>
> No se usa Wix Payments, Wix Bookings, Wix Stores checkout, dominio propio ni
> ninguna app de pago. El sitio puede seguir en `wixsite.com` con el plan gratuito.

Para habilitar las mejoras opcionales en el sitio Wix, activa **Dev Mode** (si tu
plan lo permite) y pega los siguientes módulos en sus respectivas páginas o
carpetas de Velo:

### 4.1 Páginas Velo (`wix/pages/`)
- `wix/pages/masterPage.js` — Script global: contador del carrito, WhatsApp flotante, fondos limpios de marca, footer sin suscripción y guard defensivo para `#btnIniciaPlan`.
- `wix/pages/Home.js` — Página de inicio: botones "Saber más" reconectados, video sin bucle ni interacción, y limpieza de placeholders.
- `wix/pages/Tienda.js` — Catálogo completo con filtros combinables (búsqueda, categoría dinámica, rango de precio, ordenamiento) y carrito sincronizado.
- `wix/pages/Carrito.js` — Carrito local, cantidades, cálculo de IVA y apertura del checkout del bridge.
- `wix/pages/Producto.js` — Conexión del botón "Agregar al carrito" en páginas de producto de Wix Stores.
- `wix/pages/Tecnologia.js` — Sistema de pestañas interactivas para arquitectura, DevOps y ERP, con scroll suave y activación por hash `#technology`.
- `wix/pages/AcercaDe.js` — Scroll suave al ancla `#acerca-de`, revelación animada de texto institucional y eliminación del placeholder "Título 2".
- `wix/pages/AgendarCita.js` — Formulario de citas técnicas validado y conectado al CRM de Odoo mediante el bridge.
- `wix/pages/Cotizacion.js` — Formulario para solicitar cotizaciones personalizadas.
- `wix/pages/MiCuenta.js`, `MiPerfil.js`, `MisCotizaciones.js`, `MisPedidos.js`, `MisFacturas.js` — Portal de cliente integrado dentro de Wix.

### 4.2 Código compartido y backend
- `wix/public/cart.js` — Estado del carrito persistido en `localStorage`.
- `wix/backend/bridge.jsw` — Cliente seguro para invocar endpoints del bridge (`callBridge`, `getBridgePublicUrl`, `requestAppointment`).
- `wix/backend/portal.jsw` — Conectores del portal para cotizaciones, pedidos, facturas y catálogo.
- `wix/backend/events.js` — Listeners para eventos nativos de Wix Stores / eCommerce.

## 5. Secretos (Secrets Manager)

En Wix: **Dev Mode → Secrets Manager**:

| Nombre | Valor |
|---|---|
| `BRIDGE_URL` | URL del túnel HTTPS (ej. `https://algo.trycloudflare.com`), sin slash final |
| `BRIDGE_KEY` | Llave secreta del bridge (debe coincidir con `BRIDGE_API_KEY` del `.env`) |

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

---

## 8. Cambios visuales en Wix Editor

> **Estado al 21/10/2026:** ya se eliminaron y publicaron el botón “Inicia tu plan”,
> el placeholder “Título 2” y el bloque de suscripción del footer desde el editor
> Wix Harmony, sin activar ningún plan pago. Quedan pendientes los enlaces del
> footer, WhatsApp, “Saber más”, “Agendar Cita” y los fondos de marca.

A continuación se detalla el procedimiento manual paso a paso que debe realizarse en el **Editor de Wix** (`https://carlosdelcidramire.wixsite.com/my-site-1`) para garantizar coherencia visual, cumplir con la guía de estilo institucional y corregir los defectos de plantilla identificados en los puntos visuales **1, 2, 3, 5, 6, 7, 8, 10 y 17**:

### Punto 1 y 17: Eliminación definitiva de “Inicia tu plan”
- **Defecto en plantilla:** En el encabezado (*Header*) existía un botón genérico y descontextualizado con el texto “Inicia tu plan” que apuntaba al ancla residual `#contact`.
- **Procedimiento paso a paso en el Editor:**
  1. Abre el Editor de Wix y ubícate en el **Header** del sitio (franja superior global).
  2. Selecciona directamente el botón “Inicia tu plan” (`#btnIniciaPlan`).
  3. Pulsa la tecla **Supr / Delete** (o clic derecho → *Eliminar*) para suprimirlo completamente.
  4. Verifica en el inspector de capas que no queden botones ocultos ni enlaces flotantes apuntando a `#contact`.
  5. Pulsa **Publicar**.
- **Respaldo defensivo Velo:** En `masterPage.js`, la función `hideObsoleteElements()` inspecciona `#btnIniciaPlan` en cada carga de página; si el elemento persistiera, le aplica `hide()` y `collapse()`.

### Punto 2: Ancla y comportamiento de “Acerca de”
- **Defecto en plantilla:** El menú principal apuntaba a `#Section 10`, un identificador autogenerado por Wix que carecía de semántica y fallaba en redirecciones externas.
- **Procedimiento paso a paso en el Editor:**
  1. Desplázate a la sección corporativa “Sobre Trebol4Devop”.
  2. En el panel de herramientas del elemento o ancla, abre la configuración y renómbrala formalmente a **`#acerca-de`** (minúsculas, con guion medio, sin espacios).
  3. En el Administrador de Páginas y Menús del sitio, edita el elemento de menú "Acerca de".
  4. Configura el enlace de navegación para que apunte directamente al ancla `#acerca-de` en la página de inicio.
  5. Si el enlace se configuró como botón independiente, asígnale el ID `#lnkAcercaDe`.
- **Respaldo defensivo Velo:** En `AcercaDe.js` y `Home.js`, el script realiza scroll suave animado a `#acerca-de` (manteniendo `#Section 10` como fallback temporal para navegación previa).

### Punto 3 y 10: Footer sin bloque de suscripción y con enlaces útiles
- **Defecto en plantilla:** El pie de página (*Footer*) mostraba un formulario genérico de newsletter (*"Suscríbete ahora / Obtenga noticias..."*) irrelevante para un modelo B2B, y carecía de enlaces institucionales de navegación.
- **Procedimiento paso a paso en el Editor:**
  1. Desplázate a la franja del **Footer** en el editor.
  2. Selecciona la caja o contenedor del formulario de suscripción (`#formSubscribe`, `#inpSubscribeEmail`, `#btnSubscribe`, `#checkboxSubscribe`).
  3. Pulsa **Supr / Delete** para eliminar el formulario de captura por completo.
  4. En su lugar, agrega una lista de enlaces útiles (menú vertical o botones de texto) y asigna sus respectivos IDs:
     - Catálogo / Servicios: `#lnkTienda` → `/tienda`
     - Checkout seguro: `#lnkCheckout` → checkout propio del bridge
     - Portal de Clientes: `#lnkPortal` → portal del cliente
     - Agendar Cita: `#lnkCita` → `/agendar-cita`
     - Atención WhatsApp: `#lnkWhatsApp` → chat directo de WhatsApp
  5. En la columna institucional izquierda, agrega una caja de texto descriptiva con ID `#txtFooterDescripcion` conteniendo el resumen de servicios de ingeniería y DevOps de Trebol4Devop.
- **Respaldo defensivo Velo:** En `masterPage.js`, `hideObsoleteElements()` oculta y colapsa programáticamente cualquier componente remanente del formulario de suscripción.

### Punto 5: Eliminación del placeholder “Título 2” y contenido limpio
- **Defecto en plantilla:** Justo debajo del encabezado “Sobre Trebol4Devop” quedaba visible un elemento de texto de muestra con el texto literal “Título 2”.
- **Procedimiento paso a paso en el Editor:**
  1. En la página de Inicio, ubica la sección “Sobre Trebol4Devop”.
  2. Localiza la caja de texto residual que contiene “Título 2” (`#txtTitulo2`).
  3. Haz clic sobre ella y elimínala definitivamente con **Supr / Delete**.
  4. Asegúrate de que no queden cajas de texto vacías en la sección.
  5. Verifica que el párrafo corporativo principal `#txtAcercaTexto` mantenga la redacción profesional sobre soluciones ERP y DevOps.
- **Respaldo defensivo Velo:** `Home.js` y `AcercaDe.js` detectan si `#txtTitulo2` contiene "Título 2" o texto vacío y ejecutan `hide()` y `collapse()`.

### Punto 6: Fondos limpios de marca
- **Defecto en plantilla:** La plantilla original combinaba fotografías de stock heterogéneas y fondos con patrones visuales que afectaban la legibilidad y la seriedad institucional.
- **Paleta corporativa oficial:**
  - **Verde institucional principal:** `#0b3d3b` (`--green`)
  - **Verde secundario:** `#145a55` (`--green-2`)
  - **Acento Dorado:** `#d8a24a` (`--gold`)
  - **Fondo claro / Contenedor:** Blanco `#ffffff` o crema `#f7f4ec`
  - **Verde suave de fondo:** `#f1f8f4`
  - **Texto / Tipografía:** `#172525`
- **Procedimiento paso a paso en el Editor:**
  1. Haz clic en el fondo de cada sección principal y selecciona **"Cambiar fondo de la franja"**.
  2. Elige el tipo **"Color"** en lugar de "Imagen" o "Video".
  3. Aplica los códigos hexadecimales correspondientes:
     - Hero (`#sectionHero`): Fondo plano `#0b3d3b` (o crema `#f7f4ec`).
     - Acerca de (`#sectionAcerca`): Fondo blanco `#ffffff`.
     - Soluciones / Tecnología (`#sectionTecnologia`): Fondo suave `#f1f8f4`.
     - Footer (`#sectionFooter`): Fondo institucional `#0b3d3b`.
- **Respaldo defensivo Velo:** `masterPage.js` incluye `applyBrandBackgrounds()` que asigna los colores de marca mediante manipulación del estilo en tiempo de ejecución.

### Punto 7: Botones “Saber más” reconectados
- **Defecto en plantilla:** Diversos botones de llamado a la acción con el texto “Saber más ya” o “Conocer más” estaban cableados a `#contact`.
- **Procedimiento paso a paso en el Editor:**
  1. Localiza cada botón en las secciones de inicio:
     - Botón del Hero: Asigna el ID `#btnSaberMas`. Enlace: Ancla `#acerca-de`.
     - Botón de Soluciones Técnicas: Asigna el ID `#btnSaberMas2`. Enlace: Ancla `#technology` o página `/tecnologia`.
     - Botón de Servicios / Catálogo: Asigna el ID `#btnConocerMas`. Enlace: Página `/tienda`.
  2. Elimina cualquier vinculación hacia la vieja ancla `#contact`.
- **Respaldo defensivo Velo:** `Home.js` intercepta los eventos de clic en `#btnSaberMas` y `#btnSaberMas2` para realizar scroll suave a la sección correspondiente.

### Punto 8: Video corporativo sin bucle ni controles invasivos
- **Defecto en plantilla:** El reproductor de video de presentación (`Darle_Darken.mp4`) reproducía en bucle constante, con sonido no silenciado o permitiendo pausas accidentales por clic.
- **Procedimiento paso a paso en el Editor:**
  1. Selecciona el elemento de video (`#videoPlayer` o `#videoFondo`).
  2. En el panel de Ajustes del reproductor de video:
     - **Desactivar:** "Reproducir en bucle" (*Loop = Off*).
     - **Activar:** "Silenciar al inicio" (*Muted = On*).
     - **Desactivar:** "Mostrar controles de reproducción" (*Controls = Off*).
  3. Agrega una caja contenedora transparente encima del video con ID `#videoOverlay` que cubra toda el área para interceptar toques o clics.
- **Respaldo defensivo Velo:** `Home.js` ejecuta programáticamente `video.loop = false`, `video.mute()`, `video.play()` una única vez y anula los eventos de clic sobre `#videoOverlay`.

### Punto visual adicional: Canales de WhatsApp en todo el sitio
- **Procedimiento en el Editor:**
  1. Agrega un botón flotante con el icono de WhatsApp en la esquina inferior derecha.
  2. Fija la posición en pantalla (*Pin to screen*): Abajo a la derecha, margen de 24 px.
  3. Asigna el ID `#btnWhatsApp`.
  4. Configura el enlace a URL externa: `https://wa.me/50223000000?text=Hola%20Trebol4Devop...`.
- **Respaldo defensivo Velo:** `masterPage.js` conecta el botón flotante y el enlace `#lnkWhatsApp` del footer.

### Punto visual adicional: Página de Agendar Cita Técnica
- **Procedimiento en el Editor:**
  1. Crea una página nueva en Wix titulada **"Agendar Cita"** (ruta `/agendar-cita`).
  2. Diseña el formulario corporativo con los campos:
     - `#inpNombre`, `#inpEmail`, `#inpTelefono`, `#inpEmpresa`, `#inpFecha`, `#inpHora`, `#ddlMotivo`, `#txtNotas`, `#btnAgendar`, `#txtEstado`, `#loaderCita`.
  3. Pega el código de `wix/pages/AgendarCita.js` en Dev Mode.
  4. Vincula el botón "Agendar Cita" del menú hacia `/agendar-cita`.

### Punto visual adicional: Carrito lateral y prevención de truncamiento
- **Procedimiento en el Editor:**
  1. Ajusta el panel lateral del carrito a un ancho no menor a **380 px – 420 px**.
  2. En el elemento de repetición (`#repeaterCart`), configura `#txtName` con propiedad de auto-expand (sin altura fija).
  3. En vista móvil, verifica un espaciado vertical mínimo de 12 px entre el total del pedido y el botón `#btnCheckout`.
- **Respaldo defensivo Velo:** `Carrito.js` añade tooltips con el nombre completo y calcula el IVA 12 % en tiempo real.

---

## 9. Reimportación del Catálogo y Configuración de Secretos

Para sincronizar los cambios de precios, descripciones enriquecidas y la URL del bridge en Wix:

### 9.1 Reimportación de `wix/catalog/productos_wix.csv`
1. Ejecuta `make start`: deja el stack y el túnel activos, y regenera el CSV con
   la URL actual. Los enlaces quedan en `wix/TUNEL_ACTUAL.md`.
2. Si prefieres hacerlo manual, regenera solo el CSV:
   ```bash
   python3 scripts/generate_images.py --csv-only --base-url https://TU-TUNEL.trycloudflare.com
   ```
3. En el panel de control de Wix:
   - Dirígete a **Tienda → Productos**.
   - Haz clic en **Más acciones → Importar**.
   - Selecciona **Subir archivo CSV** y carga `wix/catalog/productos_wix.csv`.
   - Marca la casilla **"Sobrescribir productos existentes con el mismo SKU"**.
   - Confirma la asignación de columnas (`Handle`, `Name`, `SKU`, `Price`, `Description`, `Field image`) y pulsa **Importar**.

### 9.2 Reconfiguración de Secretos en Wix (Secrets Manager)
1. En el Editor de Wix, activa **Dev Mode**.
2. En la barra lateral izquierda, dirígete a **Herramientas de Desarrollador → Secrets Manager**.
3. Configura o actualiza los dos secretos requeridos:
   - **`BRIDGE_URL`**: La URL HTTPS completa de tu túnel activo (ej. `https://algo.trycloudflare.com`), **sin** diagonal final `/`.
   - **`BRIDGE_KEY`**: La clave de autenticación compartida (por defecto: `trebol-bridge-dev-key`, coincidente con `BRIDGE_API_KEY` en el `.env`).
4. Haz clic en **Guardar** y pulsa **Publicar** en el editor.
