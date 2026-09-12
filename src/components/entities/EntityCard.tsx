'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { Entity, EntityType, InformationStatus, Vehicle } from '@/types'
import { Card, CardBody } from '@/components/ui/Card'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { EntityImage } from '@/components/entities/EntityImage'
import { WishlistButton } from '@/components/ui/WishlistButton'
import type { ResolvedDisplayImage } from '@/lib/images'
import { ENTITY_TYPE_LABELS, STATUS_LABELS } from '@/lib/entity-labels'
import { getGenericQuickFacts } from '@/lib/entity-fields'
import { parsePowerHp } from '@/lib/vehicle-power'
import { EVIDENCE_STAMP_META } from '@/lib/evidence'
import { FLIP_VIEW_TRANSITION_NAME, consumeFlipSlug } from '@/lib/view-transitions'
import { cn } from '@/lib/utils'

const STATUS_SYMBOL: Record<InformationStatus, string> = {
  confirmado: '●',
  rumor: '◇',
  nuestro: '◆',
}

const STATUS_TEXT_CLASS: Record<InformationStatus, string> = {
  confirmado: 'text-archive-green',
  rumor: 'text-oxide-red',
  nuestro: 'text-oxide-red',
}

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

function priceHeadline(vehicle: Vehicle): string | null {
  if (!vehicle.price) return null
  const clean = vehicle.price.split('(')[0].trim()
  return clean || vehicle.price
}

function vehicleShowcaseSpecs(vehicle: Vehicle): Array<{ label: string; value: string }> {
  const specs: Array<{ label: string; value: string }> = []
  const hp = parsePowerHp(vehicle)
  if (hp !== null) specs.push({ label: 'Potencia', value: `${hp} HP` })
  if (vehicle.cilindrada) specs.push({ label: 'Cilindrada', value: vehicle.cilindrada })
  const transmission = shortTransmissionLabel(vehicle.transmision)
  if (transmission) specs.push({ label: 'Caja', value: transmission })
  return specs
}

type MiniIconName =
  | 'clock'
  | 'calendar'
  | 'link'
  | 'play'
  | 'scenes'
  | 'engine'
  | 'power'
  | 'fuel'
  | 'transmission'

const MINI_ICON_NAMES: MiniIconName[] = [
  'clock',
  'calendar',
  'link',
  'play',
  'scenes',
  'engine',
  'power',
  'fuel',
  'transmission',
]

function isMiniIconName(value: string): value is MiniIconName {
  return (MINI_ICON_NAMES as string[]).includes(value)
}

