'use client'

import 'leaflet/dist/leaflet.css'
import { Fragment, useMemo, useState } from 'react'
import Link from 'next/link'
import L from 'leaflet'
import { MapContainer, TileLayer, Circle, Marker, Tooltip, Popup, useMapEvents } from 'react-leaflet'
import type { Entity, EntityType } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { STATUS_LABELS } from '@/lib/entity-labels'
import { LEONIDA_ZONES, LEONIDA_ZONES_SOURCE, type LeonidaZone } from '@/lib/leonida-zones'
import { LEONIDA_MAP_VIEW, LEONIDA_ZONE_COORDS, locationPinOffset } from '@/lib/leonida-map-coordinates'

interface LeonidaMapCanvasProps {
  locations: Entity[]
  entityType: EntityType
}

function findLocation(locations: Entity[], slug: string): Entity | undefined {
  return locations.find((loc) => loc.slug === slug)
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max).trimEnd()}…`
}

const pinIcon = (variant: 'default' | 'active') =>
  L.divIcon({
    className: 'leonida-pin',
    html: `<span class="leonida-pin__dot leonida-pin__dot--${variant}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })

/** Cierra el detalle de zona al clickear el mapa fuera de cualquier círculo. */
function MapClickHandler({ onClear }: { onClear: () => void }) {
  useMapEvents({ click: () => onClear() })
  return null
}

export function LeonidaMapCanvas({ locations, entityType }: LeonidaMapCanvasProps) {
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
            Mapa real de Florida usado como referencia — las zonas y posiciones están basadas en la cobertura
            periodística de la filtración CYBERLEEK ({LEONIDA_ZONES_SOURCE.leakDate}), no en un mapa confirmado
            por Rockstar Games ni en coordenadas reales del juego.
          </span>
        </div>

        <div className="leonida-leaflet-wrap overflow-hidden rounded-lg border border-gta-border-strong/60">
          <MapContainer
            center={LEONIDA_MAP_VIEW.center}
            zoom={LEONIDA_MAP_VIEW.zoom}
            minZoom={LEONIDA_MAP_VIEW.minZoom}
            maxZoom={LEONIDA_MAP_VIEW.maxZoom}
            scrollWheelZoom={false}
            style={{ height: '520px', width: '100%', background: '#050308' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <MapClickHandler onClear={() => setActiveZoneId(null)} />

            {LEONIDA_ZONES.map((zone) => {
              const coords = LEONIDA_ZONE_COORDS[zone.id]
              if (!coords) return null
              const isActive = zone.id === activeZoneId
              const isHover = zone.id === hoverZoneId
              const hasLocations = zone.locationSlugs.length > 0
              const zoneLocations = zone.locationSlugs
                .map((slug) => findLocation(locations, slug))
                .filter((loc): loc is Entity => Boolean(loc))

              const color = isActive ? '#ff7ec4' : isHover ? '#ff2f8f' : hasLocations ? '#22d3ee' : '#453163'

              return (
                <Fragment key={zone.id}>
                  <Circle
                    center={coords.center}
                    radius={coords.radiusMeters}
                    pathOptions={{
                      color,
                      weight: isActive ? 2.5 : 1.5,
                      fillColor: color,
                      fillOpacity: isActive ? 0.22 : isHover ? 0.14 : hasLocations ? 0.08 : 0.03,
                      dashArray: hasLocations ? undefined : '6 5',
                    }}
                    eventHandlers={{
                      click: (e) => {
                        L.DomEvent.stopPropagation(e)
                        setActiveZoneId(isActive ? null : zone.id)
                      },
                      mouseover: () => setHoverZoneId(zone.id),
                      mouseout: () => setHoverZoneId((current) => (current === zone.id ? null : current)),
                    }}
                  >
                    <Tooltip direction="center" permanent className="leonida-zone-tooltip" opacity={1}>
                      <span className="leonida-zone-tooltip__row">
                        <span className="leonida-zone-tooltip__name">{zone.leakName}</span>
                        <span className="leonida-zone-tooltip__position">{zone.position}</span>
                      </span>
                      <span
                        className={`leonida-zone-tooltip__status ${
                          hasLocations
                            ? 'leonida-zone-tooltip__status--confirmed'
                            : 'leonida-zone-tooltip__status--unconfirmed'
                        }`}
                      >
                        {hasLocations
                          ? `✓ ${zoneLocations.length} ubicación${zoneLocations.length === 1 ? '' : 'es'} confirmada${zoneLocations.length === 1 ? '' : 's'}`
                          : '⚠ sin ubicaciones confirmadas'}
                      </span>
                    </Tooltip>
                  </Circle>

                  {zoneLocations.map((loc, i) => {
                    const { dLat, dLng } = locationPinOffset(i, zoneLocations.length)
                    const pos: [number, number] = [coords.center[0] + dLat, coords.center[1] + dLng]
                    return (
                      <Marker key={loc.slug} position={pos} icon={pinIcon(isActive ? 'active' : 'default')}>
                        <Tooltip direction="top" offset={[0, -6]}>
                          {loc.title}
                        </Tooltip>
                        <Popup className="leonida-pin-popup" closeButton minWidth={220} maxWidth={260}>
                          <div className="leonida-pin-popup__inner">
                            <div className="leonida-pin-popup__head">
                              <span className="leonida-pin-popup__title">{loc.title}</span>
                              <Badge variant="status" status={loc.status}>
                                {STATUS_LABELS[loc.status as keyof typeof STATUS_LABELS] || loc.status}
                              </Badge>
                            </div>
                            {loc.description && (
                              <p className="leonida-pin-popup__desc">{truncate(loc.description, 150)}</p>
                            )}
                            <Link href={`/${entityType}/${loc.slug}`} className="leonida-pin-popup__link">
                              Ver ficha completa →
                            </Link>
                          </div>
                        </Popup>
                      </Marker>
                    )
                  })}
                </Fragment>
              )
            })}
          </MapContainer>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-2 text-xs text-gta-text-tertiary sm:grid-cols-2">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: 'rgba(34,211,238,0.2)', border: '1.5px solid #22d3ee' }}
            />
            Círculo cian = zona con al menos una ubicación confirmada
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-4 rounded-sm"
              style={{ border: '1.5px dashed #453163' }}
            />
            Círculo gris punteado = zona reportada, sin confirmar todavía
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: 'rgba(255,126,196,0.25)', border: '1.5px solid #ff7ec4' }}
            />
            Círculo rosa = zona seleccionada (mostrando su detalle a la derecha)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-gta-gold" />
            Punto dorado = ubicación catalogada — tocalo para ver un resumen
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-gta-border bg-gta-card p-4 md:p-6">
        {!activeZone ? (
          <div>
            <h3 className="font-display text-lg font-semibold text-gta-text">Ubicaciones sin zona asignada</h3>
            <p className="mt-1 text-sm text-gta-text-secondary">
              Tocá una zona del mapa para ver su detalle. Estas {unzonedLocations.length} ubicaciones del
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
