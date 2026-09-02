'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

/**
 * Resumen mínimo de un vehículo para el mini-comparador de la home: solo
 * los tres campos numéricos ya validados que usa `rankings.ts`
 * (`parsePowerHp`/`parsePriceUsd`/`parseYear`) — nunca se vuelve a parsear
 * texto libre acá, se recibe ya calculado desde `page.tsx` (Server
 * Component, tiene el catálogo completo cargado).
 */
export interface CompareTeaserVehicle {
  slug: string
  title: string
  powerHp: number | null
  priceUsd: number | null
  year: number | null
}

export interface CompareTeaserPair {
  /** Slug del par para el link a la página fija `/comparar/[pair]`. */
  pairSlug: string
  a: CompareTeaserVehicle
  b: CompareTeaserVehicle
}

interface LiveCompareTeaserProps {
  pairs: CompareTeaserPair[]
}

function formatHp(value: number | null): string {
  return value !== null ? `${Math.round(value)} hp` : 'Sin dato'
}

function formatUsd(value: number | null): string {
  return value !== null ? `USD ${Math.round(value).toLocaleString('en-US')}` : 'Sin dato'
}

function formatYear(value: number | null): string {
  return value !== null ? String(Math.round(value)) : 'Sin dato'
}

/** Fila de la tabla comparativa: label + valor de cada lado. Resalta en
 *  negrita el lado con más potencia o el más reciente (dato objetivo,
 *  "más" sin ambigüedad) — pero NO declara un "ganador" en precio: más
 *  barato no es objetivamente "mejor" (depende del presupuesto de cada
 *  quien), así que esa fila se muestra siempre neutral. */
function CompareRow({
  label,
  valueA,
  valueB,
  highlight,
}: {
  label: string
  valueA: string
  valueB: string
  highlight?: 'a' | 'b' | null
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-t border-neutral-200 py-3 first:border-t-0">
      <span
        className={cn(
          'truncate text-right font-mono text-sm tabular-nums text-neutral-500',
          highlight === 'a' && 'font-semibold text-neutral-900'
        )}
      >
        {valueA}
      </span>
      <span className="text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
        {label}
      </span>
      <span
        className={cn(
          'truncate text-left font-mono text-sm tabular-nums text-neutral-500',
          highlight === 'b' && 'font-semibold text-neutral-900'
        )}
      >
        {valueB}
      </span>
    </div>
  )
}

function highlightFor(a: number | null, b: number | null, direction: 'higher' | 'lower'): 'a' | 'b' | null {
  if (a === null || b === null || a === b) return null
  if (direction === 'higher') return a > b ? 'a' : 'b'
  return a < b ? 'a' : 'b'
}

/** Distancia mínima de swipe (px) para contar como "cambiar de lado" en
 *  vez de un toque/scroll vertical accidental. */
const SWIPE_THRESHOLD_PX = 40

/** Fila de una sola métrica, versión "panel completo" (label arriba,
 *  valor grande abajo) para la vista mobile A/B — a diferencia de
 *  `CompareRow` (que muestra los dos lados en la misma fila), acá cada
 *  panel es un solo vehículo, así que no hace falta comprimir dos
 *  valores + label en 3 columnas angostas. */
function StatRow({ label, value, highlighted }: { label: string; value: string; highlighted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between border-t border-neutral-200 py-3 first:border-t-0">
      <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-400">{label}</span>
      <span
        className={cn(
          'font-mono text-base tabular-nums text-neutral-500',
          highlighted && 'font-semibold text-neutral-900'
        )}
      >
        {value}
      </span>
    </div>
  )
}

/**
 * Versión mobile del "Comparador en vivo": en vez de las 3 columnas
 * [A | label | B] de `CompareRow` (que en una pantalla angosta obliga a
 * truncar los dos títulos y aprieta bastante los valores), cada lado se
 * muestra como panel completo y se navega con swipe horizontal — mismo
 * gesto que cualquier carrusel de fotos, sin curva de aprendizaje nueva.
 * El segmentado A/B de abajo cubre el mismo cambio sin depender del
 * gesto (accesibilidad + descubribilidad: nada indica visualmente que
 * se puede swipear si nunca se probó).
 */
