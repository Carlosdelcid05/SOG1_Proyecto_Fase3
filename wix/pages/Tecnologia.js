// Página: Tecnología
// Código Velo para la sección / página de Tecnología con sistema de pestañas (Tabs).
//
// Elementos requeridos u opcionales (IDs):
//   #sectionTecnologia   → Sección principal que contiene la tecnología
//   #technology          → Ancla de la sección en la página (URL: #technology)
//   #tabsTecnologia      → (Opcional) Widget de pestañas nativo de Wix
//   #btnTab1, #btnTab2, #btnTab3 → Botones selectores de pestaña
//   #boxTab1, #boxTab2, #boxTab3 → Paneles o cajas contenedoras de contenido de cada pestaña:
//       Pestaña 1: Arquitectura Cloud & DevOps (Docker, CI/CD, Kubernetes)
//       Pestaña 2: Integración Odoo ERP (APIs JSON-RPC, Facturación, Stock)
//       Pestaña 3: Desarrollo a la Medida (Node.js, TypeScript, Python)
//   #txtTecnologiaError  → (Opcional) Texto para mensajes o advertencias

import wixLocation from "wix-location";

const TOTAL_TABS = 3;

function el(id) {
  try {
    return $w(id);
  } catch (error) {
    return null;
  }
}

/**
 * Activa la pestaña especificada (1..TOTAL_TABS), mostrando su panel,
 * ocultando los demás y actualizando el estado de los botones.
 *
 * @param {number} activeIndex Número de pestaña a activar (1-based)
 * @param {boolean} shouldScroll Si debe realizar scroll suave a la sección
 */
function activateTab(activeIndex, shouldScroll = false) {
  for (let i = 1; i <= TOTAL_TABS; i++) {
    const box = el(`#boxTab${i}`);
    const btn = el(`#btnTab${i}`);

    if (box) {
      try {
        if (i === activeIndex) {
          if (typeof box.expand === "function") box.expand();
          box.show();
        } else {
          box.hide();
          if (typeof box.collapse === "function") box.collapse();
        }
      } catch (error) {
        /* Ignorar */
      }
    }

    if (btn) {
      try {
        if (i === activeIndex) {
          if (typeof btn.disable === "function") btn.disable();
        } else {
          if (typeof btn.enable === "function") btn.enable();
        }
      } catch (error) {
        /* Ignorar */
      }
    }
  }

  // Scroll suave sin saltos bruscos
  if (shouldScroll) {
    const section = el("#sectionTecnologia") || el("#technology");
    if (section && typeof section.scrollTo === "function") {
      section.scrollTo();
    } else {
      try {
        wixLocation.to("#technology");
      } catch (error) {
        /* Ignorar */
      }
    }
  }
}

$w.onReady(() => {
  const errorBox = el("#txtTecnologiaError");
  if (errorBox) {
    errorBox.hide();
  }

  // Configurar botones de pestañas manuales (#btnTab1..#btnTab3)
  for (let i = 1; i <= TOTAL_TABS; i++) {
    const btn = el(`#btnTab${i}`);
    if (btn) {
      btn.onClick(() => {
        activateTab(i, true);
      });
    }
  }

  // Si existe un widget nativo de tabs (#tabsTecnologia)
  const nativeTabs = el("#tabsTecnologia");
  if (nativeTabs && typeof nativeTabs.onChange === "function") {
    nativeTabs.onChange((event) => {
      const idx = Number(nativeTabs.currentTabIndex || 0) + 1;
      activateTab(idx, true);
    });
  }

  // Verificar si el usuario navegó con hash #technology o #tecnologia
  const urlParts = (wixLocation.url || "").split("#");
  const hash = (urlParts[1] || "").toLowerCase();

  if (hash === "technology" || hash === "tecnologia") {
    // Activar pestaña 1 y asegurar scroll a la sección
    activateTab(1, true);
  } else {
    // Estado inicial por defecto: Pestaña 1 visible
    activateTab(1, false);
  }
});
