/**
 * Notification payload builders for future integrations.
 * Pure functions: no messages are sent and no secrets or customer photos leave the server.
 * Only invoke from an authenticated/controlled server-side dispatcher when providers are configured.
 */
export type RequestNotice = {
  reference: string;
  name: string;
  email?: string;
  phone?: string;
  productSummary: string[];
  totalCents: number;
};
export type NotificationDraft = {
  subject: string;
  text: string;
};

function mxn(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cents / 100);
}

/** Private contact details belong only in the owner's authenticated email, never in WhatsApp templates. */
export function ownerRequestEmail(notice: RequestNotice): NotificationDraft {
  return {
    subject: "ATHELIER · Nueva solicitud " + notice.reference,
    text: [
      "ATHELIER recibió una nueva solicitud de personalización.",
      "",
      "Referencia: " + notice.reference,
      "Cliente: " + notice.name,
      "Correo: " + (notice.email || "No proporcionado"),
      "Teléfono: " + (notice.phone || "No proporcionado"),
      "Productos: " + notice.productSummary.join(", "),
      "Importe de referencia (no pagado): " + mxn(notice.totalCents),
      "",
      "Revisa los detalles y las fotografías privadas dentro del Administrador:",
      "https://athelier.mx/admin",
      "",
      "Este aviso no confirma ningún pago ni una orden aceptada.",
    ].join("\n"),
  };
}

/** Send only if the customer actually provided an address and consented. */
export function customerReceiptEmail(notice: RequestNotice): NotificationDraft {
  return {
    subject: "ATHELIER · Recibimos tu solicitud " + notice.reference,
    text: [
      "Hola, " + notice.name + ":",
      "",
      "Recibimos tu solicitud de personalización en ATHELIER.",
      "Tu referencia es: " + notice.reference,
      "Importe estimado: " + mxn(notice.totalCents),
      "",
      "Nuestro equipo revisará tu solicitud y se pondrá en contacto contigo.",
      "Esto no es un recibo de pago ni confirma una compra.",
      "",
      "Gracias por elegir ATHELIER.",
    ].join("\n"),
  };
}

/** Use only with an approved WhatsApp Business template and recipient opt-in. */
export function ownerWhatsAppVariables(notice: RequestNotice) {
  return {
    reference: notice.reference,
    total: mxn(notice.totalCents),
  };
}
