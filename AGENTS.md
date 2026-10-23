# AGENTS.md

USAC Fase 3 project: Wix storefront + Odoo 16 ERP/CRM, integrated by a Node/TypeScript bridge.
Wix is catalog-only (free plan); checkout, customer portal and the appointment form are served by the bridge.
Odoo is the source of truth for orders, invoices, payments and stock. Do not introduce paid Wix features
(Wix Payments, Wix Bookings, Wix Stores checkout, premium apps, custom domain) into the solution.

## Entrypoints

- `bridge/src/server.ts` — Express app; mounts `/api/checkout`, `/api/wix`, `/api/portal`, `/api/catalog`, `/api/pdf` and serves `/checkout`, `/portal`.
- `bridge/src/odoo/*` — Odoo JSON-RPC (`/jsonrpc` + `execute_kw`) wrappers. There is no ORM or DB driver in the bridge.
- `odoo/addons/trebol4devop_ecommerce/models/sale_order.py` — business logic (`action_web_*` methods). The bridge calls these methods by name; renaming one requires changing both sides.
- `odoo/addons/trebol4devop_ecommerce/models/crm_lead.py` — `crm.lead.action_web_create_appointment` RPC method used by the appointment endpoint.
- `bridge/public/checkout.html`, `bridge/public/portal.html` — hand-written vanilla JS/CSS, served as files. No bundler or template step.
- `wix/` — Velo snippets and the product CSV. They are pasted/imported manually into the Wix editor; nothing here is deployed by the repo.

## Commands

```bash
make up          # docker compose up -d --build db odoo bridge
make start       # stack + Cloudflare tunnel + updates .env/CSV and prints Wix links
make url         # prints the active quick-tunnel URL
curl localhost:4000/health
make bootstrap   # runs scripts/bootstrap.py inside Odoo shell (API user, portal users, stock, images, bank journal)
make test        # python3 scripts/e2e_test.py
```

- Stack ports: Odoo `8069`, bridge `4000`, Postgres `5433` on the host (`5432` inside Docker).
- `make test` needs the stack up and `make bootstrap` already run. It runs 40 checks, including contra-entrega and appointment idempotency, and writes real sales orders/invoices/payments into Odoo. Run it against the demo DB, not production data.
- No lint or unit-test suites exist. Verification is `make test` plus a TypeScript check:
  `docker compose exec bridge npm run typecheck` (dependencies are installed inside the container, not necessarily on the host).
- Bridge changes hot-reload via `tsx watch`; the source directory is bind-mounted. Rebuild (`make build` or `docker compose build bridge`) only when `package.json` changes.
- Odoo module changes: the container command runs `-i` and `-u` on every start, so `docker compose restart odoo` applies Python/XML edits. A new Python file also requires adding it to `models/__init__.py`. Odoo startup is slow the first time (module upgrade); the bridge waits for its healthcheck.

## Database / Docker gotchas

- `db/init/01-restore.sh` restores `db/trebol4devop.dump` **only when the `pgdata` volume is created for the first time**. Editing the dump does nothing on an existing volume; use `make clean` (destructive) to reinitialize, or restore manually.
- `make dump` refreshes `db/trebol4devop.dump` from the running database. `db/filestore/` is bind-mounted as Odoo's filestore and is tracked in git; avoid churning these binaries unless intentionally refreshing the dataset.
- `make clean` removes all volumes. `make tunnel` is an alias of `make start` (stack + quick tunnel); Metabase uses the `bi` profile and is not started by `make up`.
- The Odoo image builds `FROM 0520josem/trebol4devop:fase3-bi` (custom image pinned to the DB version). Building requires Docker Hub access.
- `.env` is gitignored; compose defaults and `scripts/e2e_test.py` assume `BRIDGE_API_KEY=trebol-bridge-dev-key` and `PORTAL_ACCESS_CODE=trebol2026`. Keep them aligned if you change them.

## Bridge conventions

