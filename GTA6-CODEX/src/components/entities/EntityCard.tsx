'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Entity, EntityType, Trailer } from '@/types'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { EntityImage } from '@/components/entities/EntityImage'
import type { ResolvedDisplayImage } from '@/lib/images'
import { ENTITY_TYPE_LABELS, STATUS_LABELS } from '@/lib/entity-labels'
import { getGenericQuickFacts } from '@/lib/entity-fields'
import { performanceToScale } from '@/lib/vehicle-performance'
import { EVIDENCE_STAMP_META } from '@/lib/evidence'
import { cn } from '@/lib/utils'

/** Ancho de la mini-barra de rendimiento en la vista de catálogo (fila),
 *  reutilizando la misma escala 1-5 que EntityMetadata/StatBar. */
function statBarWidth(value?: string): string {
  const scale = performanceToScale(value)
  return scale !== null ? `${(scale / 5) * 100}%` : '0%'
}

function formatTrailerDuration(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Un ícono SVG mínimo, lineal, mismo lenguaje que CategoryIcon — no hay
 *  ícono de "reloj/calendario/link" en ese archivo (son solo por categoría),
 *  así que estos quedan acá, locales al card, en vez de agrandar ese
 *  registro con glifos de propósito único. */
function MiniIcon({ name }: { name: 'clock' | 'calendar' | 'link' | 'play' | 'scenes' }) {
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
function getQuickFacts(entity: Entity): Array<{ label: string; value: string }> {
  if (entity.type === EntityType.CHARACTER) {
    const facts: Array<{ label: string; value: string }> = []
    if (entity.faction) facts.push({ label: 'Facción', value: entity.faction })
    if (entity.alias && entity.alias.length > 0) {
      facts.push({ label: 'Alias', value: entity.alias[0] })
    }
    return facts
  }

  if (entity.type === EntityType.VEHICLE) {
    const facts: Array<{ label: string; value: string }> = []
    if (entity.manufacturer) facts.push({ label: 'Fabricante', value: entity.manufacturer })
    if (entity.class) facts.push({ label: 'Clase', value: entity.class })
    return facts
  }

  if (entity.type === EntityType.LOCATION) {
    const facts: Array<{ label: string; value: string }> = []
    if (entity.region) facts.push({ label: 'Región', value: entity.region })
    if (entity.district) facts.push({ label: 'Distrito', value: entity.district })
    return facts
  }

  if (entity.type === EntityType.MISSION) {
    const facts: Array<{ label: string; value: string }> = []
    if (entity.giver) facts.push({ label: 'Encargado por', value: entity.giver })
    if (entity.reward) facts.push({ label: 'Recompensa', value: entity.reward })
    return facts
  }

  // Trailer ya tiene su propio bloque de datos dedicado más abajo en la
  // card (escenas, duración, fecha) — un quick-fact genérico acá sería
  // redundante/ruido, mismo criterio que ya usa `EntityMetadata`.
  if (entity.type === EntityType.TRAILER) return []

  // Resto de tipos (hoy: armas, actividades, organizaciones, negocios,
  // objetos, noticias, guías — los 7 `GenericEntity` sin rama propia
  // arriba): hasta 2 campos data-driven, reutilizando exactamente la
  // misma heurística que ya alimenta la ficha técnica completa en
  // `EntityMetadata`/`GenericEntityMetadata` (ver `lib/entity-fields.ts`).
  // Nunca inventa un dato que no exista ya en el JSON de contenido.
  return getGenericQuickFacts(entity as unknown as Record<string, unknown>, 2)
}

interface EntityCardProps {
  entity: Entity
  /** Imagen ya resuelta por el caller de servidor (ver
   *  `resolveEntityDisplayImage`/`getEntityImageMap` en `@/lib/media.ts`).
   *  `EntityCard` es `'use client'`, así que no puede resolverla por su
   *  cuenta con `fs` — ver el comentario largo en `EntityImage.tsx`. */
  image?: ResolvedDisplayImage | null
  /** Label legible del tipo (ej. "Personajes"). Opcional: si no se pasa,
   *  se resuelve de `ENTITY_TYPE_LABELS` (fuente compartida en
   *  lib/entity-labels.ts) — se deja overrideable por si el caller ya
   *  resolvió su propio label localmente. */
  typeLabel?: string
  /** URL directa (mp4) del clip de presentación, si existe (hoy, solo
   *  algunos personajes — ver CHARACTER_CLIPS en lib/media.ts). Cuando
   *  está presente, la card reproduce el clip en hover como media animada
   *  (punto 6 de Fase 8), sin descargar nada hasta que el usuario
   *  interactúa (punto 14: rendimiento, no todas las cards a la vez). */
  clipUrl?: string | null
  /** Conteo de conexiones a mostrar en el pie de la card. Opcional: si no
   *  se pasa, se usa `entity.relations?.length` (solo relaciones
   *  explícitas, comportamiento previo). El caller server (hoy,
   *  `EntityListExplorer` vía `[entityType]/page.tsx`) puede resolver acá
   *  un conteo que incluye relaciones inferidas/bidireccionales — ver
   *  `getBidirectionalRelationCount` en `lib/relations.ts` — para que la
   *  card sugiera también conexiones que la entidad no declaró ella
   *  misma pero que otras entidades sí declaran hacia ella (Fase 8,
   *  hallazgo [7]). Nunca se inventa un número: sigue siendo 100%
   *  derivado de relaciones reales, solo que en ambas direcciones. */
  relationCount?: number
  className?: string
  /** 'grid' (default) = card actual. 'row' = fila compacta horizontal,
   *  usada solo por la vista "Catálogo" del listado de Vehículos (ver
   *  EntityListExplorer) — mismo componente, sin duplicar lógica de
   *  quick facts/badges/comparación entre ambas vistas. */
  layout?: 'grid' | 'row'
  /** Habilita el checkbox de comparación (solo Vehículos). Si es false u
   *  omitido, el checkbox no se renderiza y la card se comporta como
   *  siempre. */
  compareEnabled?: boolean
  compareChecked?: boolean
  onCompareToggle?: () => void
  /** true cuando ya se alcanzó el máximo de vehículos a comparar y esta
   *  card no está seleccionada — el checkbox se muestra deshabilitado en
   *  vez de ocultarse, para que quede claro por qué no se puede tildar. */
  compareDisabled?: boolean
  /** 'default' = card actual. 'hero' = variante ampliada para la primera
   *  entrada de una sección de Destacados: tipografía más grande,
   *  descripción sin recortar tan corto, franja de datos con más aire.
   *  Solo tiene efecto con `layout="grid"`; el caller controla el ancho
   *  real (col-span) vía `className`, esta prop solo cambia la densidad
   *  interna de contenido. */
  size?: 'default' | 'hero'
  /** Pasado directo a `EntityImage`. Ver el comentario de `priority` en
   *  `EntityImageProps` — solo las primeras cards visibles sin scroll de
   *  una página de listado deberían pasar `true` acá. */
  priority?: boolean
}

/** Checkbox de comparación superpuesto a la card/fila. Detiene la
 *  propagación del click para no disparar la navegación del `<Link>` que
 *  envuelve toda la card. */
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
    <button
      type="button"
      role="checkbox"
      aria-checked={Boolean(checked)}
      aria-label={checked ? `Quitar ${title} del comparador` : `Agregar ${title} al comparador`}
      title={disabled ? 'Máximo 3 vehículos para comparar' : undefined}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onToggle?.()
      }}
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gta-accent',
        checked
          ? 'border-gta-accent bg-gta-accent text-white'
          : 'border-white/25 bg-black/40 text-transparent hover:border-white/50',
        disabled && !checked && 'cursor-not-allowed opacity-40'
      )}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </button>
  )
}

