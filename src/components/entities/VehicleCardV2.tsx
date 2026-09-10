'use client'

/**
 * VehicleCardV2 — reset completo de arquitectura visual (no es una
 * iteración de EntityCard, es un componente nuevo e independiente).
 *
 * Objetivo: poster automotriz editorial, no card de ecommerce/inventario.
 * La fotografía domina la composición; el texto vive DENTRO de ella, no
 * debajo en un panel separado. Jerarquía por defecto: foto → modelo →
 * precio → marca → specs compactos → estado/favorito. Todo lo demás
 * (categoría, año, km, comparar) se revela solo en hover.
 *
 * EntityCard.tsx queda intacto — esta es una vista alternativa que se
 * monta en paralelo en el catálogo hasta aprobación explícita.
 */

import { type CSSProperties } from 'react'
import Link from 'next/link'
import { Entity, EntityType, Vehicle } from '@/types'
import { EntityImage } from '@/components/entities/EntityImage'
import { WishlistButton } from '@/components/ui/WishlistButton'
import type { ResolvedDisplayImage } from '@/lib/images'
import { parsePowerHp } from '@/lib/vehicle-power'
import { cn } from '@/lib/utils'

/** "Audi Q5" → { brand: "Audi", model: "Q5" }. Si el título no arranca con
 *  el fabricante (dato faltante o formato distinto), no inventa marca:
 *  el título completo pasa a ser "modelo". */
function splitVehicleName(vehicle: Vehicle): { brand: string; model: string } {
  const manufacturer = vehicle.manufacturer?.trim()
  const title = vehicle.title?.trim() ?? ''
  if (manufacturer && title.toLowerCase().startsWith(manufacturer.toLowerCase())) {
    const rest = title.slice(manufacturer.length).trim()
    if (rest) return { brand: manufacturer, model: rest }
  }
  return { brand: manufacturer ?? '', model: title }
}

function shortTransmissionLabel(raw?: string | null): string | null {
  if (!raw) return null
  const lower = raw.toLowerCase()
  const isManual = /manual/.test(lower)
  const isAuto = /(automátic|automatic|cvt|dsg|s tronic|doble embrague|dct|secuencial)/.test(lower)
  if (isManual && !isAuto) return 'Manual'
  if (isAuto) return 'Auto'
  return null
}

function vehicleYearLabel(vehicle: Vehicle): string | null {
  if (typeof vehicle.anoLanzamiento === 'number') return String(vehicle.anoLanzamiento)
  if (typeof vehicle.anoLanzamiento === 'string' && /^\d{4}$/.test(vehicle.anoLanzamiento)) {
    return vehicle.anoLanzamiento
  }
  if (vehicle.anoProduccion) {
    const match = /\d{4}/.exec(vehicle.anoProduccion)
    if (match) return match[0]
  }
  return null
}

/** Precio recortado a headline (sin la aclaración entre paréntesis que
 *  trae el campo `price` para la ficha completa). */
function priceHeadline(vehicle: Vehicle): string | null {
  if (!vehicle.price) return null
  const clean = vehicle.price.split('(')[0].trim()
  return clean || vehicle.price
}

/** Máximo 3 valores compactos, sin labels: "280 HP · 1.995 CC · AUTO". */
function compactSpecsLine(vehicle: Vehicle): string | null {
  const parts: string[] = []
  const hp = parsePowerHp(vehicle)
  if (hp !== null) parts.push(`${hp} HP`)
  if (vehicle.cilindrada) parts.push(vehicle.cilindrada)
  const transmission = shortTransmissionLabel(vehicle.transmision)
  if (transmission) parts.push(transmission.toUpperCase())
  if (parts.length === 0) return null
  return parts.slice(0, 3).join('  ·  ')
}

const STATUS_LABEL_V2: Record<string, string> = {
  confirmado: 'Verificado',
  rumor: 'Rumor',
  nuestro: 'Editorial',
}

export interface VehicleCardV2Props {
  entity: Entity
  image?: ResolvedDisplayImage | null
  className?: string
  priority?: boolean
  /** Comparador de vehículos — mismo contrato que EntityCard (ver
   *  EntityListExplorer/VehicleCompareSheet). Si no se pasa, el toggle
   *  simplemente no se renderiza (comportamiento seguro en cualquier
   *  otro caller que no compare, ej. fichas de "similares"). */
  compareEnabled?: boolean
  compareChecked?: boolean
  onCompareToggle?: () => void
  compareDisabled?: boolean
}

