SHELL := /bin/bash
COMPOSE := docker compose

.PHONY: help up start url down logs ps build init bootstrap seed test dump clean bridge tunnel simulate catalog

help:
	@echo "Trebol4Devop — Fase 3 (Wix + Odoo)"
	@echo "  make start      Levanta stack + túnel y muestra los enlaces para Wix"
	@echo "  make url        Muestra la URL activa del túnel"
	@echo "  make up         Levanta PostgreSQL + Odoo + bridge (sin túnel)"
	@echo "  make build      Reconstruye imágenes"
	@echo "  make init       Instala el módulo e-commerce en Odoo"
	@echo "  make bootstrap  Crea usuario API, portal demo, stock e imágenes"
	@echo "  make bridge     Levanta solo el bridge"
	@echo "  make tunnel     Alias de make start"
	@echo "  make catalog    Regenera imágenes y CSV para Wix (BASE_URL=...)"
	@echo "  make simulate   Simula un pedido de Wix"
	@echo "  make seed-demo  Carga cotizaciones/pedidos de demostración"
	@echo "  make test       Ejecuta la prueba end-to-end"
	@echo "  make dump       Exporta la base actual a db/trebol4devop.dump"
	@echo "  make logs       Muestra logs de todos los servicios"
	@echo "  make down       Detiene los contenedores"
	@echo "  make clean      Detiene y borra volúmenes (¡destructivo!)"

up:
	$(COMPOSE) up -d --build db odoo bridge

start:
	bash scripts/start_demo.sh

url:
	bash scripts/start_demo.sh url

build:
	$(COMPOSE) build

init:
	$(COMPOSE) exec -T odoo odoo -c /etc/odoo/odoo.conf -d Trebol4Devop -i trebol4devop_ecommerce --stop-after-init --without-demo=all
	$(COMPOSE) restart odoo

bootstrap:
	$(COMPOSE) exec -T odoo odoo shell -c /etc/odoo/odoo.conf -d Trebol4Devop --no-http < scripts/bootstrap.py
	$(COMPOSE) restart odoo bridge

bridge:
	$(COMPOSE) up -d bridge

# Alias histórico: antes solo levantaba el túnel. Ahora deja todo listo y
# muestra los enlaces que hay que pegar en Wix.
tunnel: start

catalog:
	python3 scripts/generate_images.py $(if $(BASE_URL),--base-url $(BASE_URL),)

simulate:
	bash scripts/simulate_wix_order.sh

seed-demo:
	bash scripts/seed_demo.sh

test:
	python3 scripts/e2e_test.py

dump:
	$(COMPOSE) exec -T db pg_dump -U odoo -Fc Trebol4Devop > db/trebol4devop.dump
	@echo "Dump actualizado: db/trebol4devop.dump"

logs:
	$(COMPOSE) logs -f --tail=120

ps:
	$(COMPOSE) ps

down:
	$(COMPOSE) down

clean:
	$(COMPOSE) down -v
