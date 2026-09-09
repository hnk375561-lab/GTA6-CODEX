'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { Entity, EntityType, InformationStatus, Vehicle } from '@/types'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { EntityImage } from '@/components/entities/EntityImage'
import { WishlistButton } from '@/components/ui/WishlistButton'
import type { ResolvedDisplayImage } from '@/lib/images'
import { ENTITY_TYPE_LABELS, STATUS_LABELS } from '@/lib/entity-labels'
import { getGenericQuickFacts } from '@/lib/entity-fields'
import { performanceToScale } from '@/lib/vehicle-performance'
import { parsePowerHp } from '@/lib/vehicle-power'
import { EVIDENCE_STAMP_META } from '@/lib/evidence'
import { FLIP_VIEW_TRANSITION_NAME, consumeFlipSlug } from '@/lib/view-transitions'
import { cn } from '@/lib/utils'

/** Color del punto de estado en la card "showroom" de vehículos — mismo
 *  mapeo semántico que `Badge` (`statusStyles`), pero como punto de 2px
 *  en vez de pill, para que el estado deje de competir visualmente con
 *  la foto (ver rediseño Fase 9: "CONFIRMADO" pasa de pill grande a
 *  indicador chico). */
const STATUS_DOT_CLASS: Record<InformationStatus, string> = {
  confirmado: 'bg-emerald-400',
  rumor: 'bg-auto-accent-warning',
  nuestro: 'bg-auto-accent-orange',
}

/** Separa "Audi Q5" en marca ("Audi") + modelo ("Q5") para la
 *  presentación tipográfica de la card showroom: la marca chica en
 *  mayúsculas, el modelo grande como elemento principal. Si el título no
 *  arranca con el fabricante (dato faltante o formato distinto), cae a
 *  mostrar el título completo como "modelo" sin línea de marca — nunca
 *  inventa una marca que el contenido no declara. */
function splitVehicleName(vehicle: Vehicle): { brand: string; model: string } {
  const manufacturer = vehicle.manufacturer?.trim()
  const title = vehicle.title?.trim() ?? ''
  if (manufacturer && title.toLowerCase().startsWith(manufacturer.toLowerCase())) {
    const rest = title.slice(manufacturer.length).trim()
    if (rest) return { brand: manufacturer, model: rest }
  }
  return { brand: manufacturer ?? '', model: title }
}

/** Clasifica el texto libre de `transmision` (ej. "Automática S tronic de
 *  doble embrague (7 velocidades)") en la etiqueta corta que necesita una
 *  métrica de card ("Auto"/"Manual"). Devuelve `null` en vez de adivinar
 *  cuando el texto no da una señal clara — mejor omitir el dato que
 *  mostrar una clasificación potencialmente errónea. */
function shortTransmissionLabel(raw?: string | null): string | null {
  if (!raw) return null
  const lower = raw.toLowerCase()
  const isManual = /manual/.test(lower)
  const isAuto = /(automátic|automatic|cvt|dsg|s tronic|doble embrague|dct|secuencial)/.test(lower)
  if (isManual && !isAuto) return 'Manual'
  if (isAuto) return 'Auto'
  return null
}

/** Año de lanzamiento/producción para la línea secundaria de la card
 *  ("SUV mediano premium · 2024"). Prioriza `anoLanzamiento` (ya viene
 *  como año puntual); si no está, intenta extraer un año de 4 dígitos de
 *  `anoProduccion` (texto libre tipo "2024-presente"). Nunca inventa un
 *  año si ninguno de los dos campos lo tiene. */
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

/** Versión corta del precio para la card: el campo `price` suele traer
 *  una aclaración entre paréntesis (ej. "USD 86.700 (Precio de
 *  referencia mercado argentino)") pensada para la ficha completa, no
 *  para una card compacta. Se recorta esa aclaración para la
 *  presentación "showroom" — el precio completo sigue intacto en la
 *  ficha del vehículo, esto es solo de display. */
