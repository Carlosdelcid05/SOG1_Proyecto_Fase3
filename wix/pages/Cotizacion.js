// Página: Solicitar Cotización
// Elementos requeridos:
//   #ddProduct (Dropdown), #inpQty (Input número), #inpCompany, #inpVat,
//   #inpPhone, #inpNotes (Text Box), #btnSend (Button),
//   #txtSuccess, #txtError, #loader

import { getCatalog, requestQuote } from "backend/portal";

let products = [];

$w.onReady(async () => {
  $w("#loader").show();
  $w("#txtSuccess").hide();
  $w("#txtError").hide();
  $w("#inpQty").value = 1;

  try {
    products = await getCatalog();
    $w("#ddProduct").options = products.map((product) => ({
      label: `${product.name} — Q ${Number(product.price).toFixed(2)}`,
      value: product.sku,
    }));

    if (products.length) {
      $w("#ddProduct").value = products[0].sku;
    }
  } catch (error) {
    console.error(error);
    $w("#txtError").text = "No se pudo cargar el catálogo de servicios.";
    $w("#txtError").show();
  } finally {
    $w("#loader").hide();
  }
});

export async function btnSend_click() {
  $w("#txtSuccess").hide();
  $w("#txtError").hide();

  const sku = $w("#ddProduct").value;
  const quantity = Number($w("#inpQty").value) || 1;

  if (!sku) {
    $w("#txtError").text = "Selecciona un servicio.";
    $w("#txtError").show();
    return;
  }

  if (quantity < 1 || quantity > 999) {
    $w("#txtError").text = "La cantidad debe estar entre 1 y 999.";
    $w("#txtError").show();
    return;
  }

  $w("#btnSend").disable();
  $w("#loader").show();

  try {
    const result = await requestQuote({
      company: $w("#inpCompany").value,
      vat: $w("#inpVat").value,
      phone: $w("#inpPhone").value,
      notes: $w("#inpNotes").value,
      items: [{ sku, quantity }],
    });

    $w("#txtSuccess").text = `¡Solicitud recibida! Tu cotización ${result.orderName} ya está disponible en Mis Cotizaciones.`;
    $w("#txtSuccess").show();
    $w("#inpNotes").value = "";
  } catch (error) {
    console.error(error);
    $w("#txtError").text =
      error.message || "No se pudo enviar la solicitud. Intenta de nuevo.";
    $w("#txtError").show();
  } finally {
    $w("#btnSend").enable();
    $w("#loader").hide();
  }
}
