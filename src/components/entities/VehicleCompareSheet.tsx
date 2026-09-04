'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Vehicle } from '@/types'
import type { ResolvedDisplayImage } from '@/lib/images'
import { StatBar } from '@/components/entities/StatBar'
import { useModalFocus } from '@/lib/hooks/useModalFocus'
import { cn } from '@/lib/utils'
import { parsePriceUsd, hasMixedPriceCurrencies } from '@/lib/vehicle-price'
import { performanceToScale } from '@/lib/vehicle-performance'
import { getBestValueIndices } from '@/lib/vehicle-compare-best'
import { parsePowerHp } from '@/lib/vehicle-power'
import { parseTrunkVolume } from '@/lib/vehicle-trunk'
import { getSafetyInfo } from '@/lib/vehicle-safety-score'
import { getAllEquipmentNames, getVehicleEquipmentMatrix } from '@/lib/vehicle-compare-equipment'

export const MAX_COMPARE = 5

interface VehicleCompareBarProps {
  selected: Vehicle[]
  imageBySlug?: Record<string, ResolvedDisplayImage | null>
  onRemove: (slug: string) => void
  onClear: () => void
  onOpen: () => void
}

/**
 * Barra flotante inferior, visible solo cuando hay 1+ vehículos
 * seleccionados para comparar. Miniaturas + botón "Comparar" que abre el
 * panel completo (VehicleCompareSheet). Puramente presentacional — todo el
 * estado de selección vive en EntityListExplorer, único lugar donde el
 * usuario puede tildar una card.
 */
