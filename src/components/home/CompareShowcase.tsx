'use client'

import { useEffect, useRef, useState, type TouchEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Evidence, Vehicle } from '@/types'
import type { ResolvedDisplayImage } from '@/lib/images'
import { StatBar } from '@/components/entities/StatBar'
import { EvidenceBlock } from '@/components/entities/EvidenceBlock'
import { performanceToScale } from '@/lib/vehicle-performance'
import { getBestValueIndices } from '@/lib/vehicle-compare-best'
import { cn } from '@/lib/utils'

/**
 * Vehículo ya resuelto en servidor para este panel: además de las specs de
 * `Vehicle`, incluye la imagen (`resolveEntityDisplayImage` depende de
 * `fs`, no puede llamarse desde acá — mismo criterio que
 * `HeroVehicleShowcase`/`EntityImage`). El `pool` completo (no solo A/B)
 * viaja al cliente porque "cambiar vehículo A/B" reelige al azar DENTRO
 * de ese pool — no hay refetch al servidor al cambiar, así el usuario
 * nunca sale de la home (criterio de aceptación de la 1.3).
 */
export interface CompareShowcaseVehicle {
  slug: string
  title: string
  manufacturer?: string
  power?: string
  price?: string | null
  /** Precio ya resuelto a USD en servidor (`parsePriceUsd`, mismo parser
   *  que usa `/comparar`) — `null` si el vehículo no tiene precio
   *  estructurado en USD. Se usa solo para decidir qué lado destacar como
   *  "Mejor" (`getBestValueIndices`, `vehicle-compare-best.ts`); `price`
   *  (el string de arriba) sigue siendo lo único que se muestra. */
  priceUsd?: number | null
  performance?: Vehicle['performance']
  evidence?: Evidence
  image: ResolvedDisplayImage | null
}

interface CompareShowcaseProps {
  /** Vehículos `featured` candidatos (con specs contrastantes entre sí,
   *  criterio decidido en servidor — ver `src/app/page.tsx`). Mínimo 2. */
  pool: CompareShowcaseVehicle[]
  /** Índice inicial del lado A dentro de `pool`. */
  initialIndexA: number
  /** Índice inicial del lado B dentro de `pool`. */
  initialIndexB: number
}

const CROSSFADE_MS = 400
const SWIPE_THRESHOLD_PX = 40

/** Elige un índice de `pool` al azar, excluyendo los que ya están en uso
 *  (el propio lado actual + el otro lado, para que A y B nunca coincidan).
 *  `null` si no queda ningún candidato (pool agotado). */
