'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trackAffiliateClick } from '@/lib/analytics-events'

/**
 * Captura de leads de compra ("Solicitá cotización sin compromiso").
 *
 * Por qué esto y no solo más afiliados: en el rubro automotor, un lead
 * calificado (nombre + teléfono + qué auto quiere) vale mucho más para
 * una concesionaria que una comisión de afiliado de Mercado Libre — es
 * habitual que un concesionario pague $3.000-$15.000 ARS por lead real
 * (persona que ya comparó specs y decidió qué auto quiere, no un click
 * frío). Esta ficha ya tiene esa audiencia de alta intención; hoy ese
 * valor se estaba regalando entero a ML/afiliados sin capturar el dato
 * de contacto de la persona en ningún lado.
 *
 * Modelo de negocio (dos formas de cobrar el mismo formulario, elegí
 * una o combiná ambas — no requiere tocar este componente, solo cambiar
 * a quién se le manda el mailto o agregar destinatarios):
 *   1. Lead directo: el mail llega a tu casilla, vos lo revendés/pasás a
 *      la concesionaria que ya te paga por `MonetizationCtaGroup`/`anunciate`
 *      (mismo cliente, canal nuevo — ver prospeccion/).
 *   2. Lead compartido: agregás un segundo destinatario en `to` (CC a la
 *      concesionaria patrocinadora de esa marca/modelo) y cobrás un fee
 *      mensual fijo por "recibir todos los leads de Toyota", en vez de
 *      por lead individual — más simple de facturar.
 *
 * Mismo criterio que `NewsletterSignupForm.tsx`: mailto: en vez de un
 * backend nuevo. Cuando el volumen lo justifique, este es el único
 * archivo a tocar (cambiar `handleSubmit` para postear a un CRM/Sheet).
 */
// Misma casilla que el resto del sitio usa como contacto (footer, media
// kit, newsletter). Si en algún momento el lead se reparte con una
// concesionaria patrocinadora, agregar un segundo destinatario acá.
const CONTACT_EMAIL = 'uruspotcdu@gmail.com'

export function LeadQuoteForm({
  vehicleName,
  trackingLabelPrefix,
  className = '',
}: {
  vehicleName: string
  trackingLabelPrefix: string
  className?: string
}) {
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [comentario, setComentario] = useState('')
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !contacto.trim()) return

    const subject = encodeURIComponent(`Lead de cotización — ${vehicleName}`)
    const body = encodeURIComponent(
      `Vehículo: ${vehicleName}\nNombre: ${nombre}\nContacto (tel/email): ${contacto}\nComentario: ${comentario || '(sin comentario)'}\n\n— enviado desde la ficha de ${vehicleName}`
    )
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`

    trackAffiliateClick({
      platform: 'lead-cotizacion',
      vehicleName,
      label: `${trackingLabelPrefix}-lead-form`,
    })
    setSent(true)
  }

  if (sent) {
    return (
      <div className={`rounded-lg border border-auto-accent/30 bg-auto-accent/5 p-4 text-sm text-neutral-700 ${className}`}>
        ✅ Se abrió tu cliente de correo con los datos cargados. Si no se abrió automáticamente,
        escribinos por WhatsApp desde <Link className="underline" href="/anunciate">la página de contacto</Link>.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={`rounded-lg border border-edge bg-surface-card p-4 ${className}`}>
      <p className="mb-3 text-sm font-semibold text-neutral-900">
        📩 Solicitá una cotización de {vehicleName} sin compromiso
      </p>
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Tu nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          className="w-full rounded-md border border-edge bg-white px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Teléfono o email de contacto"
          value={contacto}
          onChange={(e) => setContacto(e.target.value)}
          required
          className="w-full rounded-md border border-edge bg-white px-3 py-2 text-sm"
        />
        <textarea
          placeholder="¿Algo puntual que quieras preguntar? (opcional)"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-edge bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="w-full rounded-md bg-auto-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-auto-accent-strong"
        >
          Pedir cotización
        </button>
        <p className="text-center text-[11px] text-neutral-400">
          No compartimos tus datos con nadie sin tu consentimiento explícito.
        </p>
      </div>
    </form>
  )
}
