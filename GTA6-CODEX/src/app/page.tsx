import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import { EntityType } from '@/types'
import {
  getFeaturedEntities,
  getEntityCount,
  getEntityCountsByType,
  getEntitiesByType,
} from '@/lib/entities'
import { resolveEntityDisplayImage } from '@/lib/media'
import { getBidirectionalRelationCount } from '@/lib/relations'
import { generateHomepageMetadata, generateBreadcrumbJsonLd, generateWebsiteJsonLd } from '@/lib/seo'
import { Card } from '@/components/ui/Card'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { CountUp } from '@/components/ui/CountUp'
import { WordRotate } from '@/components/ui/WordRotate'
import { CategoryCardMedia } from '@/components/ui/CategoryCardMedia'
import { EntityCard } from '@/components/entities/EntityCard'
import { getCategoryPreviewImages } from '@/lib/images'
import { ENTITY_TYPE_LABELS } from '@/lib/entity-labels'
import { QuickSearchForm } from '@/components/home/QuickSearchForm'
import { PinnedScrollStages, type Stage } from '@/components/home/PinnedScrollStages'

export async function generateMetadata(): Promise<Metadata> {
  return generateHomepageMetadata()
}

/**
 * Home rediseñada (agosto 2026, ver conversación de rediseño): en vez de
 * una página larga que se scrollea sección por sección, el viewport queda
 * fijo y el scroll pasa de un panel al siguiente por crossfade — ver
 * `PinnedScrollStages`. Estética: blanco/tipografía grande (referencia
 * explícita: Apple / Vercel), cards oscuras como único acento de color
 * sobre el fondo blanco, en vez del hero oscuro con glow que tenía antes
 * la home. El resto del sitio (fichas, listados, comparador) no cambia.
 */

const HERO_STAT_TYPES: EntityType[] = [EntityType.VEHICLE, EntityType.NEWS, EntityType.GUIDE]
const HERO_SUBTITLE_WORDS = ['auto', 'moto', 'ficha técnica', 'comparativa']
const CATEGORY_ORDER: EntityType[] = [EntityType.VEHICLE, EntityType.NEWS, EntityType.GUIDE]
const CATEGORY_ACCENT: Record<EntityType, string> = {
  [EntityType.VEHICLE]: '#c9a35f',
  [EntityType.NEWS]: '#ff6a1a',
  [EntityType.GUIDE]: '#3d84ff',
}