function randomOtherIndex(poolLength: number, exclude: number[]): number | null {
  const candidates = Array.from({ length: poolLength }, (_, i) => i).filter((i) => !exclude.includes(i))
  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

/**
 * Imagen del vehículo con crossfade CSS real al cambiar de `src`: dos
 * capas apiladas y montadas desde el primer render (no una que aparece
 * recién al cambiar — un nodo recién montado no puede animar su propia
 * transición de opacidad, necesita existir en el frame anterior). Cada
 * cambio de `src` actualiza la capa oculta y recién ahí invierte cuál de
 * las dos está visible, así el navegador interpola una transición real
 * sobre un nodo existente — mismo principio que ya usa
 * `RotatingHeroBackground` para su propio crossfade de fondos.
 */
function CrossfadeImage({
  src,
  alt,
  reducedMotion,
  sizes,
}: {
  src: string | null
  alt: string
  reducedMotion: boolean
  sizes: string
}) {
  const [layers, setLayers] = useState<[string | null, string | null]>([src, src])
  const [activeIndex, setActiveIndex] = useState<0 | 1>(0)
  const prevSrc = useRef(src)

  useEffect(() => {
    if (src === prevSrc.current) return
    prevSrc.current = src
    setActiveIndex((current) => {
      const hidden = current === 0 ? 1 : 0
      setLayers((prevLayers) => {
        const next: [string | null, string | null] = [...prevLayers]
        next[hidden] = src
        return next
      })
      return hidden
    })
  }, [src])

  return (
    <div className="relative h-full w-full bg-white">
      {layers.map((layerSrc, i) =>
        layerSrc ? (
          <Image
            key={i}
            src={layerSrc}
            alt={i === activeIndex ? alt : ''}
            fill
            sizes={sizes}
            quality={90}
            className="object-cover"
            style={{
              opacity: i === activeIndex ? 1 : 0,
              transition: reducedMotion ? undefined : `opacity ${CROSSFADE_MS}ms ease-in-out`,
            }}
          />
        ) : null
      )}
    </div>
  )
}

function formatPower(power?: string): string {
  return power && power.trim().length > 0 ? power : 'Sin dato'
}

function formatPrice(price?: string | null): string {
  return price && price.trim().length > 0 ? price : 'Sin dato'
}

/** Qué filas de UN lado (A o B) se destacan como "Mejor" — se calculan
 *  juntas para el par activo (ver `computeHighlights`) porque "mejor" solo
 *  tiene sentido en relación al otro lado, nunca de forma aislada. */
interface SideHighlights {
  speed: boolean
  acceleration: boolean
  handling: boolean
  braking: boolean
  price: boolean
}

const PERFORMANCE_HIGHLIGHT_ROWS = [
  { key: 'speed' as const, label: 'Velocidad' },
  { key: 'acceleration' as const, label: 'Aceleración' },
  { key: 'handling' as const, label: 'Manejo' },
  { key: 'braking' as const, label: 'Frenado' },
]

/**
 * Compara A vs B con la misma lógica ya validada que usa la tabla completa
 * de `/comparar` (`VehicleCompareSheet`): `getBestValueIndices` de
 * `vehicle-compare-best.ts` sobre la escala 1-5 de `performanceToScale`
 * (mayor es mejor) para las 4 métricas de rendimiento, y sobre `priceUsd`
 * (menor es mejor) para el precio — nunca un cálculo nuevo, el mismo
 * criterio que ya usa el resto del sitio. Si un lado no tiene el valor
 * parseable (o ambos empatan), esa fila queda sin destacar en ningún lado
 * — `getBestValueIndices` ya devuelve un set vacío en esos casos.
 */
function computeHighlights(
  a: CompareShowcaseVehicle,
  b: CompareShowcaseVehicle
): [SideHighlights, SideHighlights] {
  const rows = PERFORMANCE_HIGHLIGHT_ROWS.map((row) =>
    getBestValueIndices(
      [performanceToScale(a.performance?.[row.key]), performanceToScale(b.performance?.[row.key])],
      'max'
    )
  )
  const priceIndices = getBestValueIndices([a.priceUsd ?? null, b.priceUsd ?? null], 'min')

  const forSide = (side: 0 | 1): SideHighlights => ({
    speed: rows[0].has(side),
    acceleration: rows[1].has(side),
    handling: rows[2].has(side),
    braking: rows[3].has(side),
    price: priceIndices.has(side),
  })

  return [forSide(0), forSide(1)]
}

/** Mismo lenguaje visual que `BestValueBadge` en `VehicleCompareSheet`
 *  (no exportado desde ahí, así que se repite acá en vez de importarlo). */
function BestBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-auto-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
      Mejor
    </span>
  )
}

/** Una mitad del duelo (lado A o B): foto + specs + evidencia de UN
 *  vehículo, más el botón que re-elige ese lado al azar dentro del pool. */
