'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { getBestValueIndices } from '@/lib/vehicle-compare-best'
import { cn } from '@/lib/utils'

/** Resumen de una posición del ranking, ya resuelto server-side desde
 *  `RankingEntry` (`rankings.ts`) — se pasa el mínimo necesario para
 *  pintar la fila, no el `Vehicle` completo, para no viajar al cliente
 *  más JSON del que este panel compacto necesita. */
export interface RankingSpotlightEntry {
  position: number
  vehicleSlug: string
  vehicleTitle: string
  /** Valor numérico crudo que determinó el orden (`RankingEntry.metricValue`
   *  en `rankings.ts`) — nunca se muestra directo, es el input de
   *  `getBestValueIndices` (2.3) para marcar empates en el top 3. El texto
   *  visible sigue siendo `metricLabel`, ya formateado. */
  metricValue: number
  /** Valor ya formateado por `def.formatValue` (ej. "412 hp",
   *  "USD 38,000") — el mismo texto que se ve en la página completa del
   *  ranking, nunca un número recalculado acá. */
  metricLabel: string
}

export interface RankingSpotlight {
  slug: string
  shortTitle: string
  title: string
  /** 'min' | 'max' — traducido en `page.tsx` desde `RankingDefinition.direction`
   *  ('asc'/'desc'), es el vocabulario que espera `getBestValueIndices`
   *  (`vehicle-compare-best.ts`) para saber si el mejor valor del top 3 es
   *  el menor o el mayor. */
  direction: 'min' | 'max'
  /** Top de posiciones a mostrar en el panel (recortado a 3 en
   *  `page.tsx`; el ranking completo, hasta `RANKING_TOP_N`, vive en
   *  `/rankings/[slug]`). */
  topEntries: RankingSpotlightEntry[]
  eligibleCount: number
}

interface RankingsSpotlightProps {
  rankings: RankingSpotlight[]
}

/** Duración del crossfade al cambiar de tab — mismo valor que ya usa
 *  `CompareShowcase.tsx` (`CrossfadeImage`) para que el ritmo de
 *  transición sea consistente entre paneles de la home. */
const CROSSFADE_MS = 220

/**
 * Panel "Rankings destacados": mismo espíritu que `LiveCompareTeaser"
 * (recorte real y navegable, no una demo) pero para el motor de rankings
 * programáticos de `rankings.ts` — 4 rankings reales (más potentes, más
 * baratos, más caros, más recientes), cada uno ya filtrado por el mismo
 * umbral de contenido (`RANKING_MIN_ELIGIBLE`) que usa la página `/rankings`.
 * Tabs en vez de mostrar los 4 a la vez: en el espacio de un panel del
 * track, 4 tablas simultáneas competirían por atención — un ranking
 * completo y legible por vez, con navegación directa a los otros 3.
 *
 * Mini-leaderboard (2.3): top 3 por criterio (recortado en `page.tsx`,
 * no acá), con el o los vehículos empatados en el mejor valor del top 3
 * marcados vía `getBestValueIndices` (`vehicle-compare-best.ts` — mismo
 * criterio que ya usa `CompareShowcase` para "Mejor" en el comparador en
 * vivo). Cambiar de tab hace un crossfade del leaderboard en vez de un
 * corte seco: se mantiene el contenido anterior visible mientras se
 * desvanece, y el nuevo entra ya resuelto (sin layout shift a mitad de
 * transición). `prefers-reduced-motion`: el cambio es instantáneo, sin
 * fade, igual que el resto de los crossfades de la home.
 */
export function RankingsSpotlight({ rankings }: RankingsSpotlightProps) {
  const [reducedMotion, setReducedMotion] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [displayedIndex, setDisplayedIndex] = useState(0)
  const [fadingOut, setFadingOut] = useState(false)
  const pendingIndexRef = useRef<number | null>(null)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(query.matches)
    const onChange = () => setReducedMotion(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!fadingOut) return
    const timer = setTimeout(() => {
      if (pendingIndexRef.current !== null) {
        setDisplayedIndex(pendingIndexRef.current)
        pendingIndexRef.current = null
      }
      setFadingOut(false)
    }, CROSSFADE_MS)
    return () => clearTimeout(timer)
  }, [fadingOut])

  const selectTab = (index: number) => {
    if (index === activeIndex) return
    setActiveIndex(index)
    if (reducedMotion) {
      setDisplayedIndex(index)
      return
    }
    pendingIndexRef.current = index
    setFadingOut(true)
  }

  const ranking = rankings[displayedIndex]
  if (!ranking) return null

  // 2.3: "mejor valor" del top 3 — mismo criterio que `computeHighlights`
  // en `CompareShowcase.tsx`, acá sobre N posiciones en vez de 2 lados.
  // `getBestValueIndices` ya devuelve un set vacío si hay menos de 2
  // valores distintos parseables, así que un top 3 con un solo vehículo
  // elegible (o los 3 empatados) simplemente no marca nada.
  const bestValueIndices = getBestValueIndices(
    ranking.topEntries.map((entry) => entry.metricValue),
    ranking.direction
  )

  return (
    <div className="mx-auto w-full max-w-2xl">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
        Rankings
      </p>
      <h2 className="mb-8 text-center font-display text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
        Rankings destacados
      </h2>

      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        {rankings.map((r, i) => (
          <button
            key={r.slug}
            type="button"
            onClick={() => selectTab(i)}
            aria-current={i === activeIndex}
            className={cn(
              'rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors',
              i === activeIndex
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-300 text-neutral-500 hover:border-neutral-400 hover:text-neutral-900'
            )}
          >
            {r.shortTitle}
          </button>
        ))}
      </div>

      {/* `Card` (src/components/ui/Card.tsx) no expone `style` en su
          `CardProps` — se envuelve en un div que aplica el crossfade de
          opacidad en la misma superficie, sin tocar ese componente
          compartido. */}
      <div
        style={{
          opacity: fadingOut ? 0 : 1,
          transition: reducedMotion ? undefined : `opacity ${CROSSFADE_MS}ms ease-in-out`,
        }}
      >
        <Card className="!p-6">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h3 className="font-display text-lg font-bold text-neutral-900">{ranking.shortTitle}</h3>
            <span className="shrink-0 text-xs text-neutral-400">{ranking.eligibleCount} elegibles</span>
          </div>
          <ol className="divide-y divide-neutral-200">
            {ranking.topEntries.map((entry, i) => {
              const isBest = bestValueIndices.has(i)
              return (
                <li key={entry.vehicleSlug} className="flex items-center gap-4 py-3">
                  <span className="w-6 shrink-0 text-right font-mono text-sm tabular-nums text-neutral-400">
                    {entry.position}
                  </span>
                  <Link
                    href={`/vehiculos/${entry.vehicleSlug}`}
                    className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900 hover:text-orange-600"
                  >
                    {entry.vehicleTitle}
                  </Link>
                  {isBest && (
                    <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700">
                      Mejor valor
                    </span>
                  )}
                  <span
                    className={cn(
                      'shrink-0 font-mono text-sm tabular-nums',
                      isBest ? 'font-semibold text-neutral-900' : 'text-neutral-500'
                    )}
                  >
                    {entry.metricLabel}
                  </span>
                </li>
              )
            })}
          </ol>

          <div className="mt-6 text-center">
            <Link
              href={`/rankings/${ranking.slug}`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
            >
              Ver ranking completo <span aria-hidden="true">→</span>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
