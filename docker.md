# Despliegue — Trebol4Devop Fase 3

## Stack local

```bash
cp .env.example .env
docker compose up -d --build db odoo bridge
```

Servicios:

| Servicio | URL | Descripción |
|---|---|---|
| Odoo 16 | <http://localhost:8069> | ERP/CRM |
| Bridge | <http://localhost:4000> | API Wix ↔ Odoo |
| PostgreSQL | `localhost:5433` | Base `Trebol4Devop` |
| Metabase (opcional) | <http://localhost:3001> | BI |

## Cargar datos iniciales

```bash
docker compose exec -T odoo odoo shell -c /etc/odoo/odoo.conf \
  -d Trebol4Devop --no-http < scripts/bootstrap.py
docker compose restart odoo bridge
```

Credenciales de demostración:

- Odoo admin: `admin` / `admin`
- API: `ecommerce_api` / `TrebolApi2026!`
- Portal: `cmendoza@tecnoguate.com.gt` / `Demo1234`

## Exponer el bridge a Wix

Wix necesita una URL HTTPS pública. El comando recomendado levanta todo y deja
los enlaces listos:

```bash
make start
```

Actualiza `.env` con `BRIDGE_PUBLIC_URL`, regenera el CSV y escribe
`wix/TUNEL_ACTUAL.md`. Para consultar solo la URL activa: `make url`.

Copia la URL y configúrala en Wix Secrets Manager como `BRIDGE_URL`. El secreto
`BRIDGE_KEY` debe coincidir con `BRIDGE_API_KEY` del `.env`.

El túnel rápido cambia si reinicias el contenedor o apagas la PC. Para una URL
fija revisa [`docs/tunel-estable.md`](docs/tunel-estable.md). Si el sitio debe
seguir disponible con la PC apagada, usa un VPS.

## Pruebas

```bash
python3 scripts/e2e_test.py
bash scripts/simulate_wix_order.sh
```

## BI (opcional)

```bash
docker compose --profile bi up -d metabase
```

Abre <http://localhost:3001>, conecta a PostgreSQL (`db:5432`, base
`Trebol4Devop`, usuario `odoo`, contraseña `odoo`) y crea los dashboards de
inventario y ventas.

## Limpieza

```bash
make down        # detiene contenedores
make clean       # elimina contenedores y volúmenes (¡destructivo!)
```
