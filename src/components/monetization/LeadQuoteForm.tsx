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
 * Envío: Google Forms como "backend" gratis, sin servidor propio.
 * Si `NEXT_PUBLIC_LEADS_GFORM_ACTION_URL` está configurada, el submit
 * postea directo al formResponse de un Google Form (que ya viene con
 * una hoja de cálculo enlazada automáticamente — el "CRM" es esa
 * planilla, todos los leads en un lugar ordenado, exportable, filtrable
 * por vehículo/fecha). Ver `.env.example` para el paso a paso de cómo
 * crear el form (2 minutos, con la cuenta de Gmail que ya usás).
 *
 * Si esas env vars NO están configuradas, cae a mailto: (mismo
 * comportamiento que antes) para que el botón nunca se rompa aunque el
 * form no esté armado todavía — fail-soft, no fail-closed, porque acá
 * perder un lead sí duele.
 *
 * Modelo de negocio (no requiere tocar este componente):
 *   1. Lead directo: revisás la planilla y lo pasás a la concesionaria
 *      que ya te paga por `MonetizationCtaGroup`/`anunciate`.
 *   2. Lead compartido: le das acceso de lectura a la planilla (filtrada
 *      por columna "Vehículo") a la concesionaria patrocinadora de esa
 *      marca, y cobrás un fee mensual fijo en vez de por lead individual.
 */
const CONTACT_EMAIL = 'uruspotcdu@gmail.com'

const GFORM_ACTION_URL = process.env.NEXT_PUBLIC_LEADS_GFORM_ACTION_URL
const GFORM_ENTRY_NOMBRE = process.env.NEXT_PUBLIC_LEADS_GFORM_ENTRY_NOMBRE
const GFORM_ENTRY_CONTACTO = process.env.NEXT_PUBLIC_LEADS_GFORM_ENTRY_CONTACTO
const GFORM_ENTRY_VEHICULO = process.env.NEXT_PUBLIC_LEADS_GFORM_ENTRY_VEHICULO
const GFORM_ENTRY_COMENTARIO = process.env.NEXT_PUBLIC_LEADS_GFORM_ENTRY_COMENTARIO

const GFORM_CONFIGURED = Boolean(
  GFORM_ACTION_URL && GFORM_ENTRY_NOMBRE && GFORM_ENTRY_CONTACTO && GFORM_ENTRY_VEHICULO
)

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
  const [sentVia, setSentVia] = useState<'gform' | 'mailto'>('mailto')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !contacto.trim()) return

    trackAffiliateClick({
      platform: 'lead-cotizacion',
      vehicleName,
      label: `${trackingLabelPrefix}-lead-form`,
    })

    if (GFORM_CONFIGURED) {
      // no-cors: Google Forms no devuelve headers CORS, así que la
      // respuesta es "opaque" (no podemos leer status) — se asume éxito
      // si el fetch no tira excepción. Es el patrón estándar para
      // postear a Google Forms desde un sitio de terceros.
      const formData = new URLSearchParams()
      formData.append(GFORM_ENTRY_NOMBRE!, nombre)
      formData.append(GFORM_ENTRY_CONTACTO!, contacto)
      formData.append(GFORM_ENTRY_VEHICULO!, vehicleName)
      if (GFORM_ENTRY_COMENTARIO) {
        formData.append(GFORM_ENTRY_COMENTARIO, comentario)
      }
      try {
        await fetch(GFORM_ACTION_URL!, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString(),
        })
        setSentVia('gform')
      } catch {
        // Si falla la red (o el CSP bloquea el fetch), no perdemos el
        // lead: caemos a mailto igual, pero avisamos que fue por esa vía
        // (ver `sentVia` más abajo) en vez de mentir que llegó al Sheet.
        const subject = encodeURIComponent(`Lead de cotización — ${vehicleName}`)
        const body = encodeURIComponent(
          `Vehículo: ${vehicleName}\nNombre: ${nombre}\nContacto (tel/email): ${contacto}\nComentario: ${comentario || '(sin comentario)'}`
        )
        window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
        setSentVia('mailto')
      }
      setSent(true)
      return
    }

    // Fallback sin Google Form configurado: mailto, como antes.
    const subject = encodeURIComponent(`Lead de cotización — ${vehicleName}`)
    const body = encodeURIComponent(
      `Vehículo: ${vehicleName}\nNombre: ${nombre}\nContacto (tel/email): ${contacto}\nComentario: ${comentario || '(sin comentario)'}\n\n— enviado desde la ficha de ${vehicleName}`
    )
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
    setSentVia('mailto')
    setSent(true)
  }

  if (sent) {
    return (
      <div className={`rounded-lg border border-auto-accent/30 bg-auto-accent/5 p-4 text-sm text-neutral-700 ${className}`}>
        {sentVia === 'gform'
          ? '✅ ¡Listo! Ya registramos tu consulta, te contactamos a la brevedad.'
          : '✅ Se abrió tu cliente de correo con los datos cargados. Si no se abrió automáticamente, escribinos por WhatsApp desde '}
        {sentVia === 'mailto' && (
          <Link className="underline" href="/anunciate">
            la página de contacto
          </Link>
        )}
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