export function VehicleCompareBar({ selected, imageBySlug, onRemove, onClear, onOpen }: VehicleCompareBarProps) {
  if (selected.length === 0) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 sm:pb-6"
      role="region"
      aria-label="Comparador de vehículos"
    >
      <div className="glass-surface flex w-full max-w-2xl flex-wrap items-center gap-3 rounded-2xl border border-edge bg-surface-card/95 p-3 shadow-md backdrop-blur-md sm:gap-4 sm:p-4">
        <div className="flex flex-1 items-center gap-2">
          {selected.map((v) => {
            const img = imageBySlug?.[`vehiculos/${v.slug}`]
            return (
              <div key={v.slug} className="group relative">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-edge bg-surface-card sm:h-12 sm:w-12">
                  {img?.src ? (
                    <Image src={img.src} alt={v.title} width={48} height={48} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[9px] font-semibold uppercase text-neutral-400">
                      {v.title.slice(0, 2)}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(v.slug)}
                  aria-label={`Quitar ${v.title} de la comparación`}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-edge bg-white text-neutral-500 opacity-0 transition duration-200 hover:text-auto-accent active:scale-90 group-hover:opacity-100 focus-visible:border-auto-accent focus-visible:text-auto-accent focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })}
          <span className="ml-1 text-xs text-neutral-500">
            {selected.length}/{MAX_COMPARE} seleccionados
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-neutral-500 transition-colors hover:text-neutral-900"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={onOpen}
            disabled={selected.length < 2}
            className="rounded-lg bg-auto-accent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-[0_0_24px_-6px_rgba(255,106,26,0.25)] transition-transform disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none enabled:hover:scale-[1.03]"
          >
            Comparar
          </button>
        </div>
      </div>
    </div>
  )
}

const PERFORMANCE_ROWS: Array<{ key: 'speed' | 'acceleration' | 'handling' | 'braking'; label: string }> = [
  { key: 'speed', label: 'Velocidad' },
  { key: 'acceleration', label: 'Aceleración' },
  { key: 'handling', label: 'Manejo' },
  { key: 'braking', label: 'Frenado' },
]

/**
 * Filas de comparación de texto simple, con campos reales del dominio
 * automotor en vez de los legado `customizable`/`driven_by` (oportunidad
 * P0 #2 de la auditoría "AutoFicha: aprovechamiento de datos"):
 * `customizable` era `false` en las 250 fichas sin ninguna variación —
 * no comparaba nada — y `driven_by` estaba 0/250 poblado. Precio,
 * consumo, dimensiones, transmisión y tracción sí varían entre vehículos
 * y son, en los hechos, lo que alguien comparando autos quiere ver.
 */
const TEXT_COMPARE_ROWS: Array<{ key: 'price' | 'consumo' | 'dimensiones' | 'transmision' | 'traccion'; label: string }> = [
  { key: 'price', label: 'Precio' },
  { key: 'consumo', label: 'Consumo' },
  { key: 'dimensiones', label: 'Dimensiones' },
  { key: 'transmision', label: 'Transmisión' },
  { key: 'traccion', label: 'Tracción' },
]

interface VehicleCompareTableProps {
  vehicles: Vehicle[]
  imageBySlug?: Record<string, ResolvedDisplayImage | null>
  onRemove?: (slug: string) => void
}

/**
 * Contenido puro de la comparación: fotos + nombre + filas alineadas por
 * atributo (clase, precio/consumo/dimensiones/transmisión/tracción, y las
 * 4 métricas de rendimiento). Extraído de `VehicleCompareSheet` para poder
 * reutilizarlo tanto
 * en el panel modal (sobre el listado de `/vehiculos`) como en la página
 * standalone `/comparar` — mismo componente, dos contenedores distintos
 * (overlay vs. sección de página normal). `onRemove` es opcional: si no
 * se pasa, no se muestra el botón de quitar por vehículo (ej. si el
 * caller prefiere manejar la remoción desde otro lugar de su UI).
 */
export function VehicleCompareTable({ vehicles, imageBySlug, onRemove }: VehicleCompareTableProps) {
  if (vehicles.length === 0) return null

  // Con 2-3 vehículos las columnas siempre entran cómodas en una fila.
  // A partir de 4 (hasta MAX_COMPARE = 5), en pantallas angostas la
  // grilla quedaría demasiado apretada — en vez de eso le ponemos un piso
  // de ancho por columna y dejamos que el contenedor scrollee horizontal.
  // El `minWidth` es lo único que difiere entre casos: en 2-3 vehículos
  // queda `undefined` (mismo layout de siempre, sin scroll).
  const scrollable = vehicles.length > 3
  const minWidth = scrollable ? `${vehicles.length * 180}px` : undefined

  return (
    <div className={scrollable ? 'overflow-x-auto' : undefined}>
      <div style={{ minWidth }}>
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${vehicles.length}, minmax(0, 1fr))` }}
        >
          {vehicles.map((v) => {
            const img = imageBySlug?.[`vehiculos/${v.slug}`]
            return (
              <div key={v.slug} className="flex flex-col">
                <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-xl border border-edge bg-surface-card">
                  {img?.src ? (
                    <Image
                      src={img.src}
                      alt={v.title}
                      fill
                      sizes={
                        vehicles.length <= 2
                          ? '(min-width: 1024px) 900px, (min-width: 640px) 700px, 500px'
                          : '(min-width: 1024px) 700px, (min-width: 640px) 500px, 400px'
                      }
                      quality={95}
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                      Sin imagen
                    </div>
                  )}
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(v.slug)}
                      aria-label={`Quitar ${v.title} de la comparación`}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <Link
                  href={`/vehiculos/${v.slug}`}
                  className="mb-1 line-clamp-2 text-sm font-bold text-neutral-900 transition-colors hover:text-auto-accent"
                >
                  {v.title}
                </Link>
                {v.manufacturer && (
                  <p className="text-xs text-neutral-500">{v.manufacturer}</p>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-6 space-y-5 border-t border-edge pt-5">
          <CompareRow label="Clase">
            {vehicles.map((v) => (
              <span key={v.slug} className="text-sm capitalize text-neutral-900">
                {v.class ? v.class.replace(/-/g, ' ') : '—'}
              </span>
            ))}
          </CompareRow>

          {TEXT_COMPARE_ROWS.map((row) => {
            // Solo el precio tiene una dirección de "mejor" inequívoca
            // (menor USD) — ver comentario en vehicle-compare-best.ts
            // sobre por qué consumo/dimensiones/transmisión/tracción no
            // se destacan (texto libre heterogéneo, sin unidad común).
            // FASE 4: detecta si hay monedas mixtas — si las hay, no
            // compara automáticamente.
            const bestIndices =
              row.key === 'price' && !hasMixedPriceCurrencies(vehicles)
                ? getBestValueIndices(
                    vehicles.map((v) => parsePriceUsd(v)),
                    'min'
                  )
                : new Set<number>()

            return (
              <CompareRow key={row.key} label={row.label}>
                {vehicles.map((v, i) => (
                  <span
                    key={v.slug}
                    className={cn(
                      'inline-flex w-fit items-center gap-1.5 rounded-md text-sm text-neutral-900',
                      bestIndices.has(i) && 'rounded-lg bg-auto-accent/10 px-2 py-1 ring-1 ring-inset ring-auto-accent/40'
                    )}
                  >
                    {v[row.key] || '—'}
                    {bestIndices.has(i) && <BestValueBadge />}
                  </span>
                ))}
              </CompareRow>
            )
          })}

          {PERFORMANCE_ROWS.map((row) => {
            const bestIndices = getBestValueIndices(
              vehicles.map((v) => performanceToScale(v.performance?.[row.key])),
              'max'
            )

            return (
              <CompareRow key={row.key} label={row.label} align="stretch">
                {vehicles.map((v, i) => (
                  <div
                    key={v.slug}
                    className={cn(
                      bestIndices.has(i) && 'rounded-lg bg-auto-accent/10 p-2 ring-1 ring-inset ring-auto-accent/40'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <StatBar label={row.label} value={v.performance?.[row.key]} />
                      {bestIndices.has(i) && <BestValueBadge className="shrink-0" />}
                    </div>
                    {!v.performance?.[row.key] && (
                      <span className="text-xs text-neutral-400">Sin dato</span>
                    )}
                  </div>
                ))}
              </CompareRow>
            )
          })}

          {/* FASE 4: Potencia */}
          <CompareRow label="Potencia">
            {vehicles.map((v) => {
              const hp = parsePowerHp(v)
              return (
                <span key={v.slug} className="text-sm text-neutral-900">
                  {hp ? `${Math.round(hp)} hp` : v.power || '—'}
                </span>
              )
            })}
          </CompareRow>

          {/* FASE 4: Año de lanzamiento */}
          <CompareRow label="Año">
            {vehicles.map((v) => (
              <span key={v.slug} className="text-sm text-neutral-900">
                {v.anoLanzamiento || '—'}
              </span>
            ))}
          </CompareRow>

          {/* FASE 4: Baúl */}
          <CompareRow label="Baúl (l)">
            {vehicles.map((v, i) => {
              const volume = parseTrunkVolume(v)
              const bestIndices = getBestValueIndices(
                vehicles.map((v2) => parseTrunkVolume(v2)),
                'max'
              )
              return (
                <span
                  key={v.slug}
                  className={cn(
                    'inline-flex w-fit items-center gap-1.5 rounded-md text-sm text-neutral-900',
                    bestIndices.has(i) && 'rounded-lg bg-auto-accent/10 px-2 py-1 ring-1 ring-inset ring-auto-accent/40'
                  )}
                >
                  {volume ? `${volume}` : v.baul || '—'}
                  {bestIndices.has(i) && volume && <BestValueBadge />}
                </span>
              )
            })}
          </CompareRow>

          {/* FASE 4: Seguridad */}
          <CompareRow label="Seguridad">
            {vehicles.map((v) => {
              const safetyInfo = getSafetyInfo(v)
              return (
                <span key={v.slug} className="text-sm text-neutral-900">
                  {safetyInfo ? `${safetyInfo.score} ⭐ Euro NCAP` : '—'}
                </span>
              )
            })}
          </CompareRow>
        </div>

        {/* FASE 4: Sección de Equipamiento */}
        {(() => {
          const allEquipment = getAllEquipmentNames(vehicles)
          if (allEquipment.length === 0) return null

          return (
            <div className="mt-8 border-t border-edge pt-6">
              <h3 className="mb-4 text-sm font-semibold text-neutral-900">Equipamiento</h3>
              <div className="space-y-2">
                {allEquipment.map((equipmentName) => (
                  <div key={equipmentName} className="rounded-lg border border-edge bg-surface-card/40 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{equipmentName}</p>
                    <div
                      className="grid gap-3"
                      style={{ gridTemplateColumns: `repeat(${vehicles.length}, minmax(0, 1fr))` }}
                    >
                      {vehicles.map((v) => {
                        const matrix = getVehicleEquipmentMatrix(v, [equipmentName])
                        const status = matrix[0]?.status || 'unknown'
                        const icon =
                          status === 'present' ? '✓' : status === 'absent' ? '✕' : '—'
                        const bgColor =
                          status === 'present'
                            ? 'bg-green-500/10 text-green-600'
                            : status === 'absent'
                              ? 'bg-red-500/10 text-red-600'
                              : 'bg-surface-card text-neutral-500'

                        return (
                          <div
                            key={v.slug}
                            className={cn(
                              'flex items-center justify-center rounded-md py-1.5 text-xs font-semibold',
                              bgColor
                            )}
                          >
                            {icon}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

interface VehicleCompareSheetProps {
  open: boolean
  vehicles: Vehicle[]
  imageBySlug?: Record<string, ResolvedDisplayImage | null>
  onClose: () => void
  onRemove: (slug: string) => void
}

/**
 * Panel de comparación a pantalla completa (overlay): hasta MAX_COMPARE
 * vehículos lado a lado, montado sobre el listado de `/vehiculos` (ver
 * `EntityListExplorer`). Para la comparación como sección propia del
 * sitio (no un overlay temporal) ver `/comparar`, que reutiliza
 * `VehicleCompareTable` directamente embebida en la página.
 */
export function VehicleCompareSheet({ open, vehicles, imageBySlug, onClose, onRemove }: VehicleCompareSheetProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  useModalFocus(open, dialogRef)

  if (!open || vehicles.length === 0) return null

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Comparador de vehículos"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl border border-edge bg-surface-card shadow-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-edge bg-surface-card/95 px-5 py-4 backdrop-blur-md">
          <h2 className="text-lg font-bold text-neutral-900">Comparar vehículos</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar comparador"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-surface-alt hover:text-neutral-900"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          <VehicleCompareTable vehicles={vehicles} imageBySlug={imageBySlug} onRemove={onRemove} />
        </div>
      </div>
    </div>
  )
}

/**
 * Marca visual para la celda con el mejor valor de una fila del
 * comparador (audit2.md sección 16, quick win #13).
 */
function BestValueBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full bg-auto-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white',
        className
      )}
    >
      Mejor
    </span>
  )
}

function CompareRow({
  label,
  align = 'center',
  children,
}: {
  label: string
  align?: 'center' | 'stretch'
  children: ReactNode
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
      <div
        className={cn('grid gap-4', align === 'center' && 'items-center')}
        style={{ gridTemplateColumns: `repeat(${Array.isArray(children) ? children.length : 1}, minmax(0, 1fr))` }}
      >
        {children}
      </div>
    </div>
  )
}
