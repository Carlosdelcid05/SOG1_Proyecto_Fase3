// Código del master page (header/footer global).
// Si el header tiene un elemento con ID #txtCartCount, muestra el número de
// artículos del carrito propio en todas las páginas.

import { cartCount } from "public/cart";
import wixLocation from "wix-location";

function el(id) {
  try {
    return $w(id);
  } catch (error) {
    return null;
  }
}

$w.onReady(() => {
  const badge = el("#txtCartCount");
  if (badge) badge.text = String(cartCount());

  const cartButton = el("#btnCart");
  if (cartButton) {
    cartButton.onClick(() => wixLocation.to("/carrito"));
  }
});