function MobileCompareSwipe({ pair }: { pair: CompareTeaserPair }) {
  const [side, setSide] = useState<0 | 1>(0)
  const touchStartX = useRef<number | null>(null)

  const vehicles: [CompareTeaserVehicle, CompareTeaserVehicle] = [pair.a, pair.b]
  const powerHighlight = highlightFor(pair.a.powerHp, pair.b.powerHp, 'higher')
  const yearHighlight = highlightFor(pair.a.year, pair.b.year, 'higher')

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const deltaX = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current
    touchStartX.current = null
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return
    // Swipe hacia la izquierda (deltaX negativo) avanza de A a B, igual
    // que deslizar una foto hacia la siguiente.
    if (deltaX < 0 && side === 0) setSide(1)
    if (deltaX > 0 && side === 1) setSide(0)
  }

  return (
    <Card className="!p-0 overflow-hidden sm:hidden">
      <div
        className="overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex w-[200%] transition-transform duration-300 ease-out"
          style={{ transform: side === 0 ? 'translateX(0%)' : 'translateX(-50%)' }}
        >
          {vehicles.map((v, i) => (
            <div key={v.slug} className="w-1/2 shrink-0 p-6">
              <Link
                href={`/vehiculos/${v.slug}`}
                className="mb-3 block truncate font-display text-lg font-bold text-neutral-900 hover:text-orange-600"
              >
                {v.title}
              </Link>
              <StatRow label="Potencia" value={formatHp(v.powerHp)} highlighted={powerHighlight === (i === 0 ? 'a' : 'b')} />
              <StatRow label="Precio (USD)" value={formatUsd(v.priceUsd)} />
              <StatRow label="Año" value={formatYear(v.year)} highlighted={yearHighlight === (i === 0 ? 'a' : 'b')} />
            </div>
          ))}
        </div>
      </div>

      {/* Segmentado A/B: mismo cambio que el swipe, sin depender del gesto. */}
      <div className="flex border-t border-neutral-200" role="tablist" aria-label="Elegí qué vehículo ver">
        {vehicles.map((v, i) => (
          <button
            key={v.slug}
            type="button"
            role="tab"
            aria-selected={side === i}
            onClick={() => setSide(i as 0 | 1)}
            className={cn(
              'flex-1 truncate px-3 py-3 text-xs font-semibold uppercase tracking-wide transition-colors',
              side === i ? 'bg-neutral-900 text-white' : 'text-neutral-500'
            )}
          >
            {v.title}
          </button>
        ))}
      </div>

      <div className="px-6 py-4 text-center">
        <Link
          href={`/comparar/${pair.pairSlug}`}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
        >
          Ver comparación completa <span aria-hidden="true">→</span>
        </Link>
      </div>
    </Card>
  )
}

/**
 * Panel "Comparador en vivo" de la home: no es una demo estática, es un
 * recorte real y navegable del comparador completo (`/comparar`) — mismos
 * pares fijos que `fixed-comparisons.ts` deriva de relaciones
 * `competidor` ya verificadas editorialmente, mismos parsers numéricos que
 * `rankings.ts`. La interactividad (elegir qué par ver) vive acá porque es
 * mínima y no necesita el motor completo de `CompareExplorer` — para una
 * comparación con más de 2 vehículos o más campos, el CTA lleva a
 * `/comparar`.
 */
export function LiveCompareTeaser({ pairs }: LiveCompareTeaserProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const pair = pairs[activeIndex]
  if (!pair) return null

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Selector de par: pills horizontales, mismo lenguaje visual que
          los dots de progreso del track (scrollea si no entran todos). */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        {pairs.map((p, i) => (
          <button
            key={p.pairSlug}
            type="button"
            onClick={() => setActiveIndex(i)}
            aria-current={i === activeIndex}
            className={cn(
              'rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors',
              i === activeIndex
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-300 text-neutral-500 hover:border-neutral-400 hover:text-neutral-900'
            )}
          >
            {p.a.title} <span className="text-neutral-400">vs</span> {p.b.title}
          </button>
        ))}
      </div>

      <Card className="!p-6 hidden sm:block">
        <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-baseline gap-3">
          <Link
            href={`/vehiculos/${pair.a.slug}`}
            className="truncate text-right font-display text-lg font-bold text-neutral-900 hover:text-orange-600"
          >
            {pair.a.title}
          </Link>
          <span className="text-center text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">vs</span>
          <Link
            href={`/vehiculos/${pair.b.slug}`}
            className="truncate text-left font-display text-lg font-bold text-neutral-900 hover:text-orange-600"
          >
            {pair.b.title}
          </Link>
        </div>

        <CompareRow
          label="Potencia"
          valueA={formatHp(pair.a.powerHp)}
          valueB={formatHp(pair.b.powerHp)}
          highlight={highlightFor(pair.a.powerHp, pair.b.powerHp, 'higher')}
        />
        <CompareRow label="Precio (USD)" valueA={formatUsd(pair.a.priceUsd)} valueB={formatUsd(pair.b.priceUsd)} />
        <CompareRow
          label="Año"
          valueA={formatYear(pair.a.year)}
          valueB={formatYear(pair.b.year)}
          highlight={highlightFor(pair.a.year, pair.b.year, 'higher')}
        />

        <div className="mt-6 text-center">
          <Link
            href={`/comparar/${pair.pairSlug}`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
          >
            Ver comparación completa <span aria-hidden="true">→</span>
          </Link>
        </div>
      </Card>

      {/* Mobile (Prioridad C): panel completo por vehículo + swipe A/B en
          vez de comprimir las 3 columnas de arriba en una pantalla
          angosta — ver `MobileCompareSwipe`. `key={pair.pairSlug}` para
          que el lado mostrado (A) se resetee solo al cambiar de par. */}
      <MobileCompareSwipe key={pair.pairSlug} pair={pair} />
    </div>
  )
}