/**
 * Card de entidad "premium" reutilizada en todos los listados (`/[type]`)
 * y en la sección de Destacados de home: imagen/clip, badges de estado,
 * datos rápidos por tipo, conteo de relaciones declaradas, y un CTA de
 * cierre siempre visible ("Ver ficha") además de que la card entera ya es
 * un link real a la ficha (Fase 8, punto 3: ningún botón decorativo).
 */
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
  priority = false,
}: EntityCardProps) {
  const [hovering, setHovering] = useState(false)
  /** Visible en viewport (con margen), independiente del hover — habilita
   *  el clip como "media ambiental" (loop a bajo opacity apenas la card
   *  entra en pantalla), no solo como reacción al mouse. Sigue sin haber
   *  descarga para cards fuera de pantalla: `videoRef.play()` es lo que
   *  dispara la carga real, y solo se llama cuando el IntersectionObserver
   *  confirma que la card está cerca del viewport. */
  const [ambientVisible, setAmbientVisible] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaWrapRef = useRef<HTMLDivElement>(null)
  /** Elemento que recibe la inclinación 3D en hover (mousemove). Separado
   *  del nodo de `Card` (que ya tiene su propia animación CSS de
   *  translateY + glow) para no pisar esa transición existente: acá se
   *  compone un `perspective()+rotateX+rotateY` en un wrapper propio. */
  const tiltRef = useRef<HTMLDivElement>(null)
  const isTrailer = entity.type === EntityType.TRAILER && 'scenes' in entity
  const trailer = isTrailer ? (entity as Trailer) : null
  const quickFacts = getQuickFacts(entity)
  const resolvedRelationCount = relationCount ?? entity.relations?.length ?? 0
  const resolvedTypeLabel = typeLabel ?? ENTITY_TYPE_LABELS[entity.type]
  /** Sello de trazabilidad — mismo dato que EvidenceBlock muestra en la
   *  ficha completa, ahora también visible en el grid (ver lib/evidence.ts
   *  para el razonamiento). `undefined` cuando la entidad no tiene
   *  evidencia cargada (ej. contenido "nuestro"/analítico sin fuente
   *  puntual) — el sello simplemente no se renderiza en ese caso. */
  const evidenceStamp = entity.evidence?.level ? EVIDENCE_STAMP_META[entity.evidence.level] : null

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  // Clip como media ambiental: arranca el loop (mute, sin sonido) apenas la
  // card entra en viewport, con opacity baja hasta que además hay hover.
  // Se pausa al salir de pantalla — evita que una grilla larga de cards con
  // clip mantenga decenas de videos corriendo en simultáneo fuera de vista.
  useEffect(() => {
    if (!clipUrl || reducedMotion) return
    const el = mediaWrapRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        setAmbientVisible(entry.isIntersecting)
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {
            // Igual que en handleEnter: autoplay puede fallar según política
            // del navegador, la card sigue viéndose bien como imagen fija.
          })
        } else {
          videoRef.current?.pause()
        }
      },
      { rootMargin: '200px 0px', threshold: 0.15 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [clipUrl, reducedMotion])

  const handleTiltMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion) return
    const el = tiltRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    // Amplitud chica a propósito (±4°/±3°): la idea es que la card se
    // sienta como un objeto físico que reacciona al cursor, no un efecto
    // de feria — demasiado ángulo lee como gimmick, no como premium.
    const rotateY = (px - 0.5) * 8
    const rotateX = (0.5 - py) * 6
    el.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
  }

  const handleTiltLeave = () => {
    const el = tiltRef.current
    if (el) el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)'
  }

  if (layout === 'row') {
    return (
      <Link href={`/${entity.type}/${entity.slug}`} className={cn('group block', className)}>
        <div className="flex items-center gap-4 rounded-xl border border-gta-border bg-gta-card/90 p-3 shadow-gta-sm backdrop-blur-[2px] transition-colors duration-300 hover:border-gta-accent/60 hover:shadow-gta-md sm:p-4">
          {compareEnabled && (
            <CompareCheckbox
              checked={compareChecked}
              disabled={compareDisabled}
              onToggle={onCompareToggle}
              title={entity.title}
            />
          )}

          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-28">
            <EntityImage entity={entity} image={image} variant="thumbnail" className="h-full rounded-lg border-0" />
            {evidenceStamp && (
              /* Versión "solo ícono" del sello: la fila es angosta (catálogo
                 de vehículos), no hay lugar para el label de texto completo
                 que sí usa la card en grilla — el glifo solo, con el mismo
                 color por nivel, mantiene la señal sin romper el layout. */
              <span
                className={cn(
                  'absolute right-1 top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full border font-mono text-[9px] leading-none backdrop-blur-sm',
                  evidenceStamp.className
                )}
                title={`Evidencia: ${evidenceStamp.shortLabel}`}
                aria-hidden="true"
              >
                {evidenceStamp.icon}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Badge variant="status" status={entity.status}>
                {STATUS_LABELS[entity.status as keyof typeof STATUS_LABELS] || entity.status}
              </Badge>
              {entity.featured && <Badge variant="tag">Destacado</Badge>}
            </div>
            <h2 className="truncate text-base font-bold text-gta-text transition-colors group-hover:text-gta-accent sm:text-lg">
              {entity.title}
            </h2>
            <p className="hidden truncate text-xs text-gta-text-secondary sm:block">{entity.description}</p>
          </div>

          {quickFacts.length > 0 && (
            <dl className="hidden shrink-0 flex-col gap-0.5 text-xs md:flex">
              {quickFacts.map((fact) => (
                <div key={fact.label} className="flex items-center gap-1.5 whitespace-nowrap">
                  <dt className="text-gta-text-secondary">{fact.label}:</dt>
                  <dd className="font-medium text-gta-text">{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {entity.type === EntityType.VEHICLE && entity.performance && (
            <div className="hidden w-32 shrink-0 gap-1 lg:grid">
              {(['speed', 'acceleration', 'handling', 'braking'] as const).map((key) => {
                const value = entity.performance?.[key]
                if (!value) return null
                return (
                  <div key={key} className="h-1 w-full overflow-hidden rounded-full bg-gta-border" title={`${key}: ${value}`}>
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gta-accent to-gta-accent-orange"
                      style={{ width: statBarWidth(value) }}
                    />
                  </div>
                )
              })}
            </div>
          )}

          <span
            aria-hidden="true"
            className="hidden shrink-0 items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gta-accent transition-transform duration-200 group-hover:translate-x-0.5 sm:inline-flex"
          >
            Ver ficha →
          </span>
        </div>
      </Link>
    )
  }

  const handleEnter = () => {
    setHovering(true)
    videoRef.current?.play().catch(() => {
      // Autoplay puede fallar en algunos navegadores/políticas (ej. sin
      // interacción previa del usuario en la página); la card sigue
      // funcionando perfectamente como imagen estática si eso pasa.
    })
  }

  const handleLeave = () => {
    setHovering(false)
    // Si la card sigue en viewport, el clip sigue como media ambiental a
    // baja opacidad (ver IntersectionObserver arriba) — solo se pausa acá
    // si ya salió de pantalla, para no cortar el loop ambiental al mover
    // el mouse dentro de la misma card.
    if (!ambientVisible) {
      const video = videoRef.current
      if (video) {
        video.pause()
        video.currentTime = 0
      }
    }
  }

  return (
    <Link
      href={`/${entity.type}/${entity.slug}`}
      className={cn('group block h-full', className)}
    >
      {/* Wrapper de inclinación 3D: transform propio (perspective + rotateX/Y
          calculado en el mousemove), separado del translateY+glow que ya
          aplica `.card-animated` sobre `Card` — se componen sin pisarse. */}
      <div
        ref={tiltRef}
        onMouseMove={handleTiltMove}
        onMouseLeave={handleTiltLeave}
        className="h-full transition-transform duration-300 ease-out will-change-transform"
      >
        <Card hoverable className={cn('flex h-full flex-col overflow-hidden !p-0', size === 'hero' && 'lg:flex-row')}>
          <div
            ref={mediaWrapRef}
            className={cn('relative', size === 'hero' && 'lg:w-2/5 lg:shrink-0')}
            onMouseEnter={clipUrl ? handleEnter : undefined}
            onMouseLeave={clipUrl ? handleLeave : undefined}
          >
            <EntityImage
              entity={entity}
              image={image}
              variant="thumbnail"
              priority={priority}
              className={cn(
                'rounded-none border-x-0 border-t-0',
                size === 'hero' && 'sm:aspect-[2/1] lg:aspect-auto lg:h-full lg:w-full lg:border-b-0'
              )}
            />

          {/* Pestaña de categoría — lengüeta de separador de carpeta, refuerza
              la lectura "expediente" de la card. Ancla siempre a la misma
              posición (top-0 left-5) para que el grid no "salte" entre
              tarjetas con y sin otros overlays. */}
          <span className="absolute left-5 top-0 z-10 inline-flex items-center gap-1.5 rounded-b-lg border border-t-0 border-gta-border-strong bg-gta-darker px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-gta-text-tertiary transition-colors duration-300 group-hover:border-gta-accent group-hover:text-gta-accent-strong">
            <CategoryIcon type={entity.type} className="h-2.5 w-2.5" />
            {resolvedTypeLabel}
          </span>

          {evidenceStamp && (
            <span
              className={cn(
                'absolute right-3 top-3 z-10 inline-flex -rotate-3 items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wide backdrop-blur-sm transition-transform duration-300 group-hover:rotate-0',
                evidenceStamp.className
              )}
              title="Nivel de evidencia — ver detalle completo en la ficha"
            >
              <span aria-hidden="true">{evidenceStamp.icon}</span>
              {evidenceStamp.shortLabel}
            </span>
          )}

          {compareEnabled && (
            /* top-9 en vez de top-2: deja libre la esquina donde ahora vive
               la pestaña de categoría (left-5 top-0) para que no se solapen
               en la vista grilla de Vehículos. */
            <div className="absolute left-2 top-9 z-10">
              <CompareCheckbox
                checked={compareChecked}
                disabled={compareDisabled}
                onToggle={onCompareToggle}
                title={entity.title}
              />
            </div>
          )}

          {clipUrl && (
            <>
              {/* preload="none": cero descarga hasta que el usuario pasa el
                  mouse — ver handleEnter. No se usa el atributo `autoPlay`
                  a propósito: si cada card con clip lo tuviera, todas las
                  visibles en pantalla arrancarían la descarga del video a
                  la vez (viola el punto 14 de Fase 8). */}
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
                Clip
              </span>
            </>
          )}

          {isTrailer && trailer && (
            <div className="trailer-card-overlay">
              <span className="trailer-card-overlay-chip">
                <MiniIcon name="scenes" />
                {trailer.scenes.length} escenas
              </span>
              {formatTrailerDuration(trailer.durationSeconds) && (
                <span className="trailer-card-overlay-chip">
                  <MiniIcon name="clock" />
                  {formatTrailerDuration(trailer.durationSeconds)}
                </span>
              )}
            </div>
          )}
        </div>

        <CardBody className={cn('flex flex-1 flex-col gap-3', size === 'hero' ? 'p-6 sm:p-8 lg:justify-center' : 'p-6')}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="status" status={entity.status}>
              {STATUS_LABELS[entity.status as keyof typeof STATUS_LABELS] || entity.status}
            </Badge>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gta-text-tertiary">
              <CategoryIcon type={entity.type} className="h-3 w-3" />
              {resolvedTypeLabel}
            </span>
            {entity.featured && <Badge variant="tag">Destacado</Badge>}
          </div>

          <h2 className={cn('font-bold text-gta-text transition-colors group-hover:text-gta-accent', size === 'hero' ? 'text-2xl sm:text-3xl' : 'text-xl')}>
            {entity.title}
          </h2>

          <p className={cn('text-gta-text-secondary', size === 'hero' ? 'line-clamp-4 text-[15px] sm:text-base' : 'line-clamp-3 text-sm')}>
            {entity.description}
          </p>

          {quickFacts.length > 0 && (
            /* "Ficha técnica": borde punteado (formulario/expediente, no un
               simple divisor) + columnas separadas por hairline + valores en
               mono con tabular-nums, mismo lenguaje que EvidenceBlock en la
               ficha completa (Fase "Expediente", punto 1). */
            <dl className="grid grid-flow-col auto-cols-fr divide-x divide-gta-border border-y border-dashed border-gta-border-strong py-2.5">
              {quickFacts.map((fact) => (
                <div key={fact.label} className="min-w-0 px-3 first:pl-0">
                  <dt className="mb-0.5 truncate font-mono text-[9px] uppercase tracking-wide text-gta-text-tertiary">
                    {fact.label}
                  </dt>
                  <dd className="truncate font-mono text-xs font-medium tabular-nums text-gta-text">{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {isTrailer && trailer && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gta-border pt-3 text-xs text-gta-text-secondary">
              <span className="inline-flex items-center gap-1">
                <MiniIcon name="scenes" />
                {trailer.scenes.length} escenas
              </span>
              {formatTrailerDuration(trailer.durationSeconds) && (
                <span className="inline-flex items-center gap-1">
                  <MiniIcon name="clock" />
                  {formatTrailerDuration(trailer.durationSeconds)}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <MiniIcon name="calendar" />
                {new Date(trailer.releaseDate).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-2 border-t border-gta-border pt-3">
            {resolvedRelationCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-gta-text-secondary">
                <MiniIcon name="link" />
                {resolvedRelationCount} {resolvedRelationCount === 1 ? 'conexión' : 'conexiones'}
              </span>
            ) : (
              <span aria-hidden="true" />
            )}
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gta-accent transition-transform duration-200 group-hover:translate-x-0.5">
              Ver ficha
              <span aria-hidden="true">→</span>
            </span>
          </div>
        </CardBody>
        </Card>
      </div>
    </Link>
  )
}