function priceHeadline(vehicle: Vehicle): string | null {
  if (!vehicle.price) return null
  const clean = vehicle.price.split('(')[0].trim()
  return clean || vehicle.price
}

/** Métricas compactas (valor grande + label chico) para la franja
 *  inferior de la card showroom. Solo incluye lo que el vehículo
 *  realmente tiene cargado — potencia via `parsePowerHp` (mismo parser
 *  que ya usa el sitio para filtros/rankings), cilindrada tal cual está
 *  en el contenido (nunca se convierte a litros: no hay dato confiable
 *  para esa conversión en todo el catálogo) y caja de cambios solo
 *  cuando `shortTransmissionLabel` puede clasificarla con confianza. */
function vehicleShowcaseSpecs(vehicle: Vehicle): Array<{ label: string; value: string }> {
  const specs: Array<{ label: string; value: string }> = []
  const hp = parsePowerHp(vehicle)
  if (hp !== null) specs.push({ label: 'Potencia', value: `${hp} HP` })
  if (vehicle.cilindrada) specs.push({ label: 'Cilindrada', value: vehicle.cilindrada })
  const transmission = shortTransmissionLabel(vehicle.transmision)
  if (transmission) specs.push({ label: 'Caja', value: transmission })
  return specs
}

/** Ancho de la mini-barra de rendimiento en la vista de catálogo (fila),
 *  reutilizando la misma escala 1-5 que EntityMetadata/StatBar. */
function statBarWidth(value?: string): string {
  const scale = performanceToScale(value)
  return scale !== null ? `${(scale / 5) * 100}%` : '0%'
}

/** Un ícono SVG mínimo, lineal, mismo lenguaje que CategoryIcon — no hay
 *  ícono de "reloj/calendario/link" en ese archivo (son solo por categoría),
 *  así que estos quedan acá, locales al card, en vez de agrandar ese
 *  registro con glifos de propósito único. */
function MiniIcon({ name }: { name: 'clock' | 'calendar' | 'link' | 'play' | 'scenes' | 'engine' | 'power' | 'fuel' | 'transmission' }) {
  const common = {
    width: 12,
    height: 12,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  switch (name) {
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3.2 2" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="4" y="4.5" width="16" height="15" rx="1.4" />
          <path d="M7.5 8.5h6M7.5 11.5h9" />
        </svg>
      )
    case 'link':
      return (
        <svg {...common}>
          <path d="M9.5 14.5 14.5 9.5" />
          <path d="M11 7.5l1.3-1.3a3 3 0 0 1 4.3 4.3L15 12" />
          <path d="M13 16.5l-1.3 1.3a3 3 0 0 1-4.3-4.3L9 12" />
        </svg>
      )
    case 'scenes':
      return (
        <svg {...common}>
          <rect x="3.5" y="5.5" width="17" height="13" rx="1.6" />
          <path d="M9.7 9.3v5.4l4.6-2.7-4.6-2.7Z" />
        </svg>
      )
    case 'play':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M8 5v14l11-7z" />
        </svg>
      )
    case 'engine':
      return (
        <svg {...common}>
          <path d="M8 6h8v5h-8z" />
          <rect x="4" y="11" width="16" height="2" />
          <circle cx="6" cy="14" r="1" />
          <circle cx="18" cy="14" r="1" />
          <path d="M12 6v-2M12 17v2" />
        </svg>
      )
    case 'power':
      return (
        <svg {...common}>
          <path d="M12 2v6M4.93 4.93l4.24 4.24M19.07 4.93l-4.24 4.24" />
          <circle cx="12" cy="14" r="7" fill="none" />
          <path d="M12 11v3" />
        </svg>
      )
    case 'fuel':
      return (
        <svg {...common}>
          <path d="M7 10v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7M9 4h6v3H9z" />
          <path d="M12 9v5" />
        </svg>
      )
    case 'transmission':
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="2" />
          <circle cx="17" cy="7" r="2" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
          <path d="M9 7h6M7 9v6M17 9v6M9 17h6" />
        </svg>
      )
  }
}

