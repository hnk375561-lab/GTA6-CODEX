'use client'

import { useState } from 'react'
import { isValidFlyerData, type FlyerData } from '@/lib/for-sale-flyer'
import { trackPremiumReportCheckoutStarted } from '@/lib/analytics-events'

/**
 * Formulario del "cartel de venta" — ver `src/lib/for-sale-flyer.ts` para
 * el modelo de negocio histórico.
 *
 * Migración a GitHub Pages: antes, "Pagar y descargar" hacía POST a
 * `/api/for-sale-flyer/create-preference` y redirigía a Mercado Pago; el
 * PDF salía recién de `/api/for-sale-flyer/pdf` tras confirmar el pago.
 * Sin servidor no hay forma de cobrar (necesita
 * `MERCADOPAGO_ACCESS_TOKEN`), así que el cartel pasa a ser gratis y el
 * PDF se genera directo en el navegador con `buildFlyerPdf`.
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
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
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
      const [{ buildFlyerPdf, findUnencodableFlyerField }, { downloadPdfBytes }] = await Promise.all([
        import('@/lib/pdf/build-flyer'),
        import('@/lib/pdf/download'),
      ])

      const unencodableField = await findUnencodableFlyerField(data)
      if (unencodableField) {
        setStatus('error')
        setErrorMessage(`El campo "${unencodableField}" tiene un caracter que el cartel no puede imprimir (ej. emoji). Sacalo e intentá de nuevo.`)
        return
      }

      const bytes = await buildFlyerPdf(data)
      downloadPdfBytes(bytes, `cartel-venta-${data.marca}-${data.modelo}.pdf`.replace(/\s+/g, '-'))
      setStatus('idle')
    } catch {
      setStatus('error')
      setErrorMessage('No se pudo generar el PDF. Probá de nuevo.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`rounded-lg border border-edge bg-surface-card p-4 ${className}`}>
      <p className="mb-3 text-sm font-semibold text-neutral-900">
        🖼️ Generá un cartel de venta profesional (PDF, gratis)
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
        {status === 'loading' ? 'Generando PDF…' : 'Descargar cartel (gratis)'}
      </button>
      {errorMessage && <p role="alert" className="mt-1.5 text-xs text-red-400">{errorMessage}</p>}
      <p className="mt-2 text-center text-[11px] text-neutral-400">
        El PDF se genera en tu navegador. No mandamos tus datos a ningún servidor.
      </p>
    </form>
  )
}