function MiniIcon({ name, className }: { name: MiniIconName; className?: string }) {
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
    className,
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

function getQuickFacts(entity: Entity): Array<{ label: string; value: string; icon?: string }> {
  if (entity.type === EntityType.VEHICLE) {
    const facts: Array<{ label: string; value: string; icon?: string }> = []
    
    if (entity.manufacturer) facts.push({ label: 'Fabricante', value: entity.manufacturer })
    if (entity.class) facts.push({ label: 'Clase', value: entity.class })
    
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
  rankBadge?: {
    position: number
    metricLabel: string
  }
  collectionIndex?: number
  collectionTotal?: number
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
    <label className="flex cursor-pointer items-center gap-2 rounded border border-ink/20 bg-ink/5 px-2 py-1 text-xs transition-colors hover:border-oxide-red/50 hover:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-50">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => onToggle?.()}
        className="h-3.5 w-3.5 cursor-pointer accent-oxide-red disabled:cursor-not-allowed"
        aria-label={`Comparar ${title}`}
      />
      <span className="whitespace-nowrap font-medium text-ink/70">Comparar</span>
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
  collectionIndex,
  collectionTotal,
}: EntityCardProps) {
  const resolvedTypeLabel = typeLabel || ENTITY_TYPE_LABELS[entity.type]
  const quickFacts = getQuickFacts(entity)
  const resolvedRelationCount = relationCount ?? entity.relations?.length ?? 0
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [hovering, setHovering] = useState(false)
  const flipSlug = consumeFlipSlug(entity.slug)

  useEffect(() => {
    if (!videoRef.current || !clipUrl) return
    if (hovering) {
      const playPromise = videoRef.current.play()
      playPromise?.catch(() => {})
    } else {
      videoRef.current.pause()
    }
  }, [hovering, clipUrl])

  const evidenceStamp = entity.evidence ? EVIDENCE_STAMP_META[entity.evidence.level] : undefined

  /**
   * CARD "ARCHIVO" — nueva generación con identidad de documento
   * Metáfora: ficha técnica de archivo, expediente, dossier
   * 
   * - Papel blanco como fondo
   * - Bordes finos tipo documento
   * - Tipografía serif para títulos, mono para datos
   * - Sello de evidencia en esquina
   * - Referencia de archivo (REF: XXX)
   * - Composición editorial, no showroom
   */
  if (entity.type === EntityType.VEHICLE && layout !== 'row') {
    const vehicle = entity as Vehicle
    const { brand, model } = splitVehicleName(vehicle)
    const specs = vehicleShowcaseSpecs(vehicle)
    const specsLine = specs.map((spec) => spec.value).join('  ·  ')
    const year = vehicleYearLabel(vehicle)
    const price = priceHeadline(vehicle)
    const secondaryLine = [vehicle.class, year].filter(Boolean).join(' · ')
    const isCompact = size === 'compact'
    const statusText = STATUS_LABELS[entity.status as keyof typeof STATUS_LABELS] || entity.status
    const collectionLabel =
      typeof collectionIndex === 'number'
        ? collectionTotal
          ? `${String(collectionIndex).padStart(2, '0')} / ${collectionTotal}`
          : String(collectionIndex).padStart(2, '0')
        : null

    const secondaryBadge = rankBadge
      ? { icon: `#${rankBadge.position}`, label: rankBadge.metricLabel, title: rankBadge.metricLabel }
      : evidenceStamp
        ? {
            icon: evidenceStamp.icon,
            label: evidenceStamp.shortLabel,
            title: 'Nivel de evidencia — ver detalle completo en la ficha',
          }
        : null

    return (
      <div className={cn('group', className)}>
        <Link href={`/${entity.type}/${entity.slug}`} prefetch={false} className="block h-full">
          <article
            className={cn(
              'group/card relative flex h-full w-full overflow-hidden bg-surface-card border border-border transition-all duration-300',
              'hover:border-oxide-red/50 hover:shadow-md'
            )}
          >
            {/* CANVAS — la fotografía con aspecto de documento */}
            <div
              className={cn('relative w-full', isCompact ? 'aspect-[4/5]' : 'aspect-[3/4]')}
              onMouseEnter={() => setHovering(true)}
              onMouseLeave={() => setHovering(false)}
              style={flipSlug ? ({ viewTransitionName: FLIP_VIEW_TRANSITION_NAME } as CSSProperties) : undefined}
            >
              <div className="absolute inset-0 transition-transform duration-300 group-hover/card:scale-[1.02]">
                <EntityImage entity={entity} image={image} priority={priority} />
              </div>

              {/* Degradé mínimo para legibilidad */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-ink/30 to-transparent" />

              {/* Clip de video ambient */}
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
                    className="absolute inset-0 h-full w-full object-cover opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"
                  />
                </>
              )}

              {/* REFERENCIA DE ARCHIVO (+ número de colección si la card
                  viene de una tira numerada, ej. FeaturedDossiers — antes
                  se calculaba collectionLabel y no se mostraba en ningún
                  lado) */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                <div className="font-mono text-[9px] uppercase tracking-wider text-ink/40 bg-white/90 backdrop-blur-sm px-2 py-1 border border-border/50">
                  REF: {vehicle.slug.slice(0, 8).toUpperCase()}
                </div>
                {collectionLabel && (
                  <div className="font-mono text-[9px] uppercase tracking-wider text-ink/40 bg-white/90 backdrop-blur-sm px-2 py-1 border border-border/50">
                    {collectionLabel}
                  </div>
                )}
              </div>

              {/* SELLO DE EVIDENCIA */}
              {evidenceStamp && (
                <div className={cn(
                  'absolute top-3 right-3 font-mono text-[9px] uppercase tracking-wider px-2 py-1 border bg-white/90 backdrop-blur-sm',
                  evidenceStamp.className
                )}>
                  <span className="mr-1">{evidenceStamp.icon}</span>
                  {evidenceStamp.shortLabel}
                </div>
              )}

              {/* CONTENIDO INFERIOR */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                {/* Marca y modelo */}
                <div className="space-y-1 mb-3">
                  {brand && (
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink/60">
                      {brand}
                    </p>
                  )}
                  <h3 className="font-serif text-base sm:text-lg font-semibold text-white leading-tight line-clamp-2">
                    {model}
                  </h3>
                  {secondaryLine && (
                    <p className="font-mono text-[10px] text-white/70">
                      {secondaryLine}
                    </p>
                  )}
                </div>

                {/* Specs line */}
                {specsLine && (
                  <p className="font-mono text-[10px] text-ink/70 mb-1">
                    {specsLine}
                  </p>
                )}

                {/* Estado de verificación (confirmado/rumor/nuestro) */}
                <p className={cn('font-mono text-[9px] uppercase tracking-[0.15em] mb-3', STATUS_TEXT_CLASS[entity.status as InformationStatus])}>
                  <span aria-hidden="true">{STATUS_SYMBOL[entity.status as InformationStatus]}</span> {statusText}
                </p>

                {/* Pie de card */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {price && (
                      <p className="font-mono text-xs font-semibold text-white">
                        {price}
                      </p>
                    )}
                    {secondaryBadge && (
                      <span
                        className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-white/30 bg-white/10 text-white"
                        title={secondaryBadge.title}
                      >
                        {secondaryBadge.icon} {secondaryBadge.label}
                      </span>
                    )}
                    {resolvedRelationCount > 0 && (
                      <span
                        className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-white/30 bg-white/10 text-white"
                        title="Cantidad de fichas relacionadas"
                      >
                        {resolvedRelationCount} relacionado{resolvedRelationCount === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Favorito */}
                    <div className="relative">
                      <WishlistButton
                        type={entity.type}
                        slug={entity.slug}
                        title={entity.title}
                        className="text-white/70 hover:text-oxide-red transition-colors"
                      />
                    </div>

                    {/* Comparar */}
                    {compareEnabled && (
                      <CompareCheckbox
                        checked={compareChecked}
                        disabled={compareDisabled}
                        onToggle={onCompareToggle}
                        title={model}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </article>
        </Link>
      </div>
    )
  }

  // Layout genérico para otros tipos de entidad
  return (
    <div className={cn('group', className)}>
      <Link href={`/${entity.type}/${entity.slug}`} prefetch={false} className="block h-full">
        <Card className="h-full border border-border hover:border-oxide-red/50 transition-colors">
          <CardBody className="flex flex-col h-full">
            {image && (
              <div className="relative aspect-video mb-4 overflow-hidden bg-paper border border-border/30">
                <EntityImage entity={entity} image={image} priority={priority} />
              </div>
            )}

            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <CategoryIcon type={entity.type} className="w-4 h-4 text-ink/50" />
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink/50">
                      {resolvedTypeLabel}
                    </span>
                  </div>
                  <h3 className="font-serif text-base font-semibold text-ink leading-tight line-clamp-2">
                    {entity.title}
                  </h3>
                </div>
                {evidenceStamp && (
                  <span
                    className={cn(
                      'font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border shrink-0',
                      evidenceStamp.className
                    )}
                    title="Nivel de evidencia"
                  >
                    {evidenceStamp.icon} {evidenceStamp.shortLabel}
                  </span>
                )}
              </div>

              {quickFacts.length > 0 && (
                <div className="space-y-2">
                  {quickFacts.map((fact, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {fact.icon && isMiniIconName(fact.icon) && (
                        <MiniIcon name={fact.icon} className="text-ink/50 shrink-0" />
                      )}
                      <span className="text-ink/60">{fact.label}:</span>
                      <span className="font-mono text-ink font-medium">{fact.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {dateLabel && (
                <p className="font-mono text-xs text-ink/50">
                  {dateLabel}
                </p>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
              <span className="font-mono text-[9px] text-ink/40">
                REF: {entity.slug.slice(0, 6).toUpperCase()}
              </span>
              <span className="font-mono text-[9px] text-oxide-red uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                Ver ficha →
              </span>
            </div>
          </CardBody>
        </Card>
      </Link>
    </div>
  )
}
