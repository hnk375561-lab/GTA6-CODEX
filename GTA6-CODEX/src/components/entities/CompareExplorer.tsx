'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import type { Vehicle } from '@/types'
import type { ResolvedDisplayImage } from '@/lib/images'
import { VehicleCompareTable, MAX_COMPARE } from '@/components/entities/VehicleCompareSheet'
import { cn } from '@/lib/utils'

interface CompareExplorerProps {
  vehicles: Vehicle[]
  imageBySlug: Record<string, ResolvedDisplayImage | null>
}

/**
 * Sección standalone `/comparar`: a diferencia del comparador embebido en
 * `/vehiculos` (barra flotante + sheet modal, pensado para comparar
 * mientras se explora el listado filtrado), esta página es un destino en
 * sí mismo — pensada para llegar directo (desde el nav o un link
 * compartido) a comparar hasta MAX_COMPARE vehículos sin pasar por el
 * listado general. Reutiliza `VehicleCompareTable` (la tabla en sí) para
 * no duplicar la lógica de filas/columnas entre ambos lugares.
 *
 * La selección se sincroniza con `?v=slug1,slug2,slug3` en la URL (no
 * debounced: son clicks discretos, no texto) para que la comparación
 * armada se pueda compartir con un link directo — a diferencia del sheet
 * modal, que es estado efímero de sesión sin URL propia.
 */
export function CompareExplorer({ vehicles, imageBySlug }: CompareExplorerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [selected, setSelected] = useState<string[]>(() => {
    const raw = searchParams.get('v')
    if (!raw) return []
    const slugs = raw.split(',').filter(Boolean)
    const validSlugs = new Set(vehicles.map((v) => v.slug))
    return slugs.filter((s) => validSlugs.has(s)).slice(0, MAX_COMPARE)
  })
  const [query, setQuery] = useState('')

  const syncUrl = useCallback(
    (slugs: string[]) => {
      const params = new URLSearchParams(searchParams.toString())
      if (slugs.length > 0) {
        params.set('v', slugs.join(','))
      } else {
        params.delete('v')
      }
      const qs = params.toString()
      router.replace(qs ? `/comparar?${qs}` : '/comparar', { scroll: false })
    },
    [router, searchParams]
  )

  const toggle = (slug: string) => {
    setSelected((prev) => {
      const next = prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : prev.length >= MAX_COMPARE
          ? prev
          : [...prev, slug]
      syncUrl(next)
      return next
    })
  }

  const clear = () => {
    setSelected([])
    syncUrl([])
  }

  const selectedVehicles = useMemo(
    () => selected.map((slug) => vehicles.find((v) => v.slug === slug)).filter((v): v is Vehicle => Boolean(v)),
    [selected, vehicles]
  )

  const filteredVehicles = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return vehicles
    return vehicles.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.manufacturer?.toLowerCase().includes(q) ||
        v.class?.toLowerCase().includes(q)
    )
  }, [vehicles, query])

  return (
    <div className="space-y-10">
      {/* --- Comparación activa --- */}
      <section aria-label="Comparación seleccionada">
        {selectedVehicles.length >= 2 ? (
          <div className="glass-surface rounded-2xl border border-gta-border bg-gta-card p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gta-text">
                Comparando {selectedVehicles.length}/{MAX_COMPARE}
              </h2>
              <button
                type="button"
                onClick={clear}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gta-text-secondary transition-colors hover:text-gta-text"
              >
                Limpiar
              </button>
            </div>
            <VehicleCompareTable vehicles={selectedVehicles} imageBySlug={imageBySlug} onRemove={toggle} />
          </div>
        ) : (
          <div className="glass-surface flex flex-col items-center justify-center rounded-2xl border border-dashed border-gta-border bg-gta-card/60 px-6 py-12 text-center">
            <p className="text-sm font-semibold text-gta-text">
              {selectedVehicles.length === 0
                ? 'Elegí al menos 2 vehículos para comparar'
                : 'Elegí 1 vehículo más para comparar'}
            </p>
            <p className="mt-1 text-xs text-gta-text-secondary">
              Seleccioná hasta {MAX_COMPARE} de la lista de abajo. La comparación se arma acá mismo.
            </p>
            {selectedVehicles.length === 1 && (
              <div className="mt-4 w-full max-w-[180px]">
                <VehiclePickerTile
                  vehicle={selectedVehicles[0]}
                  image={imageBySlug[`vehiculos/${selectedVehicles[0].slug}`]}
                  selected
                  disabled={false}
                  onToggle={() => toggle(selectedVehicles[0].slug)}
                />
              </div>
            )}
          </div>
        )}
      </section>

      {/* --- Selector --- */}
      <section aria-label="Elegir vehículos">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold text-gta-text">
            Todos los vehículos <span className="text-gta-text-tertiary">({filteredVehicles.length})</span>
          </h2>
          <div className="relative w-full sm:w-72">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gta-text-tertiary"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, fabricante o clase…"
              className="w-full rounded-lg border border-gta-border bg-gta-surface py-2 pl-8 pr-3 text-sm text-gta-text placeholder:text-gta-text-tertiary focus:border-gta-accent focus:outline-none"
              aria-label="Buscar vehículos"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredVehicles.map((v) => {
            const isSelected = selected.includes(v.slug)
            const disabled = !isSelected && selected.length >= MAX_COMPARE
            return (
              <VehiclePickerTile
                key={v.slug}
                vehicle={v}
                image={imageBySlug[`vehiculos/${v.slug}`]}
                selected={isSelected}
                disabled={disabled}
                onToggle={() => toggle(v.slug)}
              />
            )
          })}
        </div>

        {filteredVehicles.length === 0 && (
          <p className="py-10 text-center text-sm text-gta-text-secondary">
            Sin resultados para &ldquo;{query}&rdquo;.
          </p>
        )}
      </section>
    </div>
  )
}

function VehiclePickerTile({
  vehicle,
  image,
  selected,
  disabled,
  onToggle,
}: {
  vehicle: Vehicle
  image?: ResolvedDisplayImage | null
  selected: boolean
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-gta-surface text-left transition-all',
        selected
          ? 'border-gta-accent shadow-glow-pink'
          : 'border-gta-border hover:border-gta-accent/60',
        disabled && 'cursor-not-allowed opacity-40 hover:border-gta-border'
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gta-dark">
        {image?.src ? (
          <Image
            src={image.src}
            alt={vehicle.title}
            fill
            sizes="(min-width: 1024px) 200px, 40vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-gta-text-tertiary">
            Sin imagen
          </div>
        )}
        <div
          className={cn(
            'absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border text-white transition-colors',
            selected ? 'border-gta-accent bg-gta-accent' : 'border-white/30 bg-black/50'
          )}
          aria-hidden="true"
        >
          {selected && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </div>
      </div>
      <div className="p-2">
        <p className="line-clamp-1 text-xs font-semibold text-gta-text">{vehicle.title}</p>
        {vehicle.manufacturer && (
          <p className="line-clamp-1 text-[10px] text-gta-text-secondary">{vehicle.manufacturer}</p>
        )}
      </div>
    </button>
  )
}
