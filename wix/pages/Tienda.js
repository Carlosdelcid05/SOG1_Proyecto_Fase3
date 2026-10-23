// Página: Tienda (Catálogo de Servicios y Soluciones)
//
// Elementos requeridos u opcionales (IDs):
//   Repeater de productos:
//     #repeaterProducts  → repeater principal con los elementos por item:
//         #imgProduct    → Imagen del producto/servicio
//         #txtName       → Nombre del producto
//         #txtCategory   → Categoría
//         #txtPrice      → Precio formateado en GTQ con IVA
//         #txtSku        → Código SKU (default_code de Odoo)
//         #btnAdd        → Botón "Agregar al carrito"
//   Filtros combinables:
//     #txtSearch         → (Opcional) Input de texto para búsqueda libre
//     #ddlCategory       → (Opcional) Dropdown de categorías (poblado dinámicamente)
//     #txtMinPrice       → (Opcional) Input de precio mínimo
//     #txtMaxPrice       → (Opcional) Input de precio máximo
//     #ddlSort           → (Opcional) Dropdown para ordenamiento (menor/mayor precio, A-Z)
//     #btnClearFilters   → (Opcional) Botón para reiniciar todos los filtros
//   Indicadores y utilidades:
//     #txtResultCount    → (Opcional) Texto contador: "Mostrando X de Y servicios"
//     #txtEmpty          → (Opcional) Mensaje cuando no hay resultados para el filtro
//     #txtCartCount      → Texto contador de artículos en el carrito
//     #btnCart           → Botón para navegar a la página de /carrito
//     #txtToast          → Mensaje emergente temporal de confirmación
//     #txtError          → Caja de error
//     #loader            → Indicador de carga inicial

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

/**
 * Renderiza los productos en el repeater y actualiza estados de vacío y contador.
 */
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

  const repeater = el("#repeaterProducts");
  if (repeater) {
    repeater.data = data;
  }

  const empty = el("#txtEmpty");
  if (empty) {
    data.length ? empty.hide() : empty.show();
  }

  const countBadge = el("#txtResultCount");
  if (countBadge) {
    countBadge.text = `Mostrando ${data.length} de ${allProducts.length} servicios`;
  }
}

/**
 * Aplica los filtros combinables de búsqueda, categoría, rango de precio y orden.
 */
function applyFilters() {
  const searchInput = el("#txtSearch");
  const term = String(searchInput?.value || "").trim().toLowerCase();

  const ddlCategory = el("#ddlCategory");
  const selectedCategory = String(ddlCategory?.value || "").trim();

  const minInput = el("#txtMinPrice");
  const maxInput = el("#txtMaxPrice");
  const minVal = minInput?.value !== undefined && minInput?.value !== "" ? Number(minInput.value) : null;
  const maxVal = maxInput?.value !== undefined && maxInput?.value !== "" ? Number(maxInput.value) : null;

  const ddlSort = el("#ddlSort");
  const sortMode = String(ddlSort?.value || "").trim();

  let filtered = allProducts.filter((product) => {
    // 1. Filtro por categoría seleccionada
    if (selectedCategory && String(product.category || "").trim() !== selectedCategory) {
      return false;
    }

    // 2. Filtro por término de búsqueda (nombre, SKU, categoría o descripción)
    if (term) {
      const name = String(product.name || "").toLowerCase();
      const sku = String(product.sku || "").toLowerCase();
      const cat = String(product.category || "").toLowerCase();
      const desc = String(product.description || "").toLowerCase();
      if (!name.includes(term) && !sku.includes(term) && !cat.includes(term) && !desc.includes(term)) {
        return false;
      }
    }

    // 3. Filtro por precio mínimo
    if (minVal !== null && !isNaN(minVal) && Number(product.price || 0) < minVal) {
      return false;
    }

    // 4. Filtro por precio máximo
    if (maxVal !== null && !isNaN(maxVal) && Number(product.price || 0) > maxVal) {
      return false;
    }

    return true;
  });

  // 5. Ordenamiento opcional
  if (sortMode === "price_asc") {
    filtered.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  } else if (sortMode === "price_desc") {
    filtered.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  } else if (sortMode === "name_asc") {
    filtered.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  } else if (sortMode === "name_desc") {
    filtered.sort((a, b) => String(b.name || "").localeCompare(String(a.name || "")));
  }

  render(filtered);
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

/**
 * Inicializa dinámicamente las categorías únicas en el selector dropdown.
 */
function setupCategoryDropdown() {
  const ddlCategory = el("#ddlCategory");
  if (!ddlCategory) return;

  const rawCats = allProducts
    .map((p) => String(p.category || "").trim())
    .filter(Boolean);
  const categories = Array.from(new Set(rawCats)).sort();

  ddlCategory.options = [
    { label: "Todas las categorías", value: "" },
    ...categories.map((cat) => ({ label: cat, value: cat })),
  ];
  ddlCategory.value = "";
  ddlCategory.onChange(() => applyFilters());
}

/**
 * Inicializa las opciones del selector de ordenamiento si no están predefinidas.
 */
function setupSortDropdown() {
  const ddlSort = el("#ddlSort");
  if (!ddlSort) return;

  if (!ddlSort.options || ddlSort.options.length <= 1) {
    ddlSort.options = [
      { label: "Orden predeterminado", value: "" },
      { label: "Precio: menor a mayor", value: "price_asc" },
      { label: "Precio: mayor a menor", value: "price_desc" },
      { label: "Nombre: A - Z", value: "name_asc" },
      { label: "Nombre: Z - A", value: "name_desc" },
    ];
  }
  ddlSort.onChange(() => applyFilters());
}

$w.onReady(async () => {
  const loader = el("#loader");
  const errorBox = el("#txtError");
  if (loader) loader.show();
  if (errorBox) errorBox.hide();
  updateCartBadge();

  try {
    allProducts = await getCatalog();
    setupCategoryDropdown();
    setupSortDropdown();
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

  // Configuración del repeater de productos
  const repeater = el("#repeaterProducts");
  if (repeater) {
    repeater.onItemReady(($item, itemData) => {
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
  }

  // Búsqueda libre por texto
  const search = el("#txtSearch");
  if (search) {
    search.onInput(() => applyFilters());
  }

  // Filtros de rango de precio
  const minPrice = el("#txtMinPrice");
  if (minPrice) {
    minPrice.onInput(() => applyFilters());
  }
  const maxPrice = el("#txtMaxPrice");
  if (maxPrice) {
    maxPrice.onInput(() => applyFilters());
  }

  // Botón para limpiar todos los filtros
  const btnClear = el("#btnClearFilters");
  if (btnClear) {
    btnClear.onClick(() => {
      if (search) search.value = "";
      const ddlCat = el("#ddlCategory");
      if (ddlCat) ddlCat.value = "";
      if (minPrice) minPrice.value = "";
      if (maxPrice) maxPrice.value = "";
      const ddlSort = el("#ddlSort");
      if (ddlSort) ddlSort.value = "";
      applyFilters();
    });
  }

  // Navegación al carrito
  const cartButton = el("#btnCart");
  if (cartButton) {
    cartButton.onClick(() => wixLocation.to("/carrito"));
  }
});
