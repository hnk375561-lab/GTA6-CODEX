'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trackAffiliateClick } from '@/lib/analytics-events'

/**
 * Captura de leads de VENTA/tasación (distinto de `LeadQuoteForm.tsx`,
 * que captura intención de COMPRA).
 *
 * Por qué esto es un canal separado y no "más de lo mismo": una
 * concesionaria no solo paga por gente que quiere comprar — paga (a
 * veces mejor, porque hoy escasea stock de usados) por gente que tiene un
 * auto para VENDER o entregar como parte de pago. Hoy ese interés
 * quedaba completamente sin capturar: la guía
 * `como-tasar-auto-usado-antes-de-vender.json` explica cómo tasar un
 * auto pero no tenía ningún formulario — alguien que llegaba con
 * intención real de vender no tenía dónde dejar sus datos.
 *
 * Mismo mecanismo que `LeadQuoteForm.tsx` (Google Forms como backend
 * gratis vía `NEXT_PUBLIC_VENTA_GFORM_*`, fallback a mailto si no está
 * configurado) para no duplicar infraestructura nueva. Se guarda aparte
 * (`fuente: 'lead-venta-usado'` en revenue.ts) porque el valor y el
 * comprador de este lead son distintos al de compra: acá el cliente que
 * paga es "quiero comprar autos usados para revender", no necesariamente
 * el mismo que paga por leads de compra.
 */
const CONTACT_EMAIL = 'uruspotcdu@gmail.com'

const GFORM_ACTION_URL = process.env.NEXT_PUBLIC_VENTA_GFORM_ACTION_URL
const GFORM_ENTRY_NOMBRE = process.env.NEXT_PUBLIC_VENTA_GFORM_ENTRY_NOMBRE
const GFORM_ENTRY_CONTACTO = process.env.NEXT_PUBLIC_VENTA_GFORM_ENTRY_CONTACTO
const GFORM_ENTRY_VEHICULO = process.env.NEXT_PUBLIC_VENTA_GFORM_ENTRY_VEHICULO
const GFORM_ENTRY_COMENTARIO = process.env.NEXT_PUBLIC_VENTA_GFORM_ENTRY_COMENTARIO

const GFORM_CONFIGURED = Boolean(
  GFORM_ACTION_URL && GFORM_ENTRY_NOMBRE && GFORM_ENTRY_CONTACTO && GFORM_ENTRY_VEHICULO
)

export function SellVehicleLeadForm({
  trackingLabelPrefix,
  className = '',
}: {
  trackingLabelPrefix: string
  className?: string
}) {
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [vehiculo, setVehiculo] = useState('')
  const [comentario, setComentario] = useState('')
  const [sent, setSent] = useState(false)
  const [sentVia, setSentVia] = useState<'gform' | 'mailto'>('mailto')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !contacto.trim() || !vehiculo.trim()) return

    trackAffiliateClick({
      platform: 'lead-venta',
      vehicleName: vehiculo,
      label: `${trackingLabelPrefix}-lead-venta-form`,
    })

    if (GFORM_CONFIGURED) {
      const formData = new URLSearchParams()
      formData.append(GFORM_ENTRY_NOMBRE!, nombre)
      formData.append(GFORM_ENTRY_CONTACTO!, contacto)
      formData.append(GFORM_ENTRY_VEHICULO!, vehiculo)
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
        sendMailtoFallback()
        setSentVia('mailto')
      }
      setSent(true)
      return
    }

    sendMailtoFallback()
    setSentVia('mailto')
    setSent(true)

    function sendMailtoFallback() {
      const subject = encodeURIComponent(`Quiero vender/tasar mi auto — ${vehiculo}`)
      const body = encodeURIComponent(
        `Vehículo a vender: ${vehiculo}\nNombre: ${nombre}\nContacto (tel/email): ${contacto}\nComentario: ${comentario || '(sin comentario)'}`
      )
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
    }
  }

  if (sent) {
    return (
      <div className={`rounded-lg border border-auto-accent/30 bg-auto-accent/5 p-4 text-sm text-neutral-700 ${className}`}>
        {sentVia === 'gform'
          ? '✅ ¡Listo! Ya registramos tu auto, te contactamos con propuestas reales.'
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
      <p className="mb-3 text-sm font-semibold text-neutral-900">🚗 Dejá los datos de tu auto o moto y recibí propuestas</p>
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Marca, modelo y año (ej. Toyota Corolla 2019)"
          value={vehiculo}
          onChange={(e) => setVehiculo(e.target.value)}
          required
          className="w-full rounded-md border border-edge bg-white px-3 py-2 text-sm"
        />
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
          placeholder="Kilometraje, estado, algo puntual (opcional)"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-edge bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="w-full rounded-md bg-auto-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-auto-accent-strong"
        >
          Quiero vender mi vehículo
        </button>
        <p className="text-center text-[11px] text-neutral-400">
          No compartimos tus datos con nadie sin tu consentimiento explícito.
        </p>
      </div>
    </form>
  )
}
