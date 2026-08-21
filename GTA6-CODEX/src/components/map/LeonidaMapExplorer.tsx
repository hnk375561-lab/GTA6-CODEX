'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Entity, EntityType } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { LEONIDA_ZONES, LEONIDA_ZONES_SOURCE, type LeonidaZone } from '@/lib/leonida-zones'

interface LeonidaMapExplorerProps {
  /** Todas las entidades de tipo `ubicaciones`, para resolver título/slug/evidencia de cada pin. */
  locations: Entity[]
  entityType: EntityType
}

function findLocation(locations: Entity[], slug: string): Entity | undefined {
  return locations.find((loc) => loc.slug === slug)
}

export function LeonidaMapExplorer({ locations, entityType }: LeonidaMapExplorerProps) {
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null)

  const zonedSlugs = useMemo(
    () => new Set(LEONIDA_ZONES.flatMap((z) => z.locationSlugs)),
    []
  )
  const unzonedLocations = useMemo(
    () => locations.filter((loc) => !zonedSlugs.has(loc.slug)),
    [locations, zonedSlugs]
  )

  const activeZone: LeonidaZone | null = activeZoneId
    ? LEONIDA_ZONES.find((z) => z.id === activeZoneId) ?? null
    : null

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-xl border border-gta-border bg-gta-card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-gta-accent-warning/25 bg-gta-accent-warning/10 px-3 py-2 text-xs text-gta-accent-warning">
          <span aria-hidden="true">⚠</span>
          <span>
            Mapa esquemático no oficial. Zonas y posiciones basadas en cobertura periodística de la filtración
            CYBERLEEK ({LEONIDA_ZONES_SOURCE.leakDate}), no en un mapa confirmado por Rockstar Games.
          </span>
        </div>

        <svg viewBox="0 0 400 300" className="w-full" role="img" aria-label="Mapa esquemático no oficial de Leonida por condados">
          <rect x="0" y="0" width="400" height="300" fill="var(--tw-color-gta-darker, #050308)" rx="12" />
          {LEONIDA_ZONES.map((zone) => {
            const isActive = zone.id === activeZoneId
            const hasLocations = zone.locationSlugs.length > 0
            return (
              <g key={zone.id}>
                <path
                  d={zone.path}
                  className={cn(
                    'cursor-pointer transition-colors duration-150',
                    isActive
                      ? 'fill-gta-accent/25 stroke-gta-accent'
                      : hasLocations
                        ? 'fill-gta-accent-orange/10 stroke-gta-accent-orange/40 hover:fill-gta-accent-orange/20'
                        : 'fill-gta-surface-elevated/60 stroke-gta-border hover:fill-gta-surface-elevated'
                  )}
                  strokeWidth={isActive ? 2 : 1}
                  strokeDasharray={hasLocations ? undefined : '4 3'}
                  onClick={() => setActiveZoneId(isActive ? null : zone.id)}
                />
                <text
                  x={zone.labelPoint.x}
                  y={zone.labelPoint.y}
                  textAnchor="middle"
                  className={cn(
                    'pointer-events-none select-none font-display text-[11px] font-semibold',
                    isActive ? 'fill-gta-accent-strong' : 'fill-gta-text-secondary'
                  )}
                >
                  {zone.leakName}
                </text>
              </g>
            )
          })}
        </svg>

        <p className="mt-3 text-xs text-gta-text-tertiary">
          Bordes sólidos: al menos una ubicación catalogada tiene un dato confirmado que la ubica en esa zona.
          Bordes punteados: zona sin ninguna ubicación del catálogo confirmada todavía. Tocá una zona para ver el
          detalle.
        </p>
      </div>

      <div className="rounded-xl border border-gta-border bg-gta-card p-4">
        {!activeZone ? (
          <div>
            <h3 className="font-display text-lg font-semibold text-gta-text">Ubicaciones sin zona asignada</h3>
            <p className="mt-1 text-sm text-gta-text-secondary">
              Elegí una zona del diagrama para ver su detalle. Estas {unzonedLocations.length} ubicaciones del
              catálogo no tienen todavía un dato confirmado que las sitúe en alguna de las 5 zonas reportadas.
            </p>
            <ul className="mt-4 space-y-2">
              {unzonedLocations.map((loc) => (
                <li key={loc.slug}>
                  <Link
                    href={`/${entityType}/${loc.slug}`}
                    className="text-sm text-gta-text hover:text-gta-accent-strong"
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
                    <li key={slug}>
                      <Link
                        href={`/${entityType}/${slug}`}
                        className="text-sm text-gta-text hover:text-gta-accent-strong"
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
              className="mt-4 text-xs font-semibold text-gta-accent-orange hover:text-gta-accent-strong"
            >
              ← Ver ubicaciones sin zona asignada
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
