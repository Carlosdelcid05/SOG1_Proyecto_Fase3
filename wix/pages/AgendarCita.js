// Página: Agendar Cita
// Permite a clientes potenciales solicitar una reunión técnica / asesoría
// con el equipo de Trebol4Devop e integrarla con el CRM / pipeline de Odoo.
//
// Elementos requeridos (IDs):
//   #inpNombre    → Input de texto: Nombre y apellido del contacto
//   #inpEmail     → Input de texto/email: Correo electrónico
//   #inpTelefono  → Input de texto/tel: Teléfono de contacto
//   #inpEmpresa   → Input de texto: Nombre de la empresa u organización
//   #inpFecha     → DatePicker o Input: Fecha deseada para la reunión
//   #inpHora      → TimePicker o Input: Hora sugerida
//   #ddlMotivo    → Dropdown: Motivo o servicio de interés
//   #txtNotas     → TextBox: Detalles adicionales o requerimiento específico
//   #btnAgendar   → Botón: Enviar solicitud de cita
//   #txtEstado    → Texto: Mensajes de confirmación o error
//   #loaderCita   → Box/Icono: Indicador de carga durante el envío

import { requestAppointment } from "backend/bridge";

function el(id) {
  try {
    return $w(id);
  } catch (error) {
    return null;
  }
}

/**
 * Normaliza un valor de fecha (objeto Date o string) al formato YYYY-MM-DD.
 */
function formatDate(value) {
  if (!value) return "";
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const str = String(value).trim();
  // Si ya es YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // Si es ISO string con T
  if (str.includes("T")) return str.split("T")[0];
  // Intentar parsear como fecha
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return str;
}

/**
 * Normaliza un valor de hora al formato HH:MM.
 */
function formatTime(value) {
  if (!value) return "";
  if (typeof value === "object" && value !== null) {
    // Si viene como objeto { hours: 14, minutes: 30 } de un TimePicker
    const h = String(value.hours ?? value.hour ?? 0).padStart(2, "0");
    const m = String(value.minutes ?? value.minute ?? 0).padStart(2, "0");
    return `${h}:${m}`;
  }
  const str = String(value).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, "0")}:${match[2]}`;
  }
  return str;
}

function showStatus(message, isError = false) {
  const statusEl = el("#txtEstado");
  if (!statusEl) return;
  statusEl.text = message;
  try {
    // Si el elemento admite colores de texto
    if (statusEl.style) {
      statusEl.style.color = isError ? "#a52a2a" : "#167a4a";
    }
  } catch (e) {
    /* Ignorar */
  }
  statusEl.show();
}

$w.onReady(() => {
  const loader = el("#loaderCita");
  const status = el("#txtEstado");
  if (loader) loader.hide();
  if (status) status.hide();

  // Poblar opciones del dropdown de motivos si está vacío
  const ddlMotivo = el("#ddlMotivo");
  if (ddlMotivo && (!ddlMotivo.options || ddlMotivo.options.length <= 1)) {
    ddlMotivo.options = [
      { label: "Asesoría en Odoo ERP y Facturación Electrónica", value: "odoo_erp" },
      { label: "Desarrollo Web / Tienda E-commerce", value: "ecommerce" },
      { label: "Consultoría DevOps, Nube y Automatización", value: "devops" },
      { label: "Soporte y Mantenimiento Mensual", value: "soporte" },
      { label: "Demostración de Plataforma Trebol4Devop", value: "demo" },
      { label: "Otro requerimiento especializado", value: "otro" },
    ];
    if (!ddlMotivo.value && ddlMotivo.options.length) {
      ddlMotivo.value = ddlMotivo.options[0].value;
    }
  }

  const btnAgendar = el("#btnAgendar");
  if (btnAgendar) {
    btnAgendar.onClick(async () => {
      if (status) status.hide();

      const nombre = String(el("#inpNombre")?.value || "").trim();
      const email = String(el("#inpEmail")?.value || "").trim().toLowerCase();
      const telefono = String(el("#inpTelefono")?.value || "").trim();
      const empresa = String(el("#inpEmpresa")?.value || "").trim();
      const rawFecha = el("#inpFecha")?.value;
      const rawHora = el("#inpHora")?.value;
      const motivo = String(el("#ddlMotivo")?.value || "").trim();
      const notas = String(el("#txtNotas")?.value || "").trim();

      // Validaciones básicas de cliente
      if (!nombre) {
        showStatus("Por favor ingresa tu nombre completo.", true);
        return;
      }
      if (!email || !email.includes("@") || !email.includes(".")) {
        showStatus("Por favor ingresa un correo electrónico válido.", true);
        return;
      }
      if (!telefono || telefono.length < 6) {
        showStatus("Por favor ingresa un número de teléfono de contacto.", true);
        return;
      }
      if (!rawFecha) {
        showStatus("Por favor selecciona la fecha deseada para la cita.", true);
        return;
      }
      if (!rawHora) {
        showStatus("Por favor indica la hora preferida para la reunión.", true);
        return;
      }

      const fecha = formatDate(rawFecha);
      const hora = formatTime(rawHora);

      if (loader) loader.show();
      btnAgendar.disable();

      try {
        const payload = {
          name: nombre,
          email,
          phone: telefono,
          company: empresa,
          date: fecha,
          time: hora,
          reason: motivo,
          notes,
        };

        const result = await requestAppointment(payload);
        const refName =
          result?.data?.name ||
          result?.data?.reference ||
          result?.reference ||
          result?.leadName ||
          `CITA-${fecha.replace(/-/g, "")}`;

        showStatus(
          `¡Cita agendada exitosamente! Referencia: ${refName}. Nos comunicaremos a ${email} para coordinar la videollamada.`,
          false,
        );

        // Limpiar formulario tras confirmación exitosa
        if (el("#inpNombre")) el("#inpNombre").value = "";
        if (el("#inpEmail")) el("#inpEmail").value = "";
        if (el("#inpTelefono")) el("#inpTelefono").value = "";
        if (el("#inpEmpresa")) el("#inpEmpresa").value = "";
        if (el("#inpFecha")) el("#inpFecha").value = null;
        if (el("#inpHora")) el("#inpHora").value = null;
        if (el("#txtNotas")) el("#txtNotas").value = "";
      } catch (error) {
        console.error("Error al agendar cita:", error);
        showStatus(
          error.message ||
            "No fue posible enviar la solicitud de cita en este momento. Intenta de nuevo más tarde o contáctanos por WhatsApp.",
          true,
        );
      } finally {
        if (loader) loader.hide();
        btnAgendar.enable();
      }
    });
  }
});
