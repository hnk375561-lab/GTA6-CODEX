'use client'

/**
 * ManufacturerCardV2 — mismo reset editorial que VehicleCardV2, aplicado
 * a fabricantes. La card anterior (rama genérica de EntityCard) era un
 * panel UI convencional: logo arriba + panel de texto abajo con badges,
 * dashed divider y grid de datos — exactamente el patrón "database
 * record" que se buscaba eliminar en los vehículos, pero nunca se tocó
 * acá. Este componente aplica la misma filosofía: composición única,
 * logo como protagonista (NUNCA recortado — object-contain, no cover,
 * porque un logo cropeado se rompe visualmente al contrario que una
 * foto de auto), tipografía dominante para el nombre, resto oculto
 * hasta hover.
 *
 * Independiente: no reemplaza EntityCard ni afecta ninguna otra ruta.
 */

import Link from 'next/link'
import Image from 'next/image'
import { Entity, EntityType } from '@/types'
import type { Manufacturer } from '@/types/entity'
import { WishlistButton } from '@/components/ui/WishlistButton'
import { getManufacturerLogoSrc } from '@/lib/manufacturer-logos'
import { STATUS_LABELS } from '@/lib/entity-labels'
import { EVIDENCE_STAMP_META } from '@/lib/evidence'
import { cn } from '@/lib/utils'

const CATEGORY_LABEL: Record<string, string> = {
  automovilista: 'Autos',
  motociclista: 'Motos',
  ambos: 'Autos y motos',
}

/** Glifo lineal mínimo para fabricantes sin logo verificado — mismo
 *  lenguaje de trazo que el resto del sitio (stroke 1.5, sin relleno),
 *  nunca inventa una marca ni usa un logo de stock. */
function ManufacturerGlyph() {
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10 stroke-white/25" fill="none" strokeWidth="1.5" aria-hidden="true">
      <circle cx="24" cy="24" r="17" />
      <path d="M24 7v34M7 24h34" />
    </svg>
  )
}

export interface ManufacturerCardV2Props {
  entity: Entity
  className?: string
  relationCount?: number
}

export function ManufacturerCardV2({ entity, className, relationCount }: ManufacturerCardV2Props) {
  if (entity.type !== EntityType.MANUFACTURER) return null

  const manufacturer = entity as Manufacturer
  const logoSrc = getManufacturerLogoSrc(entity.slug)
  const statusLabel = STATUS_LABELS[entity.status as keyof typeof STATUS_LABELS] ?? entity.status
  const evidenceStamp = entity.evidence ? EVIDENCE_STAMP_META[entity.evidence.level] : undefined
  const categoryLabel = manufacturer.category ? CATEGORY_LABEL[manufacturer.category] : null
  const vehicleCount = relationCount ?? entity.relations?.length ?? 0

  return (
    <div className={cn('group/mv2', className)}>
      <Link
        href={`/${entity.type}/${entity.slug}`}
        prefetch={false}
        className="block h-full rounded-[3px] outline-none focus-visible:ring-2 focus-visible:ring-auto-accent focus-visible:ring-offset-2 focus-visible:ring-offset-auto-darker"
      >
        <article
          className="group/mv2card relative flex aspect-[4/5] w-full flex-col overflow-hidden rounded-[3px] bg-auto-darker"
        >
          {/* PLACA — el logo vive en un "panel de identificación" propio,
              no en un recorte fotográfico: fondo neutro grafito, logo
              centrado a tamaño natural (object-contain), nunca cropeado.
              Ocupa ~62% del alto — deja aire real arriba y abajo del
              logo en vez de estirarlo a full-bleed como si fuera foto. */}
          <div className="relative flex flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent_70%)] px-8 py-6 transition-transform duration-300 ease-out motion-reduce:transition-none group-hover/mv2card:scale-[1.02] motion-reduce:group-hover/mv2card:scale-100">
            {logoSrc ? (
              <div className="relative h-full w-full">
                <Image
                  src={logoSrc}
                  alt={`Logo de ${entity.title}`}
                  fill
                  sizes="(min-width: 1024px) 260px, 40vw"
                  quality={90}
                  className="object-contain"
                />
              </div>
            ) : (
              <ManufacturerGlyph />
            )}
          </div>

          {/* TOP-LEFT — estado, mismo glifo+texto sin pill que VehicleCardV2. */}
          <span className="absolute left-3.5 top-3 z-10 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/60">
            {statusLabel}
          </span>

          {/* TOP-RIGHT — favorito, ícono suelto. */}
          <div className="absolute right-2.5 top-2 z-10 opacity-55 transition-opacity duration-200 group-hover/mv2card:opacity-100">
            <WishlistButton
              type={entity.type}
              slug={entity.slug}
              title={entity.title}
              className="h-6 w-6 border-transparent bg-transparent p-0 text-white backdrop-blur-none hover:border-transparent hover:bg-transparent"
            />
          </div>

          {/* Línea divisoria mínima — el único elemento que separa
              "placa de logo" de "identificación", apenas visible. */}
          <div className="h-px w-full bg-white/[0.06]" aria-hidden="true" />

          {/* BLOQUE INFERIOR — nombre dominante + país/categoría chico +
              conteo de vehículos, mismo peso tipográfico que la card de
              vehículos (marca→modelo se traduce acá en país→nombre). */}
          <div className="relative z-10 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4">
            {manufacturer.country && (
              <p className="truncate text-[9px] font-semibold uppercase tracking-[0.24em] text-white/45">
                {manufacturer.country}
              </p>
            )}
            <h2 className="line-clamp-2 break-words text-xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-[1.35rem]">
              {entity.title}
            </h2>

            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p className="max-h-0 overflow-hidden text-[10px] font-medium text-white/0 opacity-0 transition-all duration-300 ease-out group-hover/mv2card:max-h-4 group-hover/mv2card:text-white/45 group-hover/mv2card:opacity-100">
                {[categoryLabel, evidenceStamp?.shortLabel].filter(Boolean).join(' · ')}
              </p>
              <span className="ml-auto shrink-0 whitespace-nowrap text-[11px] font-semibold text-auto-accent">
                {vehicleCount > 0 ? `${vehicleCount} modelo${vehicleCount === 1 ? '' : 's'}` : '\u00A0'}
              </span>
            </div>
          </div>
        </article>
      </Link>
    </div>
  )
}
