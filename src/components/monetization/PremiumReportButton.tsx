'use client'

import { useState } from 'react'
import { trackPremiumReportCheckoutStarted } from '@/lib/analytics-events'

interface PremiumReportButtonProps {
  /** Slugs de los vehículos ya seleccionados en la comparación (2 a 5). */
  slugs: string[]
  className?: string
  trackingLabel?: string
}

/**
 * CTA de "Reporte comparativo" — ver `docs/monetizacion-plan.md` y
 * `src/lib/premium-report.ts` para el contexto histórico.
 *
 * Migración a GitHub Pages (sitio 100% estático, sin servidor): antes,
 * el click hacía POST a `/api/premium-report/create-preference` y
 * redirigía al checkout de Mercado Pago; el PDF se generaba recién
 * después de confirmar el pago vía `/api/premium-report/pdf`. Ninguna de
 * las dos rutas puede vivir en hosting estático (necesitan
 * `MERCADOPAGO_ACCESS_TOKEN` server-side), así que el cobro se cae y el
 * PDF se genera directo en el navegador con `buildPremiumReportPdf`
 * (pdf-lib no depende de Node) — el reporte pasa a ser gratis.
 *
 * `buildPremiumReportPdf` se importa dinámicamente recién al hacer click
 * (arrastra el catálogo completo de vehículos) para no sumarlo al bundle
 * inicial de `/comparar`.
 */
export function PremiumReportButton({ slugs, className = '', trackingLabel }: PremiumReportButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const disabled = slugs.length < 2 || slugs.length > 5

  const handleClick = async () => {
    if (disabled || status === 'loading') return
    setStatus('loading')
    setErrorMessage(null)

    trackPremiumReportCheckoutStarted({ slugs, label: trackingLabel || 'comparar' })

    try {
      const [{ buildPremiumReportPdf }, { downloadPdfBytes }] = await Promise.all([
        import('@/lib/pdf/build-premium-report'),
        import('@/lib/pdf/download'),
      ])
      const bytes = await buildPremiumReportPdf(slugs)
      downloadPdfBytes(bytes, `reporte-${slugs.join('-')}.pdf`)
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'No se pudo generar el PDF. Probá de nuevo.')
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || status === 'loading'}
        className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-auto-accent bg-transparent px-4 py-2 text-sm font-semibold text-auto-accent-strong transition-colors hover:bg-auto-accent hover:text-auto-darker disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 15V3m0 12-4-4m4 4 4-4" />
          <path d="M2 17l.6 3.4a2 2 0 0 0 2 1.6h14.8a2 2 0 0 0 2-1.6L22 17" />
        </svg>
        {status === 'loading' ? 'Generando PDF…' : 'Descargar reporte en PDF (gratis)'}
      </button>
      {errorMessage && <p role="alert" className="mt-1.5 text-xs text-red-400">{errorMessage}</p>}
      {!errorMessage && (
        <p className="mt-1.5 text-[11px] text-neutral-400">
          Ficha técnica completa con evidencia citada, para guardar o llevar a la concesionaria.
        </p>
      )}
    </div>
  )
}
