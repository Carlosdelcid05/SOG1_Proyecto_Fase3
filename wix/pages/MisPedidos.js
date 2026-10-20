// Página: Mis Pedidos
// Elementos requeridos:
//   Repeater #repOrders con: #txtOrderName, #txtOrderDate, #txtOrderTotal,
//     #txtOrderStage, #btnOrderPdf, #btnPay
//   #txtEmpty, #txtError, #loader

import { getOrders, simulatePayment, getPdfUrl } from "backend/portal";
import wixLocation from "wix-location";

function formatDate(value) {
  if (!value) return "—";
  return String(value).slice(0, 10);
}

async function loadOrders() {
  $w("#loader").show();
  $w("#txtError").hide();

  try {
    const orders = await getOrders();
    if (!orders.length) {
      $w("#txtEmpty").show();
      $w("#repOrders").hide();
      return;
    }

    $w("#txtEmpty").hide();
    $w("#repOrders").show();
    $w("#repOrders").data = orders;
  } catch (error) {
    console.error(error);
    $w("#txtError").text = error.message || "No se pudieron cargar los pedidos.";
    $w("#txtError").show();
  } finally {
    $w("#loader").hide();
  }
}

$w.onReady(() => {
  $w("#repOrders").onItemReady(($item, itemData) => {
    $item("#txtOrderName").text = itemData.name;
    $item("#txtOrderDate").text = `Fecha: ${formatDate(itemData.date)}`;
    $item("#txtOrderTotal").text = itemData.totalLabel;
    $item("#txtOrderStage").text = itemData.stage;
    $item("#btnPay").show();

    if (!itemData.canSimulatePayment) {
      $item("#btnPay").hide();
    }

    $item("#btnOrderPdf").onClick(async () => {
      try {
        const url = await getPdfUrl("order", itemData.id);
        wixLocation.to(url);
      } catch (error) {
        console.error(error);
        $w("#txtError").text = "No se pudo generar el PDF del pedido.";
        $w("#txtError").show();
      }
    });

    $item("#btnPay").onClick(async () => {
      $item("#btnPay").disable();
      try {
        await simulatePayment(itemData.id);
        await loadOrders();
      } catch (error) {
        console.error(error);
        $item("#btnPay").enable();
        $w("#txtError").text =
          error.message || "No se pudo registrar el pago simulado.";
        $w("#txtError").show();
      }
    });
  });

  loadOrders();
});