/**
 * Datos rápidos específicos por tipo de entidad, derivados únicamente de
 * campos que ya existen en el contenido (nunca se inventa nada — Fase 8,
 * punto 10). Cada tipo con contrato TS propio (`types/entity.ts`) obtiene
 * hasta 2 datos de mayor valor editorial mediante una rama dedicada;
 * Trailer no agrega fila propia acá (ya tiene su bloque de escenas/
 * duración/fecha); el resto (GenericEntity: armas, actividades,
 * organizaciones, negocios, objetos, noticias, guías) obtiene hasta 2
 * campos data-driven vía `getGenericQuickFacts` (ver `lib/entity-fields.ts`),
 * la misma heurística que ya alimenta su ficha técnica completa en
 * `EntityMetadata` — así la card ya no queda sin ningún dato visible para
 * esos 7 tipos (Fase 8, etapa A).
 */
function getQuickFacts(entity: Entity): Array<{ label: string; value: string; icon?: string }> {
  if (entity.type === EntityType.VEHICLE) {
    const facts: Array<{ label: string; value: string; icon?: string }> = []
    
    // Datos técnicos con iconos para vehículos
    if (entity.manufacturer) facts.push({ label: 'Fabricante', value: entity.manufacturer })
    if (entity.class) facts.push({ label: 'Clase', value: entity.class })
    
    // Agregar campos adicionales si existen (engine, power, fuel, transmission)
    const customData = entity as unknown as Record<string, unknown>
    if (customData.engine) {
      facts.push({ 
        label: 'Motor', 
        value: String(customData.engine),
        icon: 'engine'
      })
    }
    if (customData.power || customData.hp) {
      facts.push({ 
        label: 'Potencia', 
        value: `${customData.power || customData.hp} HP`,
        icon: 'power'
      })
    }
    if (customData.fuel) {
      facts.push({ 
        label: 'Combustible', 
        value: String(customData.fuel),
        icon: 'fuel'
      })
    }
    if (customData.transmission) {
      facts.push({ 
        label: 'Transmisión', 
        value: String(customData.transmission),
        icon: 'transmission'
      })
    }
    
    return facts
  }

  // Resto de tipos (hoy: noticias, guías — `GenericEntity` sin rama propia
  // arriba): hasta 2 campos data-driven, reutilizando exactamente la
  // misma heurística que ya alimenta la ficha técnica completa en
  // `EntityMetadata`/`GenericEntityMetadata` (ver `lib/entity-fields.ts`).
  // Nunca inventa un dato que no exista ya en el JSON de contenido.
  return getGenericQuickFacts(entity as unknown as Record<string, unknown>, 2)
}

interface EntityCardProps {
  entity: Entity
  image?: ResolvedDisplayImage | null
  typeLabel?: string
  clipUrl?: string | null
  relationCount?: number
  className?: string
  layout?: 'grid' | 'row'
  compareEnabled?: boolean
  compareChecked?: boolean
  onCompareToggle?: () => void
  compareDisabled?: boolean
  size?: 'default' | 'hero' | 'compact'
  priority?: boolean
  dateLabel?: string | null
  /** Sello de posición para grillas de ranking (`/rankings/[slug]`,
   *  `RankingsLeaderboardTabs`) — ej. "#1 · 0-100 km/h". Opcional: el
   *  resto de las grillas del sitio no lo pasa y la card se ve igual
   *  que antes. */
  rankBadge?: {
    position: number
    metricLabel: string
  }
}

