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
import { generateHomepageMetadata, generateBreadcrumbJsonLd, generateWebsiteJsonLd, serializeJsonLd } from '@/lib/seo'
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
import { Reveal } from '@/components/home/StageProgress'
import { Parallax, TiltCard } from '@/components/home/Parallax'

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
  [EntityType.MANUFACTURER]: '#8a8f98',
}

export default async function HomePage() {
  // Solo vehículos: son los únicos tipos con foto real hoy (96.8% de
  // cobertura) — guías/noticias no tienen imagen propia, así que mezclarlas
  // acá dejaba cards sin foto (fallback CSS) en la sección "Destacados".
  // Límite en 12 (no 6): hoy hay 8 vehículos marcados `featured`, así que
  // esto ya trae "todos" los que existen — el 12 solo da margen para
  // cuando se marquen más sin tener que volver a tocar este número.
  const [featured, totalCount, countsByType, allNews] = await Promise.all([
    getFeaturedEntities(12, EntityType.VEHICLE),
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
    // 1. Hero — cada bloque entra en cascada (título → subtítulo → stats →
    // CTAs/buscador) en vez de aparecer todo junto con el fundido del panel.
    // `Reveal` lee el progreso local del panel por Context (no por prop
    // función): así este contenido puede seguir viviendo en un Server
    // Component que hace `await` a la base del expediente.
    {
      id: 'hero',
      label: 'Inicio',
      content: (
        <div className="mx-auto w-full max-w-[90rem] text-center">
          <Reveal index={0} total={6} options={{ distance: 22 }}>
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
              Auto · Ficha
            </p>
            <Parallax strength={14}>
              <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-neutral-900 sm:text-6xl lg:text-7xl">
                Cada{' '}
                <span className="text-orange-600">
                  <WordRotate words={HERO_SUBTITLE_WORDS} />
                </span>{' '}
                a un clic
              </h1>
            </Parallax>
          </Reveal>

          <Reveal index={1} total={6} className="mx-auto mt-6 max-w-xl">
            <p className="text-lg text-neutral-500 sm:text-xl">
              Specs reales del fabricante — para que compares antes de comprar.
            </p>
          </Reveal>

          <Reveal
            index={2}
            total={6}
            className="mx-auto mt-10 flex max-w-lg flex-wrap items-center justify-center gap-x-10 gap-y-4"
          >
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
          </Reveal>

          <Reveal index={3} total={6}>
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
          </Reveal>

          {/* Preview de categorías directo en el hero: contenido real
              (no relleno) para que el panel tenga más para mostrar sin
              alargar el tiempo que tarda en aparecer cada ficha — eso lo
              sigue regulando `Reveal`/`STAGE_SCROLL_VH` sin tocarse acá. */}
          <Reveal
            index={4}
            total={6}
            className="mx-auto mt-14 grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3"
          >
            {categories.map((type) => {
              const accent = CATEGORY_ACCENT[type]
              return (
                <Link
                  key={type}
                  href={`/${type}`}
                  className="group flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white/70 px-4 py-3 text-left shadow-sm backdrop-blur transition-transform hover:-translate-y-0.5"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ background: accent }}
                  >
                    <CategoryIcon type={type} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-neutral-900">
                      {ENTITY_TYPE_LABELS[type]}
                    </span>
                    <span className="block text-xs text-neutral-500">
                      {countsByType[type]} {countsByType[type] === 1 ? 'entrada' : 'entradas'}
                    </span>
                  </span>
                </Link>
              )
            })}
          </Reveal>

          {/* Franja de confianza al pie del hero: contenido nuevo (no
              relleno) que responde a "más cosas en el hero", separado del
              grid de categorías de arriba. Estático — no pide datos extra
              — así que no compite con `Promise.all` de la carga inicial. */}
          <Reveal
            index={5}
            total={6}
            className="mx-auto mt-14 grid w-full max-w-[70rem] grid-cols-1 gap-6 border-t border-neutral-200 pt-10 text-left sm:grid-cols-3"
          >
            {[
              {
                title: 'Fuente verificable',
                body: 'Cada ficha cita de dónde sale el dato: comunicado, medio o filtración — nunca relleno.',
              },
              {
                title: 'Nivel de evidencia',
                body: 'Confirmado, rumor o estimación nuestra: siempre marcado, así sabés cuánto confiar en cada especificación.',
              },
              {
                title: 'Comparador real',
                body: 'Poné vehículos lado a lado con las mismas unidades y fuentes, sin cambiar de pestaña.',
              },
            ].map((item) => (
              <div key={item.title}>
                <p className="font-display text-base font-semibold text-neutral-900">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{item.body}</p>
              </div>
            ))}
          </Reveal>
        </div>
      ),
    },
    // 2. Categorías — cada card entra con su propio delay en la cascada
    {
      id: 'categorias',
      label: 'Categorías',
      content: (
        <div className="mx-auto w-full max-w-[96rem]">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
            Categorías
          </p>
          <h2 className="mb-10 text-center font-display text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            Explorá por sección
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((type, i) => {
              const density = Math.max(6, Math.round((countsByType[type] / maxCategoryCount) * 100))
              const accent = CATEGORY_ACCENT[type]
              return (
                <Reveal key={type} index={i} total={categories.length} className="h-full">
                  <Link
                    href={`/${type}`}
                    className="group block h-full"
                    style={{ '--auto-corner-color': accent } as CSSProperties}
                  >
                    <TiltCard className="h-full">
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
                    </TiltCard>
                  </Link>
                </Reveal>
              )
            })}
          </div>
          <Reveal index={categories.length} total={categories.length + 1} className="mt-8 text-center">
            <Link href="/buscar" className="text-sm font-semibold text-neutral-500 underline underline-offset-4 hover:text-neutral-900">
              Ver las {totalCount} entradas del expediente →
            </Link>
          </Reveal>
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
              <div className="mx-auto w-full max-w-[96rem]">
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
                <div className="grid max-h-[46vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
                  {featured.map((entity, i) => (
                    <Reveal key={`${entity.type}-${entity.slug}`} index={i} total={featured.length}>
                      <TiltCard>
                        <EntityCard
                          entity={entity}
                          image={resolveEntityDisplayImage(entity)}
                          clipUrl={undefined}
                          relationCount={featuredRelationCounts[entity.slug]}
                          size="compact"
                        />
                      </TiltCard>
                    </Reveal>
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
              <div className="mx-auto w-full max-w-[96rem]">
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
                  {latestNews.map((entity, i) => (
                    <Reveal key={`${entity.type}-${entity.slug}`} index={i} total={latestNews.length}>
                      <TiltCard>
                        <EntityCard entity={entity} image={latestNewsImages[entity.slug]} />
                      </TiltCard>
                    </Reveal>
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
        <div className="mx-auto w-full max-w-2xl text-center">
          <Reveal index={0} total={3} options={{ distance: 22 }}>
            <h2 className="font-display text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
              ¿Buscás algo puntual?
            </h2>
          </Reveal>
          <Reveal index={1} total={3} className="mx-auto mt-4 max-w-md">
            <p className="text-neutral-500">
              Vehículos, noticias y guías: todo el expediente es buscable, con su nivel de
              evidencia siempre visible.
            </p>
          </Reveal>
          <Reveal index={2} total={3} className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/buscar" className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-8 py-4 font-semibold text-white transition-transform hover:-translate-y-0.5">
              Buscar en el expediente
            </Link>
            <Link href="/galeria" className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-8 py-4 font-semibold text-neutral-900 transition-transform hover:-translate-y-0.5">
              Ver galería
            </Link>
          </Reveal>
        </div>
      ),
    },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteLd) }} />
      <PinnedScrollStages stages={stages} />
    </>
  )
}