export function VehicleCardV2({
  entity,
  image,
  className,
  priority,
  compareEnabled,
  compareChecked,
  onCompareToggle,
  compareDisabled,
}: VehicleCardV2Props) {
  if (entity.type !== EntityType.VEHICLE) return null

  const vehicle = entity as Vehicle
  const { brand, model } = splitVehicleName(vehicle)
  const price = priceHeadline(vehicle)
  const specsLine = compactSpecsLine(vehicle)
  const year = vehicleYearLabel(vehicle)
  const secondaryLine = [vehicle.class, year].filter(Boolean).join(' · ')
  const statusLabel = STATUS_LABEL_V2[entity.status] ?? entity.status

  return (
    <div className={cn('group/v2', className)}>
      <Link
        href={`/${entity.type}/${entity.slug}`}
        prefetch={false}
        className="block h-full rounded-[3px] outline-none focus-visible:ring-2 focus-visible:ring-auto-accent focus-visible:ring-offset-2 focus-visible:ring-offset-auto-darker"
      >
        <article
          className={cn(
            // Casi sin radio, sin borde, sin shadow "flotante" — no debe
            // leerse como componente UI convencional sino como recorte
            // de una página editorial.
            'group/v2card relative flex aspect-[3/4] w-full overflow-hidden rounded-[3px] bg-auto-darker'
          )}
          style={{ aspectRatio: '0.75 / 1' } as CSSProperties}
        >
          {/* FOTOGRAFÍA — ~100% del área. Único elemento con scale en hover.
              `h-full w-full` es necesario: EntityImage fija su propio
              aspect-[16/9] interno (pensado para su card genérica); con
              ambas dimensiones explícitas ese aspect-ratio queda anulado
              (spec CSS: aspect-ratio solo aplica si una dimensión es auto)
              y la foto pasa a llenar realmente el contenedor 3/4 de esta
              card en vez de dejar una franja negra vacía debajo. */}
          <div className="absolute inset-0 scale-100 transition-transform duration-300 ease-out motion-reduce:transition-none group-hover/v2card:scale-[1.03] motion-reduce:group-hover/v2card:scale-100">
            <EntityImage
              entity={entity}
              image={image}
              priority={priority}
              className="h-full w-full !rounded-none !border-0"
            />
          </div>

          {/* Velo inferior — máx. ~28% de alto, muy gradual. El auto se
              ve casi a pleno color; esto es solo para que el texto lea. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-[linear-gradient(to_top,rgba(5,6,7,0.86)_0%,rgba(5,6,7,0.42)_38%,rgba(5,6,7,0)_100%)]" />
          {/* Velo superior mínimo, solo contraste para status/favorito/comparar. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/35 to-transparent" />

          {/* TOP-LEFT — estado (glifo+texto, sin pill) + comparar (si el
              caller lo habilita), mismo patrón visual "+"/"✓" mínimo que
              tenía la card anterior — sin esto, VehicleCompareBar queda
              sin forma de agregar vehículos desde la grilla. */}
          <div className="absolute left-3.5 top-3 z-10 flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/75 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">
              {statusLabel}
            </span>
            {compareEnabled && (
              <label
                className={cn(
                  'group/compare inline-flex cursor-pointer items-center gap-1 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]',
                  compareDisabled && 'cursor-not-allowed opacity-40'
                )}
                onClick={(event) => event.stopPropagation()}
              >
                <span
                  className={cn(
                    'text-[11px] font-bold leading-none transition-colors duration-200',
                    compareChecked ? 'text-auto-accent' : 'text-white/55 group-hover/compare:text-white/85'
                  )}
                  aria-hidden="true"
                >
                  {compareChecked ? '✓' : '+'}
                </span>
                <input
                  type="checkbox"
                  checked={compareChecked}
                  disabled={compareDisabled}
                  onChange={() => onCompareToggle?.()}
                  onClick={(event) => event.stopPropagation()}
                  className="sr-only"
                  aria-label={`Comparar ${entity.title}`}
                />
                <span
                  className={cn(
                    'overflow-hidden whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide transition-[max-width,opacity] duration-200',
                    compareChecked
                      ? 'max-w-[5rem] text-auto-accent opacity-100'
                      : 'max-w-0 text-white/70 opacity-0 group-hover/compare:max-w-[5rem] group-hover/compare:opacity-100'
                  )}
                >
                  Comparar
                </span>
              </label>
            )}
          </div>

          {/* TOP-RIGHT — favorito, ícono suelto sin chip, semi-invisible por defecto. */}
          <div className="absolute right-2.5 top-2 z-10 opacity-60 transition-opacity duration-200 group-hover/v2card:opacity-100 [&_svg]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            <WishlistButton
              type={entity.type}
              slug={entity.slug}
              title={entity.title}
              className="h-6 w-6 border-transparent bg-transparent p-0 text-white backdrop-blur-none hover:border-transparent hover:bg-transparent"
            />
          </div>

          {/* BLOQUE INFERIOR — dos ejes: marca/modelo/specs (izq, crece
              hacia arriba) y precio/flecha (der, offset propio). NO es
              un panel: está anclado directamente sobre la foto. */}
          <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-2 px-3.5 pb-3.5 sm:px-4 sm:pb-4">
            <div className="min-w-0 flex-1">
              {secondaryLine && (
                <p className="mb-0.5 max-h-0 overflow-hidden whitespace-nowrap text-[9.5px] font-medium uppercase tracking-wide text-white/0 opacity-0 transition-all duration-300 ease-out group-hover/v2card:max-h-4 group-hover/v2card:text-white/45 group-hover/v2card:opacity-100">
                  {secondaryLine}
                </p>
              )}
              {brand && (
                <p className="truncate text-[9px] font-semibold uppercase tracking-[0.24em] text-white/50">
                  {brand}
                </p>
              )}
              {/* line-clamp-2 en vez de truncate: un nombre largo ("GLE 450
                  4MATIC Coupé AMG Line") puede envolver a 2 líneas sin
                  romper la composición — truncarlo a 1 línea perdía
                  información real del modelo (brief §24: 2 líneas es
                  aceptable si preservar el nombre completo lo justifica). */}
              <h2 className="line-clamp-2 break-words text-[1.4rem] font-extrabold leading-[1.02] tracking-tight text-white sm:text-[1.7rem]">
                {model}
              </h2>
              {specsLine && (
                <p className="mt-1 truncate text-[10px] font-semibold tracking-wide text-white/55">
                  {specsLine}
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1 text-right -translate-y-0.5">
              {price && (
                <span className="whitespace-nowrap text-sm font-bold tracking-tight text-auto-accent sm:text-base">
                  {price}
                </span>
              )}
              <span
                aria-hidden="true"
                className="text-sm font-bold leading-none text-white/60 transition-transform duration-200 motion-reduce:transition-none group-hover/v2card:translate-x-1 motion-reduce:group-hover/v2card:translate-x-0 group-hover/v2card:text-auto-accent"
              >
                →
              </span>
            </div>
          </div>
        </article>
      </Link>
    </div>
  )
}
