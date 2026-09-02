import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getAllEntities, getEntityCountsByType } from '@/lib/entities'
import { getEntityImageMap } from '@/lib/media'
import { getBidirectionalRelationCount } from '@/lib/relations'
import { SearchClient } from '@/components/search/SearchClient'
import { Reveal } from '@/components/ui/Reveal'
import { SITE_NAME, SITE_URL } from '@/config/site'

// Antes esta página no definía `alternates`, `openGraph` ni `twitter`, así
// que heredaba en silencio los del layout raíz: el canonical y el og:url
// servidos en producción para /buscar apuntaban a la home, no a /buscar
// (mismo patrón ya usado en /galeria — ver src/app/galeria/page.tsx).
const TITLE = `Buscar | ${SITE_NAME}`
const DESCRIPTION = `Busca autos y motos por marca, modelo o segmento en ${SITE_NAME}.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: `${SITE_URL}/buscar` },
  openGraph: {
    type: 'website',
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/buscar`,
    siteName: SITE_NAME,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default async function SearchPage({
  searchParams,
}: {
  // Next.js 15: `searchParams` llega como Promise en Server Components.
  searchParams: Promise<{ q?: string }>
}) {
  const [{ q }, entities, counts] = await Promise.all([
    searchParams,
    getAllEntities(),
    getEntityCountsByType(),
  ])

  // Conteo de conexiones incluyendo relaciones inferidas/bidireccionales
  // (mismo patrón que `[entityType]/page.tsx`), para habilitar el orden
  // "Más conexiones" en el buscador global igual que en los listados por
  // categoría. Se resuelve una sola vez acá, en servidor — `SearchClient`
  // es `'use client'` y no puede recorrer todo el contenido por su cuenta.
  const relationCountEntries = await Promise.all(
    entities.map(async (e) => [`${e.type}/${e.slug}`, await getBidirectionalRelationCount(e)] as const)
  )
  const relationCountBySlug = Object.fromEntries(relationCountEntries)

  return (
    <section className="py-12 sm:py-16">
      <div className="container-max">
        <div className="mb-8">
          <h1 className="mb-2 font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
            Buscá <span className="text-gradient-vice">en el expediente</span>
          </h1>
          <Reveal delay={100}>
            <p className="text-neutral-500">
              Explorá vehículos, motos, fabricantes y guías documentadas en el catálogo.
            </p>
          </Reveal>
        </div>

        {/* Suspense requerido por `useSearchParams` dentro de SearchClient
            (sincroniza `?q=`/`?tipo=` con la URL, ver
            `useSyncedSearchParams`). Esta ruta ya es 100% dinámica (usa
            `searchParams` server-side arriba), así que no afecta la
            generación estática — se agrega igual por consistencia y para
            que una futura navegación cliente entre categorías no bloquee
            el resto de la página. */}
        <Suspense>
          <SearchClient
            entities={entities}
            counts={counts}
            imageBySlug={getEntityImageMap(entities)}
            relationCountBySlug={relationCountBySlug}
            initialQuery={q}
          />
        </Suspense>
      </div>
    </section>
  )
}
