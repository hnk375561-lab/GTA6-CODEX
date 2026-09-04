'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { calculateFinancing } from '@/lib/financing'
import { Card, CardBody } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { trackLeadSubmit } from '@/lib/analytics-events'

const CURRENCIES = ['USD', 'EUR', 'ARS', 'GBP', 'MXN', 'BRL'] as const

const TERM_OPTIONS = [12, 24, 36, 48, 60, 72] as const

// Mismo criterio que MELI_AFFILIATE_TAG_DEFAULT en
// MercadoLibreAffiliateButton.tsx: número real confirmado por el usuario
// (el mismo de prospeccion/media-kit-data.json), hardcodeado como
// default porque de todos modos queda expuesto en cualquier link de
// WhatsApp que se comparta. NEXT_PUBLIC_WHATSAPP_NUMBER permite
// rotarlo sin tocar código. Formato E.164 sin "+" (requerido por
// wa.me): 54 9 3445 511081 → "5493445511081".
const WHATSAPP_NUMBER_DEFAULT = '5493445511081'

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
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd
        className={cn(
          'font-mono tabular-nums text-neutral-900',
          emphasis ? 'text-lg font-bold text-auto-accent-strong' : 'text-sm font-medium'
        )}
      >
        {value}
      </dd>
    </div>
  )
}

/**
 * Calculadora de cuota/financiamiento (TODO.md, Quick Wins). Sigue sin
 * intentar leer/parsear el precio en el caso general: `price` es texto
 * libre inconsistente en el contenido actual (ver el comentario largo en
 * `lib/financing.ts`), así que por defecto el usuario lo ingresa a mano.
 *
 * Excepción acotada (Oportunidad #8 de la auditoría "AutoFicha:
 * aprovechamiento de datos"): cuando la ficha de origen SÍ tiene un
 * precio en USD confiablemente parseable (`parsePriceUsd`, ver
 * `lib/vehicle-price.ts` — nunca adivina, solo reconoce un número USD ya
 * inequívoco en el texto), el link "Simular cuota →" de la ficha pasa ese
 * valor por querystring (`?precio=34900`) y esta calculadora lo usa para
 * precargar el campo. Sigue siendo 100% editable: no es más que ahorrar
 * la copia manual en el caso feliz, nunca un valor inventado. `vehiculo`
 * (nombre del modelo) viaja en el mismo link solo para dar contexto al
 * mensaje de WhatsApp del lead — no se usa en ningún cálculo.
 *
 * Captura de leads (Monetización, fase 2): debajo del resultado se
 * ofrece un botón "Enviar por WhatsApp" que arma un mensaje prellenado
 * (con nombre, teléfono del interesado y el detalle de la simulación) y
 * abre wa.me hacia el número del sitio. Se eligió WhatsApp en vez de un
 * formulario con backend propio a propósito: cero infraestructura nueva
 * (sin base de datos, sin API route, sin servicio de email de terceros)
 * y el lead cae directo en un canal que ya se usa activamente para
 * prospección (ver prospeccion/mensajes-whatsapp-listos.md). El costo es
 * que el "CRM" de leads es la bandeja de WhatsApp — aceptable al volumen
 * actual, revisar si el volumen crece mucho.
 */
