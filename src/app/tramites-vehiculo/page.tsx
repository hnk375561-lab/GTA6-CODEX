import type { Metadata } from 'next'
import { TramitesLeadForm } from '@/components/monetization/TramitesLeadForm'
import { Reveal } from '@/components/ui/Reveal'
import { AdUnit } from '@/components/monetization/AdUnit'
import { SITE_NAME, SITE_URL } from '@/config/site'

/**
 * Página de trámites vehiculares (transferencia, patentamiento, cambio de
 * radicación, etc.) — canal nuevo, ver `docs/monetizacion-plan.md` sección
 * 2.19 y `TramitesLeadForm.tsx` para el modelo de negocio completo.
 *
 * Sigue el mismo template que `/financiamiento` (página standalone,
 * angosta, un único componente central) a propósito — mismo lenguaje
 * visual que el resto de las "herramientas" del sitio.
 */
export const metadata: Metadata = {
  title: `Trámites de transferencia y patentamiento | ${SITE_NAME}`,
  description:
    'Dejá tus datos y te conectamos con una gestoría para tu transferencia, patentamiento, cambio de radicación u otro trámite vehicular.',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: `${SITE_URL}/tramites-vehiculo`,
  },
  openGraph: {
    type: 'website',
    title: `Trámites de transferencia y patentamiento | ${SITE_NAME}`,
    description:
      'Dejá tus datos y te conectamos con una gestoría para tu trámite vehicular.',
    url: `${SITE_URL}/tramites-vehiculo`,
    siteName: SITE_NAME,
  },
}

export default function TramitesVehiculoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Reveal>
        <div className="mb-8 max-w-2xl">
          <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
            Trámites de <span className="text-gradient-vice">transferencia y patentamiento</span>
          </h1>
          <p className="mt-2 text-sm text-neutral-500 sm:text-base">
            ¿Compraste, vendiste o heredaste un vehículo y necesitás transferirlo, patentarlo o hacer otro
            trámite? Dejanos tus datos y te conectamos con una gestoría de la zona.
          </p>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <TramitesLeadForm />
      </Reveal>

      <Reveal delay={140}>
        <AdUnit slotId="3119092668" format="responsive" className="mt-12" dataTrackingLabel="ad-tramites-vehiculo" />
      </Reveal>
    </div>
  )
}
