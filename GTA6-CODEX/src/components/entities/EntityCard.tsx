'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Entity, EntityType, Trailer } from '@/types'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { EntityImage } from '@/components/entities/EntityImage'
import { ENTITY_TYPE_LABELS } from '@/lib/entity-labels'
import { cn } from '@/lib/utils'

const STATUS_LABELS = {
  confirmado: 'Confirmado',
  rumor: 'Rumor',
  nuestro: 'Nuestro',
} as const

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
 * hasta 2 datos de mayor valor editorial; el resto (GenericEntity) no
 * agrega fila propia acá — ya tiene su ficha técnica data-driven completa
 * en `EntityMetadata`, y listar campos arbitrarios en la card sería ruido.
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

  return []
}

interface EntityCardProps {
  entity: Entity
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
  className?: string
}

/**
 * Card de entidad "premium" reutilizada en todos los listados (`/[type]`)
 * y en la sección de Destacados de home: imagen/clip, badges de estado,
 * datos rápidos por tipo, conteo de relaciones declaradas, y un CTA de
 * cierre siempre visible ("Ver ficha") además de que la card entera ya es
 * un link real a la ficha (Fase 8, punto 3: ningún botón decorativo).
 */
export function EntityCard({ entity, typeLabel, clipUrl, className }: EntityCardProps) {
  const [hovering, setHovering] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const isTrailer = entity.type === EntityType.TRAILER && 'scenes' in entity
  const trailer = isTrailer ? (entity as Trailer) : null
  const quickFacts = getQuickFacts(entity)
  const relationCount = entity.relations?.length ?? 0
  const resolvedTypeLabel = typeLabel ?? ENTITY_TYPE_LABELS[entity.type]

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
    const video = videoRef.current
    if (video) {
      video.pause()
      video.currentTime = 0
    }
  }

  return (
    <Link
      href={`/${entity.type}/${entity.slug}`}
      className={cn('group block h-full', className)}
    >
      <Card hoverable className="flex h-full flex-col overflow-hidden !p-0">
        <div
          className="relative"
          onMouseEnter={clipUrl ? handleEnter : undefined}
          onMouseLeave={clipUrl ? handleLeave : undefined}
        >
          <EntityImage entity={entity} variant="thumbnail" className="rounded-none border-x-0 border-t-0" />

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
                  'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
                  hovering ? 'opacity-100' : 'opacity-0'
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

        <CardBody className="flex flex-1 flex-col gap-3 p-6">
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

          <h2 className="text-xl font-bold text-gta-text transition-colors group-hover:text-gta-accent">
            {entity.title}
          </h2>

          <p className="line-clamp-3 text-sm text-gta-text-secondary">{entity.description}</p>

          {quickFacts.length > 0 && (
            <dl className="flex flex-wrap gap-x-4 gap-y-1 border-t border-gta-border pt-3 text-xs">
              {quickFacts.map((fact) => (
                <div key={fact.label} className="flex items-center gap-1.5">
                  <dt className="text-gta-text-secondary">{fact.label}:</dt>
                  <dd className="truncate font-medium text-gta-text">{fact.value}</dd>
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
            {relationCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-gta-text-secondary">
                <MiniIcon name="link" />
                {relationCount} {relationCount === 1 ? 'conexión' : 'conexiones'}
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
    </Link>
  )
}