export default async function HomePage() {
  const [featured, totalCount, countsByType, allNews] = await Promise.all([
    getFeaturedEntities(6),
    getEntityCount(),
    getEntityCountsByType(),
    getEntitiesByType(EntityType.NEWS),
  ])

  const latestNews = [...allNews]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
  const latestNewsImages = Object.fromEntries(
    latestNews.map((entity) => [entity.slug, resolveEntityDisplayImage(entity)])
  )

  const breadcrumbLd = generateBreadcrumbJsonLd([{ label: 'Inicio', url: '/' }])
  const websiteLd = generateWebsiteJsonLd()

  const featuredRelationCounts = Object.fromEntries(
    await Promise.all(featured.map(async (e) => [e.slug, await getBidirectionalRelationCount(e)] as const))
  )

  const categories = CATEGORY_ORDER.filter((type) => countsByType[type] > 0)
  const maxCategoryCount = Math.max(...categories.map((type) => countsByType[type]), 1)
  const categoryPreviews = Object.fromEntries(
    categories.map((type) => [type, getCategoryPreviewImages(type, 3)])
  ) as Record<EntityType, ReturnType<typeof getCategoryPreviewImages>>

  const stages: Stage[] = [
    // 1. Hero
    {
      id: 'hero',
      label: 'Inicio',
      content: (
        <div className="mx-auto w-full max-w-3xl text-center">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
            Auto · Ficha
          </p>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-neutral-900 sm:text-6xl lg:text-7xl">
            Cada{' '}
            <span className="text-orange-600">
              <WordRotate words={HERO_SUBTITLE_WORDS} />
            </span>{' '}
            a un clic
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-neutral-500 sm:text-xl">
            Specs reales del fabricante — para que compares antes de comprar.
          </p>

          <div className="mx-auto mt-10 flex max-w-lg flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {HERO_STAT_TYPES.map((type) => (
              <div key={type} className="flex flex-col items-center gap-0.5">
                <span className="font-display text-3xl font-bold text-neutral-900">
                  <CountUp end={countsByType[type] ?? 0} />
                </span>
                <span className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                  {ENTITY_TYPE_LABELS[type]}
                </span>
              </div>
            ))}
            <div className="hidden h-10 w-px bg-neutral-200 sm:block" aria-hidden="true" />
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-display text-3xl font-bold text-orange-600">
                <CountUp end={totalCount} />
              </span>
              <span className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                {totalCount === 1 ? 'Entrada total' : 'Entradas totales'}
              </span>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/vehiculos"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-8 py-4 text-base font-semibold text-white transition-transform hover:-translate-y-0.5"
            >
              Ver fichas de autos <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/comparar"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 px-8 py-4 text-base font-semibold text-neutral-900 transition-transform hover:-translate-y-0.5"
            >
              Comparar vehículos
            </Link>
          </div>

          <div className="mx-auto mt-6 max-w-xl">
            <QuickSearchForm />
          </div>
        </div>
      ),
    },
    // 2. Categorías
    {
      id: 'categorias',
      label: 'Categorías',
      content: (
        <div className="mx-auto w-full max-w-5xl">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
            Categorías
          </p>
          <h2 className="mb-10 text-center font-display text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            Explorá por sección
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((type) => {
              const density = Math.max(6, Math.round((countsByType[type] / maxCategoryCount) * 100))
              const accent = CATEGORY_ACCENT[type]
              return (
                <Link key={type} href={`/${type}`} className="group block h-full" style={{ '--auto-corner-color': accent } as CSSProperties}>
                  <Card hoverable className="relative flex h-full flex-col overflow-hidden !p-0 text-center">
                    <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden">
                      <CategoryCardMedia previews={categoryPreviews[type]} />
                      <div className="absolute left-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur">
                        <CategoryIcon type={type} className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="relative z-10 flex flex-1 flex-col gap-2 px-5 py-4">
                      <p className="font-semibold text-auto-text">{ENTITY_TYPE_LABELS[type]}</p>
                      <p className="text-sm text-auto-text-secondary">
                        {countsByType[type]} {countsByType[type] === 1 ? 'entrada' : 'entradas'}
                      </p>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-auto-border" aria-hidden="true">
                        <div className="h-full rounded-full" style={{ width: `${density}%`, background: accent }} />
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
          <p className="mt-8 text-center">
            <Link href="/buscar" className="text-sm font-semibold text-neutral-500 underline underline-offset-4 hover:text-neutral-900">
              Ver las {totalCount} entradas del expediente →
            </Link>
          </p>
        </div>
      ),
    },
    // 3. Destacados
    ...(featured.length > 0
      ? [
          {
            id: 'destacados',
            label: 'Destacados',
            content: (
              <div className="mx-auto w-full max-w-5xl">
                <div className="mb-10 flex items-end justify-between gap-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
                      Destacados
                    </p>
                    <h2 className="font-display text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
                      Lo más relevante
                    </h2>
                  </div>
                  <Link href="/galeria" className="hidden shrink-0 text-sm font-semibold text-neutral-500 underline underline-offset-4 hover:text-neutral-900 sm:inline-block">
                    Ver galería completa
                  </Link>
                </div>
                <div className="grid max-h-[46vh] grid-cols-1 gap-4 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                  {featured.slice(0, 6).map((entity) => (
                    <EntityCard
                      key={`${entity.type}-${entity.slug}`}
                      entity={entity}
                      image={resolveEntityDisplayImage(entity)}
                      clipUrl={undefined}
                      relationCount={featuredRelationCounts[entity.slug]}
                    />
                  ))}
                </div>
              </div>
            ),
          } satisfies Stage,
        ]
      : []),
    // 4. Noticias
    ...(latestNews.length > 0
      ? [
          {
            id: 'noticias',
            label: 'Noticias',
            content: (
              <div className="mx-auto w-full max-w-5xl">
                <div className="mb-10 flex items-end justify-between gap-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
                      Últimas noticias
                    </p>
                    <h2 className="font-display text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
                      Novedades del sector
                    </h2>
                  </div>
                  <Link href="/noticias" className="hidden shrink-0 text-sm font-semibold text-neutral-500 underline underline-offset-4 hover:text-neutral-900 sm:inline-block">
                    Ver todas
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {latestNews.map((entity) => (
                    <EntityCard key={`${entity.type}-${entity.slug}`} entity={entity} image={latestNewsImages[entity.slug]} />
                  ))}
                </div>
              </div>
            ),
          } satisfies Stage,
        ]
      : []),
    // 5. CTA final
    {
      id: 'buscar',
      label: 'Buscar',
      content: (
        <div className="mx-auto w-full max-w-xl text-center">
          <h2 className="font-display text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            ¿Buscás algo puntual?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-neutral-500">
            Vehículos, noticias y guías: todo el expediente es buscable, con su nivel de
            evidencia siempre visible.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/buscar" className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-8 py-4 font-semibold text-white transition-transform hover:-translate-y-0.5">
              Buscar en el expediente
            </Link>
            <Link href="/galeria" className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-8 py-4 font-semibold text-neutral-900 transition-transform hover:-translate-y-0.5">
              Ver galería
            </Link>
          </div>
        </div>
      ),
    },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }} />
      <PinnedScrollStages stages={stages} />
    </>
  )
}
