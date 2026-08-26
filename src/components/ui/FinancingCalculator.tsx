'use client'

import { useMemo, useState } from 'react'
import { calculateFinancing } from '@/lib/financing'
import { Card, CardBody } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

const CURRENCIES = ['USD', 'EUR', 'ARS', 'GBP', 'MXN', 'BRL'] as const

const TERM_OPTIONS = [12, 24, 36, 48, 60, 72] as const

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    // Intl.NumberFormat tira si `currency` no es un código ISO 4217
    // válido — no debería pasar con la lista fija de arriba, pero si
    // algún día se agrega una entrada mal tipeada, esto evita que toda
    // la calculadora explote en vez de solo perder el símbolo.
    return `${currency} ${value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
  }
}

/** Fila label/valor del resultado — mismo lenguaje visual (mono,
 *  tabular-nums) que `Field` en EntityMetadata, para que la calculadora
 *  se sienta parte del mismo sitio y no un widget pegado aparte. */
function ResultRow({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-sm text-auto-text-secondary">{label}</dt>
      <dd
        className={cn(
          'font-mono tabular-nums text-auto-text',
          emphasis ? 'text-lg font-bold text-auto-accent-strong' : 'text-sm font-medium'
        )}
      >
        {value}
      </dd>
    </div>
  )
}

/**
 * Calculadora de cuota/financiamiento (TODO.md, Quick Wins). Es una
 * simulación genérica e independiente del contenido de cada vehículo a
 * propósito — el precio no se auto-completa desde la ficha porque ese
 * campo es texto libre inconsistente en el contenido actual (ver el
 * comentario largo en `lib/financing.ts`). El usuario ingresa el precio
 * a mano, así el resultado siempre corresponde exactamente al número que
 * ve en pantalla.
 */
export function FinancingCalculator() {
  const [price, setPrice] = useState('30000')
  const [currency, setCurrency] = useState<string>('USD')
  const [downPaymentPercent, setDownPaymentPercent] = useState(20)
  const [annualRatePercent, setAnnualRatePercent] = useState('12')
  const [termMonths, setTermMonths] = useState<number>(48)

  const parsedPrice = Number(price.replace(/[^\d.]/g, ''))
  const parsedRate = Number(annualRatePercent.replace(/[^\d.]/g, ''))

  const result = useMemo(
    () =>
      calculateFinancing({
        price: parsedPrice,
        downPaymentPercent,
        annualRatePercent: parsedRate,
        termMonths,
      }),
    [parsedPrice, downPaymentPercent, parsedRate, termMonths]
  )

  return (
    <Card className="shadow-auto-sm">
      <CardBody className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wide text-auto-text-tertiary">
              Precio del vehículo
            </span>
            <div className="flex overflow-hidden rounded-lg border border-auto-border focus-within:border-auto-accent">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                aria-label="Moneda"
                className="border-r border-auto-border bg-auto-surface px-2 text-sm text-auto-text focus:outline-none"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-auto-surface px-3 py-2 text-sm text-auto-text focus:outline-none"
                placeholder="30000"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wide text-auto-text-tertiary">
              Tasa de interés anual (%)
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={annualRatePercent}
              onChange={(e) => setAnnualRatePercent(e.target.value)}
              className="w-full rounded-lg border border-auto-border bg-auto-surface px-3 py-2 text-sm text-auto-text focus:border-auto-accent focus:outline-none"
              placeholder="12"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-wide text-auto-text-tertiary">
              <span>Entrega</span>
              <span className="text-auto-text">{downPaymentPercent}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={90}
              step={5}
              value={downPaymentPercent}
              onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
              className="w-full accent-auto-accent"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wide text-auto-text-tertiary">
              Plazo
            </span>
            <select
              value={termMonths}
              onChange={(e) => setTermMonths(Number(e.target.value))}
              className="w-full rounded-lg border border-auto-border bg-auto-surface px-3 py-2 text-sm text-auto-text focus:border-auto-accent focus:outline-none"
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
          <dl className="space-y-1 border-t border-dashed border-auto-border-strong pt-4">
            <ResultRow label="Cuota mensual estimada" value={formatMoney(result.monthlyPayment, currency)} emphasis />
            <ResultRow label="Entrega" value={formatMoney(result.downPayment, currency)} />
            <ResultRow label="Monto financiado" value={formatMoney(result.financedAmount, currency)} />
            <ResultRow label="Interés total del período" value={formatMoney(result.totalInterest, currency)} />
            <ResultRow label="Total a pagar (entrega + cuotas)" value={formatMoney(result.totalPaid, currency)} />
          </dl>
        ) : (
          <p className="border-t border-dashed border-auto-border-strong pt-4 text-sm text-auto-text-secondary">
            Completá un precio y un plazo válidos para ver la simulación.
          </p>
        )}

        <p className="text-xs text-auto-text-tertiary">
          Simulación con sistema de amortización francés (cuota fija), a fines orientativos. No es una oferta de
          financiamiento ni refleja las condiciones reales de ningún banco o concesionaria.
        </p>
      </CardBody>
    </Card>
  )
}
