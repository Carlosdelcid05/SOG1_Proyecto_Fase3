// public/cart.js
// Carrito compartido por las páginas de Velo. Usa localStorage porque el
// checkout propio vive en el bridge (otro dominio) y recibe el carrito por URL.

export const CART_KEY = "trebol_cart_v1";

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

export function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = safeParse(raw, []);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        sku: String(item.sku || "").trim(),
        quantity: Math.max(1, Math.min(999, Number(item.quantity) || 1)),
      }))
      .filter((item) => item.sku);
  } catch (error) {
    return [];
  }
}

export function writeCart(items) {
  const clean = (Array.isArray(items) ? items : [])
    .map((item) => ({
      sku: String(item.sku || "").trim(),
      quantity: Math.max(1, Math.min(999, Number(item.quantity) || 1)),
    }))
    .filter((item) => item.sku);

  try {
    localStorage.setItem(CART_KEY, JSON.stringify(clean));
  } catch (error) {
    console.warn("No se pudo guardar el carrito", error);
  }
  return clean;
}

export function addToCart(sku, quantity = 1) {
  const cleanSku = String(sku || "").trim();
  if (!cleanSku) return readCart();

  const cart = readCart();
  const existing = cart.find((item) => item.sku === cleanSku);
  if (existing) {
    existing.quantity = Math.min(999, existing.quantity + Math.max(1, quantity));
  } else {
    cart.push({
      sku: cleanSku,
      quantity: Math.max(1, Math.min(999, quantity)),
    });
  }
  return writeCart(cart);
}

export function setQuantity(sku, quantity) {
  const cart = readCart();
  const index = cart.findIndex((item) => item.sku === sku);
  if (index === -1) return cart;

  if (quantity <= 0) {
    cart.splice(index, 1);
  } else {
    cart[index].quantity = Math.min(999, Math.max(1, quantity));
  }
  return writeCart(cart);
}

export function removeFromCart(sku) {
  return writeCart(readCart().filter((item) => item.sku !== sku));
}

export function clearCart() {
  return writeCart([]);
}

export function cartCount(items = readCart()) {
  return items.reduce((total, item) => total + Number(item.quantity || 0), 0);
}

export function money(value) {
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
}
