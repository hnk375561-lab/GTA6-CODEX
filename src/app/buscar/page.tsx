import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getEntityCountsByType } from '@/lib/entities'
import { SearchClient } from '@/components/search/SearchClient'
import { Reveal } from '@/components/ui/Reveal'
import { SearchRowSkeleton, Skeleton } from '@/components/ui/loading'
import { AdUnit } from '@/components/monetization/AdUnit'
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
  // Página de resultados de búsqueda: sin contenido indexable único y con
  // el costo de servidor más alto del sitio (recarga todas las entidades
  // + conteo de relaciones en cada request). Alineada con /favoritos:
  // noindex + fuera del sitemap (ver src/app/sitemap.ts).
  // Fase 1 del plan de escalado (docs/plan-escalado-1000-vehiculos.md):
  // esta página dejó de ser la de mayor costo de servidor del sitio — ya
  // no recarga el catálogo completo ni resuelve conteo de relaciones para
  // todas las entidades en cada request. La búsqueda ahora corre en
  // `/api/buscar`, resuelta solo para los resultados que realmente
  // vuelven al cliente. Sigue noindex por lo mismo de siempre: sin
  // contenido indexable único, alineada con /favoritos.
  robots: {
    index: false,
    follow: true,
  },
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

export default async function SearchPage() {
  // Antes esta página recibía `searchParams` y hacía `await` sobre esa
  // Promise para pasarle `q` a `SearchClient` como `initialQuery`. Eso
  // basta para que Next.js trate la ruta como dinámica (cualquier lectura
  // de `searchParams`/`cookies()`/`headers()` en un Server Component
  // desoptimiza toda la ruta), aunque el valor de `q` nunca se volvía a
  // usar después del render inicial — el estado real vive en
  // `SearchClient`. Cada `router.replace()` de `useSyncedSearchParams`
  // (un tecleo debounced en el buscador) invalidaba el Router Cache de
  // Next para esta ruta y forzaba un nuevo render server-side completo
  // (re-ejecutando `getEntityCountsByType()` de nuevo) solo para
  // actualizar la URL — sin aportar datos nuevos, ya que los resultados
  // de búsqueda vienen de `/api/buscar` vía `fetch` normal, no de este
  // render. Ver auditoría de invocaciones (Cloudflare Workers, 2026-09).
  //
  // Sacando `searchParams` de la firma, esta página vuelve a ser 100%
  // estática (mismo criterio que `[entityType]/page.tsx`): Next.js no
  // vuelve a golpear el servidor cuando cambia solo el query string.
  // `SearchClient` ya sabe leer `?q=` inicial por su cuenta con
  // `useSearchParams()` (ver `useSyncedSearchParams`), así que el
  // deep-link sigue funcionando igual.
  const counts = await getEntityCountsByType()

  return (
    <section className="py-12 sm:py-16">
      <div className="container-max">
        <Reveal direction="chapter" className="mb-8">
        <h1 className="mb-2 font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
          Buscá <span className="text-gradient-oxide">en el expediente</span>
        </h1>
        <p className="text-neutral-500">
          Explorá vehículos, motos, fabricantes y guías documentadas en el catálogo.
        </p>
      </Reveal>

        {/* Suspense requerido por `useSearchParams` dentro de SearchClient
            (sincroniza `?q=`/`?tipo=` con la URL, ver
            `useSyncedSearchParams`). Esta ruta ya es 100% dinámica (usa
            `searchParams` server-side arriba), así que no afecta la
            generación estática — se agrega igual por consistencia y para
            que una futura navegación cliente entre categorías no bloquee
            el resto de la página. El fallback reproduce el mismo skeleton
            que `loading.tsx` (evita una zona de resultados vacía durante
            la navegación cliente mientras `SearchClient` hidrata) y usa
            `role="status"` para anunciar el estado a lectores de pantalla,
            mismo criterio accesible que los loading.tsx de las rutas. */}
        <Suspense
          fallback={
            <div role="status">
              <span className="sr-only">Buscando…</span>
              <div className="mx-auto max-w-xl">
                <Skeleton className="h-12 w-full rounded-xl" />
                <div className="mt-6 divide-y divide-edge rounded-xl border border-edge bg-surface-card px-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SearchRowSkeleton key={i} />
                  ))}
                </div>
              </div>
            </div>
          }
        >
          <SearchClient counts={counts} />
        </Suspense>

        {/* Monetization: mismo slot real de AdSense reusado en el resto
            del sitio (ver rankings/page.tsx para el criterio). */}
        <AdUnit slotId="3119092668" format="responsive" className="mt-12" dataTrackingLabel="ad-buscar" />
      </div>
    </section>
  )
}
