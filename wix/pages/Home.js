// Página: Inicio (Home)
//
// Elementos requeridos u opcionales (IDs):
//   Botones de navegación ("Saber más" sin apuntar a #contact):
//     #btnSaberMas    → Botón hero: redirige/hace scroll a #acerca-de
//     #btnSaberMas2   → Botón intermedio: redirige/hace scroll a #technology
//     #btnConocerMas  → Botón funciones/servicios: redirige a #features o /tienda
//   Video de presentación sin bucle ni controles:
//     #videoPlayer, #videoFondo → Componente de video
//     #videoOverlay             → Capa transparente para bloquear clics
//   Textos y placeholders:
//     #txtTitulo2     → Placeholder residual a ocultar/eliminar
//     #txtAcercaTexto → Párrafo corporativo sobre Trebol4Devop
//   Secciones / Anclas:
//     #sectionHero, #sectionAcerca, #sectionTecnologia, #sectionFeatures

import wixLocation from "wix-location";

function el(id) {
  try {
    return $w(id);
  } catch (error) {
    return null;
  }
}

/**
 * Realiza un scroll suave hacia el elemento destino o redirige mediante ancla.
 *
 * @param {string} sectionId ID del elemento o ancla (ej. "#sectionAcerca")
 * @param {string} fallbackHash Hash URL de respaldo (ej. "#acerca-de")
 */
function smoothScrollTo(sectionId, fallbackHash) {
  const target = el(sectionId);
  if (target && typeof target.scrollTo === "function") {
    target.scrollTo();
  } else if (fallbackHash) {
    try {
      wixLocation.to(fallbackHash);
    } catch (error) {
      /* Ignorar */
    }
  }
}

/**
 * Configura los botones "Saber más" para que dirijan a contenido de valor
 * (Tecnología, Funciones o Acerca de) y nunca al ancla genérica #contact.
 */
function setupLearnMoreButtons() {
  const btnSaberMas = el("#btnSaberMas");
  if (btnSaberMas) {
    btnSaberMas.onClick((event) => {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      smoothScrollTo("#sectionAcerca", "#acerca-de");
    });
  }

  const btnSaberMas2 = el("#btnSaberMas2");
  if (btnSaberMas2) {
    btnSaberMas2.onClick((event) => {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      smoothScrollTo("#sectionTecnologia", "#technology");
    });
  }

  const btnConocerMas = el("#btnConocerMas");
  if (btnConocerMas) {
    btnConocerMas.onClick((event) => {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      // Si existe sección de funciones hace scroll; si no, lleva a la tienda
      const featuresSection = el("#sectionFeatures");
      if (featuresSection) {
        smoothScrollTo("#sectionFeatures", "#features");
      } else {
        wixLocation.to("/tienda");
      }
    });
  }
}

/**
 * Configura el video para que se reproduzca una sola vez, sin bucle, silenciado
 * y sin controles visibles. Agrega overlay bloqueador de clics.
 */
function setupHeroVideo() {
  const video = el("#videoPlayer") || el("#videoFondo");
  if (video) {
    try {
      // 1. Silenciar video
      if (typeof video.mute === "function") {
        video.mute();
      }

      // 2. Desactivar bucle
      try {
        video.loop = false;
      } catch (e) {
        /* Ignorar */
      }

      // 3. Ocultar controles nativos si la API está disponible
      if (typeof video.hideControls === "function") {
        video.hideControls();
      }

      // 4. Detener video al terminar para evitar reinicios accidentales
      if (typeof video.onEnded === "function") {
        video.onEnded(() => {
          try {
            if (typeof video.pause === "function") video.pause();
          } catch (e) {
            /* Ignorar */
          }
        });
      }

      // 5. Iniciar reproducción controlada
      if (typeof video.play === "function") {
        video.play();
      }
    } catch (error) {
      console.warn("No se pudo configurar el video del Hero", error);
    }
  }

  // Overlay que captura clics para evitar interacción o pausa accidental
  const overlay = el("#videoOverlay");
  if (overlay) {
    overlay.onClick((event) => {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      if (event && typeof event.stopPropagation === "function") {
        event.stopPropagation();
      }
    });
  }
}

/**
 * Limpieza de títulos erróneos y revelación de texto institucional.
 */
function cleanupPlaceholders() {
  // Ocultar placeholder "Título 2"
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

  // Revelar texto de Sobre Trebol4Devop
  const acercaTexto = el("#txtAcercaTexto");
  if (acercaTexto) {
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      try {
        acercaTexto.show("fade", { duration: 400 });
      } catch (e) {
        acercaTexto.show();
      }
    };

    if (typeof acercaTexto.onViewportEnter === "function") {
      try {
        acercaTexto.onViewportEnter(reveal);
      } catch (e) {
        reveal();
      }
    }
    setTimeout(reveal, 600);
  }
}

$w.onReady(() => {
  // 1. Configurar botones "Saber más" para que nunca apunten a #contact
  setupLearnMoreButtons();

  // 2. Configurar video sin bucle ni interacción
  setupHeroVideo();

  // 3. Limpiar placeholders residuales y asegurar texto institucional
  cleanupPlaceholders();
});
