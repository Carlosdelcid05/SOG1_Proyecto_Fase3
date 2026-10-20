// Página: Mis Cotizaciones
// Elementos requeridos:
//   Repeater #repQuotes con: #txtQuoteName, #txtQuoteDate, #txtQuoteTotal,
//     #txtQuoteStatus, #btnAccept, #btnPdf
//   #txtEmpty, #txtError, #loader

import { getQuotes, acceptQuote, getPdfUrl } from "backend/portal";
import wixLocation from "wix-location";

function formatDate(value) {
  if (!value) return "—";
  return String(value).slice(0, 10);
}

async function loadQuotes() {
  $w("#loader").show();
  $w("#txtError").hide();

  try {
    const quotes = await getQuotes();
    if (!quotes.length) {
      $w("#txtEmpty").show();
      $w("#repQuotes").hide();
      return;
    }

    $w("#txtEmpty").hide();
    $w("#repQuotes").show();
    $w("#repQuotes").data = quotes;
  } catch (error) {
    console.error(error);
    $w("#txtError").text = error.message || "No se pudieron cargar las cotizaciones.";
    $w("#txtError").show();
  } finally {
    $w("#loader").hide();
  }
}

$w.onReady(() => {
  $w("#repQuotes").onItemReady(($item, itemData) => {
    $item("#txtQuoteName").text = itemData.name;
    $item("#txtQuoteDate").text = `Emitida: ${formatDate(itemData.date)}`;
    $item("#txtQuoteTotal").text = itemData.totalLabel;
    $item("#txtQuoteStatus").text = itemData.state;
    $item("#btnAccept").show();
    $item("#btnAccept").enable();

    if (!itemData.canAccept) {
      $item("#btnAccept").hide();
    }

    $item("#btnAccept").onClick(async () => {
      $item("#btnAccept").disable();
      try {
        const result = await acceptQuote(itemData.id);
        $item("#txtQuoteStatus").text = "Aprobada";
        $item("#btnAccept").hide();
        console.log("Cotización aceptada", result);
        await loadQuotes();
      } catch (error) {
        console.error(error);
        $item("#btnAccept").enable();
        $w("#txtError").text = error.message || "No se pudo aceptar la cotización.";
        $w("#txtError").show();
      }
    });

    $item("#btnPdf").onClick(async () => {
      try {
        const url = await getPdfUrl("order", itemData.id);
        wixLocation.to(url);
      } catch (error) {
        console.error(error);
        $w("#txtError").text = "No se pudo generar el PDF de la cotización.";
        $w("#txtError").show();
      }
    });
  });

  loadQuotes();
});
