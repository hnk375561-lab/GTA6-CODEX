'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { calculateFinancing } from '@/lib/financing'
import { Card, CardBody } from '@/components/ui/Card'

const TERM_OPTIONS = [12, 24, 36, 48, 60, 72] as const

/** Entrega y tasa fijas (no editables acá — esos dos campos son
 *  justamente lo que separa esta versión de la calculadora completa de
 *  `/financiamiento`). Mismos valores por defecto que ya usa
 *  `FinancingCalculator` (`downPaymentPercent = 20`,
 *  `annualRatePercent = '12'`), así que el número que ve el usuario acá
 *  coincide con el que va a encontrar si sigue a la versión completa sin
 *  tocar nada más que precio/plazo. */
const DEFAULT_DOWN_PAYMENT_PERCENT = 20
const DEFAULT_ANNUAL_RATE_PERCENT = 12

function formatUsd(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Teaser de la calculadora de cuota (3.1, panel 8): versión reducida de
 * `FinancingCalculator.tsx` (`/financiamiento`) con solo los dos inputs
 * que definen la pregunta que trae a alguien a este panel — "¿cuánto
 * pagaría por mes?" — y no los que ajustan la simulación (moneda,
 * entrega, tasa), que quedan fijos en un valor de referencia y solo son
 * editables en la versión completa.
 *
 * Reusa `calculateFinancing` (`lib/financing.ts`) tal cual — misma
 * matemática (amortización francesa) que la calculadora completa, nunca
 * un cálculo aproximado propio — así que el resultado acá y en
 * `/financiamiento` con los mismos precio/plazo siempre coinciden.
 *
 * El link final pasa `?precio=` (mismo querystring que ya lee
 * `FinancingCalculator` vía `useSearchParams`, ver el comentario en ese
 * componente) para no perder el precio ya cargado al pasar a la versión
 * completa.
 */
export function FinancingTeaser() {
  const [price, setPrice] = useState('30000')
  const [termMonths, setTermMonths] = useState<number>(48)

  const parsedPrice = Number(price.replace(/[^\d.]/g, ''))

  const result = useMemo(
    () =>
      calculateFinancing({
        price: parsedPrice,
        downPaymentPercent: DEFAULT_DOWN_PAYMENT_PERCENT,
        annualRatePercent: DEFAULT_ANNUAL_RATE_PERCENT,
        termMonths,
      }),
    [parsedPrice, termMonths]
  )

  const fullCalculatorHref =
    Number.isFinite(parsedPrice) && parsedPrice > 0
      ? `/financiamiento?precio=${Math.round(parsedPrice)}`
      : '/financiamiento'

  return (
    <Card className="shadow-sm">
      <CardBody className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-left">
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wide text-neutral-400">
              Precio del vehículo (USD)
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-edge bg-surface-card px-3 py-2 text-sm text-neutral-900 focus:border-auto-accent focus:outline-none"
              placeholder="30000"
              aria-label="Precio del vehículo en dólares"
            />
          </label>

          <label className="block text-left">
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wide text-neutral-400">
              Plazo
            </span>
            <select
              value={termMonths}
              onChange={(e) => setTermMonths(Number(e.target.value))}
              className="w-full rounded-lg border border-edge bg-surface-card px-3 py-2 text-sm text-neutral-900 focus:border-auto-accent focus:outline-none"
              aria-label="Plazo del financiamiento en meses"
            >
              {TERM_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m} meses
                </option>
              ))}
            </select>
          </label>
        </div>

        {result ? (
          <div className="flex items-baseline justify-between gap-4 border-t border-dashed border-edge-strong pt-4 text-left">
            <span className="text-sm text-neutral-500">Cuota mensual estimada</span>
            <span className="font-mono text-2xl font-bold tabular-nums text-auto-accent-strong">
              {formatUsd(result.monthlyPayment)}
            </span>
          </div>
        ) : (
          <p className="border-t border-dashed border-edge-strong pt-4 text-left text-sm text-neutral-500">
            Completá un precio válido para ver la cuota estimada.
          </p>
        )}

        <p className="text-left text-xs text-neutral-400">
          Con {DEFAULT_DOWN_PAYMENT_PERCENT}% de entrega y una tasa de referencia del {DEFAULT_ANNUAL_RATE_PERCENT}%
          anual — ajustá moneda, entrega y tasa en la simulación completa. No es una oferta de financiamiento ni
          refleja las condiciones reales de ningún banco o concesionaria.
        </p>

        <div className="text-center">
          <Link
            href={fullCalculatorHref}
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-inverse px-6 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Ver simulación completa{' '}
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>
      </CardBody>
    </Card>
  )
}
