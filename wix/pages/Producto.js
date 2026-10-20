// Página: Producto (Wix Stores)
// Opcional. Si agregas un botón #btnAddCart en la página de producto, este
// código lo conecta con el carrito propio. El botón nativo de Wix Stores se
// desactiva porque el sitio está en plan gratis.
//
// Elementos:
//   #productPage1 → widget de producto de Wix Stores
//   #btnAddCart   → botón "Agregar al carrito" (opcional)
//   #txtCartCount → contador del header (opcional)

import { addToCart, cartCount } from "public/cart";
import wixLocation from "wix-location";

function el(id) {
  try {
    return $w(id);
  } catch (error) {
    return null;
  }
}

$w.onReady(async () => {
  const badge = el("#txtCartCount");
  if (badge) badge.text = String(cartCount());

  const addButton = el("#btnAddCart");
  if (!addButton) return;

  try {
    const product = await $w("#productPage1").getProduct();
    addButton.onClick(() => {
      const sku = product.sku || product.productId;
      if (!sku) {
        console.warn("El producto no tiene SKU; no se puede agregar al carrito.");
        return;
      }
      addToCart(sku, 1);
      if (badge) badge.text = String(cartCount());
      addButton.label = "¡Agregado!";
      setTimeout(() => {
        addButton.label = "Agregar al carrito";
      }, 1800);
    });
  } catch (error) {
    console.warn("No se pudo inicializar el botón de carrito", error);
  }

  const cartButton = el("#btnCart");
  if (cartButton) {
    cartButton.onClick(() => wixLocation.to("/carrito"));
  }
});
