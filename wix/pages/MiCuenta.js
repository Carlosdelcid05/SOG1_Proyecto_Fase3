// Página: Mi Cuenta
// Elementos requeridos (IDs):
//   #txtWelcome, #txtCompany, #txtQuotes, #txtOrders, #txtInvoices, #txtDue,
//   #btnQuotes, #btnOrders, #btnInvoices, #btnCatalog, #txtError, #loader

import { getSummary } from "backend/portal";
import wixLocation from "wix-location";

$w.onReady(async () => {
  $w("#loader").show();
  $w("#txtError").hide();

  try {
    const data = await getSummary();

    $w("#txtWelcome").text = `Bienvenido, ${data.customer.name}`;
    $w("#txtCompany").text = data.customer.company || "Cliente Trebol4Devop";
    $w("#txtQuotes").text = String(data.quotes);
    $w("#txtOrders").text = String(data.orders);
    $w("#txtInvoices").text = String(data.pendingInvoices);
    $w("#txtDue").text = data.amountDueLabel;
  } catch (error) {
    console.error(error);
    $w("#txtError").text =
      error.message || "No se pudo cargar tu información. Intenta de nuevo.";
    $w("#txtError").show();
  } finally {
    $w("#loader").hide();
  }
});

export function btnQuotes_click() {
  wixLocation.to("/mis-cotizaciones");
}

export function btnOrders_click() {
  wixLocation.to("/mis-pedidos");
}

export function btnInvoices_click() {
  wixLocation.to("/mis-facturas");
}

export function btnCatalog_click() {
  wixLocation.to("/tienda");
}
