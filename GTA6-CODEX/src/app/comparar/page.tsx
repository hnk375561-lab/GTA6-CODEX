import { Suspense } from 'react'
import type { Metadata } from 'next'
import { EntityType, type Vehicle } from '@/types'
import { getEntitiesByType } from '@/lib/entities'
import { getEntityImageMap } from '@/lib/media'
import { CompareExplorer } from '@/components/entities/CompareExplorer'
import { Reveal } from '@/components/ui/Reveal'
import { SITE_NAME, SITE_URL } from '@/config/site'
import { AdUnit } from '@/components/monetization/AdUnit'

export const metadata: Metadata = {
  title: `Comparar vehículos | ${SITE_NAME}`,
  description:
    'Compará hasta 5 autos o motos lado a lado: fabricante, clase, rendimiento y más, en una sola tabla.',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: `${SITE_URL}/comparar`,
  },
  openGraph: {
    type: 'website',
    title: `Comparar vehículos | ${SITE_NAME}`,
    description: 'Compará hasta 5 autos o motos lado a lado: fabricante, clase, rendimiento y más.',
    url: `${SITE_URL}/comparar`,
    siteName: SITE_NAME,
  },
}

/**
 * Fallback del Suspense que envuelve `CompareExplorer` (usa
 * `useSearchParams` para leer `?v=` — mismo patrón que
 * `EntityListExplorerFallback` en `[entityType]/page.tsx`). Se muestra
 * hasta que React hidrata; no hay mucho contenido indexable que
 * preservar acá más allá del título, a diferencia del listado general,
 * así que un placeholder simple alcanza.
 */
function CompareExplorerFallback() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="aspect-[4/3] animate-pulse rounded-xl border border-auto-border bg-auto-surface" />
      ))}
    </div>
  )
}

export default async function CompararPage() {
  // `getEntitiesByType` devuelve `Entity[]` (unión de todos los tipos) por
  // firma genérica, pero filtrar por `EntityType.VEHICLE` garantiza que
  // cada elemento es efectivamente un `Vehicle` — mismo cast que ya usa
  // `useVehicleCompare` para este mismo caso.
  const vehicles = (await getEntitiesByType(EntityType.VEHICLE)) as Vehicle[]
  const imageBySlug = getEntityImageMap(vehicles)

  return (
    <div className="mx-auto max-w-[96rem] px-4 py-10 sm:px-6 sm:py-14 lg:px-8 xl:px-12">
      <Reveal>
        <div className="mb-8 max-w-2xl">
          <h1 className="font-display text-2xl font-bold text-auto-text sm:text-3xl">
            Comparar <span className="text-gradient-vice">vehículos</span>
          </h1>
          <p className="mt-2 text-sm text-auto-text-secondary sm:text-base">
            Elegí hasta 5 autos o motos y compará fabricante, clase, rendimiento y más, lado a
            lado.
          </p>
        </div>
      </Reveal>

      <Suspense fallback={<CompareExplorerFallback />}>
        <CompareExplorer vehicles={vehicles} imageBySlug={imageBySlug} />
      </Suspense>

      {/* Monetization: Ad Unit */}
      <Reveal className="mt-12">
        <AdUnit slotId="5425797006" format="responsive" dataTrackingLabel="ad-comparar" />
      </Reveal>
    </div>
  )
}
