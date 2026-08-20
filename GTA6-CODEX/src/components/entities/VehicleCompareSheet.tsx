'use client'

import { useEffect, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Vehicle } from '@/types'
import type { ResolvedDisplayImage } from '@/lib/images'
import { StatBar } from '@/components/entities/StatBar'
import { cn } from '@/lib/utils'

export const MAX_COMPARE = 3

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
      <div className="glass-surface flex w-full max-w-2xl flex-wrap items-center gap-3 rounded-2xl border border-gta-border bg-gta-card/95 p-3 shadow-gta-md backdrop-blur-md sm:gap-4 sm:p-4">
        <div className="flex flex-1 items-center gap-2">
          {selected.map((v) => {
            const img = imageBySlug?.[`vehiculos/${v.slug}`]
            return (
              <div key={v.slug} className="group relative">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-gta-border bg-gta-surface sm:h-12 sm:w-12">
                  {img?.src ? (
                    <Image src={img.src} alt={v.title} width={48} height={48} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[9px] font-semibold uppercase text-gta-text-tertiary">
                      {v.title.slice(0, 2)}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(v.slug)}
                  aria-label={`Quitar ${v.title} de la comparación`}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-gta-border bg-gta-dark text-gta-text-secondary opacity-0 transition-opacity hover:text-gta-accent group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })}
          <span className="ml-1 text-xs text-gta-text-secondary">
            {selected.length}/{MAX_COMPARE} seleccionados
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-gta-text-secondary transition-colors hover:text-gta-text"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={onOpen}
            disabled={selected.length < 2}
            className="rounded-lg bg-gta-accent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-glow-pink transition-transform disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none enabled:hover:scale-[1.03]"
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

interface VehicleCompareTableProps {
  vehicles: Vehicle[]
  imageBySlug?: Record<string, ResolvedDisplayImage | null>
  onRemove?: (slug: string) => void
}

/**
 * Contenido puro de la comparación: fotos + nombre + filas alineadas por
 * atributo (clase, personalizable, 4 métricas de rendimiento, conducido
 * por). Extraído de `VehicleCompareSheet` para poder reutilizarlo tanto
 * en el panel modal (sobre el listado de `/vehiculos`) como en la página
 * standalone `/comparar` — mismo componente, dos contenedores distintos
 * (overlay vs. sección de página normal). `onRemove` es opcional: si no
 * se pasa, no se muestra el botón de quitar por vehículo (ej. si el
 * caller prefiere manejar la remoción desde otro lugar de su UI).
 */
export function VehicleCompareTable({ vehicles, imageBySlug, onRemove }: VehicleCompareTableProps) {
  if (vehicles.length === 0) return null

  return (
    <div>
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${vehicles.length}, minmax(0, 1fr))` }}
      >
        {vehicles.map((v) => {
          const img = imageBySlug?.[`vehiculos/${v.slug}`]
          return (
            <div key={v.slug} className="flex flex-col">
              <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-xl border border-gta-border bg-gta-surface">
                {img?.src ? (
                  <Image
                    src={img.src}
                    alt={v.title}
                    fill
                    sizes={`(min-width: 1024px) calc((min(100vw, 1280px) - 200px) / ${vehicles.length}), calc((100vw - 48px) / ${vehicles.length})`}
                    quality={95}
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gta-text-tertiary">
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
                className="mb-1 line-clamp-2 text-sm font-bold text-gta-text transition-colors hover:text-gta-accent"
              >
                {v.title}
              </Link>
              {v.manufacturer && (
                <p className="text-xs text-gta-text-secondary">{v.manufacturer}</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 space-y-5 border-t border-gta-border pt-5">
        <CompareRow label="Clase">
          {vehicles.map((v) => (
            <span key={v.slug} className="text-sm capitalize text-gta-text">
              {v.class ? v.class.replace(/-/g, ' ') : '—'}
            </span>
          ))}
        </CompareRow>

        <CompareRow label="Personalizable">
          {vehicles.map((v) => (
            <span key={v.slug} className="text-sm text-gta-text">
              {v.customizable ? 'Sí' : v.customizable === false ? 'No' : '—'}
            </span>
          ))}
        </CompareRow>

        {PERFORMANCE_ROWS.map((row) => (
          <CompareRow key={row.key} label={row.label} align="stretch">
            {vehicles.map((v) => (
              <div key={v.slug}>
                <StatBar label={row.label} value={v.performance?.[row.key]} />
                {!v.performance?.[row.key] && (
                  <span className="text-xs text-gta-text-tertiary">Sin dato</span>
                )}
              </div>
            ))}
          </CompareRow>
        ))}

        <CompareRow label="Conducido por">
          {vehicles.map((v) => (
            <span key={v.slug} className="text-sm text-gta-text">
              {v.driven_by && v.driven_by.length > 0 ? v.driven_by.join(', ') : '—'}
            </span>
          ))}
        </CompareRow>
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

  if (!open || vehicles.length === 0) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-gta-dark/80 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Comparador de vehículos"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl border border-gta-border bg-gta-card shadow-gta-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gta-border bg-gta-card/95 px-5 py-4 backdrop-blur-md">
          <h2 className="text-lg font-bold text-gta-text">Comparar vehículos</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar comparador"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gta-text-secondary transition-colors hover:bg-gta-surface-elevated hover:text-gta-text"
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
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gta-text-tertiary">{label}</p>
      <div
        className={cn('grid gap-4', align === 'center' && 'items-center')}
        style={{ gridTemplateColumns: `repeat(${Array.isArray(children) ? children.length : 1}, minmax(0, 1fr))` }}
      >
        {children}
      </div>
    </div>
  )
}
