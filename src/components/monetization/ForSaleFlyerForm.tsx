'use client'

import { useState } from 'react'
import { FLYER_PRICE_ARS, isValidFlyerData, type FlyerData } from '@/lib/for-sale-flyer'
import { trackPremiumReportCheckoutStarted } from '@/lib/analytics-events'

/**
 * Formulario del "cartel de venta" pago — ver `src/lib/for-sale-flyer.ts`
 * para el modelo de negocio completo. Reutiliza
 * `trackPremiumReportCheckoutStarted` para el evento de analytics en vez
 * de crear uno nuevo: ambos son "inicio de checkout de un producto
 * pequeño vía Mercado Pago", el nombre del evento no necesita ser
 * literal al reporte premium para servir el mismo propósito de embudo.
 */
export function ForSaleFlyerForm({ className = '' }: { className?: string }) {
  const [data, setData] = useState<FlyerData>({
    marca: '',
    modelo: '',
    anio: '',
    precio: '',
    km: '',
    contacto: '',
    ubicacion: '',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'unavailable'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const disabled = !isValidFlyerData(data)

  function update<K extends keyof FlyerData>(key: K, value: string) {
    setData((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (disabled || status === 'loading') return
    setStatus('loading')
    setErrorMessage(null)

    trackPremiumReportCheckoutStarted({ slugs: [`flyer:${data.marca}-${data.modelo}`], label: 'cartel-venta' })

    try {
      const res = await fetch('/api/for-sale-flyer/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()

      if (res.status === 503) {
        setStatus('unavailable')
        return
      }
      if (!res.ok || !json.initPoint) {
        setStatus('error')
        setErrorMessage(json.error || 'No se pudo iniciar el pago.')
        return
      }

      window.location.href = json.initPoint
    } catch {
      setStatus('error')
      setErrorMessage('No se pudo conectar con Mercado Pago. Probá de nuevo.')
    }
  }

  if (status === 'unavailable') {
    return (
      <p role="status" className={`text-sm text-neutral-400 ${className}`}>
        El cartel de venta en PDF todavía no está activo en este sitio.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={`rounded-lg border border-edge bg-surface-card p-4 ${className}`}>
      <p className="mb-3 text-sm font-semibold text-neutral-900">
        🖼️ Generá un cartel de venta profesional (PDF, ARS {FLYER_PRICE_ARS})
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Marca (ej. Toyota)"
          value={data.marca}
          onChange={(e) => update('marca', e.target.value)}
          required
          className="w-full rounded-md border border-edge bg-surface-input px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Modelo (ej. Corolla)"
          value={data.modelo}
          onChange={(e) => update('modelo', e.target.value)}
          required
          className="w-full rounded-md border border-edge bg-surface-input px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Año (ej. 2019)"
          value={data.anio}
          onChange={(e) => update('anio', e.target.value)}
          required
          className="w-full rounded-md border border-edge bg-surface-input px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Kilometraje (opcional)"
          value={data.km}
          onChange={(e) => update('km', e.target.value)}
          className="w-full rounded-md border border-edge bg-surface-input px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Precio (ej. USD 15.000)"
          value={data.precio}
          onChange={(e) => update('precio', e.target.value)}
          required
          className="col-span-2 w-full rounded-md border border-edge bg-surface-input px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Teléfono de contacto"
          value={data.contacto}
          onChange={(e) => update('contacto', e.target.value)}
          required
          className="col-span-2 w-full rounded-md border border-edge bg-surface-input px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Ubicación (opcional, ej. Concepción del Uruguay)"
          value={data.ubicacion}
          onChange={(e) => update('ubicacion', e.target.value)}
          className="col-span-2 w-full rounded-md border border-edge bg-surface-input px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={disabled || status === 'loading'}
        className="mt-3 w-full rounded-md bg-auto-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-auto-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === 'loading' ? 'Generando pago…' : `Pagar y descargar (ARS ${FLYER_PRICE_ARS})`}
      </button>
      {errorMessage && <p role="alert" className="mt-1.5 text-xs text-red-400">{errorMessage}</p>}
      <p className="mt-2 text-center text-[11px] text-neutral-400">
        Pago único vía Mercado Pago. No guardamos tus datos en ningún servidor: viajan solo hasta generar el PDF.
      </p>
    </form>
  )
}