function VehiclePane({
  side,
  vehicle,
  highlights,
  reducedMotion,
  onChange,
  canChange,
  className,
}: {
  side: 'a' | 'b'
  vehicle: CompareShowcaseVehicle
  highlights: SideHighlights
  reducedMotion: boolean
  onChange: () => void
  canChange: boolean
  className?: string
}) {
  const label = side === 'a' ? 'A' : 'B'

  return (
    <div className={cn('glass-surface overflow-hidden rounded-2xl border border-edge bg-surface-card', className)}>
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <CrossfadeImage
          src={vehicle.image?.src ?? null}
          alt={vehicle.image?.alt ?? vehicle.title}
          reducedMotion={reducedMotion}
          sizes="(min-width: 640px) 24rem, 100vw"
        />
        {!vehicle.image && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-400">
            Sin imagen
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">
              Vehículo {label}
            </p>
            <Link
              href={`/vehiculos/${vehicle.slug}`}
              className="block truncate font-display text-lg font-bold text-neutral-900 hover:text-orange-600"
            >
              {vehicle.title}
            </Link>
            {vehicle.manufacturer && (
              <p className="truncate text-xs text-neutral-500">{vehicle.manufacturer}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onChange}
            disabled={!canChange}
            aria-label={`Cambiar vehículo ${label} por otro al azar`}
            className="shrink-0 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cambiar
          </button>
        </div>

        <div className="mb-3 flex items-center gap-4 text-xs text-neutral-500">
          <span>
            <span className="font-semibold text-neutral-900">Potencia:</span> {formatPower(vehicle.power)}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1',
              highlights.price && 'rounded-md bg-auto-accent/10 px-1.5 py-0.5 ring-1 ring-inset ring-auto-accent/40'
            )}
          >
            <span className="font-semibold text-neutral-900">Precio:</span> {formatPrice(vehicle.price)}
            {highlights.price && <BestBadge />}
          </span>
        </div>

        {/* `StatBar` ya anima el ancho de su propia barra con
            `transition-[width] duration-700 ease-[var(--ease-premium)]`
            (ver `src/components/entities/StatBar.tsx`) — al pasarle un
            `value` nuevo (nuevo vehículo elegido para este lado) esa
            transición corre sola, es el "movimiento" que pide la spec sin
            tener que reimplementarla acá. El destacado "Mejor" reusa
            `getBestValueIndices` de `vehicle-compare-best.ts` (ver
            `computeHighlights` más arriba) — mismo criterio y mismo
            lenguaje visual que la tabla completa de `/comparar`. */}
        <div className="space-y-2.5">
          {PERFORMANCE_HIGHLIGHT_ROWS.map((row) => (
            <div
              key={row.key}
              className={cn(
                highlights[row.key] && 'rounded-lg bg-auto-accent/10 p-2 ring-1 ring-inset ring-auto-accent/40'
              )}
            >
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <StatBar label={row.label} value={vehicle.performance?.[row.key]} />
                </div>
                {highlights[row.key] && <BestBadge />}
              </div>
            </div>
          ))}
        </div>

        {vehicle.evidence && (
          <div className="mt-4">
            <EvidenceBlock evidence={vehicle.evidence} />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Panel 3 de la home ("Comparador en vivo"): reemplaza al viejo teaser de
 * pares fijos (pensado como aviso liviano hacia `/comparar/[pair]`, ya
 * borrado del repo) — este panel envuelve datos reales de `Vehicle` para
 * dos vehículos `featured` con specs contrastantes: foto, las 4 barras de
 * rendimiento (`StatBar`), el destacado de "Mejor" por métrica y por
 * precio (`getBestValueIndices` de `vehicle-compare-best.ts` — mismo
 * criterio que ya usa la tabla completa de `/comparar`, nunca un cálculo
 * nuevo) y la trazabilidad completa (`EvidenceBlock`). Cada lado tiene su
 * propio botón "Cambiar" que re-elige al azar OTRO vehículo del `pool`
 * recibido por props (nunca navega ni vuelve a pedir datos al servidor:
 * todo el pool ya viajó resuelto desde `page.tsx`).
 *
 * Mobile: en vez de las dos columnas de desktop, se ve un vehículo a la
 * vez — los pills "Vehículo A"/"Vehículo B" (`<button aria-pressed>`)
 * cambian cuál, y un swipe horizontal sobre la tarjeta hace lo mismo como
 * atajo táctil (el swipe es un plus, no reemplaza los botones — ver
 * accesibilidad abajo).
 *
 * Accesibilidad: todo control es un `<button>` real con `aria-label`
 * descriptivo ("Cambiar vehículo A por otro al azar", no un div con
 * onClick) — nunca hay una acción que dependa solo del gesto de swipe.
 *
 * `prefers-reduced-motion`: el crossfade de la foto (`CrossfadeImage`) se
 * desactiva (cambia sin transición); la animación de ancho de `StatBar`
 * es CSS puro de esa misma clase y no se toca acá — ver su propio
 * componente si hace falta ese ajuste en el futuro.
 */
export function CompareShowcase({ pool, initialIndexA, initialIndexB }: CompareShowcaseProps) {
  const [reducedMotion, setReducedMotion] = useState(false)
  const [indexA, setIndexA] = useState(initialIndexA)
  const [indexB, setIndexB] = useState(initialIndexB)
  const [mobileSide, setMobileSide] = useState<'a' | 'b'>('a')
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(query.matches)
    const onChange = () => setReducedMotion(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  if (pool.length < 2) return null

  const vehicleA = pool[indexA]
  const vehicleB = pool[indexB]
  const canChange = pool.length > 2
  const [highlightsA, highlightsB] = computeHighlights(vehicleA, vehicleB)

  const changeA = () => {
    const next = randomOtherIndex(pool.length, [indexA, indexB])
    if (next !== null) setIndexA(next)
  }
  const changeB = () => {
    const next = randomOtherIndex(pool.length, [indexA, indexB])
    if (next !== null) setIndexB(next)
  }

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }
  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current
    const delta = endX - touchStartX.current
    touchStartX.current = null
    if (delta > SWIPE_THRESHOLD_PX) setMobileSide('a')
    else if (delta < -SWIPE_THRESHOLD_PX) setMobileSide('b')
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* Selector mobile: oculto en desktop (`sm:hidden`), donde ambos
          lados ya se ven uno al lado del otro. */}
      <div className="mb-6 flex items-center justify-center gap-2 sm:hidden">
        <button
          type="button"
          onClick={() => setMobileSide('a')}
          aria-pressed={mobileSide === 'a'}
          aria-label={`Ver vehículo A: ${vehicleA.title}`}
          className={cn(
            'rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors',
            mobileSide === 'a'
              ? 'border-neutral-900 bg-neutral-900 text-white'
              : 'border-neutral-300 text-neutral-500 hover:border-neutral-400 hover:text-neutral-900'
          )}
        >
          Vehículo A
        </button>
        <button
          type="button"
          onClick={() => setMobileSide('b')}
          aria-pressed={mobileSide === 'b'}
          aria-label={`Ver vehículo B: ${vehicleB.title}`}
          className={cn(
            'rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors',
            mobileSide === 'b'
              ? 'border-neutral-900 bg-neutral-900 text-white'
              : 'border-neutral-300 text-neutral-500 hover:border-neutral-400 hover:text-neutral-900'
          )}
        >
          Vehículo B
        </button>
      </div>

      <div
        className="grid grid-cols-1 gap-6 sm:grid-cols-2"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <VehiclePane
          side="a"
          vehicle={vehicleA}
          highlights={highlightsA}
          reducedMotion={reducedMotion}
          onChange={changeA}
          canChange={canChange}
          className={cn(mobileSide !== 'a' && 'hidden sm:block')}
        />
        <VehiclePane
          side="b"
          vehicle={vehicleB}
          highlights={highlightsB}
          reducedMotion={reducedMotion}
          onChange={changeB}
          canChange={canChange}
          className={cn(mobileSide !== 'b' && 'hidden sm:block')}
        />
      </div>
    </div>
  )
}
