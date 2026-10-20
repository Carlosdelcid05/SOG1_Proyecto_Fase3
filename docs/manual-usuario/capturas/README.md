# Capturas para el manual de usuario

Aquí se guardan las imágenes que se insertarán en el manual de usuario de
Trebol4Devop. Cada subcarpeta corresponde a una sección del manual.

```
capturas/
├── 01-wix/        Sitio Wix: inicio, catálogo, producto y carrito
├── 02-checkout/   Checkout propio: catálogo, carrito y confirmación
├── 03-portal/     Portal de clientes: login, resumen, pedidos y facturas
└── 04-odoo/       Odoo: pedido, factura y CRM (vista administrativa)
```

## Convención de nombres

```
NN-descripcion-breve.png
```

Ejemplos:

- `01-inicio-wix.png`
- `02-catalogo-wix.png`
- `03-carrito-wix.png`
- `04-checkout-catalogo.png`
- `05-checkout-carrito.png`
- `06-checkout-confirmacion.png`
- `07-portal-login.png`
- `08-portal-resumen.png`
- `09-portal-facturas.png`
- `10-odoo-pedido.png`

Usa minúsculas, guiones y sin espacios para que las rutas funcionen en Markdown
y en cualquier sistema operativo.

## Recomendaciones

- Resolución sugerida: **1440 × 900** o superior (16:10 / 16:9).
- Formato **PNG** para texto y formularios; JPEG solo si el peso es un problema.
- Captura la ventana completa del navegador cuando sea útil mostrar la URL.
- Oculta o difumina datos personales reales antes de publicar el manual.
- No incluyas contraseñas, tokens ni la barra de herramientas del editor de Wix.
- Si cambia el túnel de Cloudflare, vuelve a capturar las pantallas que muestren
  la URL.

## Cómo referenciarlas en el manual

```markdown
![Inicio del sitio Wix](capturas/01-wix/01-inicio-wix.png)
```

## Capturas iniciales

| Archivo | Contenido | Nota |
|---|---|---|
| `01-wix/01-inicio-wix.png` | Inicio del sitio Wix | Conserva el hero y logo demo del template |
| `01-wix/02-catalogo-wix.png` | Catálogo de Wix con productos y filtros | Conserva productos y categorías demo |
| `01-wix/03-carrito-wix.png` | Carrito de Wix con producto y el botón al checkout | Lista para el manual |
| `02-checkout/04-checkout-catalogo.png` | Catálogo del checkout propio | Lista para el manual |
| `02-checkout/05-checkout-carrito.png` | Carrito, datos y método de pago | Lista para el manual |
| `02-checkout/06-checkout-confirmacion.png` | Confirmación con pedido y factura | Lista para el manual |
| `03-portal/07-portal-login.png` | Login del portal | Lista para el manual |
| `03-portal/08-portal-resumen.png` | Resumen de la cuenta | Lista para el manual |
| `03-portal/09-portal-pedidos.png` | Pedido con factura y entrega | Lista para el manual |
| `03-portal/10-portal-facturas.png` | Factura con descarga de PDF | Lista para el manual |
| `04-odoo/11-odoo-pedidos.png` | Lista de pedidos en Odoo | Lista para el manual |
| `04-odoo/12-odoo-pedido-detalle.png` | Pedido `S00015` con pago y factura | Lista para el manual |
| `04-odoo/13-odoo-factura.png` | Factura `INV/2026/00010` pagada | Lista para el manual |

Las capturas se tomaron en el navegador a 1440 × 900 lógicos (escala 1,25 →
1800 × 1125 px; la del carrito de Wix se recortó para quitar el pie de página
del template).

Las capturas de **inicio** y **catálogo de Wix** conservan el logo, hero,
productos y categorías demo del template. Se dejan así porque el contenido demo
es aceptable para este manual; si más adelante se limpia el sitio, basta con
volver a tomar esas dos imágenes.
