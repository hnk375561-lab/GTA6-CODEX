'use client'

import { useState, useId, type CSSProperties } from 'react'
import Link from 'next/link'
import type { Vehicle } from '@/types'
import type { ResolvedDisplayImage } from '@/lib/images'
import { EntityCard } from '@/components/entities/EntityCard'
import { cn } from '@/lib/utils'

export interface RankingTabEntry {
  vehicle: Vehicle
  position: number
  metricLabel: string
  metricValue: number
}

export interface RankingTabData {
  slug: string
  shortTitle: string
  criterionLabel: string
  eligibleCount: number
  entries: RankingTabEntry[]
}

interface RankingsLeaderboardTabsProps {
  rankings: RankingTabData[]
  imageBySlug: Record<string, ResolvedDisplayImage | null>
  relationCountBySlug: Record<string, number>
  /** Cuántas posiciones se muestran en el preview (el ranking completo,
   *  con hasta `RANKING_TOP_N`, vive en `/rankings/[slug]`). */
  previewCount: number
}

/**
 * Prioridad C: tabs animados en el índice de `/rankings`. Antes, la
 * página índice solo mostraba una grilla de cards que enlazaban a cada
 * `/rankings/[slug]` — para ver el leaderboard había que navegar y volver.
 * Este componente reutiliza exactamente los mismos datos ya calculados
 * por `getAvailableRankings()` (ningún criterio ni orden nuevo, mismo
 * `RankingEntry` de `lib/rankings.ts`) para mostrar un preview navegable
 * sin recargar la página: cambiar de tab hace un crossfade entre
 * leaderboards, no un fade genérico de biblioteca — la transición vive
 * en `globals.css` (`.rankings-tabs-panel`): el `key={active.slug}` del
 * panel fuerza a React a desmontar/montar el contenido en cada cambio de
 * tab, así la animación de entrada corre siempre, incluso si se vuelve a
 * elegir un tab ya visitado.
 *
 * Las páginas `/rankings/[slug]` siguen existiendo tal cual (SEO,
 * JSON-LD `ItemList`, top `RANKING_TOP_N` completo) — este preview solo
 * muestra `previewCount` posiciones con un link "Ver ranking completo".
 */
export function RankingsLeaderboardTabs({
  rankings,
  imageBySlug,
  relationCountBySlug,
  previewCount,
}: RankingsLeaderboardTabsProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  // Prioridad C (vuelta 2): la única forma de "ver" un ranking acá era
  // la grilla de EntityCard (misma pieza que Destacados/Similares) — para
  // un LISTADO ordenado por un número real, una tabla con barras
  // proporcionales al valor comunica el orden y la distancia entre
  // posiciones de un vistazo (el 2do más caro está cerca del 1ro o muy
  // lejos), algo que una grilla de cards no puede mostrar. Las cards no
  // se sacan: siguen siendo el mejor formato para reconocer el vehículo
  // por foto — 'Tabla' es una vista alternativa, no un reemplazo.
  const [view, setView] = useState<'cards' | 'tabla'>('cards')
  const tabsId = useId()

  if (rankings.length === 0) return null

  const active = rankings[activeIndex]

  return (
    <div>
      <div
        role="tablist"
        aria-label="Elegí un ranking"
        className="mb-6 flex flex-wrap gap-2"
      >
        {rankings.map((ranking, index) => {
          const isActive = index === activeIndex
          return (
            <button
              key={ranking.slug}
              type="button"
              role="tab"
              id={`${tabsId}-tab-${ranking.slug}`}
              aria-selected={isActive}
              aria-controls={`${tabsId}-panel-${ranking.slug}`}
              onClick={() => setActiveIndex(index)}
              className={cn(
                'tap-scale rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent',
                isActive
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-edge text-neutral-500 hover:border-auto-accent hover:text-auto-accent-strong'
              )}
            >
              {ranking.shortTitle}
            </button>
          )
        })}
      </div>

      <div
        key={active.slug}
        id={`${tabsId}-panel-${active.slug}`}
        role="tabpanel"
        aria-labelledby={`${tabsId}-tab-${active.slug}`}
        className="rankings-tabs-panel"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-neutral-500">
            Top {Math.min(previewCount, active.entries.length)} de {active.eligibleCount} vehículos
            comparables, ordenados por {active.criterionLabel}.
          </p>

          <div role="group" aria-label="Formato de vista" className="flex gap-1 rounded-full border border-edge p-1">
            {(['cards', 'tabla'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={view === mode}
                onClick={() => setView(mode)}
                className={cn(
                  'tap-scale rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors',
                  view === mode
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-500 hover:text-neutral-900'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {view === 'cards' ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {active.entries.slice(0, previewCount).map((entry) => (
              <EntityCard
                key={entry.vehicle.slug}
                entity={entry.vehicle}
                image={imageBySlug[`${entry.vehicle.type}/${entry.vehicle.slug}`]}
                typeLabel="Vehículo"
                relationCount={relationCountBySlug[entry.vehicle.slug]}
                rankBadge={{ position: entry.position, metricLabel: entry.metricLabel }}
              />
            ))}
          </div>
        ) : (
          <RankingBarList entries={active.entries.slice(0, previewCount)} />
        )}

        <div className="mt-6">
          <Link
            href={`/rankings/${active.slug}`}
            className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-auto-accent transition-colors hover:text-auto-accent-strong"
          >
            Ver ranking completo <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * Vista "Tabla": lista ordenada con una barra proporcional al valor de
 * cada vehículo (relativa al máximo del propio top mostrado, no del
 * ranking completo — así la barra #1 siempre llega al 100% dentro de lo
 * que se ve acá). El ancho se anima desde 0% en cada montaje (mismo
 * truco que el resto del sitio: `key` en el padre fuerza remount al
 * cambiar de tab, así la barra "crece" de nuevo cada vez que se entra a
 * un ranking distinto, no solo la primera vez).
 */
function RankingBarList({ entries }: { entries: RankingTabEntry[] }) {
  const maxValue = Math.max(...entries.map((e) => e.metricValue), 1)

  return (
    <ol className="flex flex-col gap-2">
      {entries.map((entry, i) => {
        const pct = Math.max(4, Math.round((entry.metricValue / maxValue) * 100))
        return (
          <li key={entry.vehicle.slug}>
            <Link
              href={`/${entry.vehicle.type}/${entry.vehicle.slug}`}
              className="group flex items-center gap-3 rounded-lg border border-transparent px-2 py-1.5 transition-colors hover:border-edge hover:bg-surface-alt"
            >
              <span className="w-6 shrink-0 text-right font-mono text-xs text-neutral-400">
                {entry.position}
              </span>
              <span className="w-32 shrink-0 truncate text-sm font-medium text-neutral-900 sm:w-48">
                {entry.vehicle.title}
              </span>
              <span className="relative h-6 flex-1 overflow-hidden rounded-md bg-surface-alt">
                <span
                  className="ranking-bar-fill absolute inset-y-0 left-0 rounded-md bg-gradient-to-r from-auto-accent to-auto-accent-orange"
                  style={{ '--bar-target': `${pct}%`, animationDelay: `${Math.min(i, 10) * 30}ms` } as CSSProperties}
                />
              </span>
              <span className="w-20 shrink-0 text-right font-mono text-xs text-neutral-500 sm:w-24">
                {entry.metricLabel}
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
