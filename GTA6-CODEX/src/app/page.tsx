import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import { EntityType } from '@/types'
import {
  getFeaturedEntities,
  getEntityCount,
  getEntityCountsByType,
  getEntitiesByType,
  getMostRecentUpdate,
} from '@/lib/entities'
import { resolveEntityDisplayImage } from '@/lib/media'
import { getBidirectionalRelationCount } from '@/lib/relations'
import { generateHomepageMetadata, generateBreadcrumbJsonLd, generateWebsiteJsonLd } from '@/lib/seo'
import { formatRelativeTime } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Reveal } from '@/components/ui/Reveal'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { CountUp } from '@/components/ui/CountUp'
import { WordRotate } from '@/components/ui/WordRotate'
import { CategoryCardMedia } from '@/components/ui/CategoryCardMedia'
import { EntityCard } from '@/components/entities/EntityCard'
import { getCategoryPreviewImages } from '@/lib/images'
import { RotatingHeroBackground } from '@/components/layout/RotatingHeroBackground'
import { SceneSection } from '@/components/webgl/SceneSection'
import { ENTITY_TYPE_LABELS } from '@/lib/entity-labels'
import { DevelopmentTimeline, type TimelineEvent } from '@/components/home/DevelopmentTimeline'
import { LaunchCountdown, type CountdownTarget } from '@/components/home/LaunchCountdown'
import { QuickSearchForm } from '@/components/home/QuickSearchForm'
import { HeroScrollCue } from '@/components/home/HeroScrollCue'
import { HeroNewsFlash } from '@/components/home/HeroNewsFlash'
import { HeroCountdownChip } from '@/components/home/HeroCountdownChip'
import { CinematicScroll } from '@/components/home/CinematicScroll'

export async function generateMetadata(): Promise<Metadata> {
  return generateHomepageMetadata()
}

/**
 * Tipos que se destacan en el stat strip del hero, alimentados por
 * `countsByType` real (no números hardcodeados), con el total del sitio
 * (`totalCount`) como valor destacado extra en el color de acento.
 */
const HERO_STAT_TYPES: EntityType[] = [EntityType.VEHICLE, EntityType.NEWS, EntityType.GUIDE]

/**
 * Mismas cuatro palabras que ya formaban la lista estática del subtítulo
 * del hero ("Cada personaje, vehículo, ubicación y misión de GTA6...").
 * Se rotan de a una con `WordRotate` en vez de listarlas juntas — mismo
 * contenido, sin agregar copy nuevo. Concuerdan en singular porque el
 * "clasificado" que sigue en la oración concuerda con "GTA6", no con
 * esta palabra.
 */
const HERO_SUBTITLE_WORDS = ['auto', 'moto', 'ficha técnica', 'comparativa']

const CATEGORY_ORDER: EntityType[] = [EntityType.VEHICLE, EntityType.NEWS, EntityType.GUIDE]

/**
 * Color de acento por categoría — mismo trío de acentos ya existente
 * (magenta / cian / dorado): vehículos en dorado (el acento "premium" del
 * sitio), noticias en magenta, guías en cian.
 */
const CATEGORY_ACCENT: Record<EntityType, string> = {
  [EntityType.VEHICLE]: '#f0c274',
  [EntityType.NEWS]: '#ff2f8f',
  [EntityType.GUIDE]: '#22d3ee',
}

/**
 * Explicación de los 4 niveles de evidencia que ya usa el sitio a nivel de
 * ficha individual (ver `EvidenceBlock.tsx`), resumida acá para que el
 * criterio editorial del proyecto —su diferencial real frente a un wiki
 * genérico— sea visible desde la home y no recién al entrar a una entidad.
 * Mismo vocabulario e iconografía (✓ ◎ ◈ ?) que `EvidenceBlock`, para que
 * un visitante reconozca el badge cuando lo vea después en una ficha.
 */
const EVIDENCE_LEVELS: Array<{
  icon: string
  label: string
  description: string
  className: string
}> = [
  {
    icon: '✓',
    label: 'Oficial',
    description: 'Confirmado por ficha técnica oficial del fabricante o comunicado de prensa.',
    className: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
  },
  {
    icon: '◎',
    label: 'Identificación visual',
    description: 'Visible en material oficial, aunque sin confirmación textual explícita.',
    className: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
  },
  {
    icon: '◈',
    label: 'Respaldado',
    description: 'Sin confirmación oficial directa, pero sostenido por fuentes secundarias solventes.',
    className: 'border-auto-accent-orange/25 bg-auto-accent-orange/10 text-auto-accent-orange',
  },
  {
    icon: '?',
    label: 'Especulativo',
    description: 'Teoría o rumor razonable, marcado como tal, sin evidencia sólida detrás — todavía.',
    className: 'border-auto-accent-warning/25 bg-auto-accent-warning/10 text-auto-accent-warning',
  },
]

