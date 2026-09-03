import { InsuranceAffiliateButton } from '@/components/monetization/InsuranceAffiliateButton'
import { FinancingAffiliateButton } from '@/components/monetization/FinancingAffiliateButton'

interface MonetizationCtaGroupProps {
  /** Nombre del vehículo, si el bloque se muestra en una ficha técnica. */
  vehicleName?: string
  showInsurance?: boolean
  showFinancing?: boolean
  /** Prefijo para las tracking labels (ej. "vehicle-toyota-corolla" o "guide-seguros-2026"). */
  trackingLabelPrefix: string
  /** Título opcional del bloque (por defecto sin título, para no repetir contexto en la ficha de vehículo). */
  heading?: string
}

/**
 * Bloque de afiliados de "servicios alrededor de la compra" (seguro y
 * financiación). Separado de los botones de ML/OLX (que son de "dónde
 * comprar el vehículo") porque la audiencia y el momento de decisión son
 * distintos: alguien que ya eligió el auto necesita después asegurarlo y
 * financiarlo.
 *
 * `showInsurance`/`showFinancing` se resuelven en el caller a partir de
 * `entity.tags` (ver GUIDE_INSURANCE_TAGS / GUIDE_FINANCING_TAGS en
 * page.tsx) para no mostrar, por ejemplo, el CTA de financiación en una
 * guía sobre cómo elegir un taller mecánico.
 */
export function MonetizationCtaGroup({
  vehicleName,
  showInsurance = true,
  showFinancing = true,
  trackingLabelPrefix,
  heading,
}: MonetizationCtaGroupProps) {
  if (!showInsurance && !showFinancing) return null

  return (
    <div className="py-2">
      {heading && (
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-neutral-400">
          {heading}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        {showInsurance && (
          <InsuranceAffiliateButton
            vehicleName={vehicleName}
            trackingLabel={`${trackingLabelPrefix}-seguro`}
          />
        )}
        {showFinancing && (
          <FinancingAffiliateButton
            vehicleName={vehicleName}
            trackingLabel={`${trackingLabelPrefix}-financiacion`}
          />
        )}
      </div>
    </div>
  )
}
