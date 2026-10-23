// masterPage.js — Código global del sitio (Header, Footer y Utilidades Globales)
//
// Elementos requeridos u opcionales (IDs):
//   Header:
//     #txtCartCount    → (opcional) Texto contador de artículos en el carrito
//     #btnCart         → (opcional) Botón para navegar a /carrito
//     #btnIniciaPlan   → (a eliminar/ocultar) Botón antiguo "Inicia tu plan"
//   WhatsApp global:
//     #btnWhatsApp     → (opcional) Botón flotante para chat en WhatsApp
//     #lnkWhatsApp     → (opcional) Enlace en header o footer a WhatsApp
//   Secciones de marca (fondos limpios):
//     #sectionHero, #sectionAcerca, #sectionTecnologia, #sectionFooter
//   Footer sin suscripción:
//     #txtSubscribeTitle, #txtSubscribeText, #formSubscribe, #btnSubscribe,
//     #checkboxSubscribe, #inpSubscribeEmail → Elementos a ocultar defensivamente
//     #txtFooterDescripcion → Descripción institucional de Trebol4Devop
//     #lnkTienda, #lnkCheckout, #lnkPortal, #lnkCita, #lnkWhatsApp → Enlaces útiles

import { cartCount } from "public/cart";
import { getBridgePublicUrl } from "backend/bridge";
import wixLocation from "wix-location";

const WA_NUMBER = "50223000000";
const WA_MESSAGE =
  "Hola Trebol4Devop, quiero información sobre sus servicios de software y Odoo ERP.";
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MESSAGE)}`;

const BRAND_BACKGROUNDS = {
  "#sectionHero": "#0b3d3b",
  "#sectionAcerca": "#ffffff",
  "#sectionTecnologia": "#f1f8f4",
  "#sectionFooter": "#0b3d3b",
};

function el(id) {
  try {
    return $w(id);
  } catch (error) {
    return null;
  }
}

/**
 * Asigna colores de fondo corporativos limpios a secciones principales,
 * eliminando fondos genéricos de plantillas o imágenes de stock.
 */
function applyBrandBackgrounds() {
  for (const [id, color] of Object.entries(BRAND_BACKGROUNDS)) {
    const section = el(id);
    if (section) {
      try {
        if (section.style) {
          section.style.backgroundColor = color;
        }
      } catch (error) {
        /* Ignorar silenciosamente si el widget no admite style.backgroundColor */
      }
    }
  }
}

/**
 * Oculta y colapsa de forma defensiva el bloque de suscripción del footer
 * y cualquier botón residual obsoleto del header.
 */
function hideObsoleteElements() {
  // Tarea 4 y 17: Ocultar botón obsoleto "Inicia tu plan"
  const btnIniciaPlan = el("#btnIniciaPlan");
  if (btnIniciaPlan) {
    try {
      btnIniciaPlan.hide();
      if (typeof btnIniciaPlan.collapse === "function") {
        btnIniciaPlan.collapse();
      }
    } catch (error) {
      /* Elemento ausente o sin método collapse */
    }
  }

  // Tareas 3 y 10: Ocultar bloque de suscripción en el footer
  const obsoleteFooterIds = [
    "#txtSubscribeTitle",
    "#txtSubscribeText",
    "#formSubscribe",
    "#btnSubscribe",
    "#checkboxSubscribe",
    "#inpSubscribeEmail",
  ];

  for (const id of obsoleteFooterIds) {
    const item = el(id);
    if (item) {
      try {
        item.hide();
        if (typeof item.collapse === "function") {
          item.collapse();
        }
      } catch (error) {
        /* Ignorar */
      }
    }
  }
}

/**
 * Configura los enlaces útiles del footer y actualiza la descripción corporativa.
 */
function setupFooterLinks() {
  const footerDesc = el("#txtFooterDescripcion");
  if (footerDesc) {
    footerDesc.text =
      "Trebol4Devop — Soluciones tecnológicas empresariales, desarrollo de software a la medida, infraestructura DevOps e integración experta con Odoo ERP.";
  }

  const lnkTienda = el("#lnkTienda");
  if (lnkTienda) {
    lnkTienda.onClick(() => wixLocation.to("/tienda"));
  }

  const lnkCita = el("#lnkCita");
  if (lnkCita) {
    lnkCita.onClick(() => wixLocation.to("/agendar-cita"));
  }

  const lnkPortal = el("#lnkPortal");
  const lnkCheckout = el("#lnkCheckout");

  if (lnkPortal || lnkCheckout) {
    getBridgePublicUrl()
      .then((baseUrl) => {
        if (lnkPortal) {
          lnkPortal.onClick(() => wixLocation.to(`${baseUrl}/portal`));
        }
        if (lnkCheckout) {
          lnkCheckout.onClick(() => wixLocation.to(`${baseUrl}/checkout`));
        }
      })
      .catch(() => {
        // Fallback si no hay secretos configurados o falla la conexión con el bridge
        if (lnkPortal) lnkPortal.onClick(() => wixLocation.to("/portal"));
        if (lnkCheckout) lnkCheckout.onClick(() => wixLocation.to("/checkout"));
      });
  }
}

/**
 * Conecta los botones flotantes y enlaces de WhatsApp en todo el sitio.
 */
function setupWhatsApp() {
  const elements = [el("#btnWhatsApp"), el("#lnkWhatsApp")];
  for (const item of elements) {
    if (item) {
      try {
        item.link = WA_URL;
        item.target = "_blank";
      } catch (error) {
        /* Algunos botones de Wix no soportan .link directamente */
      }
      item.onClick(() => wixLocation.to(WA_URL));
    }
  }
}

$w.onReady(() => {
  // 1. Contador del carrito propio
  const badge = el("#txtCartCount");
  if (badge) {
    badge.text = String(cartCount());
  }

  const cartButton = el("#btnCart");
  if (cartButton) {
    cartButton.onClick(() => wixLocation.to("/carrito"));
  }

  // 2. Aplicar colores de fondo de marca limpios
  applyBrandBackgrounds();

  // 3. Ocultar elementos obsoletos (Inicia tu plan, suscripción footer)
  hideObsoleteElements();

  // 4. Configurar enlaces de navegación útiles en el footer
  setupFooterLinks();

  // 5. Configurar WhatsApp flotante y de navegación
  setupWhatsApp();
});
