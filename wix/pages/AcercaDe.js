// Página / Sección: Acerca de nosotros (Sobre Trebol4Devop)
//
// Elementos requeridos u opcionales (IDs):
//   #lnkAcercaDe       → Enlace o botón del menú hacia Acerca de
//   #sectionAcerca     → Sección principal "Sobre Trebol4Devop"
//   #acerca-de         → Ancla recomendada (reemplazar #Section 10 en el editor)
//   #txtAcercaTexto    → Párrafo de contenido descriptivo de la empresa
//   #txtTitulo2        → Elemento placeholder que debe ocultarse/eliminarse

import wixLocation from "wix-location";

function el(id) {
  try {
    return $w(id);
  } catch (error) {
    return null;
  }
}

/**
 * Desplaza la vista suavemente hasta la sección "Acerca de".
 */
function scrollToAcerca() {
  const target =
    el("#sectionAcerca") || el("#acerca-de") || el("#Section 10");

  if (target && typeof target.scrollTo === "function") {
    target.scrollTo();
  } else {
    try {
      wixLocation.to("#acerca-de");
    } catch (error) {
      /* Ignorar */
    }
  }
}

$w.onReady(() => {
  // 1. Tarea 5: Ocultar y colapsar de forma defensiva el placeholder "#txtTitulo2"
  const titulo2 = el("#txtTitulo2");
  if (titulo2) {
    try {
      const raw = String(titulo2.text || "").trim().toLowerCase();
      if (
        !raw ||
        raw.includes("título 2") ||
        raw.includes("titulo 2") ||
        raw.includes("placeholder")
      ) {
        titulo2.hide();
        if (typeof titulo2.collapse === "function") {
          titulo2.collapse();
        }
      }
    } catch (error) {
      try {
        titulo2.hide();
      } catch (e) {
        /* Ignorar */
      }
    }
  }

  // 2. Tarea 2: Revelar el texto descriptivo #txtAcercaTexto con animación,
  // con fallback garantizado para evitar que permanezca oculto si no dispara onViewportEnter.
  const acercaTexto = el("#txtAcercaTexto");
  if (acercaTexto) {
    let revealed = false;

    const reveal = () => {
      if (revealed) return;
      revealed = true;
      try {
        acercaTexto.show("fade", { duration: 500 });
      } catch (error) {
        acercaTexto.show();
      }
    };

    if (typeof acercaTexto.onViewportEnter === "function") {
      try {
        acercaTexto.onViewportEnter(() => reveal());
      } catch (error) {
        reveal();
      }
    }

    // Fallback defensivo: asegurar visibilidad a los 700 ms
    setTimeout(reveal, 700);
  }

  // 3. Tarea 2: Conectar el enlace del menú (#lnkAcercaDe) al scroll de la sección
  const lnkAcerca = el("#lnkAcercaDe");
  if (lnkAcerca) {
    lnkAcerca.onClick((event) => {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      scrollToAcerca();
    });
  }

  // 4. Si la URL incluye hash de Acerca de (#acerca-de o #Section 10), hacer scroll
  const hash = (wixLocation.url || "").split("#")[1] || "";
  const cleanHash = decodeURIComponent(hash).toLowerCase();
  if (
    cleanHash === "acerca-de" ||
    cleanHash === "section 10" ||
    cleanHash === "section-10" ||
    cleanHash === "sobre-nosotros"
  ) {
    setTimeout(scrollToAcerca, 300);
  }
});
