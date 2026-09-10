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

/** Glifo + color de texto para el micro-label editorial de estado en la
 *  card showroom v3 ("● VERIFICADO", "◆ RESPALDADO") — reemplaza el punto
 *  de color plano por un símbolo con significado propio, coherente con el
 *  lenguaje visual "editorial" pedido (ver rediseño Fase 11). */
const STATUS_SYMBOL: Record<InformationStatus, string> = {
  confirmado: '●',
  rumor: '◇',
  nuestro: '◆',
}

const STATUS_TEXT_CLASS: Record<InformationStatus, string> = {
  confirmado: 'text-emerald-400',
  rumor: 'text-auto-accent-warning',
  nuestro: 'text-auto-accent-orange',
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
  /** Índice de colección para la card showroom de vehículos (ej. "03" o,
   *  con `collectionTotal`, "03 / 35") — puramente decorativo, refuerza la
   *  sensación de catálogo/colección. Opcional y sin efecto en ningún
   *  otro tipo de entidad ni en el layout "row"; si no se pasa, la card
   *  se ve igual que sin este dato. */
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
  collectionIndex,
  collectionTotal,
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
   * CARD "SHOWROOM" — cuarta generación (Fase 12, reset de arquitectura).
   * Las tres versiones anteriores, aun retrato/full-bleed, seguían siendo
   * en el fondo una única columna vertical de texto apilada sobre la
   * foto (marca → modelo → categoría → specs → precio/CTA en fila). Esta
   * versión rompe esa lógica de columna única:
   *
   * - La foto pasa a ocupar prácticamente el 100% del área (el degradado
   *   ahora solo oscurece ~34% inferior, y muy gradualmente, en vez del
   *   ~55-60% de las versiones previas) — el vehículo se ve casi
   *   completo y a color en vez de "apagado" por overlay.
   * - El bloque inferior deja de ser una columna: es una composición de
   *   DOS EJES independientes — marca/modelo/specs ancladas
   *   abajo-izquierda (creciendo hacia arriba, el modelo como elemento
   *   dominante) y precio/CTA ancladas abajo-derecha con un offset
   *   vertical propio (ligeramente más alto), no una fila de tabla
   *   "precio ... CTA" al mismo nivel.
   * - Categoría/año (antes siempre visible como línea secundaria) ahora
   *   es metadata oculta: aparece solo en hover, como una línea que se
   *   desliza sobre la marca. Reduce el ruido permanente de la card sin
   *   perder el dato para quien interactúa.
   * - Specs sin labels ni bloques separados: una sola línea editorial
   *   "280 HP · 1.995 CC · AUTO" bajo el modelo.
   * - Cero caja: se elimina el `ring` que tenían las versiones
   *   anteriores. Nada delimita la card salvo su propio contenido — el
   *   `rounded` + el lift/shadow en hover son la única "estructura".
   * - Favorito: ya no es un botón circular con fondo — se le pasa
   *   `className` a `WishlistButton` para despojarlo de su chip
   *   (border/bg propios de la variante "card", usados en el resto del
   *   sitio) y queda como ícono suelto, semi-invisible hasta hover.
   * - Comparar: pasa de checkbox con label fijo a un signo "+" mínimo
   *   que solo revela "Comparar" en hover (o siempre, si ya está
   *   seleccionado — el estado activo nunca debe quedar oculto).
   * - Estado: único badge siempre visible, como glifo+texto sin pill.
   *   Evidencia/ranking (el "resto" que pedía el brief) queda oculto
   *   hasta hover, ya no compite por atención por defecto.
   *
   * Test de la "regla de oro" (se repite en cada iteración a propósito):
   * con solo FOTO + MARCA + MODELO + PRECIO la card tiene que sostenerse
   * sola — por eso esos cuatro elementos son los únicos con tamaño y
   * contraste fuertes por defecto; todo lo demás es deliberadamente más
   * chico, más tenue, o directamente oculto hasta hover.
   *
   * Solo para vehículos en layout de grilla/compact; `layout="row"`
   * sigue con el markup genérico de abajo (los otros 8 tipos de entidad
   * del sitio, fuera de este pedido).
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

    // Único indicador secundario posible, y ahora vive oculto hasta
    // hover (ver comentario arriba) — el ranking pesa más que el sello
    // de evidencia cuando ambos existen.
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
              'group/card relative flex h-full w-full overflow-hidden rounded-[20px] bg-neutral-950 transition-all duration-[420ms] ease-out',
              'hover:-translate-y-1 hover:shadow-[0_28px_54px_-22px_rgba(0,0,0,0.75)]'
            )}
          >
            {/* CANVAS — la fotografía es prácticamente toda la card.
                Retrato para que el auto se sienta grande en 5 columnas
                sin que la card se vuelva excesivamente alta. */}
            <div
              className={cn('relative w-full', isCompact ? 'aspect-[4/5]' : 'aspect-[3/4]')}
              onMouseEnter={() => setHovering(true)}
              onMouseLeave={() => setHovering(false)}
              style={flipSlug ? ({ viewTransitionName: FLIP_VIEW_TRANSITION_NAME } as CSSProperties) : undefined}
            >
              <div className="absolute inset-0 scale-100 transition-transform duration-[420ms] ease-out group-hover/card:scale-[1.03]">
                <EntityImage entity={entity} image={image} priority={priority} />
              </div>

              {/* Degradado mínimo — solo el ~34% inferior, y muy
                  gradual, para que el auto se vea casi a pleno color.
                  Un segundo velo apenas perceptible arriba, solo para
                  que estado/comparar/favorito tengan contraste sin
                  necesitar chip propio. */}
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(3,3,4,0.88)_0%,rgba(3,3,4,0.5)_14%,rgba(3,3,4,0.14)_26%,rgba(3,3,4,0)_36%)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/30 to-transparent" />

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
                  <span className="absolute right-3 top-11 z-10 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/60 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-0">
                    <MiniIcon name="play" />
                    <span aria-hidden="true">Clip</span>
                  </span>
                </>
              )}

              {/* ESQUINA SUPERIOR IZQUIERDA — índice de colección (si
                  hay) + estado (único badge siempre visible) + a lo
                  sumo un indicador secundario, oculto hasta hover +
                  comparar, oculto hasta hover o si ya está tildado. */}
              <div className="absolute left-3.5 top-3 z-10 flex flex-col items-start gap-1">
                {collectionLabel && (
                  <span className="font-mono text-[9.5px] font-medium tracking-[0.15em] text-white/40 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">
                    {collectionLabel}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]',
                      STATUS_TEXT_CLASS[entity.status]
                    )}
                  >
                    <span aria-hidden="true">{STATUS_SYMBOL[entity.status]}</span>
                    {statusText}
                  </span>
                  {secondaryBadge && (
                    <span
                      className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/0 opacity-0 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)] transition-opacity duration-300 group-hover/card:text-white/55 group-hover/card:opacity-100"
                      title={secondaryBadge.title}
                    >
                      <span aria-hidden="true">{secondaryBadge.icon}</span>
                      {secondaryBadge.label}
                    </span>
                  )}
                </div>
                {compareEnabled && (
                  <label
                    className={cn(
                      'group/compare mt-0.5 inline-flex cursor-pointer items-center gap-1 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]',
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

              {/* ESQUINA SUPERIOR DERECHA — favorito, sin chip propio
                  (se despoja el border/bg de la variante "card" vía
                  className), casi invisible hasta hover. */}
              <div className="absolute right-3 top-3 z-10 opacity-55 transition-opacity duration-200 group-hover/card:opacity-100 [&_svg]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                <WishlistButton
                  type={entity.type}
                  slug={entity.slug}
                  title={entity.title}
                  className="h-6 w-6 border-transparent bg-transparent p-0 text-white backdrop-blur-none hover:border-transparent hover:bg-transparent"
                />
              </div>

              {/* BLOQUE INFERIOR — dos ejes independientes, no una
                  columna: marca/modelo/specs ancla abajo-izquierda,
                  precio/CTA ancla abajo-derecha con offset propio. */}
              <div
                className={cn(
                  'absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3',
                  isCompact ? 'px-3.5 pb-3' : 'px-4 pb-4 sm:px-5 sm:pb-5'
                )}
              >
                {/* EJE IZQUIERDO — marca / modelo / specs */}
                <div className="min-w-0 flex-1">
                  {secondaryLine && (
                    <p className="mb-1 max-h-0 overflow-hidden whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-white/0 opacity-0 transition-all duration-300 ease-out group-hover/card:max-h-4 group-hover/card:text-white/45 group-hover/card:opacity-100">
                      {secondaryLine}
                    </p>
                  )}
                  {brand && (
                    <p className="truncate text-[9.5px] font-semibold uppercase tracking-[0.26em] text-white/50">
                      {brand}
                    </p>
                  )}
                  <h2
                    className={cn(
                      'truncate font-extrabold leading-[0.95] tracking-tight text-white transition-transform duration-[420ms] ease-out group-hover/card:-translate-y-0.5',
                      isCompact ? 'text-lg' : 'text-[1.75rem] sm:text-4xl'
                    )}
                  >
                    {model}
                  </h2>
                  {specsLine && !isCompact && (
                    <p className="mt-1.5 truncate text-[11px] font-semibold tracking-wide text-white/55">
                      {specsLine}
                    </p>
                  )}
                </div>

                {/* EJE DERECHO — precio / CTA, anclado más arriba que
                    el eje izquierdo (offset propio) para romper la
                    lectura en fila única. */}
                <div className={cn('flex shrink-0 flex-col items-end text-right', isCompact ? '' : '-translate-y-1 sm:-translate-y-1.5')}>
                  <span
                    className={cn(
                      'whitespace-nowrap font-extrabold tracking-tight text-auto-accent',
                      isCompact ? 'text-sm' : 'text-lg sm:text-xl'
                    )}
                  >
                    {price ?? '\u00A0'}
                  </span>
                  <span className="mt-1 inline-flex items-center text-white/65 transition-colors duration-200 group-hover/card:text-auto-accent">
                    <span
                      className={cn(
                        'overflow-hidden whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide opacity-0 transition-[max-width,opacity] duration-300 group-hover/card:opacity-100',
                        isCompact ? 'max-w-0' : 'max-w-0 group-hover/card:max-w-[5.5rem]'
                      )}
                    >
                      Ver detalles&nbsp;
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-base font-bold leading-none transition-transform duration-300 group-hover/card:translate-x-0.5"
                    >
                      →
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </article>
        </Link>
      </div>
    )
  }

  return (
    <div className={cn('group', className)}>
      <Link href={`/${entity.type}/${entity.slug}`} prefetch={false}>
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
