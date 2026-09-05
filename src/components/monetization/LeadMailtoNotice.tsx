/**
 * Aviso contextual reutilizado por los tres formularios de leads
 * (`LeadQuoteForm`, `SellVehicleLeadForm`, `TramitesLeadForm`) cuando el
 * Google Form no está configurado (`!GFORM_CONFIGURED`) y el envío caerá a
 * `mailto:`. Se muestra ANTES del click — el usuario sabe de entrada que su
 * cliente de correo se va a abrir, en vez de enterarse después del submit.
 *
 * Es el mismo principio que el resto del sitio (fail-soft, no fail-closed):
 * no se bloquea el envío, solo se hace transparente el canal.
 */
export function LeadMailtoNotice() {
  return (
    <p className="text-center text-[11px] leading-relaxed text-neutral-500">
      Tu envío se completa en tu cliente de correo — la captura automática todavía no está activa.
    </p>
  )
}