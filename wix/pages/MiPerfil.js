// Página: Mi Perfil
// Elementos requeridos:
//   #inpName, #inpPhone, #inpVat, #inpStreet, #inpCity
//   #txtEmail (solo lectura), #btnSave, #txtSuccess, #txtError, #loader

import { getProfile, updateProfile } from "backend/portal";

$w.onReady(async () => {
  $w("#loader").show();
  $w("#txtSuccess").hide();
  $w("#txtError").hide();

  try {
    const profile = await getProfile();
    $w("#inpName").value = profile.name || "";
    $w("#inpPhone").value = profile.phone || "";
    $w("#inpVat").value = profile.vat || "";
    $w("#inpStreet").value = profile.street || "";
    $w("#inpCity").value = profile.city || "";
    $w("#txtEmail").text = profile.email || "";
  } catch (error) {
    console.error(error);
    $w("#txtError").text = error.message || "No se pudo cargar el perfil.";
    $w("#txtError").show();
  } finally {
    $w("#loader").hide();
  }
});

export async function btnSave_click() {
  $w("#txtSuccess").hide();
  $w("#txtError").hide();
  $w("#btnSave").disable();
  $w("#loader").show();

  try {
    await updateProfile({
      name: $w("#inpName").value,
      phone: $w("#inpPhone").value,
      vat: $w("#inpVat").value,
      street: $w("#inpStreet").value,
      city: $w("#inpCity").value,
    });

    $w("#txtSuccess").text = "Datos actualizados correctamente.";
    $w("#txtSuccess").show();
  } catch (error) {
    console.error(error);
    $w("#txtError").text = error.message || "No se pudieron guardar los cambios.";
    $w("#txtError").show();
  } finally {
    $w("#btnSave").enable();
    $w("#loader").hide();
  }
}
