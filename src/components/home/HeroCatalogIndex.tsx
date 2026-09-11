import Link from 'next/link'
import { EntityType } from '@/types'
import { ENTITY_TYPE_LABELS } from '@/lib/entity-labels'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { Reveal } from '@/components/ui/Reveal'
import { QuickSearchForm } from '@/components/home/QuickSearchForm'
import { ManufacturersMarquee } from '@/components/home/ManufacturersMarquee'
import type { ManufacturerMarqueeItem } from '@/lib/vehicle-manufacturers'

/**
 * HERO — GIRO DE 180° (sept. 2026)
 * ============================================================================
 * REEMPLAZA el hero anterior ("Comparar antes de creer" + `CompareShowcase`
 * montado como primera interacción) por un cambio de CONCEPTO, no de
 * maquillaje — ver `HERO_HOME_180_REDESIGN_REPORT.txt` para las 3
 * direcciones evaluadas y por qué se eligió esta.
 *
 * QUÉ CAMBIA (de fondo, no de paleta):
 *
 * 1. Acción principal: antes era "jugar con un comparador de 2 autos ya
 *    elegidos por nosotros" (curioso, pero no es lo que trae al 80% de las
 *    visitas — la mayoría llega buscando UN modelo puntual). Ahora la
 *    acción principal es la búsqueda real (`QuickSearchForm`, que ya
 *    navega a `/buscar?q=...` con deep-link funcional) — estaba escrita
 *    en el repo pero sin usar en ningún lado. El comparador en vivo no se
 *    elimina: pasa a ser la sección "00" inmediatamente debajo del hero
 *    (ver `page.tsx`), sigue siendo de las primeras cosas que se ven, pero
 *    ya no es el hero mismo.
 * 2. Prueba de profundidad: el hero ahora muestra, en una sola línea de
 *    cifras reales (no decorativas — vienen de `countsByType`/`totalCount`
 *    calculados en build time), cuántos vehículos/noticias/guías tiene
 *    HOY el catálogo, más el strip de marcas reales (`ManufacturersMarquee`,
 *    reubicado acá desde la sección "Categorías" para no duplicarlo dos
 *    veces en la misma página). Esto responde directo la Regla 6 del
 *    brief: "el hero debe vender la PROFUNDIDAD del producto".
 * 3. Cero autoplay/rotador en el hero: el rotador de fotos del hero legado
 *    (`HeroShowroom.tsx`, ya sin uso) necesitaba botón de pausa + roles
 *    ARIA para cumplir WCAG 2.2.2. Este hero no tiene una sola pieza que
 *    se mueva sola — nada que auditar en ese frente, por diseño, no por
 *    parche.
 * 4. Primeros 5 segundos (Regla 5 del brief): eyebrow dice explícitamente
 *    qué es el sitio ("catálogo técnico de autos y motos"), el h1 dice el
 *    diferencial real (dato con fuente, no reseña de opinión), la barra de
 *    búsqueda es la acción principal visible sin scroll, y la fila de
 *    cifras + marcas prueba que hay contenido real detrás del claim.
 *
 * QUÉ SE MANTIENE (ya funcionaba y está auditado):
 *  - El lenguaje visual "dossier" (grilla técnica, marcas de registro en
 *    las esquinas, número de sección hueco) que gobierna el resto de la
 *    home — un hero que rompiera ese sistema visual generaría exactamente
 *    el problema que la propia auditoría anterior señala como riesgo:
 *    "que no se sienta como dos sitios distintos pegados".
 *  - El dato de "% con fuente citada" como trust signal real (no de
 *    marketing), ahora calculado sobre TODO el catálogo (vehículos +
 *    noticias), no solo sobre los destacados.
 *  - `Reveal` para la entrada progresiva (fade + slide, respeta
 *    `prefers-reduced-motion` de forma nativa, cero JS de animación
 *    pesado) — mismo mecanismo que ya usa el resto de la home.
 */

