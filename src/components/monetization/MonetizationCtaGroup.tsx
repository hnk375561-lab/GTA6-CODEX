import Link from 'next/link'
import { InsuranceAffiliateButton } from '@/components/monetization/InsuranceAffiliateButton'
import { FinancingAffiliateButton } from '@/components/monetization/FinancingAffiliateButton'
import { FintechAffiliateButton } from '@/components/monetization/FintechAffiliateButton'

interface MonetizationCtaGroupProps {
  /** Nombre del vehículo, si el bloque se muestra en una ficha técnica. */
  vehicleName?: string
  showInsurance?: boolean
  showFinancing?: boolean
  /**
   * Afiliado fintech (cuenta digital / tarjeta prepaga, ver
   * `FintechAffiliateButton.tsx`, sección 2.17 del plan de monetización).
   * Default `false` a propósito: a diferencia de seguro/financiación (que
   * aplican a casi cualquier compra de vehículo), la relevancia de esto
   * varía más por contexto — se activa explícitamente en la ficha de
   * vehículo, no en guías genéricas.
   */
  showFintech?: boolean
  /**
   * Link (no botón de afiliado externo) hacia `/tramites-vehiculo` — lead
   * de transferencia/patentamiento, sección 2.19. Default `false`: solo
   * tiene sentido en momentos de "ya elegí/tengo el vehículo", igual que
   * showFintech.
   */
  showTramites?: boolean
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
  showFintech = false,
  showTramites = false,
  trackingLabelPrefix,
  heading,
}: MonetizationCtaGroupProps) {
  if (!showInsurance && !showFinancing && !showFintech && !showTramites) return null

  return (
    <div className="py-2">
      {heading && (
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-neutral-400">
          {heading}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3">
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
        {showFintech && (
          <FintechAffiliateButton
            vehicleName={vehicleName}
            trackingLabel={`${trackingLabelPrefix}-fintech`}
          />
        )}
        {showTramites && (
          <Link
            href="/tramites-vehiculo"
            className="link-underline group text-sm font-medium text-neutral-500 hover:text-auto-accent-strong"
          >
            Trámites de transferencia/patentamiento{' '}
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        )}
      </div>
    </div>
  )
}
