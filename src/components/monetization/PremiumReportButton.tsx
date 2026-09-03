'use client'

import { useState } from 'react'
import { PREMIUM_REPORT_PRICE_ARS } from '@/lib/premium-report'
import { trackPremiumReportCheckoutStarted } from '@/lib/analytics-events'

interface PremiumReportButtonProps {
  /** Slugs de los vehículos ya seleccionados en la comparación (2 a 5). */
  slugs: string[]
  className?: string
  trackingLabel?: string
}

/**
 * CTA de "Reporte comparativo premium" — ver `docs/monetizacion-plan.md`
 * y `src/lib/premium-report.ts` para el contexto completo.
 *
 * Flujo: click → POST a `/api/premium-report/create-preference` → si
 * Mercado Pago está configurado, redirige a `init_point` (checkout
 * hosteado por Mercado Pago, no hay formulario de tarjeta propio que
 * mantener). Si el endpoint devuelve 503 (falta `MERCADOPAGO_ACCESS_TOKEN`
 * en producción), se muestra un mensaje en vez de un error críptico —
 * evita que un click real de un visitante choque contra una feature a
 * medio configurar.
 */
export function PremiumReportButton({ slugs, className = '', trackingLabel }: PremiumReportButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'unavailable'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const disabled = slugs.length < 2 || slugs.length > 5

  const handleClick = async () => {
    if (disabled || status === 'loading') return
    setStatus('loading')
    setErrorMessage(null)

    trackPremiumReportCheckoutStarted({ slugs, label: trackingLabel || 'comparar' })

    try {
      const res = await fetch('/api/premium-report/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugs }),
      })
      const data = await res.json()

      if (res.status === 503) {
        setStatus('unavailable')
        return
      }
      if (!res.ok || !data.initPoint) {
        setStatus('error')
        setErrorMessage(data.error || 'No se pudo iniciar el pago.')
        return
      }

      window.location.href = data.initPoint
    } catch {
      setStatus('error')
      setErrorMessage('No se pudo conectar con Mercado Pago. Probá de nuevo.')
    }
  }

  if (status === 'unavailable') {
    return (
      <p className={`text-xs text-neutral-400 ${className}`}>
        El reporte premium en PDF todavía no está activo en este sitio.
      </p>
    )
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
        {status === 'loading' ? 'Generando pago…' : `Descargar reporte en PDF (ARS ${PREMIUM_REPORT_PRICE_ARS})`}
      </button>
      {errorMessage && <p className="mt-1.5 text-xs text-red-400">{errorMessage}</p>}
      {!errorMessage && (
        <p className="mt-1.5 text-[11px] text-neutral-400">
          Ficha técnica completa con evidencia citada, para guardar o llevar a la concesionaria. Pago único vía
          Mercado Pago.
        </p>
      )}
    </div>
  )
}
