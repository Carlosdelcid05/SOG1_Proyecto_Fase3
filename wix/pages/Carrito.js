// Página: Carrito
// Elementos requeridos (IDs):
//   #repeaterCart → item: #imgProduct, #txtName, #txtSku, #txtUnit,
//       #txtPrice, #txtQty, #btnPlus, #btnMinus, #btnRemove
//   #txtEmpty, #txtSubtotal, #txtTax, #txtTotal, #txtCount,
//   #btnCheckout, #btnClear, #btnContinue, #txtError, #loader
//
// El checkout se abre en el bridge (otro dominio) para no depender de Wix
// Payments. El carrito viaja en la URL del checkout.

import { getCatalog, getCheckoutUrl } from "backend/portal";
import {
  cartCount,
  clearCart,
  money,
  readCart,
  removeFromCart,
  setQuantity,
} from "public/cart";
import wixLocation from "wix-location";

const TAX_RATE = 0.12;
let products = new Map();

function el(id) {
  try {
    return $w(id);
  } catch (error) {
    return null;
  }
}

function showError(message) {
  const box = el("#txtError");
  if (!box) return;
  box.text = message;
  box.show();
}

function hideError() {
  const box = el("#txtError");
  if (box) box.hide();
}

function productOf(sku) {
  return (
    products.get(sku) || {
      sku,
      name: `Producto ${sku}`,
      price: 0,
      category: "Servicios",
      image: "",
    }
  );
}

function updateTotals(cart) {
  const total = cart.reduce((sum, item) => {
    const product = productOf(item.sku);
    return sum + Number(product.price || 0) * item.quantity;
  }, 0);
  const subtotal = total / (1 + TAX_RATE);
  const tax = total - subtotal;

  const subtotalEl = el("#txtSubtotal");
  const taxEl = el("#txtTax");
  const totalEl = el("#txtTotal");
  const countEl = el("#txtCount");
  const checkout = el("#btnCheckout");

  if (subtotalEl) subtotalEl.text = money(subtotal);
  if (taxEl) taxEl.text = money(tax);
  if (totalEl) totalEl.text = money(total);
  if (countEl) {
    countEl.text = `${cartCount(cart)} artículo(s) en el carrito`;
  }
  if (checkout) {
    checkout.enable();
    if (!cart.length) checkout.disable();
  }

  return { total, subtotal, tax };
}

function render() {
  const cart = readCart();
  const empty = el("#txtEmpty");
  const repeater = el("#repeaterCart");
  const actions = el("#cartActions");

  if (!cart.length) {
    if (repeater) {
      repeater.data = [];
      repeater.hide();
    }
    if (empty) empty.show();
    if (actions) actions.hide();
    updateTotals([]);
    return;
  }

  if (empty) empty.hide();
  if (repeater) {
    repeater.show();
    repeater.data = cart.map((item) => {
      const product = productOf(item.sku);
      return {
        _id: item.sku,
        sku: item.sku,
        name: product.name,
        category: product.category || "Servicios",
        image: product.image || "",
        quantity: item.quantity,
        unitPrice: Number(product.price || 0),
        unitPriceLabel: money(product.price || 0),
        lineTotal: Number(product.price || 0) * item.quantity,
        lineTotalLabel: money(Number(product.price || 0) * item.quantity),
      };
    });
  }
  if (actions) actions.show();
  updateTotals(cart);
}

$w.onReady(async () => {
  const loader = el("#loader");
  if (loader) loader.show();
  hideError();

  try {
    const catalog = await getCatalog();
    products = new Map(catalog.map((product) => [product.sku, product]));
  } catch (error) {
    console.error("No se pudo cargar el catálogo para el carrito", error);
    showError(
      "No se pudieron cargar los precios. El checkout puede fallar; verifica el bridge.",
    );
  } finally {
    if (loader) loader.hide();
  }

  const repeater = el("#repeaterCart");
  if (repeater) {
    repeater.onItemReady(($item, itemData) => {
      $item("#txtName").text = itemData.name;
      $item("#txtSku").text = `SKU ${itemData.sku}`;
      $item("#txtUnit").text = `${itemData.unitPriceLabel} c/u`;
      $item("#txtPrice").text = itemData.lineTotalLabel;
      $item("#txtQty").text = String(itemData.quantity);

      try {
        if (itemData.image) {
          $item("#imgProduct").src = itemData.image;
          $item("#imgProduct").alt = itemData.name;
        }
      } catch (error) {
        /* imagen opcional */
      }

      $item("#btnPlus").onClick(() => {
        setQuantity(itemData.sku, itemData.quantity + 1);
        render();
      });
      $item("#btnMinus").onClick(() => {
        setQuantity(itemData.sku, itemData.quantity - 1);
        render();
      });
      $item("#btnRemove").onClick(() => {
        removeFromCart(itemData.sku);
        render();
      });
    });
  }

  const clear = el("#btnClear");
  if (clear) {
    clear.onClick(() => {
      clearCart();
      hideError();
      render();
    });
  }

  const continueButton = el("#btnContinue");
  if (continueButton) {
    continueButton.onClick(() => wixLocation.to("/tienda"));
  }

  const checkout = el("#btnCheckout");
  if (checkout) {
    checkout.onClick(async () => {
      hideError();
      const cart = readCart();
      if (!cart.length) {
        showError("Tu carrito está vacío.");
        return;
      }

      checkout.disable();
      const original = checkout.label || "Finalizar compra";
      try {
        checkout.label = "Abriendo checkout…";
        const url = await getCheckoutUrl(cart, wixLocation.url);
        wixLocation.to(url);
      } catch (error) {
        console.error("No se pudo abrir el checkout", error);
        showError(
          error.message ||
            "No se pudo abrir el checkout. Intenta de nuevo en unos segundos.",
        );
        checkout.label = original;
        checkout.enable();
      }
    });
  }

  render();
});