export function FinancingCalculator() {
  const searchParams = useSearchParams()
  const prefillPrice = searchParams.get('precio')
  const vehicleName = searchParams.get('vehiculo')
  const initialPrice = (() => {
    if (!prefillPrice) return '30000'
    const value = Number(prefillPrice)
    return Number.isFinite(value) && value > 0 ? String(Math.round(value)) : '30000'
  })()

  const [price, setPrice] = useState(initialPrice)
  const [currency, setCurrency] = useState<string>('USD')
  const [downPaymentPercent, setDownPaymentPercent] = useState(20)
  const [annualRatePercent, setAnnualRatePercent] = useState('12')
  const [termMonths, setTermMonths] = useState<number>(48)
  const [leadName, setLeadName] = useState('')
  const [leadPhone, setLeadPhone] = useState('')

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

  const leadReady = result !== null && leadName.trim().length > 0 && leadPhone.trim().length >= 6

  const whatsappUrl = useMemo(() => {
    if (!result) return null
    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || WHATSAPP_NUMBER_DEFAULT
    const lines = [
      `Hola, simulé una cuota en Sin Frenos y quiero ayuda para conseguir esta financiación.`,
      vehicleName ? `Vehículo: ${vehicleName}` : null,
      `Precio: ${formatMoney(parsedPrice, currency)}`,
      `Entrega (${downPaymentPercent}%): ${formatMoney(result.downPayment, currency)}`,
      `Plazo: ${termMonths} meses`,
      `Cuota mensual estimada: ${formatMoney(result.monthlyPayment, currency)}`,
      `Mi nombre: ${leadName.trim()}`,
      `Mi teléfono: ${leadPhone.trim()}`,
    ].filter(Boolean)
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(lines.join('\n'))}`
  }, [result, vehicleName, parsedPrice, currency, downPaymentPercent, termMonths, leadName, leadPhone])

  const handleLeadSubmit = () => {
    trackLeadSubmit({ source: 'financiamiento-calculadora', vehicleName: vehicleName || undefined })
  }

  return (
    <Card className="shadow-sm">
      <CardBody className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wide text-neutral-400">
              Precio del vehículo
            </span>
            <div className="flex overflow-hidden rounded-lg border border-edge focus-within:border-auto-accent">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                aria-label="Moneda"
                className="border-r border-edge bg-surface-card px-2 text-sm text-neutral-900 focus:outline-none"
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
                className="w-full bg-surface-card px-3 py-2 text-sm text-neutral-900 focus:outline-none"
                placeholder="30000"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wide text-neutral-400">
              Tasa de interés anual (%)
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={annualRatePercent}
              onChange={(e) => setAnnualRatePercent(e.target.value)}
              className="w-full rounded-lg border border-edge bg-surface-card px-3 py-2 text-sm text-neutral-900 transition duration-200 focus:border-auto-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
              placeholder="12"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-wide text-neutral-400">
              <span>Entrega</span>
              <span className="text-neutral-900">{downPaymentPercent}%</span>
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
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wide text-neutral-400">
              Plazo
            </span>
            <select
              value={termMonths}
              onChange={(e) => setTermMonths(Number(e.target.value))}
              className="w-full rounded-lg border border-edge bg-surface-card px-3 py-2 text-sm text-neutral-900 transition duration-200 focus:border-auto-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
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
          <dl className="space-y-1 border-t border-dashed border-edge-strong pt-4">
            <ResultRow label="Cuota mensual estimada" value={formatMoney(result.monthlyPayment, currency)} emphasis />
            <ResultRow label="Entrega" value={formatMoney(result.downPayment, currency)} />
            <ResultRow label="Monto financiado" value={formatMoney(result.financedAmount, currency)} />
            <ResultRow label="Interés total del período" value={formatMoney(result.totalInterest, currency)} />
            <ResultRow label="Total a pagar (entrega + cuotas)" value={formatMoney(result.totalPaid, currency)} />
          </dl>
        ) : (
          <p className="border-t border-dashed border-edge-strong pt-4 text-sm text-neutral-500">
            Completá un precio y un plazo válidos para ver la simulación.
          </p>
        )}

        {result && (
          <div className="space-y-3 rounded-lg border border-edge bg-surface-card/50 p-4">
            <p className="font-mono text-[10px] uppercase tracking-wide text-neutral-400">
              ¿Querés ayuda para conseguir esta financiación?
            </p>
            <p className="text-sm text-neutral-500">
              Dejanos tu nombre y WhatsApp. Te escribimos con opciones reales de bancos, financieras o
              concesionarias — sin compromiso.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="Tu nombre"
                aria-label="Tu nombre"
                className="w-full rounded-lg border border-edge bg-surface-card px-3 py-2 text-sm text-neutral-900 transition duration-200 focus:border-auto-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
              />
              <input
                type="tel"
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value)}
                placeholder="Tu WhatsApp (ej. 3445123456)"
                aria-label="Tu WhatsApp"
                className="w-full rounded-lg border border-edge bg-surface-card px-3 py-2 text-sm text-neutral-900 transition duration-200 focus:border-auto-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
              />
            </div>
            {leadReady && whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleLeadSubmit}
                className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition duration-200 hover:bg-emerald-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 sm:w-auto"
              >
                Enviar por WhatsApp
                <svg className="ml-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.87 9.87 0 004.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.19c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.11.11-1.79-.11-.41-.13-.94-.31-1.62-.6-2.85-1.23-4.71-4.11-4.85-4.3-.14-.19-1.16-1.54-1.16-2.94 0-1.4.73-2.08.99-2.37.26-.29.57-.36.76-.36.19 0 .38 0 .55.01.18.01.41-.07.64.49.24.57.81 1.97.88 2.11.07.14.12.31.02.5-.1.19-.15.31-.29.48-.14.17-.3.38-.43.51-.14.14-.29.29-.12.57.17.29.75 1.24 1.62 2.01 1.11.99 2.05 1.3 2.34 1.44.29.14.46.12.63-.07.17-.19.72-.84.92-1.13.19-.29.38-.24.64-.14.26.1 1.66.78 1.94.93.29.14.48.21.55.33.07.12.07.68-.17 1.36z" />
                </svg>
              </a>
            ) : (
              <p className="text-xs text-neutral-400">Completá nombre y WhatsApp para enviar la consulta.</p>
            )}
          </div>
        )}

        <p className="text-xs text-neutral-400">
          Simulación con sistema de amortización francés (cuota fija), a fines orientativos. No es una oferta de
          financiamiento ni refleja las condiciones reales de ningún banco o concesionaria.
        </p>
      </CardBody>
    </Card>
  )
}
