'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Entity, EntityType } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import {
  LEONIDA_ZONES,
  LEONIDA_ZONES_SOURCE,
  LEONIDA_COASTLINE,
  LEONIDA_KEYS_ISLANDS,
  type LeonidaZone,
} from '@/lib/leonida-zones'

interface LeonidaMapExplorerProps {
  /** Todas las entidades de tipo `ubicaciones`, para resolver título/slug de cada pin. */
  locations: Entity[]
  entityType: EntityType
}

function findLocation(locations: Entity[], slug: string): Entity | undefined {
  return locations.find((loc) => loc.slug === slug)
}

/** Dispersa los pines de una zona alrededor de su `pinAnchor` en un pequeño arco, para que no se apilen. */
function pinOffset(index: number, total: number): { dx: number; dy: number } {
  if (total <= 1) return { dx: 0, dy: 0 }
  const spread = Math.min(total * 10, 34)
  const angle = (index / (total - 1)) * Math.PI - Math.PI / 2
  return { dx: Math.cos(angle) * spread, dy: Math.sin(angle) * (spread * 0.5) }
}

export function LeonidaMapExplorer({ locations, entityType }: LeonidaMapExplorerProps) {
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null)
  const [hoverZoneId, setHoverZoneId] = useState<string | null>(null)

  const zonedSlugs = useMemo(() => new Set(LEONIDA_ZONES.flatMap((z) => z.locationSlugs)), [])
  const unzonedLocations = useMemo(
    () => locations.filter((loc) => !zonedSlugs.has(loc.slug)),
    [locations, zonedSlugs]
  )

  const activeZone: LeonidaZone | null = activeZoneId
    ? LEONIDA_ZONES.find((z) => z.id === activeZoneId) ?? null
    : null

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="relative overflow-hidden rounded-xl border border-gta-border bg-gta-card p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-start gap-2 rounded-lg border border-gta-accent-warning/25 bg-gta-accent-warning/10 px-3 py-2.5 text-xs leading-relaxed text-gta-accent-warning">
          <span aria-hidden="true" className="mt-0.5">
            ⚠
          </span>
          <span>
            Diagrama esquemático no oficial, dibujado por este sitio — no es una copia del archivo filtrado.
            Zonas y posiciones basadas en la cobertura periodística de la filtración CYBERLEEK (
            {LEONIDA_ZONES_SOURCE.leakDate}), no en un mapa confirmado por Rockstar Games.
          </span>
        </div>

        <svg
          viewBox="0 0 480 420"
          className="w-full drop-shadow-[0_0_60px_rgba(255,47,143,0.08)]"
          role="img"
          aria-label="Mapa esquemático no oficial de Leonida por condados"
        >
          <defs>
            <radialGradient id="leonida-ocean" cx="30%" cy="20%" r="90%">
              <stop offset="0%" stopColor="#1b1430" />
              <stop offset="100%" stopColor="#050308" />
            </radialGradient>
            <linearGradient id="leonida-land" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#211a38" />
              <stop offset="100%" stopColor="#160f26" />
            </linearGradient>
            <filter id="leonida-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect x="0" y="0" width="480" height="420" rx="16" fill="url(#leonida-ocean)" />

          {/* Textura de agua sutil, mismo lenguaje que GridPattern del resto del sitio */}
          <g opacity="0.12" stroke="#ff2f8f" strokeWidth="0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <path key={i} d={`M0,${i * 42} H480`} />
            ))}
          </g>

          {/* Silueta de tierra + halo, para que el contorno se sienta "real" y no un recorte plano */}
          <path d={LEONIDA_COASTLINE} fill="url(#leonida-land)" stroke="none" filter="url(#leonida-glow)" />
          <path d={LEONIDA_COASTLINE} fill="none" stroke="#453163" strokeWidth="1.5" />

          {LEONIDA_KEYS_ISLANDS.map((island, i) => (
            <ellipse
              key={i}
              cx={island.cx}
              cy={island.cy}
              rx={island.rx}
              ry={island.ry}
              fill="url(#leonida-land)"
              stroke="#453163"
              strokeWidth="1"
            />
          ))}

          {LEONIDA_ZONES.map((zone) => {
            const isActive = zone.id === activeZoneId
            const isHover = zone.id === hoverZoneId
            const hasLocations = zone.locationSlugs.length > 0
            const zoneLocations = zone.locationSlugs
              .map((slug) => findLocation(locations, slug))
              .filter((loc): loc is Entity => Boolean(loc))

            return (
              <g key={zone.id}>
                <path
                  d={zone.path}
                  className={cn(
                    'cursor-pointer transition-[fill,stroke] duration-200',
                    isActive
                      ? 'fill-gta-accent/25 stroke-gta-accent-strong'
                      : isHover
                        ? 'fill-gta-accent/12 stroke-gta-accent/50'
                        : hasLocations
                          ? 'fill-gta-accent-orange/8 stroke-gta-accent-orange/35'
                          : 'fill-transparent stroke-gta-border-strong/70'
                  )}
                  strokeWidth={isActive ? 2 : 1.25}
                  strokeDasharray={hasLocations ? undefined : '5 4'}
                  strokeLinejoin="round"
                  onClick={() => setActiveZoneId(isActive ? null : zone.id)}
                  onMouseEnter={() => setHoverZoneId(zone.id)}
                  onMouseLeave={() => setHoverZoneId((current) => (current === zone.id ? null : current))}
                />

                {/* Chip de label, en vez de texto flotando directo sobre el fill */}
                <g className="pointer-events-none">
                  <rect
                    x={zone.labelPoint.x - zone.leakName.length * 3.1}
                    y={zone.labelPoint.y - 11}
                    width={zone.leakName.length * 6.2}
                    height="18"
                    rx="9"
                    className={cn(
                      'transition-colors duration-200',
                      isActive || isHover ? 'fill-gta-darker/90' : 'fill-gta-darker/70'
                    )}
                    stroke={isActive ? 'var(--c-pink)' : 'transparent'}
                    strokeWidth="1"
                  />
                  <text
                    x={zone.labelPoint.x}
                    y={zone.labelPoint.y + 3}
                    textAnchor="middle"
                    className={cn(
                      'select-none font-display text-[10.5px] font-semibold',
                      isActive ? 'fill-gta-accent-strong' : 'fill-gta-text'
                    )}
                  >
                    {zone.leakName}
                  </text>
                </g>

                {/* Pines de ubicaciones ya catalogadas dentro de la zona */}
                {zoneLocations.map((loc, i) => {
                  const { dx, dy } = pinOffset(i, zoneLocations.length)
                  const cx = zone.pinAnchor.x + dx
                  const cy = zone.pinAnchor.y + dy
                  return (
                    <g key={loc.slug} className="pointer-events-none">
                      <circle cx={cx} cy={cy} r="3.5" className="fill-gta-gold" stroke="#050308" strokeWidth="1" />
                    </g>
                  )
                })}
              </g>
            )
          })}
        </svg>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gta-text-tertiary">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-gta-accent-orange/50 bg-gta-accent-orange/20" />
            Zona con al menos una ubicación confirmada
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded-sm border border-dashed border-gta-border-strong" />
            Zona sin ubicaciones confirmadas todavía
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-gta-gold" />
            Ubicación catalogada
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-gta-border bg-gta-card p-4 md:p-6">
        {!activeZone ? (
          <div>
            <h3 className="font-display text-lg font-semibold text-gta-text">Ubicaciones sin zona asignada</h3>
            <p className="mt-1 text-sm text-gta-text-secondary">
              Tocá una zona del diagrama para ver su detalle. Estas {unzonedLocations.length} ubicaciones del
              catálogo no tienen todavía un dato confirmado que las sitúe en alguna de las 5 zonas reportadas.
            </p>
            <ul className="mt-4 space-y-2">
              {unzonedLocations.map((loc) => (
                <li key={loc.slug}>
                  <Link
                    href={`/${entityType}/${loc.slug}`}
                    className="text-sm text-gta-text transition-colors hover:text-gta-accent-strong"
                  >
                    {loc.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-gta-text">{activeZone.leakName}</h3>
              <Badge variant="default">{activeZone.position}</Badge>
            </div>
            <p className="text-sm text-gta-text-secondary">{activeZone.description}</p>

            <div className="mt-4 rounded-lg border border-gta-border bg-gta-darker/60 p-3 text-xs text-gta-text-tertiary">
              {activeZone.sourceNote}
            </div>

            <h4 className="mt-4 text-sm font-semibold text-gta-text">Ubicaciones catalogadas en esta zona</h4>
            {activeZone.locationSlugs.length === 0 ? (
              <p className="mt-1 text-sm text-gta-text-secondary">
                Ninguna todavía — sin dato oficial confirmado que ubique alguna ficha del catálogo acá.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {activeZone.locationSlugs.map((slug) => {
                  const loc = findLocation(locations, slug)
                  if (!loc) return null
                  return (
                    <li key={slug} className="flex items-center gap-2">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-gta-gold" aria-hidden="true" />
                      <Link
                        href={`/${entityType}/${slug}`}
                        className="text-sm text-gta-text transition-colors hover:text-gta-accent-strong"
                      >
                        {loc.title}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}

            <button
              type="button"
              onClick={() => setActiveZoneId(null)}
              className="mt-4 text-xs font-semibold text-gta-accent-orange transition-colors hover:text-gta-accent-strong"
            >
              ← Ver ubicaciones sin zona asignada
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
