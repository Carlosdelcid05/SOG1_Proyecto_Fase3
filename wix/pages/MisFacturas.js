// Página: Mis Facturas
// Elementos requeridos:
//   Repeater #repInvoices con: #txtInvoiceName, #txtInvoiceDate,
//     #txtInvoiceDue, #txtInvoiceTotal, #txtInvoiceStatus, #btnInvoicePdf
//   #txtEmpty, #txtError, #loader

import { getInvoices, getPdfUrl } from "backend/portal";
import wixLocation from "wix-location";

function formatDate(value) {
  if (!value) return "—";
  return String(value).slice(0, 10);
}

async function loadInvoices() {
  $w("#loader").show();
  $w("#txtError").hide();

  try {
    const invoices = await getInvoices();
    if (!invoices.length) {
      $w("#txtEmpty").show();
      $w("#repInvoices").hide();
      return;
    }

    $w("#txtEmpty").hide();
    $w("#repInvoices").show();
    $w("#repInvoices").data = invoices;
  } catch (error) {
    console.error(error);
    $w("#txtError").text = error.message || "No se pudieron cargar las facturas.";
    $w("#txtError").show();
  } finally {
    $w("#loader").hide();
  }
}

$w.onReady(() => {
  $w("#repInvoices").onItemReady(($item, itemData) => {
    $item("#txtInvoiceName").text = itemData.name;
    $item("#txtInvoiceDate").text = `Emitida: ${formatDate(itemData.date)}`;
    $item("#txtInvoiceDue").text = `Vence: ${formatDate(itemData.dueDate)}`;
    $item("#txtInvoiceTotal").text = itemData.totalLabel;
    $item("#txtInvoiceStatus").text = itemData.status;

    $item("#btnInvoicePdf").onClick(async () => {
      try {
        const url = await getPdfUrl("invoice", itemData.id);
        wixLocation.to(url);
      } catch (error) {
        console.error(error);
        $w("#txtError").text = "No se pudo generar el PDF de la factura.";
        $w("#txtError").show();
      }
    });
  });

  loadInvoices();
});