function CompareCheckbox({
  checked,
  disabled,
  onToggle,
  title,
}: {
  checked?: boolean
  disabled?: boolean
  onToggle?: () => void
  title: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded border border-neutral-500/40 bg-neutral-900/70 px-2 py-1 text-xs backdrop-blur-sm transition-colors hover:border-auto-accent/60 hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => onToggle?.()}
        className="h-3.5 w-3.5 cursor-pointer accent-auto-accent disabled:cursor-not-allowed"
        aria-label={`Comparar ${title}`}
      />
      <span className="whitespace-nowrap font-medium text-neutral-300">Comparar</span>
    </label>
  )
}

export function EntityCard({
  entity,
  image,
  typeLabel,
  clipUrl,
  relationCount,
  className,
  layout = 'grid',
  compareEnabled,
  compareChecked,
  onCompareToggle,
  compareDisabled,
  size = 'default',
  priority,
  dateLabel,
  rankBadge,
}: EntityCardProps) {
  const resolvedTypeLabel = typeLabel || ENTITY_TYPE_LABELS[entity.type]
  const quickFacts = getQuickFacts(entity)
  const resolvedRelationCount = relationCount ?? entity.relations?.length ?? 0
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [hovering, setHovering] = useState(false)
  const [ambientVisible] = useState(true)
  const flipSlug = consumeFlipSlug(entity.slug)

  useEffect(() => {
    if (!videoRef.current || !clipUrl) return
    if (hovering) {
      const playPromise = videoRef.current.play()
      playPromise?.catch(() => {
        // Autoplay throttled or blocked by browser, expected
      })
    } else {
      videoRef.current.pause()
    }
  }, [hovering, clipUrl])

  const evidenceStamp = entity.evidence ? EVIDENCE_STAMP_META[entity.evidence.level] : undefined

  /**
   * CARD "SHOWROOM" — rediseño radical (Fase 9). Solo para vehículos en
   * layout de grilla/compact; `layout="row"` (filas de lista/comparación)
   * sigue con el markup genérico de abajo, que sirve a los otros 8 tipos
   * de entidad del sitio y no forma parte de este pedido. Arquitectura
   * completamente distinta a la card genérica: la foto es el contenedor
   * principal (occupies ~62% via aspect-[4/5], edge-to-edge, sin Card/
   * CardBody), marca+modelo se superponen sobre el gradiente inferior de
   * la foto en vez de vivir en un bloque de texto separado, y la franja
   * inferior es mínima (specs + precio), no una "ficha técnica".
   */
  if (entity.type === EntityType.VEHICLE && layout !== 'row') {
    const vehicle = entity as Vehicle
    const { brand, model } = splitVehicleName(vehicle)
    const specs = vehicleShowcaseSpecs(vehicle)
    const year = vehicleYearLabel(vehicle)
    const price = priceHeadline(vehicle)
    const secondaryLine = [vehicle.class, year].filter(Boolean).join(' · ')
    const isCompact = size === 'compact'
    const statusText = STATUS_LABELS[entity.status as keyof typeof STATUS_LABELS] || entity.status

    return (
      <div className={cn('group', className)}>
        <Link href={`/${entity.type}/${entity.slug}`} className="block h-full">
          <article
            className={cn(
              'group/card relative flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-800/70 bg-[#111316] transition-all duration-300 ease-out',
              'hover:-translate-y-1 hover:border-auto-accent/50 hover:shadow-[0_28px_56px_-20px_rgba(0,0,0,0.7)]'
            )}
          >
            {/* FOTO — edge-to-edge, domina la card (~62% de la altura) */}
            <div
              className="relative aspect-[4/5] w-full shrink-0 overflow-hidden bg-neutral-950"
              onMouseEnter={() => setHovering(true)}
              onMouseLeave={() => setHovering(false)}
              style={flipSlug ? ({ viewTransitionName: FLIP_VIEW_TRANSITION_NAME } as CSSProperties) : undefined}
            >
              <div className="absolute inset-0 transition-transform duration-[320ms] ease-out group-hover/card:scale-[1.07]">
                <EntityImage entity={entity} image={image} priority={priority} />
              </div>

              {/* Gradiente cinematográfico — único gradiente permitido,
                  de transparente a negro, para poder leer texto encima
                  sin ningún tratamiento decorativo de color. */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
              {/* Capa de hover, muy sutil */}
              <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover/card:bg-black/15" />

              {/* Esquina superior izquierda: estado + evidencia + ranking */}
              <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-neutral-200 backdrop-blur-sm">
                  <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT_CLASS[entity.status])} aria-hidden="true" />
                  {statusText}
                </span>
                {evidenceStamp && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-auto-accent/30 bg-auto-accent/15 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-auto-accent backdrop-blur-sm"
                    title="Nivel de evidencia — ver detalle completo en la ficha"
                  >
                    <span aria-hidden="true">{evidenceStamp.icon}</span>
                    {evidenceStamp.shortLabel}
                  </span>
                )}
                {rankBadge && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-auto-accent/40 bg-neutral-900/85 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-auto-accent backdrop-blur-sm">
                    #{rankBadge.position} · {rankBadge.metricLabel}
                  </span>
                )}
                {compareEnabled && (
                  <CompareCheckbox
                    checked={compareChecked}
                    disabled={compareDisabled}
                    onToggle={onCompareToggle}
                    title={entity.title}
                  />
                )}
              </div>

              {/* Esquina superior derecha: favorito — circular, chico,
                  acción secundaria de marketplace premium. */}
              <div className="absolute right-3 top-3 z-10">
                <WishlistButton type={entity.type} slug={entity.slug} title={entity.title} />
              </div>

              {/* Clip de video ambient (sin cambios funcionales) */}
              {clipUrl && (
                <>
                  <video
                    ref={videoRef}
                    src={clipUrl}
                    muted
                    loop
                    playsInline
                    preload="none"
                    aria-hidden="true"
                    tabIndex={-1}
                    className={cn(
                      'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
                      hovering ? 'opacity-100' : ambientVisible ? 'opacity-35' : 'opacity-0'
                    )}
                  />
                  <span className="absolute right-3 top-14 z-10 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-0">
                    <MiniIcon name="play" />
                    <span aria-hidden="true">Clip</span>
                  </span>
                </>
              )}

              {/* Marca + modelo, superpuestos sobre el gradiente — el
                  elemento tipográfico principal de la card, no un
                  <h2> de dashboard debajo de la foto. */}
              <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-3">
                {brand && (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-300/90">
                    {brand}
                  </p>
                )}
                <h2
                  className={cn(
                    'font-bold leading-[1.05] tracking-tight text-white transition-colors group-hover/card:text-auto-accent',
                    isCompact ? 'text-lg' : 'text-2xl sm:text-[1.7rem]'
                  )}
                >
                  {model}
                </h2>
              </div>
            </div>

            {/* SUPERFICIE DE INFORMACIÓN — mínima, ~38% de la card */}
            <div className={cn('flex flex-1 flex-col gap-2.5', isCompact ? 'px-3.5 pb-3.5 pt-2.5' : 'px-4 pb-4 pt-3')}>
              {secondaryLine && (
                <p className="truncate text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  {secondaryLine}
                </p>
              )}

              {specs.length > 0 && (
                <div className="flex items-center gap-4 border-y border-neutral-800/70 py-2">
                  {specs.map((spec) => (
                    <div key={spec.label} className="flex flex-col">
                      <span className="text-sm font-bold tabular-nums text-neutral-100">{spec.value}</span>
                      <span className="text-[8.5px] font-semibold uppercase tracking-wide text-neutral-500">
                        {spec.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-auto flex items-center justify-between gap-2 pt-0.5">
                {price ? (
                  <span className="text-[15px] font-extrabold tracking-tight text-auto-accent">{price}</span>
                ) : (
                  <span aria-hidden="true" />
                )}
                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 transition-colors duration-200 group-hover/card:text-auto-accent">
                  Ver detalles
                  <span aria-hidden="true" className="transition-transform duration-200 group-hover/card:translate-x-0.5">
                    →
                  </span>
                </span>
              </div>
            </div>
          </article>
        </Link>
      </div>
    )
  }

  return (
    <div className={cn('group', className)}>
      <Link href={`/${entity.type}/${entity.slug}`}>
        <Card hoverable={!layout || layout === 'grid'} className={cn(layout === 'row' && 'flex-row')}>
          {/* IMAGE SECTION - Prominente, 40-45% del ancho en grid */}
          <div
            className={cn(
              'relative overflow-hidden bg-neutral-950',
              layout === 'row'
                ? 'h-24 w-32 flex-shrink-0' // Imagen compacta en row layout
                : size === 'hero'
                  ? 'aspect-video' // Hero: más alto
                  : size === 'compact'
                    ? 'aspect-square' // Compact: cuadrado
                    : 'aspect-[4/3]' // Default: 40-45% de height
            )}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            style={
              flipSlug
                ? ({ viewTransitionName: FLIP_VIEW_TRANSITION_NAME } as CSSProperties)
                : undefined
            }
          >
            {/* Zoom suave en hover */}
            <div className={cn(
              'h-full w-full transition-transform duration-300 group-hover/card:scale-105',
              'origin-center'
            )}>
              <EntityImage
                entity={entity}
                image={image}
                priority={priority}
              />
            </div>

            {/* Category Tab - esquina superior izquierda */}
            <div className="absolute left-0 top-0 z-10">
              <div className="inline-flex items-center gap-1 rounded-br-lg bg-neutral-900/80 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-300 backdrop-blur-sm border border-neutral-700/40">
                <CategoryIcon type={entity.type} className="h-3 w-3" />
                {resolvedTypeLabel}
              </div>
            </div>

            {/* Rank Badge - posición del ranking (solo grillas de /rankings).
                Esquina inferior izquierda: la superior ya tiene el Category
                Tab (izq) y el Evidence Stamp (der), y la inferior derecha
                tiene el WishlistButton — este es el único cuadrante libre. */}
            {rankBadge && (
              <div
                className="absolute bottom-3 left-3 z-10 flex flex-col items-start gap-0.5 rounded-lg border border-auto-accent/40 bg-neutral-900/85 px-2.5 py-1.5 backdrop-blur-sm"
                title={rankBadge.metricLabel}
              >
                <span className="text-sm font-extrabold leading-none text-auto-accent">
                  #{rankBadge.position}
                </span>
                <span className="max-w-[7rem] truncate text-[9px] font-semibold uppercase tracking-wide text-neutral-400">
                  {rankBadge.metricLabel}
                </span>
              </div>
            )}

            {/* Evidence Stamp */}
            {evidenceStamp && (
              <span
                className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-auto-accent/30 bg-auto-accent/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-auto-accent backdrop-blur-sm"
                title="Nivel de evidencia — ver detalle completo en la ficha"
              >
                <span aria-hidden="true">{evidenceStamp.icon}</span>
                {evidenceStamp.shortLabel}
              </span>
            )}

            {/* Compare Checkbox */}
            {compareEnabled && (
              <div className="absolute left-2 top-14 z-10">
                <CompareCheckbox
                  checked={compareChecked}
                  disabled={compareDisabled}
                  onToggle={onCompareToggle}
                  title={entity.title}
                />
              </div>
            )}

            {/* Wishlist Button - esquina inferior derecha */}
            <div className="absolute bottom-3 right-3 z-10">
              <WishlistButton type={entity.type} slug={entity.slug} title={entity.title} />
            </div>

            {/* Video Clip */}
            {clipUrl && (
              <>
                <video
                  ref={videoRef}
                  src={clipUrl}
                  muted
                  loop
                  playsInline
                  preload="none"
                  aria-hidden="true"
                  tabIndex={-1}
                  className={cn(
                    'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
                    hovering ? 'opacity-100' : ambientVisible ? 'opacity-35' : 'opacity-0'
                  )}
                />
                <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-0">
                  <MiniIcon name="play" />
                  <span aria-hidden="true">Clip</span>
                </span>
              </>
            )}
          </div>

          {/* CONTENT SECTION */}
          <CardBody
            className={cn(
              'flex flex-1 flex-col',
              layout === 'row'
                ? 'gap-1.5 p-3'
                : size === 'hero'
                  ? 'gap-3 p-6 sm:p-8 lg:justify-center'
                  : size === 'compact'
                    ? 'gap-1.5 p-3.5'
                    : 'gap-4 p-5'
            )}
          >
            {/* BADGES - Estado pequeño y elegante */}
            {layout !== 'row' && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="status" status={entity.status} className="text-[10px]">
                  {STATUS_LABELS[entity.status as keyof typeof STATUS_LABELS] || entity.status}
                </Badge>
                {size !== 'compact' && entity.featured && (
                  <Badge variant="tag" className="text-[10px]">Destacado</Badge>
                )}
              </div>
            )}

            {/* TITLE - Jerárquicamente principal */}
            <h2
              className={cn(
                'font-bold text-neutral-100 transition-colors group-hover/card:text-auto-accent',
                layout === 'row'
                  ? 'text-sm leading-tight'
                  : size === 'hero'
                    ? 'text-2xl sm:text-3xl'
                    : size === 'compact'
                      ? 'text-sm leading-snug'
                      : 'text-lg leading-snug'
              )}
            >
              {entity.title}
            </h2>

            {/* DATE (para noticias) */}
            {dateLabel && size !== 'compact' && layout !== 'row' && (
              <p className="flex items-center gap-1 text-xs text-neutral-500">
                <MiniIcon name="calendar" />
                {dateLabel}
              </p>
            )}

            {/* DESCRIPTION */}
            {size !== 'compact' && layout !== 'row' && (
              <p
                className={cn(
                  'text-neutral-400',
                  size === 'hero'
                    ? 'line-clamp-4 text-[15px] sm:text-base'
                    : entity.type === EntityType.NEWS
                      ? 'line-clamp-2 text-sm'
                      : 'line-clamp-2 text-sm'
                )}
              >
                {entity.description}
              </p>
            )}

            {/* Generic specs for non-vehicles */}
            {entity.type !== EntityType.VEHICLE && quickFacts.length > 0 && size !== 'compact' && (
              <dl className={cn(
                'grid auto-cols-fr divide-x divide-edge-strong text-xs',
                layout === 'row' ? 'grid-flow-col' : 'grid-flow-col border-t border-dashed border-edge-strong py-2'
              )}>
                {quickFacts.map((fact) => (
                  <div key={fact.label} className="px-3 first:pl-0">
                    <dt className="truncate font-mono text-[9px] uppercase tracking-wide text-neutral-500">
                      {fact.label}
                    </dt>
                    <dd className="truncate font-mono text-xs font-medium tabular-nums text-neutral-300">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {/* FOOTER - Conexiones + CTA */}
            <div className={cn(
              'mt-auto flex items-center justify-between gap-2',
              layout !== 'row' && size !== 'compact' && 'border-t border-edge/30 pt-3'
            )}>
              {resolvedRelationCount > 0 && layout !== 'row' && size !== 'compact' ? (
                <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                  <MiniIcon name="link" />
                  {resolvedRelationCount}
                </span>
              ) : (
                <span aria-hidden="true" />
              )}
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 font-semibold uppercase tracking-wide text-auto-accent transition-transform duration-200 group-hover/card:translate-x-0.5',
                  layout === 'row' ? 'text-[10px]' : size === 'compact' ? 'text-[11px]' : 'text-xs'
                )}
              >
                {layout === 'row' ? 'Ver →' : 'Ver vehículo →'}
                <span aria-hidden="true" />
              </span>
            </div>
          </CardBody>
        </Card>
      </Link>
    </div>
  )
}
