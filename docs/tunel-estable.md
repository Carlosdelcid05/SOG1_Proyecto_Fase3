# Túnel estable para el bridge

> **Esta instalación ya está configurada con Tailscale Funnel:**
> `https://carlos.tail30045d.ts.net`. El botón del carrito y “Agendar Cita” en
> Wix ya apuntan ahí. Si la PC se apaga, el sitio deja de responder; para 24/7
> usa la opción de VPS.

El túnel rápido de Cloudflare (`trycloudflare.com`) es **efímero**: si apagas la
PC, reinicias el contenedor `tunnel` o se cae la conexión, la URL cambia. Eso
obliga a volver a pegar el enlace en Wix y actualizar `BRIDGE_URL`.

`make start` automatiza la parte local (levanta el stack, obtiene la URL,
actualiza `.env`, regenera el CSV y te muestra los enlaces), pero **la URL sigue
cambiando**. Para no volver a tocar Wix, usa una URL fija.

## Comparación

| Opción | URL fija | Costo | ¿Funciona con la PC apagada? | Dificultad |
|---|---|---|---|---|
| Túnel rápido Cloudflare | ❌ | Gratis | ❌ | Muy baja |
| **Tailscale Funnel** | ✅ | Gratis | ❌ | Baja |
| ngrok con dominio estático | ✅ | Gratis (limitado) | ❌ | Baja |
| Cloudflare Named Tunnel | ✅ | Gratis + dominio | ❌ | Media |
| VPS con Docker + dominio | ✅ | Oracle Free / ~€4 al mes | ✅ | Media |

> Si el sitio debe seguir disponible cuando apagas la PC, **ningún túnel lo
> resuelve**: hay que mover Odoo + bridge a un VPS o a un servidor siempre
> encendido.

## Opción recomendada: Tailscale Funnel (gratis y URL fija)

Tailscale Funnel expone el puerto local a Internet con una URL
`https://<equipo>.<tu-tailnet>.ts.net` que no cambia.

1. Instala Tailscale en la PC:

   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```

2. Autoriza el equipo con tu cuenta gratuita de Tailscale. Si la consola pide
   habilitar **Funnel**, actívalo en **DNS → HTTPS Certificates / Funnel**.

3. Levanta el stack y publica el bridge:

   ```bash
   make up
   sudo tailscale funnel --bg 4000
   tailscale funnel status
   ```

   Si `tailscale funnel` responde `Access denied: serve config denied`, ejecuta
   una vez y vuelve a intentar:

   ```bash
   sudo tailscale set --operator=$USER
   tailscale funnel --bg 4000
   ```

4. Copia la URL que muestra `tailscale funnel status` (por ejemplo
   `https://mi-pc.tail1234.ts.net`) y pégala una sola vez en Wix:

   - Botón del carrito: `https://mi-pc.tail1234.ts.net/checkout?back=...`
   - `BRIDGE_URL` en Secrets Manager: `https://mi-pc.tail1234.ts.net`
   - Catálogo: regenera el CSV con esa URL si cambian las imágenes:
     ```bash
     python3 scripts/generate_images.py --csv-only --base-url https://mi-pc.tail1234.ts.net
     ```

5. Para apagar el túnel:

   ```bash
   sudo tailscale funnel reset
   ```

La URL se mantiene mientras el equipo y la cuenta existan. Si cambias el nombre
del equipo en Tailscale, cambia la URL. Funnel está en beta y tiene límites de
ancho de banda no configurables; es suficiente para demos y tráfico ligero, no
para streaming o descargas pesadas.

## Opción 2: ngrok con dominio estático

ngrok gratis incluye un dominio estático por cuenta. Es rápido, pero la versión
gratuita puede mostrar una página de advertencia de ngrok a los visitantes.

```bash
ngrok config add-authtoken TU_TOKEN
ngrok http 4000 --domain=tu-nombre.ngrok-free.app
```

Usa `https://tu-nombre.ngrok-free.app` en Wix. Para que el túnel arranque solo,
agrégalo a systemd o al inicio del sistema.

## Opción 3: Cloudflare Named Tunnel (requiere dominio)

Si tienes un dominio administrado en Cloudflare, el túnel con nombre es la
opción más profesional y también es gratuita.

```bash
cloudflared tunnel login
cloudflared tunnel create trebol
cloudflared tunnel route dns trebol bridge.tudominio.com
```

Crea `~/.cloudflared/config.yml`:

```yaml
tunnel: trebol
credentials-file: /home/TU_USUARIO/.cloudflared/UUID_DEL_TUNEL.json
ingress:
  - service: http://localhost:4000
```

Ejecuta y instala como servicio:

```bash
cloudflared tunnel run trebol
sudo cloudflared service install
```

La URL `https://bridge.tudominio.com` queda fija. No necesitas abrir puertos en
el router.

## Opción 4: VPS para disponibilidad 24/7

Si la PC se apaga y el sitio debe seguir arriba, despliega el stack en un VPS:

- **Oracle Cloud Always Free** (ARM Ampere A1) o un VPS económico (Hetzner,
  DigitalOcean, etc.).
- Clona el repositorio, copia `.env`, ejecuta `docker compose up -d db odoo bridge`.
- Usa Caddy o Nginx como reverse proxy con HTTPS para `bridge.tudominio.com`.
- No uses el perfil `tunnel`: el VPS tiene IP pública y dominio propios.
- Prohíbe el acceso público directo a PostgreSQL y, si no lo necesitas, a la
  administración de Odoo.

Esta es la única opción que mantiene el sitio disponible con la PC apagada.

## Qué hace `make start`

```bash
make start
```

1. Levanta PostgreSQL, Odoo y el bridge.
2. Espera a que `/health` responda con Odoo arriba.
3. Levanta o reutiliza el túnel de Cloudflare.
4. Obtiene la URL activa y la guarda en `.env` (`BRIDGE_PUBLIC_URL`).
5. Regenera `wix/catalog/productos_wix.csv` con la URL nueva.
6. Escribe `wix/TUNEL_ACTUAL.md` con los enlaces listos para copiar.
7. Imprime los pasos exactos para Wix.

Si ya tienes una URL fija (Tailscale, ngrok, Cloudflare Named Tunnel o VPS),
pásala con `STABLE_URL` para que el script **no** arranque el túnel rápido:

```bash
STABLE_URL=https://mi-pc.tail1234.ts.net make start
STABLE_URL=https://bridge.tudominio.com make url
```

La primera vez el script guarda esa URL en `.env`; en los siguientes arranques
basta con `make start`, porque detecta que `BRIDGE_PUBLIC_URL` ya es fija y no
vuelve a crear el túnel rápido.

Si solo quieres consultar la URL activa del túnel rápido:

```bash
make url
```