export interface HeroCatalogIndexProps {
  siteName: string
  totalCount: number
  evidenceCoveragePct: number | null
  categories: { type: EntityType; count: number }[]
  manufacturers: ManufacturerMarqueeItem[]
  searchExamples?: string[]
  catalogHref: string
}

export function HeroCatalogIndex({
  siteName,
  totalCount,
  evidenceCoveragePct,
  categories,
  manufacturers,
  searchExamples,
  catalogHref,
}: HeroCatalogIndexProps) {
  return (
    <section className="dossier-grid relative overflow-hidden border-b border-edge pb-14 pt-12 sm:pb-20 sm:pt-16">
      <div className="container-max">
        {/* Eyebrow: qué es el sitio, en palabras explícitas — no depende
            de que el usuario infiera "catálogo de autos" por el resto del
            hero (punto más débil que señalaba la auditoría anterior). */}
        <Reveal direction="chapter">
          <p className="dossier-tag flex flex-wrap items-center gap-x-3 gap-y-1 text-neutral-500">
            <span className="text-auto-accent">{siteName}</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span>Catálogo técnico de autos y motos</span>
            {evidenceCoveragePct !== null && evidenceCoveragePct > 0 && (
              <>
                <span aria-hidden="true" className="hidden text-neutral-600 sm:inline">·</span>
                <span className="hidden sm:inline">{evidenceCoveragePct}% con fuente citada</span>
              </>
            )}
          </p>
        </Reveal>

        {/* H1: dice el diferencial real en dos líneas cortas, sin coma
            forzada ni metáfora abstracta que dependa de leer el resto del
            hero para entenderse — auto-contenido. */}
        <Reveal direction="chapter" className="mt-6 max-w-3xl">
          <h1 className="font-display text-[13vw] font-bold leading-[0.98] tracking-tight text-neutral-900 sm:text-6xl lg:text-[5.5rem]">
            El dato,
            <span className="block text-auto-accent">no el relato.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-neutral-500 sm:text-lg">
            {totalCount} fichas de vehículos, noticias y guías con potencia, precio y evidencia citada —
            buscá el modelo que te interesa o mirá abajo qué tan grande es el catálogo.
          </p>
        </Reveal>

        {/* Acción principal: buscar, no "jugar con un demo". El input ya
            navega a /buscar?q=... con deep-link real (SearchClient lee el
            query param). Atajo de teclado "/" incluido. */}
        <Reveal delay={100} className="mt-9 max-w-xl">
          <QuickSearchForm examples={searchExamples} />
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link
              href={catalogHref}
              className="link-underline text-sm font-semibold text-neutral-500 hover:text-neutral-900"
            >
              Ver los {totalCount} vehículos →
            </Link>
            <Link
              href="/comparar"
              className="link-underline text-sm font-semibold text-neutral-500 hover:text-neutral-900"
            >
              Abrir el comparador →
            </Link>
          </div>
        </Reveal>

        {/* Prueba de profundidad: cifras reales por categoría, no
            decorativas — mismo `countsByType` que usa la sección
            "Categorías" de abajo, acá como un anticipo compacto (una
            línea, no una grilla de cards duplicada). */}
        {categories.length > 0 && (
          <Reveal delay={160} className="mt-12">
            <div
              role="list"
              aria-label="Cantidad de entradas por categoría"
              className="flex flex-wrap gap-x-8 gap-y-4 border-t border-edge pt-8"
            >
              {categories.map(({ type, count }) => (
                <div key={type} role="listitem" className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-edge text-neutral-500"
                  >
                    <CategoryIcon type={type} className="h-4 w-4" />
                  </span>
                  <span className="leading-tight">
                    <span className="block font-display text-xl font-bold tracking-tight text-neutral-900">
                      {count}
                    </span>
                    <span className="dossier-tag block text-neutral-500">{ENTITY_TYPE_LABELS[type]}</span>
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {manufacturers.length > 0 && (
          <Reveal delay={220} className="mt-10">
            <p className="dossier-tag mb-4 text-neutral-500">Marcas reales en el catálogo</p>
            <ManufacturersMarquee manufacturers={manufacturers} />
          </Reveal>
        )}
      </div>
    </section>
  )
}
