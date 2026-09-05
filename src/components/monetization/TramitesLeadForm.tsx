'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trackAffiliateClick } from '@/lib/analytics-events'

/**
 * Captura de leads de TRÁMITES vehiculares (transferencia, patentamiento
 * 0km, cambio de radicación, duplicados, baja) — canal nuevo, documentado
 * en `docs/monetizacion-plan.md` sección 2.19.
 *
 * Por qué esto es un canal aparte de `LeadQuoteForm.tsx` (compra) y
 * `SellVehicleLeadForm.tsx` (venta): el directorio local
 * (`/concesionarias-concepcion-del-uruguay`) ya lista el rubro "gestoria"
 * desde la ronda anterior, pero no existía ninguna forma de CAPTURAR ese
 * tipo de intención en el sitio — alguien que acaba de comprar/heredar/
 * vender un vehículo y necesita hacer el trámite de transferencia no tenía
 * dónde dejar sus datos. El comprador de este lead es una gestoría del
 * directorio, no una concesionaria (esas ya se venden vía 2.5/2.6).
 *
 * Deliberadamente NO calcula costos de trámites (aranceles de Rentas,
 * sellado, verificación policial, etc.): esos valores cambian seguido y
 * varían por provincia/municipio — mostrar un número que quede
 * desactualizado sería peor que no mostrar nada. El formulario solo
 * identifica el TIPO de trámite (para que la gestoría sepa qué está por
 * cotizar) y captura el contacto.
 *
 * Mismo mecanismo "sin backend propio" que el resto del sitio: Google
 * Forms vía `NEXT_PUBLIC_TRAMITES_GFORM_*`, con fallback automático a
 * mailto: si no está configurado.
 */
const CONTACT_EMAIL = 'uruspotcdu@gmail.com'

const TIPOS_TRAMITE = [
  'Transferencia de titularidad (usado)',
  'Patentamiento (0km)',
  'Cambio de radicación',
  'Verificación policial',
  'Duplicado de título / cédula',
  'Baja de vehículo',
  'Otro / no estoy seguro',
] as const

const GFORM_ACTION_URL = process.env.NEXT_PUBLIC_TRAMITES_GFORM_ACTION_URL
const GFORM_ENTRY_NOMBRE = process.env.NEXT_PUBLIC_TRAMITES_GFORM_ENTRY_NOMBRE
const GFORM_ENTRY_CONTACTO = process.env.NEXT_PUBLIC_TRAMITES_GFORM_ENTRY_CONTACTO
const GFORM_ENTRY_TRAMITE = process.env.NEXT_PUBLIC_TRAMITES_GFORM_ENTRY_TRAMITE
const GFORM_ENTRY_COMENTARIO = process.env.NEXT_PUBLIC_TRAMITES_GFORM_ENTRY_COMENTARIO

const GFORM_CONFIGURED = Boolean(
  GFORM_ACTION_URL && GFORM_ENTRY_NOMBRE && GFORM_ENTRY_CONTACTO && GFORM_ENTRY_TRAMITE
)

export function TramitesLeadForm({ className = '' }: { className?: string }) {
  const [tipoTramite, setTipoTramite] = useState<string>(TIPOS_TRAMITE[0])
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [comentario, setComentario] = useState('')
  const [sent, setSent] = useState(false)
  const [sentVia, setSentVia] = useState<'gform' | 'mailto'>('mailto')
  // Envío en curso: desactiva el submit (anti doble-click) y muestra
  // "Enviando…" mientras el fetch a Google Forms resuelve.
  const [sending, setSending] = useState(false)

  // Mismo criterio que LeadQuoteForm/SellVehicleLeadForm: el submit se
  // desactiva visiblemente hasta que estén los datos obligatorios.
  const formValid = nombre.trim() !== '' && contacto.trim() !== ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (sending) return
    if (!nombre.trim() || !contacto.trim()) return

    trackAffiliateClick({
      platform: 'lead-tramites',
      vehicleName: tipoTramite,
      label: 'tramites-vehiculo-form',
    })

    setSending(true)

    if (GFORM_CONFIGURED) {
      const formData = new URLSearchParams()
      formData.append(GFORM_ENTRY_NOMBRE!, nombre)
      formData.append(GFORM_ENTRY_CONTACTO!, contacto)
      formData.append(GFORM_ENTRY_TRAMITE!, tipoTramite)
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
      setSending(false)
      setSent(true)
      return
    }

    sendMailtoFallback()
    setSentVia('mailto')
    setSending(false)
    setSent(true)

    function sendMailtoFallback() {
      const subject = encodeURIComponent(`Trámite vehicular — ${tipoTramite}`)
      const body = encodeURIComponent(
        `Tipo de trámite: ${tipoTramite}\nNombre: ${nombre}\nContacto (tel/email): ${contacto}\nComentario: ${comentario || '(sin comentario)'}`
      )
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
    }
  }

  if (sent) {
    return (
      <div className={`rounded-lg border border-auto-accent/30 bg-auto-accent/5 p-4 text-sm text-neutral-700 ${className}`}>
        {sentVia === 'gform'
          ? '✅ ¡Listo! Registramos tu consulta, te contactamos con una gestoría de la zona.'
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
    <form onSubmit={handleSubmit} aria-busy={sending} className={`rounded-lg border border-edge bg-surface-card p-4 ${className}`}>
      <p className="mb-3 text-sm font-semibold text-neutral-900">
        📋 Contanos qué trámite necesitás y te conectamos con una gestoría
      </p>
      <div className="space-y-2">
        <select
          value={tipoTramite}
          onChange={(e) => setTipoTramite(e.target.value)}
          aria-label="Tipo de trámite"
          className="w-full rounded-md border border-edge bg-white px-3 py-2 text-sm text-neutral-900 transition duration-200 focus:border-auto-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
        >
          {TIPOS_TRAMITE.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Tu nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          className="w-full rounded-md border border-edge bg-white px-3 py-2 text-sm transition duration-200 focus:border-auto-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
        />
        <input
          type="text"
          placeholder="Teléfono o email de contacto"
          value={contacto}
          onChange={(e) => setContacto(e.target.value)}
          required
          className="w-full rounded-md border border-edge bg-white px-3 py-2 text-sm transition duration-200 focus:border-auto-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
        />
        <textarea
          placeholder="Marca, modelo, año o algo puntual (opcional)"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-edge bg-white px-3 py-2 text-sm transition duration-200 focus:border-auto-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
        />
        <button
          type="submit"
          disabled={!formValid || sending}
          className="w-full rounded-md bg-auto-accent px-3 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-auto-accent-strong active:scale-[0.99] active:bg-auto-accent-strong disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent focus-visible:ring-offset-2"
        >
          {sending ? 'Enviando…' : 'Quiero que me contacten'}
        </button>
        <p className="text-center text-[11px] text-neutral-400">
          No calculamos aranceles ni costos de trámite acá (varían por provincia y cambian seguido) — una
          gestoría real te da el presupuesto exacto.
        </p>
      </div>
    </form>
  )
}
