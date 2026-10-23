# Manual de Usuario y Operación — Trebol4Devop Fase 3

Guía operativa y paso a paso para el usuario final, evaluadores y administradores del e-commerce integrado **Wix Stores + Odoo 16 ERP/CRM**, conectado mediante el bridge Node.js / TypeScript.

---

## Índice de Contenidos

1. [Entorno y Enlaces de Acceso](#1-entorno-y-enlaces-de-acceso)
2. [Credenciales de Demostración](#2-credenciales-de-demostración)
3. [Navegación del Catálogo y Filtros Avanzados](#3-navegación-del-catálogo-y-filtros-avanzados)
4. [Carrito Lateral y Gestión de Artículos](#4-carrito-lateral-y-gestión-de-artículos)
5. [Checkout Propio y Métodos de Pago](#5-checkout-propio-y-métodos-de-pago)
6. [Simulación de Facturación, Vista Previa y Descarga de PDFs](#6-simulación-de-facturación-vista-previa-y-descarga-de-pdfs)
7. [Agendamiento de Citas Técnicas (CRM Odoo)](#7-agendamiento-de-citas-técnicas-crm-odoo)
8. [Canales de Atención por WhatsApp (+502 2300-0000)](#8-canales-de-atención-por-whatsapp-502-2300-0000)
9. [Portal de Autoservicio del Cliente](#9-portal-de-autoservicio-del-cliente)
10. [Preguntas Frecuentes y Solución de Problemas (Troubleshooting)](#10-preguntas-frecuentes-y-solución-de-problemas-troubleshooting)

---

## 1. Entorno y Enlaces de Acceso

El ecosistema opera integrando la vitrina web en Wix (plan gratuito) con el backend transaccional en Odoo 16 servido a través del bridge:

| Canal / Módulo | URL de Acceso | Descripción |
|---|---|---|
| **Sitio Principal Wix** | [carlosdelcidramire.wixsite.com/my-site-1](https://carlosdelcidramire.wixsite.com/my-site-1) | Vitrina de marca, inicio, presentación institucional y soluciones. |
| **Catálogo de Servicios** | [my-site-1/tienda](https://carlosdelcidramire.wixsite.com/my-site-1/tienda) | Catálogo con 30 servicios clasificados y filtros combinables. |
| **Carrito Wix** | [my-site-1/cart-page](https://carlosdelcidramire.wixsite.com/my-site-1/cart-page) | Carrito con botón "Ejecutar pago en Trebol4Devop". |
| **Agendar Cita** | `https://TU-TUNEL.trycloudflare.com/agendar-cita`<br>*(Local: `http://localhost:4000/agendar-cita`)* | Formulario de asesoría técnica conectado a Odoo CRM, sin Velo ni plan pago. |
| **Checkout Propio** | `https://TU-TUNEL.trycloudflare.com/checkout`<br>*(Local: `http://localhost:4000/checkout`)* | Plataforma de pago propia con catálogo, IVA 12 % y facturación. |
| **Portal de Clientes** | `https://TU-TUNEL.trycloudflare.com/portal`<br>*(Local: `http://localhost:4000/portal`)* | Consulta de pedidos, cotizaciones, facturas y descarga de PDFs. |
| **Odoo ERP / CRM** | `http://localhost:8069` | Backend administrativo (Ventas, Facturación, Inventario, CRM). |

> [!NOTE]
> **URL fija de esta instalación:** `https://carlos.tail30045d.ts.net` (Tailscale Funnel). No cambia al reiniciar la PC; solo deja de responder si la PC se apaga. El botón del carrito y “Agendar Cita” ya apuntan a esa URL. Para reinstalar o cambiar a otra opción revisa [`../tunel-estable.md`](../tunel-estable.md).

---

## 2. Credenciales de Demostración

Para interactuar con todas las funcionalidades durante la evaluación, utiliza las siguientes cuentas preconfiguradas:

### 2.1 Portal de Autoservicio de Clientes (`/portal`)
- **Código de acceso unificado:** `trebol2026` (o valor definido en `PORTAL_ACCESS_CODE`).
- **Cuentas corporativas registradas:**
  1. `cmendoza@tecnoguate.com.gt` — Corporación TecnoGuate S.A. (con pedidos y cotizaciones activas).
  2. `sestrada@fintechnorte.gt` — Fintech Soluciones del Norte (con pedidos pendientes y cotizaciones).
  3. `gorellana@agrosanrafael.com.gt` — AgroExportadora San Rafael (historial completo de pedidos).
  4. `cliente.wix.demo@example.com` — Cliente general para pruebas de checkout web.

### 2.2 Administrador de Odoo 16 (`http://localhost:8069`)
- **Base de datos:** `Trebol4Devop`
- **Usuario:** `admin`
- **Contraseña:** `admin`

---

## 3. Navegación del Catálogo y Filtros Avanzados

El catálogo reúne **30 productos y servicios tecnológicos** sincronizados con Odoo. Puede explorarse tanto desde la página de Tienda en Wix como directamente en la vista integrada del `/checkout`.

```
[Buscador libre: "e-commerce"]  [Categoría: "Sitios Web"]  [Precio: Q 500 - Q 5000]  [Orden: Menor a Mayor]
                             ┌──────────────────────────────┐
                             │  30 servicios sincronizados  │
                             └──────────────┬───────────────┘
                                            ▼
                      [Tarjeta de Producto / Modal Enriquecido]
                       • SKU Oficial Odoo (default_code)
                       • Stock disponible en tiempo real
                       • Precio GTQ con 12 % IVA incluido
                       • Características técnicas (bullet points)
                       • Tiempo de entrega y público objetivo
```

### 3.1 Búsqueda y Filtros Combinables
1. **Búsqueda por texto libre:** Escribe cualquier término (ej. *tienda*, *móvil*, *soporte*, *ERP*) para filtrar al instante por nombre o contenido.
2. **Filtro por Categoría:** Selecciona entre las 5 categorías oficiales:
   - *Sitios Web* (Landing pages, corporativos, tiendas e-commerce).
   - *Apps Móviles* (Desarrollo nativo iOS/Android, híbrido y multiplataforma).
   - *Mantenimiento Mensual* (Planes de soporte técnico continuo y DevOps).
   - *Licencias de Módulos* (Módulos ERP especializados y extensiones).
   - *Servicios Adicionales* (Auditorías de seguridad, SEO, migraciones en la nube).
3. **Rango de Precio:** Define montos mínimos y máximos en Quetzales (GTQ) para acotar soluciones al presupuesto deseado.
4. **Ordenamiento Dinámico:** Ordena por precio ascendente, descendente o alfabéticamente (A-Z).
5. **Botón "Limpiar filtros":** Restablece todos los criterios y vuelve a mostrar el total de 30 productos.

### 3.2 Modal de Detalle Extendido de Producto
Al hacer clic en cualquier producto o en el botón **"Ver detalle"**, se despliega una ficha técnica enriquecida con:
- **SKU Oficial:** Código identificador único en Odoo (ej. `WEB-BAS-01`, `APP-ECO-02`).
- **Stock disponible:** Consulta en tiempo real de unidades disponibles en el inventario de Odoo (stock inicial de 100 unidades por ítem).
- **Precio oficial:** Monto en Quetzales con el 12 % de IVA incluido por ley.
- **Descripción enriquecida:**
  - Resumen ejecutivo del alcance del servicio.
  - Lista de **Características principales** (`<ul><li>...</li></ul>`).
  - **Tiempo estimado de entrega** (ej. *2 a 4 semanas*).
  - **Ideal para:** Perfil de negocio recomendado (ej. *PyMEs en expansión*, *Startups*).
- **Acción:** Botón **"Agregar al carrito"** que suma inmediatamente el producto y notifica al usuario.

---

## 4. Carrito Lateral y Gestión de Artículos

El carrito permite administrar los artículos seleccionados antes de pasar a la confirmación de la orden, garantizando total legibilidad tanto en escritorio como en dispositivos móviles.

```
┌────────────────────────────────────────────────────────┐
│  Carrito de Compras (Panel Lateral / Checkout)         │
├────────────────────────────────────────────────────────┤
│  • Tienda E-commerce Básica                            │
│    SKU WEB-ECO-04 · [ - ] 1 [ + ]  [Eliminar]   Q 990  │
├────────────────────────────────────────────────────────┤
│  Subtotal (base imponible sin IVA):             Q 883.93 │
│  IVA (12 % fiscal incluido):                    Q 106.07 │
│  TOTAL A PAGAR:                                 Q 990.00 │
├────────────────────────────────────────────────────────┤
│  [  Ejecutar pago en Trebol4Devop (Ir al Checkout)  ]  │
└────────────────────────────────────────────────────────┘
```

### 4.1 Operaciones del Carrito
- **Añadir productos:** Pulsa "Agregar al carrito" desde la grilla o desde el modal de detalle.
- **Incrementar / Disminuir cantidad:** Usa los botones `+` y `−` para ajustar la cantidad deseada. Si la cantidad baja a 0, el ítem se elimina automáticamente.
- **Eliminar producto:** Haz clic en el enlace rojo o botón **"Eliminar"** para retirar el servicio.
- **Vaciar carrito:** El botón "Vaciar carrito" limpia el almacenamiento local y reinicia la sesión de compra.

### 4.2 Desglose Financiero con IVA 12 %
El carrito desglosa los valores respetando la legislación tributaria guatemalteca:
- $\text{Subtotal} = \frac{\text{Total}}{1.12}$ (base gravable).
- $\text{IVA} = \text{Total} - \text{Subtotal}$ (12 % exacto).
- $\text{Total} = \text{Monto final a pagar en GTQ}$.

### 4.3 Adaptabilidad Móvil y Prevención de Truncamiento
- El contenedor lateral del carrito mantiene un ancho ergonómico (380 px – 420 px).
- Los títulos largos de servicios aplican `overflow-wrap: break-word` y `auto-expand` para no cortar textos ni ocultar precios.
- Si un nombre se visualiza abreviado en pantallas pequeñas, posar el cursor o pulsar sobre él muestra un **tooltip** con el nombre íntegro.
- Los botones de acción mantienen un margen de seguridad de al menos 12 px para evitar toques accidentales en la barra de navegación del teléfono.

---

## 5. Checkout Propio y Métodos de Pago

El checkout propio (`/checkout`) solventa la restricción del plan gratuito de Wix y la indisponibilidad de Wix Payments en Guatemala, ejecutando el flujo transaccional directamente contra Odoo.

### 5.1 Datos del Cliente y Facturación
El formulario solicita los datos requeridos para la emisión contable oficial:
1. **Nombre completo / Razón Social** (mínimo 2 caracteres).
2. **Correo electrónico:** Clave de vinculación con el historial del cliente y el portal de autoservicio.
3. **Teléfono de contacto.**
4. **Empresa:** Opcional; asocia el contacto a una cuenta empresarial en Odoo.
5. **NIT / Facturación:**
   - Para Consumidor Final, deja el valor por defecto **`CF`**.
   - Para factura con crédito fiscal, ingresa el NIT guatemalteco (ej. `1234567-8` o `9876543-2`). Queda registrado en el campo `vat` de `res.partner`.
6. **Dirección y Ciudad:** Dirección fiscal y de entrega.
7. **Notas adicionales:** Instrucciones especiales para el pedido (horarios, requerimientos técnicos).

### 5.2 Los Tres Métodos de Pago y su Impacto en Odoo

Trebol4Devop soporta tres modalidades de pago con comportamiento contable diferenciado en el ERP:

```
                      ┌────────────────────────────┐
                      │    Confirmación Pedido     │
                      └─────────────┬──────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
 [Pago Simulado]         [Transferencia Bancaria]       [Contra Entrega]
  • Pedido confirmado     • Pedido confirmado            • Pedido confirmado
  • Factura emitida       • Factura emitida              • Factura emitida
  • PAGO REGISTRADO       • PAGO PENDIENTE               • PAGO PENDIENTE
    (state = 'paid')        (state = 'not_paid')           (state = 'not_paid')
```

| Método de Pago | Valor Técnico | Estado en Odoo (`x_web_stage`) | Estado de Factura (`payment_state`) | Cuándo se asienta el cobro |
|---|---|---|---|---|
| **Pago simulado (demo)** | `simulated` | `paid` (Pagado) | `paid` / `in_payment` | **Inmediato:** Para efectos académicos, el bridge invoca `action_web_register_payment` y asienta el cobro en el diario de banco. |
| **Transferencia bancaria** | `transfer` | `invoiced` (Facturado) | `not_paid` (Pendiente) | **Diferido:** El cliente recibe los datos de la cuenta de Banco Industrial y envía el comprobante a `pagos@trebol4devop.com`. Contabilidad valida y registra el pago en Odoo. |
| **Contra entrega** | `contra_entrega` | `invoiced` (Facturado) | `not_paid` (Pendiente) | **Al recibir el servicio:** El pedido queda facturado legalmente y el cobro se registra en Odoo una vez el personal técnico o de entrega percibe los fondos. |

### 5.3 Idempotencia y Protección contra Duplicados
- Cada sesión de compra genera un identificador único `checkoutId` (ej. `WEB-e2e-checkout-1698000000`).
- Si el usuario hace doble clic o reenvía la petición por intermitencia de red, el bridge detecta el `client_order_ref` existente en Odoo.
- **Resultado:** No se crea una orden duplicada; el sistema retorna la orden previamente registrada con la bandera `replayed: true`.

---

## 6. Simulación de Facturación, Vista Previa y Descarga de PDFs

El sistema ofrece transparencia fiscal total antes y después de la confirmación:

```
[ Formulario de Checkout ] ──▶ [ Ver vista previa de factura ]
                                             │ (Modal con desglose fiscal)
                                             ▼
                               [ Confirmar Pedido ]
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
             [ Pedido en PDF ]                         [ Factura Oficial en PDF ]
         (sale.report_saleorder)                        (account.report_invoice)
```

### 6.1 Vista Previa de Factura
Antes de presionar "Confirmar pedido", el cliente puede hacer clic en el botón **"📄 Ver vista previa de factura"**:
- Se abre una ventana modal estilizada como documento contable guatemalteco.
- Muestra el emisor con los datos fiscales configurados en la compañía de Odoo.
- Muestra el receptor: Nombre, Empresa, NIT indicado (o `CF`) y Dirección.
- Detalla cada línea del pedido con su código SKU, cantidad, precio unitario y total.
- Refleja el cálculo exacto de **Subtotal**, **IVA 12 %** y **Total a pagar**.
- Permite confirmar el pedido directamente desde la vista previa o volver para corregir información.

### 6.2 Confirmación y Descarga de Documentos Oficiales
Al completarse el pedido, la pantalla de éxito presenta:
1. **Identificador del Pedido:** Código oficial asignado por Odoo (ej. `S00018`).
2. **Identificador de la Factura:** Número contable emitido (ej. `INV/2026/00014`).
3. **Botón "Ver pedido en PDF":** Descarga el comprobante de venta generado por el motor de reportes de Odoo (`sale.report_saleorder`).
4. **Botón "Factura [INV/2026/XXXX] PDF":** Descarga la factura tributaria oficial (`account.report_invoice`) firmada con token criptográfico temporal.
5. **Botón "Ver en el portal de clientes":** Enlace directo al portal con sesión autenticada.

---

## 7. Agendamiento de Citas Técnicas (CRM Odoo)

Para clientes corporativos que requieren una consultoría de arquitectura, DevOps o implementación ERP antes de contratar, Trebol4Devop dispone de un módulo de agendamiento en línea.

```
Cliente llena formulario web
(Nombre, Email, Tel, Fecha, Hora, Motivo)
                │
                ▼
POST /api/checkout/appointment
                │
                ▼
Odoo CRM: crm.lead (Oportunidad)
  • Nombre: "Cita: [Motivo] - [Cliente]"
  • Etapa: la del pipeline de CRM (la oportunidad se crea sin forzar etapa)
  • Referencia única: APT-xxxxxxxxxxxx (Idempotente)
  • Chatter: Notificación automática con fecha y hora
```

### 7.1 Paso a Paso para Agendar una Cita
1. Accede a `https://TU-TUNEL.trycloudflare.com/agendar-cita` (o al botón "Agendar Cita" del sitio Wix, que enlaza a esa URL). Es una página del bridge y no requiere Velo ni plan pago.
2. Completa los campos del formulario:
   - **Nombre y Apellido:** Persona de contacto.
   - **Correo electrónico:** Correo corporativo.
   - **Teléfono de contacto:** Número para confirmación o llamada.
   - **Empresa:** Nombre de la organización.
   - **Fecha sugerida:** Selecciona una fecha en el calendario (`YYYY-MM-DD`).
   - **Hora propuesta:** Selecciona la hora deseada (`HH:MM`).
   - **Motivo de la reunión:** Elige entre *Implementación ERP Odoo*, *Desarrollo Web & E-commerce*, *Infraestructura y DevOps*, *Auditoría de Sistemas* o *Soporte Técnico*.
   - **Requerimientos adicionales:** Breve resumen del proyecto o inquietudes.
3. Haz clic en **"Agendar Cita Técnica"**.
4. **Resultado esperado:**
   - La pantalla muestra el mensaje de confirmación con el código de referencia (ej. `APT-a1b2c3d4e5f6`).
   - En **Odoo CRM**, se crea automáticamente una oportunidad (`crm.lead`) en el pipeline de ventas.
   - Si el cliente ya existe en Odoo (`res.partner`), la oportunidad se asocia a su expediente.
   - El chatter de Odoo registra una nota interna con el día, hora y motivo especificados.

---

## 8. Canales de Atención por WhatsApp (+502 2300-0000)

Trebol4Devop mantiene atención directa e inmediata mediante WhatsApp para resolver dudas de cotizaciones, soporte o pagos.

- **Número oficial de contacto:** `+502 2300-0000`
- **Ubicación en el sitio:**
  - **Botón Flotante:** Presente en la esquina inferior derecha de todas las páginas de Wix y del checkout propio.
  - **Enlaces de Texto:** Ubicados en el encabezado superior y en el pie de página (*Footer*).
- **Mensajería Inteligente y Contextual:**
  - *Navegación general:* Al hacer clic desde el catálogo o página de inicio, precarga:
    `"Hola Trebol4Devop, quiero información sobre sus servicios de software y Odoo ERP."`
  - *Contexto de Checkout:* Al confirmar un pedido en `/checkout`, el botón de WhatsApp se actualiza dinámicamente con el número de orden asignado:
    `"Hola Trebol4Devop, tengo una consulta sobre mi pedido S00018."`

---

## 9. Portal de Autoservicio del Cliente

El portal en `/portal` ofrece a los clientes visibilidad y control sobre todas sus transacciones con Trebol4Devop.

### 9.1 Ingreso al Portal
1. Accede a `https://TU-TUNEL.trycloudflare.com/portal` (o mediante el enlace al finalizar una compra).
2. Ingresa tu correo electrónico registrado y el código de acceso: `trebol2026`.
3. Haz clic en **"Iniciar sesión"**.

### 9.2 Secciones Disponibles
- **📊 Resumen (Dashboard):**
  - Tarjetas con indicadores en tiempo real: número de cotizaciones activas, pedidos confirmados y facturas pendientes de pago con el saldo total adeudado.
- **📝 Cotizaciones:**
  - Listado de cotizaciones emitidas por el equipo de ventas.
  - Botón **"Aceptar cotización"**: El cliente puede aprobar una cotización en línea, lo que actualiza la cotización en Odoo a pedido de venta confirmado y genera la factura contable respectiva.
- **📦 Pedidos:**
  - Historial de pedidos con su referencia (`S000XX`), fecha, líneas de servicio y estado semafórico (`Cotización`, `Confirmado`, `En preparación`, `Despachado`, `Facturado`, `Pagado`).
  - Para pedidos con factura pendiente (Transferencia o Contra Entrega), incluye el botón **"Simular pago"** para demostraciones.
- **🧾 Facturas:**
  - Relación completa de facturas contables (`INV/2026/XXXX`).
  - Visualización del estado: *Pagada*, *Pendiente*, *En pago*.
  - Enlace seguro para **descargar la factura oficial en PDF**.
- **👤 Perfil:**
  - Información de la empresa, dirección de facturación, NIT registrado y datos de contacto.

---

## 10. Preguntas Frecuentes y Solución de Problemas (Troubleshooting)

### P1. Al hacer clic en "Ejecutar pago en Trebol4Devop" en Wix, obtengo error 404 o "No se puede conectar".
- **Causa:** El túnel rápido de Cloudflare es dinámico y su URL cambió al reiniciar el servicio o apagar la PC.
- **Solución rápida:**
  1. En la consola del host ejecuta:
     ```bash
     make start
     ```
  2. El comando levanta el stack, obtiene la nueva URL, actualiza el CSV y escribe
     `wix/TUNEL_ACTUAL.md` con los enlaces exactos.
  3. En el editor de Wix, edita el botón del carrito y pega el checkout que muestra
     el comando.
  4. En Wix Dev Mode → Secrets Manager, actualiza `BRIDGE_URL` con la URL base.
  5. Publica el sitio.
- **Solución definitiva:** usa una URL fija con Tailscale Funnel, ngrok o un
  Cloudflare Named Tunnel. Guía: [`../tunel-estable.md`](../tunel-estable.md).
  Si necesitas que el sitio siga arriba con la PC apagada, despliega el stack en
  un VPS.

### P2. El bridge devuelve error 502 Bad Gateway o "Odoo no responde".
- **Causa:** El contenedor de Odoo está en proceso de arranque o aplicando actualizaciones de módulos (`-u trebol4devop_ecommerce`).
- **Solución:**
  1. Revisa el estado del contenedor: `docker compose ps`.
  2. Verifica el healthcheck: `curl http://localhost:4000/health`. Cuando Odoo esté listo, devolverá `{"ok":true,"odoo":"up"}`.
  3. Si Odoo falló, revisa los registros con `docker compose logs -f odoo`.

### P3. Realicé un pedido con "Transferencia bancaria" o "Contra entrega" y la factura aparece como "Pendiente". ¿Es un error?
- **Respuesta:** No, es el comportamiento correcto y legal. A diferencia del método `simulated`, en `transfer` y `contra_entrega` Odoo emite la factura contable pero mantiene el cobro pendiente hasta que se recibe la transferencia o el efectivo. El administrador o cajero registra el pago manualmente en Odoo cuando los fondos ingresan a la empresa.

### P4. ¿Por qué al dar doble clic en "Confirmar pedido" no se generaron dos facturas?
- **Respuesta:** El bridge implementa idempotencia estricta mediante el token `WEB-<checkoutId>`. Si se envía la misma orden múltiples veces, Odoo reconoce la referencia existente y devuelve los datos del pedido original sin duplicar ventas, inventario ni facturas.

### P5. ¿Dónde se visualizan las citas agendadas en Odoo?
- **Respuesta:** Ingresa a Odoo (`http://localhost:8069`) con usuario `admin` / `admin`, dirígete a la aplicación **CRM** y revisa el tablero Kanban del equipo de ventas. La cita aparecerá como una nueva oportunidad con el título `Cita: [Motivo] - [Cliente]` y su detalle en el chatter.

### P6. ¿Cómo cierro sesión en el portal del cliente?
- **Respuesta:** En la barra superior del portal (`/portal`), haz clic en el botón **"Cerrar sesión"**. Esto destruye el token de sesión almacenado en el navegador. Para reingresar, bastará con indicar nuevamente el correo y el código `trebol2026`.