- ESM + `NodeNext`: relative imports in `.ts` files must end in `.js` (e.g. `import { config } from "./config.js"`).
- Successful JSON responses are `{ ok: true, data }`. Errors are produced by the handler in `server.ts` as `{ ok: false, error, requestId }`; throw errors carrying `.status` (`AccessError` 403, `NotFoundError` 404, `OdooError` → 502). Zod validation failures become 400.
- Auth: `/api/wix` and `/api/catalog` require `x-bridge-key`. Portal routes accept either `Authorization: Bearer <signed portal token>` or `x-bridge-key` + `x-member-email` (used by Velo). `/api/checkout` and `/api/portal/login` are public with in-memory rate limiting.
- Preserve idempotency when editing order flow: Wix orders are deduplicated by the unique index on `x_wix_order_id`; checkout orders by `client_order_ref = WEB-<checkoutId>`. Replays must return the existing order, not create another.
- Products are resolved by SKU = Odoo `default_code`. `resolveProductBySku` keeps an in-process cache, so restart the bridge after changing SKUs/prices directly in Odoo.
- Checkout payment methods are `simulated`, `transfer`, and `contra_entrega`. Only `simulated` calls `action_web_register_payment`; the other two leave the posted invoice unpaid. The method is stored in `sale.order.x_payment_method`.
- Money: prices are GTQ with 12% IVA included. The checkout HTML computes the display breakdown (`TAX_RATE` in `checkout.html` and `/api/checkout/config`), but persisted totals come from Odoo (`amount_total`, `amount_tax`). Don't duplicate tax math server-side.
- Appointments use `POST /api/checkout/appointment` (public, rate-limited) → `crm.lead.action_web_create_appointment`; idempotency is keyed by `crm.lead.x_appointment_ref`. The public form is `/agendar-cita` (`bridge/public/appointment.html`), so it works without Velo or a paid Wix plan.
- `DEMO_MODE=true` leaks Odoo error details in API responses; keep it off outside the demo.
- `/assets` is a read-only mount of host `./assets`; Wix imports product images from the tunneled bridge URL.

## Odoo module rules

- Custom fields use the `x_` prefix (`x_ecommerce`, `x_wix_order_id`, `x_web_stage`, etc.). Never edit core Odoo addons.
- `action_web_confirm_and_invoice`, `action_web_register_payment`, `action_web_cancel`, and `action_web_create_quote_opportunity` are the RPC contract with the bridge. They are intentionally idempotent (safe to call twice); keep that property.
- `x_web_stage` is computed from order/picking/invoice state. Stage labels shown to users live in `bridge/src/odoo/orders.ts` (`checkoutStageLabel`) and the portal code.
- Dependencies: `sale_management`, `sale_stock`, `sale_crm`, `account`.

## Catalog and Wix quirks

- The 30 products are hardcoded in `scripts/generate_images.py` (`PRODUCTS`). `scripts/e2e_test.py` asserts the catalog has exactly 30 items, so adding/removing products requires updating that list, regenerating assets, reimporting `wix/catalog/productos_wix.csv`, and adjusting the assertion. Never change the 30 SKUs without updating both the CSV and the e2e test.
- Rich product descriptions live in `scripts/catalog_details.json` and are seeded into Odoo by `scripts/bootstrap.py` (and written into the Wix CSV). Re-run `make bootstrap` after editing that JSON.
- `make catalog BASE_URL=https://...` requires `rsvg-convert` and ImageMagick `convert` on the host. Use `python3 scripts/generate_images.py --csv-only --base-url ...` to regenerate only the CSV.
- The free Cloudflare tunnel URL changes on restart. When it does, update the Wix cart button link and the `BRIDGE_URL` secret in Wix.
- Wix Velo files (`wix/pages/*.js`) reference specific element IDs documented at the top of each file; they only work after those elements exist in the Wix editor.

## Documentation / style

- `README.md` is the authoritative overview (Spanish); `docker.md` covers deployment; `Diseno_Portal_Cliente.md` describes the portal design; `wix/README.md` has the step-by-step Wix setup.
- User-facing copy, docs and commit messages are in Spanish. Commits follow conventional-commit prefixes (`feat:`, `fix:`, `docs:`, `chore:`).
- Demo credentials in the README, `.env.example`, and `scripts/bootstrap.py` are intentional for the academic demo; do not reuse them in a real deployment.
