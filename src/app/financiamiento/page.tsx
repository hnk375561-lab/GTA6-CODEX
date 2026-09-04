import { Suspense } from 'react'
import type { Metadata } from 'next'
import { FinancingCalculator } from '@/components/ui/FinancingCalculator'
import { Reveal } from '@/components/ui/Reveal'
import { SITE_NAME, SITE_URL } from '@/config/site'
import { AdUnit } from '@/components/monetization/AdUnit'
import { FinancingAffiliateButton } from '@/components/monetization/FinancingAffiliateButton'

/** Fallback del Suspense que envuelve `FinancingCalculator` (ahora lee
 *  `useSearchParams` para el prefill opcional de precio — mismo patrón
 *  que `CompareExplorerFallback` en `/comparar`). */
function FinancingCalculatorFallback() {
  return <div className="h-[420px] animate-pulse rounded-xl border border-edge bg-surface-card" />
}

export const metadata: Metadata = {
  title: `Calculadora de financiamiento | ${SITE_NAME}`,
  description: 'Simulá la cuota mensual de un auto o moto según precio, entrega, tasa y plazo.',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: `${SITE_URL}/financiamiento`,
  },
  openGraph: {
    type: 'website',
    title: `Calculadora de financiamiento | ${SITE_NAME}`,
    description: 'Simulá la cuota mensual de un auto o moto según precio, entrega, tasa y plazo.',
    url: `${SITE_URL}/financiamiento`,
    siteName: SITE_NAME,
  },
}

export default function FinanciamientoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Reveal>
        <div className="mb-8 max-w-2xl">
          <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
            Calculadora de <span className="text-gradient-vice">financiamiento</span>
          </h1>
          <p className="mt-2 text-sm text-neutral-500 sm:text-base">
            Ingresá el precio del vehículo que te interesa (lo ves en su ficha) y simulá la cuota mensual con
            distintos plazos, entregas y tasas.
          </p>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <Suspense fallback={<FinancingCalculatorFallback />}>
          <FinancingCalculator />
        </Suspense>
      </Reveal>

      {/* La calculadora terminaba en el número simulado sin ningún próximo
       *  paso: quien ya vio la cuota que le conviene no tenía a dónde ir a
       *  buscar esa financiación de verdad. Mismo botón/afiliado que ya se
       *  usa en la ficha de vehículo (`MonetizationCtaGroup`), acá como
       *  cierre natural del flujo de la calculadora. */}
      <Reveal delay={110}>
        <div className="mt-8 flex flex-col items-center gap-2 rounded-xl border border-edge bg-surface-alt p-5 text-center">
          <p className="text-sm text-neutral-600">¿Te sirvió la simulación? Buscá tu financiación con esas condiciones.</p>
          <FinancingAffiliateButton trackingLabel="financiamiento-calculadora" />
        </div>
      </Reveal>

      <AdUnit slotId="3119092668" format="responsive" className="mt-12" dataTrackingLabel="ad-financiamiento" />
    </div>
  )
}
