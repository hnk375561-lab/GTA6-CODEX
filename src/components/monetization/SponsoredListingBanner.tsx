'use client'

import { trackAffiliateClick } from '@/lib/analytics-events'
import type { Sponsorship } from '@/lib/sponsorships'

/**
 * Banner de "ficha destacada" — la entrega real del producto que
 * `/anunciate` y el media kit ya venden bajo ese nombre (ver
 * `src/lib/sponsorships.ts` para el porqué). Solo se monta cuando
 * `getSponsorshipForVehicle()` devuelve un match, así que no hay ningún
 * caso donde esto aparezca sin un patrocinio real activo detrás.
 *
 * Deliberadamente visible como publicidad ("Patrocinado por") y no
 * disfrazado de contenido editorial — coherente con el resto del sitio
 * (AdUnit también se muestra sin camuflar) y evita cualquier problema de
 * transparencia con la audiencia o con Google AdSense (que penaliza
 * contenido pago no declarado).
 */
export function SponsoredListingBanner({
  sponsorship,
  vehicleName,
  trackingLabel,
}: {
  sponsorship: Sponsorship
  vehicleName: string
  trackingLabel: string
}) {
  const href = sponsorship.whatsappNumber
    ? `https://wa.me/${sponsorship.whatsappNumber}?text=${encodeURIComponent(
        sponsorship.whatsappMessage || `Hola, vi ${vehicleName} en Sin Frenos y quiero consultar disponibilidad.`
      )}`
    : sponsorship.externalUrl

  const handleClick = () => {
    trackAffiliateClick({
      platform: 'ficha-destacada',
      vehicleName,
      label: trackingLabel,
    })
  }

  return (
    <div className="rounded-lg border border-auto-accent/40 bg-auto-accent/5 p-4">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-auto-accent-strong">Patrocinado</p>
      <p className="mb-2 text-sm font-semibold text-neutral-900">{sponsorship.sponsorName}</p>
      <p className="mb-3 text-sm leading-relaxed text-neutral-600">{sponsorship.message}</p>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={handleClick}
          className="tap-scale inline-flex items-center justify-center rounded-lg bg-auto-accent px-4 py-2 text-sm font-semibold text-auto-darker transition-transform hover:scale-105"
        >
          Consultar disponibilidad
        </a>
      )}
    </div>
  )
}