export default async function HomePage() {
  const [featured, totalCount, countsByType, allNews, mostRecentUpdate] = await Promise.all([
    getFeaturedEntities(6),
    getEntityCount(),
    getEntityCountsByType(),
    getEntitiesByType(EntityType.NEWS),
    getMostRecentUpdate(),
  ])

  // Últimas 3 noticias por fecha real del evento (`createdAt`), no por
  // orden alfabético de `getEntitiesByType` — la portada de "Últimas
  // noticias" debe reflejar la cronología del desarrollo, no el título.
  const latestNews = [...allNews]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
  const latestNewsImages = Object.fromEntries(
    latestNews.map((entity) => [entity.slug, resolveEntityDisplayImage(entity)])
  )

  // Línea de tiempo: noticias en orden cronológico ascendente (a diferencia
  // de "Últimas noticias", que es descendente), usando `createdAt` (fecha
  // del evento que documentan) — campo que ya existe en el contenido, no
  // se deriva ni inventa ninguna fecha nueva.
  const timelineEvents: TimelineEvent[] = [...allNews]
    .map((entity) => ({
      entity,
      date: entity.createdAt,
      accent: CATEGORY_ACCENT[entity.type],
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const breadcrumbLd = generateBreadcrumbJsonLd([{ label: 'Inicio', url: '/' }])
  // `WebSite` + `SearchAction`: describe el buscador rápido que vive en el
  // hero (`QuickSearchForm`) para que Google pueda ofrecer un sitelinks
  // search box. Vive acá (no en `generateHomepageMetadata`) porque es JSON-LD
  // de página, no metadata de `<head>` — mismo patrón que `breadcrumbLd`.
  const websiteLd = generateWebsiteJsonLd()

  // El sitio ya no tiene fechas ancla de lanzamiento de juego que contar
  // (era específico de GTA6). Se deja el array vacío en vez de borrar todo
  // el bloque condicional de abajo, para reutilizar `LaunchCountdown` /
  // `HeroCountdownChip` el día que haya una fecha real que anunciar en el
  // nicho de autos (ej. un salón del automóvil o el lanzamiento de un modelo).
  const countdownTargets: CountdownTarget[] = []

  // Conteo de conexiones incluyendo relaciones inferidas/bidireccionales
  // para las cards de Destacados (Fase 8, hallazgo [7]) — mismo criterio
  // que ya se aplica en los listados por tipo, acotado a las 6 entidades
  // destacadas de home.
  const featuredRelationCounts = Object.fromEntries(
    await Promise.all(featured.map(async (e) => [e.slug, await getBidirectionalRelationCount(e)] as const))
  )

  const categories = CATEGORY_ORDER.filter((type) => countsByType[type] > 0)
  // Referencia para la barra de "densidad de archivo" de cada card de
  // categoría: la categoría con más entradas define el 100%, el resto
  // se expresa como proporción de esa — nunca se inventa un ranking
  // editorial, es puramente el conteo real de countsByType.
  const maxCategoryCount = Math.max(...categories.map((type) => countsByType[type]), 1)
  // Vista previa animada por categoría (ver CategoryCardMedia): hasta 3
  // imágenes locales reales de esa categoría (fondo principal + hasta 2
  // miniaturas superpuestas), o array vacío → fondo 100% CSS.
  const categoryPreviews = Object.fromEntries(
    categories.map((type) => [type, getCategoryPreviewImages(type, 3)])
  ) as Record<EntityType, ReturnType<typeof getCategoryPreviewImages>>

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
      />

      {/* Scroll cinemático — contenido 100% original, ver src/components/home/CinematicScroll.tsx */}
      <CinematicScroll />

      {/* Hero */}
      <SceneSection
        sceneId="home-hero"
        htmlId="hero"
        className="hero-gleam relative overflow-hidden border-b border-auto-border py-24 sm:py-32"
      >
        <RotatingHeroBackground />
        {/* Sweep de luz sincronizado con el motor WebGL (ángulo/temperatura
            reales de la escena 3D, no un brillo inventado aparte) — ver
            `.hero-gleam` en globals.css. En reposo (motor sin cargar) es
            invisible por diseño, no un "flash" que dependa de JS. */}
        <div className="hero-gleam-sweep" aria-hidden="true" />
        {/* Capas cinematográficas: scanlines sutiles + viñeta radial, mismo
            lenguaje visual que el sweep de arriba. Puramente decorativo
            (aria-hidden, no interactivo) — no altera layout ni foco. */}
        <div className="hero-scanlines" aria-hidden="true" />
        <div className="hero-vignette" aria-hidden="true" />
        {/* "Declasificación": franjas de redacción atadas al view-timeline
            nativo de #hero (--hero-scroll, publicado por `.hero-gleam` en
            globals.css) — se despegan solas a medida que el hero sale de
            foco al scrollear, cero JS de por medio. Viven en el margen
            superior del hero y quedan por debajo del contenido real
            (z-index:1, igual que scanlines/vignette): decorativas
            (aria-hidden) y nunca tapan el título, el CTA ni el buscador.
            Ver el comentario largo en globals.css para el detalle del
            fallback estático (@supports / prefers-reduced-motion). */}
        <div className="hero-declass" aria-hidden="true">
          <span className="hero-declass-bar hero-declass-bar--1" />
          <span className="hero-declass-bar hero-declass-bar--2" />
          <span className="hero-declass-bar hero-declass-bar--3" />
          <span className="hero-declass-tab">Nivel de acceso: público</span>
        </div>
        <div className="hero-cinematic container-max relative text-center">
          <Reveal>
            <p className="hero-pill hero-pill-stamp mb-4">
              <span className="hero-pill-dot" aria-hidden="true" />
              Fichas técnicas <span className="hero-pill-sep">·</span> Cobertura global
              {/* Señal de frescura real, no un "actualizado hoy" fijo en
                  el copy: `mostRecentUpdate` es el updatedAt más reciente
                  entre TODAS las entidades del sitio (`getMostRecentUpdate`
                  en lib/entities.ts), formateado con Intl.RelativeTimeFormat.
                  Ausente solo en el caso borde de un sitio sin contenido. */}
              {mostRecentUpdate && (
                <>
                  {' '}
                  <span className="hero-pill-sep">·</span> Actualizado {formatRelativeTime(mostRecentUpdate)}
                </>
              )}
            </p>

            {/* Fila de "gancho de contenido" del hero: última filtración
                rotativa + hito más próximo (Netflix / lanzamiento), lo
                que haya, en flex-wrap para apilarse limpio en mobile.
                Antes el hero era 100% branding estático hasta bajar al
                fold; ahora hay dos señales de contenido real y vivo
                arriba del título. Ambos reusan datos ya calculados más
                abajo en esta misma función (latestNews, countdownTargets)
                — ninguna fuente de verdad nueva ni duplicada.

                `min-h-[42px]`: reserva la altura de un chip (borde + py-2
                + texto text-sm) aunque no haya ninguno montado todavía.
                `HeroCountdownChip` es un Client Component que devuelve
                `null` hasta que su primer `useEffect` corre en el
                navegador (el cálculo de "cuántos días faltan" no puede
                resolverse en build, ver su propio comentario) — sin esta
                reserva, esa fila aparecía vacía en el primer paint y
                "empujaba" el título hacia abajo un instante después de
                hidratar: un salto de layout justo arriba del elemento
                más grande del hero (el propio <h1>), el peor lugar
                posible para uno. Con la altura reservada de entrada, el
                chip solo hace fade-in en su lugar, sin mover nada. */}
            <div className="mb-6 flex min-h-[42px] flex-wrap items-center justify-center gap-3">
              {latestNews.length > 0 && (
                <HeroNewsFlash
                  items={latestNews.map((entity) => ({ slug: entity.slug, type: entity.type, title: entity.title }))}
                />
              )}
              <HeroCountdownChip targets={countdownTargets} />
            </div>

            <h1 className="hero-title mx-auto max-w-3xl font-display font-bold leading-[1.08]">
              <span className="hero-mark" aria-hidden="true">
                Auto <span className="hero-mark-sep">·</span> Ficha
              </span>
              <span className="hero-title-line hero-title-line--main mt-5 block text-4xl sm:text-5xl lg:text-6xl">
                Cada{' '}
                <span className="hero-subtitle-rotate">
                  <WordRotate words={HERO_SUBTITLE_WORDS} className="hero-title-highlight" />
                </span>{' '}
                a un <span className="hero-title-highlight">clic</span>
              </span>
              <span className="hero-title-line hero-title-line--sub mt-5 block font-sans text-lg font-normal text-auto-text-secondary sm:text-xl">
                specs reales del fabricante — para que compares antes de comprar.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={150}>
            {/* El strip de cifras ahora abre el bloque de abajo, antes del
                CTA: las cifras hacen de credencial ("esto no es una promesa
                vacía, hay X entradas documentadas") antes de pedir la
                acción, en vez de quedar como cierre después del botón y el
                buscador. Mismo contenido, mismo <Reveal>, solo cambia el
                orden en el que entra. */}
            <div className="hero-stat-strip glass-surface mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-4 rounded-xl border border-auto-border/70 px-8 py-5">
              {HERO_STAT_TYPES.map((type, i) => (
                <div
                  key={type}
                  className="hero-stat-item flex flex-col items-center gap-0.5 px-2"
                  style={{ ['--stat-delay' as string]: `${i * 70}ms` }}
                >
                  <span className="font-display text-2xl font-bold text-auto-text sm:text-3xl">
                    <CountUp end={countsByType[type] ?? 0} />
                  </span>
                  <span className="text-xs uppercase tracking-[0.15em] text-auto-text-tertiary">
                    {ENTITY_TYPE_LABELS[type]}
                  </span>
                </div>
              ))}
              <div
                className="hero-stat-divider hidden h-10 w-px bg-auto-border sm:block"
                style={{ ['--stat-delay' as string]: `${HERO_STAT_TYPES.length * 70}ms` }}
                aria-hidden="true"
              />
              <div
                className="hero-stat-item flex flex-col items-center gap-0.5 px-2"
                style={{ ['--stat-delay' as string]: `${HERO_STAT_TYPES.length * 70}ms` }}
              >
                <span className="font-display text-2xl font-bold text-auto-accent-strong sm:text-3xl">
                  <CountUp end={totalCount} />
                </span>
                <span className="text-xs uppercase tracking-[0.15em] text-auto-text-tertiary">
                  {totalCount === 1 ? 'Entrada total' : 'Entradas totales'}
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={200}>
            {/* Un solo CTA de botón acá a propósito: antes había un segundo
                botón "Buscar en el Zona" apuntando al mismo /buscar que el
                QuickSearchForm de abajo — dos affordances distintas para la
                misma acción, una al lado de la otra, diluían cuál era la
                principal. El buscador real (con input) ya cubre ese caso
                mejor que un botón que aterriza en una página vacía. */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/vehiculos"
                className="btn-primary hero-cta inline-flex items-center justify-center rounded-lg px-9 py-4 text-base font-semibold text-auto-darker transition-all hover:-translate-y-0.5"
              >
                <span className="hero-cta-label">Ver fichas de autos</span>
                <span className="hero-cta-arrow" aria-hidden="true">→</span>
              </Link>
              <Link
                href="/comparar"
                className="btn-secondary hero-cta-secondary inline-flex items-center justify-center gap-2 rounded-lg px-7 py-4 text-base font-semibold text-auto-text transition-all hover:-translate-y-0.5"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M8 3v18M16 3v18M4 8h4M16 8h4M4 16h4M16 16h4" />
                </svg>
                Comparar vehículos
              </Link>
            </div>
          </Reveal>

          <Reveal delay={250}>
            <div className="hero-search-wrap mt-5">
              <QuickSearchForm />
            </div>
          </Reveal>
        </div>

        {/* Invitación a seguir scrolleando. Ahora es un botón real (antes
            era un div puramente decorativo aria-hidden): hace scroll suave
            a la sección siguiente al hacer click/Enter, y queda en el
            orden de tabulación normal para quien navega con teclado o
            lector de pantalla — la flecha ya no es solo un adorno visual,
            es una affordance de navegación real. Se sigue aquietando con
            prefers-reduced-motion (ver `.hero-scroll-cue` en globals.css). */}
        <HeroScrollCue />
      </SceneSection>

      {/* Cuenta regresiva / Estado del lanzamiento */}
      {countdownTargets.length > 0 && (
        <SceneSection sceneId="home-countdown" htmlId="countdown" className="border-b border-auto-border py-16 sm:py-20">
          <div className="container-max">
            <Reveal className="mx-auto mb-10 max-w-2xl text-center">
              <p className="eyebrow mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-auto-accent">
                Cuenta regresiva
              </p>
              <h2 className="text-3xl font-bold text-auto-text sm:text-4xl">Estado del lanzamiento</h2>
              <p className="mt-4 text-auto-text-secondary">
                Las dos fechas que definen el momento del proyecto ahora mismo, en un solo lugar.
              </p>
            </Reveal>

            <LaunchCountdown targets={countdownTargets} />
          </div>
        </SceneSection>
      )}

      {/* Categorías */}
      <SceneSection sceneId="home-categories" className="border-b border-auto-border py-16 sm:py-20">
        <div className="container-max">
          <Reveal className="mb-10 text-center">
            <p className="eyebrow mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-auto-accent">
              Categorías
            </p>
            <h2 className="text-3xl font-bold text-auto-text sm:text-4xl">Explorá por sección</h2>
          </Reveal>

          <Reveal className="stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((type, i) => {
              const density = Math.max(6, Math.round((countsByType[type] / maxCategoryCount) * 100))
              const accent = CATEGORY_ACCENT[type]
              return (
                <Link
                  key={type}
                  href={`/${type}`}
                  className="group category-card block h-full"
                  style={{ '--auto-accent': accent } as CSSProperties}
                >
                  <Card
                    hoverable
                    className="relative flex h-full flex-col overflow-hidden !p-0 text-center"
                  >
                    <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden">
                      <CategoryCardMedia previews={categoryPreviews[type]} />
                      <div className="category-icon-badge absolute left-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-lg text-auto-accent">
                        <CategoryIcon type={type} className="h-5 w-5" />
                      </div>
                      <span className="category-card-corner category-card-corner--tl" aria-hidden="true" />
                      <span className="category-card-corner category-card-corner--tr" aria-hidden="true" />
                      <span className="category-card-corner category-card-corner--bl" aria-hidden="true" />
                      <span className="category-card-corner category-card-corner--br" aria-hidden="true" />
                      <div className="category-card-redaction category-card-redaction--top" aria-hidden="true">
                        <span className="category-card-redaction-label">
                          Expediente Nº {String(i).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="category-card-redaction category-card-redaction--bottom" aria-hidden="true" />
                    </div>

                    <div className="relative z-10 flex flex-1 flex-col gap-2 px-5 py-4">
                      <p className="font-semibold text-auto-text">{ENTITY_TYPE_LABELS[type]}</p>
                      <p className="text-sm text-auto-text-secondary">
                        {countsByType[type]}{' '}
                        {countsByType[type] === 1 ? 'entrada' : 'entradas'}
                      </p>
                      <div className="category-card-meter-track" aria-hidden="true">
                        <div
                          className="category-card-meter-fill"
                          style={{ width: `${density}%`, background: accent }}
                        />
                      </div>
                      <span className="category-card-index" aria-hidden="true">
                        {String(i).padStart(2, '0')}
                      </span>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </Reveal>

          <Reveal className="mt-10 text-center">
            <Link
              href="/buscar"
              className="link-underline inline-flex items-center gap-1.5 text-sm font-semibold text-auto-accent transition-colors hover:text-auto-accent-strong"
            >
              Ver las {totalCount} entradas del expediente
              <span aria-hidden="true">→</span>
            </Link>
          </Reveal>
        </div>
      </SceneSection>

      {/* Destacados */}
      {featured.length > 0 && (
        <SceneSection sceneId="home-featured" className="py-16 sm:py-20">
          <div className="container-max">
            <Reveal className="mb-10 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-auto-accent">
                  Destacados
                </p>
                <h2 className="text-3xl font-bold text-auto-text sm:text-4xl">
                  Lo más relevante del expediente
                </h2>
              </div>
              <Link
                href="/galeria"
                className="link-underline hidden shrink-0 text-sm font-semibold text-auto-accent transition-colors hover:text-auto-accent-strong sm:inline-block"
              >
                Ver galería completa
              </Link>
            </Reveal>

            <Reveal className="stagger grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((entity, i) => (
                <EntityCard
                  key={`${entity.type}-${entity.slug}`}
                  entity={entity}
                  image={resolveEntityDisplayImage(entity)}
                  clipUrl={undefined}
                  relationCount={featuredRelationCounts[entity.slug]}
                  size={i === 0 ? 'hero' : 'default'}
                  className={i === 0 ? 'sm:col-span-2' : undefined}
                />
              ))}
            </Reveal>
          </div>
        </SceneSection>
      )}

      {/* Línea de tiempo del desarrollo */}
      {timelineEvents.length > 0 && (
        <SceneSection sceneId="home-timeline" className="border-t border-auto-border py-16 sm:py-20">
          <div className="container-max">
            <Reveal className="mx-auto mb-12 max-w-2xl text-center">
              <p className="eyebrow mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-auto-accent">
                Cronología
              </p>
              <h2 className="text-3xl font-bold text-auto-text sm:text-4xl">
                Línea de tiempo del desarrollo
              </h2>
              <p className="mt-4 text-auto-text-secondary">
                Del anuncio a hoy, cada hito oficial y cada tráiler documentado, en orden.
              </p>
            </Reveal>

            <DevelopmentTimeline events={timelineEvents} />
          </div>
        </SceneSection>
      )}

      {/* Cómo verificamos */}
      <SceneSection sceneId="home-evidence" className="border-t border-auto-border py-16 sm:py-20">
        <div className="container-max">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <p className="eyebrow mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-auto-accent">
              Metodología
            </p>
            <h2 className="text-3xl font-bold text-auto-text sm:text-4xl">Cómo verificamos la información</h2>
            <p className="mt-4 text-auto-text-secondary">
              Cada entrada del expediente lleva su propio nivel de evidencia a la vista, en vez
              de mezclar confirmación oficial con rumor sin distinción. Así se ve en cada ficha:
            </p>
          </Reveal>

          <Reveal className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EVIDENCE_LEVELS.map((level) => (
              <Card key={level.label} className="h-full">
                <span
                  className={`mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full border text-base font-semibold ${level.className}`}
                  aria-hidden="true"
                >
                  {level.icon}
                </span>
                <p className="mb-1.5 font-semibold text-auto-text">{level.label}</p>
                <p className="text-sm text-auto-text-secondary">{level.description}</p>
              </Card>
            ))}
          </Reveal>
        </div>
      </SceneSection>

      {/* Últimas noticias */}
      {latestNews.length > 0 && (
        <SceneSection sceneId="home-news" className="border-t border-auto-border py-16 sm:py-20">
          <div className="container-max">
            <Reveal className="mb-10 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-auto-accent">
                  Últimas noticias
                </p>
                <h2 className="text-3xl font-bold text-auto-text sm:text-4xl">
                  Novedades del desarrollo
                </h2>
              </div>
              <Link
                href="/noticias"
                className="link-underline hidden shrink-0 text-sm font-semibold text-auto-accent transition-colors hover:text-auto-accent-strong sm:inline-block"
              >
                Ver todas las noticias
              </Link>
            </Reveal>

            <Reveal className="stagger grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latestNews.map((entity) => (
                <EntityCard
                  key={`${entity.type}-${entity.slug}`}
                  entity={entity}
                  image={latestNewsImages[entity.slug]}
                />
              ))}
            </Reveal>

            <Reveal className="mt-8 text-center sm:hidden">
              <Link
                href="/noticias"
                className="link-underline inline-flex items-center gap-1.5 text-sm font-semibold text-auto-accent transition-colors hover:text-auto-accent-strong"
              >
                Ver todas las noticias
                <span aria-hidden="true">→</span>
              </Link>
            </Reveal>
          </div>
        </SceneSection>
      )}

      {/* CTA final */}
      <SceneSection sceneId="home-cta" className="border-t border-auto-border py-16 sm:py-24">
        <div className="container-max text-center">
          <Reveal>
            <div className="glass-surface mx-auto max-w-2xl rounded-2xl border border-auto-border/70 px-8 py-12 sm:px-14">
              <h2 className="text-gradient-vice font-display text-3xl font-bold sm:text-4xl">
                ¿Buscás algo puntual?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-auto-text-secondary">
                Personajes, vehículos, misiones, ubicaciones o tráilers: todo el expediente es
                buscable, con su nivel de evidencia siempre visible.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/buscar"
                  className="btn-primary inline-flex items-center justify-center rounded-lg px-8 py-3.5 font-semibold text-auto-darker transition-all hover:-translate-y-0.5"
                >
                  Buscar en el Zona
                </Link>
                <Link
                  href="/galeria"
                  className="inline-flex items-center justify-center rounded-lg border border-auto-border bg-auto-surface/60 px-8 py-3.5 font-semibold text-auto-text transition-all hover:-translate-y-0.5 hover:border-auto-accent/50"
                >
                  Ver galería
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </SceneSection>
    </>
  )
}
