// Página: Tienda
// Elementos requeridos (IDs):
//   #repeaterProducts  → repeater con item:
//       #imgProduct, #txtName, #txtCategory, #txtPrice, #txtSku, #btnAdd
//   #txtSearch, #txtCartCount, #btnCart, #txtToast, #txtError, #loader
//   #txtEmpty (opcional, se muestra si el filtro no devuelve productos)

import { getCatalog } from "backend/portal";
import { addToCart, cartCount, money } from "public/cart";
import wixLocation from "wix-location";

let allProducts = [];

function el(id) {
  try {
    return $w(id);
  } catch (error) {
    return null;
  }
}

function render(products) {
  const data = products.map((product) => ({
    _id: product.sku,
    sku: product.sku,
    name: product.name,
    category: product.category || "Servicios",
    description: product.description || "",
    price: product.price,
    priceLabel: money(product.price),
    image: product.image || "",
  }));

  $w("#repeaterProducts").data = data;

  const empty = el("#txtEmpty");
  if (empty) {
    data.length ? empty.hide() : empty.show();
  }
}

function updateCartBadge() {
  const badge = el("#txtCartCount");
  if (badge) badge.text = String(cartCount());
}

function showToast(message) {
  const toast = el("#txtToast");
  if (!toast) return;
  toast.text = message;
  toast.show();
  setTimeout(() => {
    try {
      toast.hide();
    } catch (error) {
      /* la página pudo cambiar */
    }
  }, 2600);
}

$w.onReady(async () => {
  const loader = el("#loader");
  const errorBox = el("#txtError");
  if (loader) loader.show();
  if (errorBox) errorBox.hide();
  updateCartBadge();

  try {
    allProducts = await getCatalog();
    render(allProducts);
  } catch (error) {
    console.error("No se pudo cargar el catálogo", error);
    if (errorBox) {
      errorBox.text =
        "No se pudo cargar el catálogo. Verifica que el bridge esté encendido.";
      errorBox.show();
    }
  } finally {
    if (loader) loader.hide();
  }

  $w("#repeaterProducts").onItemReady(($item, itemData) => {
    $item("#txtName").text = itemData.name;
    $item("#txtCategory").text = itemData.category;
    $item("#txtPrice").text = itemData.priceLabel;
    $item("#txtSku").text = `SKU ${itemData.sku}`;

    try {
      if (itemData.image) {
        $item("#imgProduct").src = itemData.image;
        $item("#imgProduct").alt = itemData.name;
      }
    } catch (error) {
      /* la imagen es opcional */
    }

    $item("#btnAdd").onClick(() => {
      addToCart(itemData.sku, 1);
      updateCartBadge();
      showToast(`Agregado: ${itemData.name}`);
    });
  });

  const search = el("#txtSearch");
  if (search) {
    search.onInput(() => {
      const term = String(search.value || "").trim().toLowerCase();
      if (!term) {
        render(allProducts);
        return;
      }
      render(
        allProducts.filter(
          (product) =>
            product.name.toLowerCase().includes(term) ||
            product.sku.toLowerCase().includes(term) ||
            String(product.category || "").toLowerCase().includes(term),
        ),
      );
    });
  }

  const cartButton = el("#btnCart");
  if (cartButton) {
    cartButton.onClick(() => wixLocation.to("/carrito"));
  }
});
