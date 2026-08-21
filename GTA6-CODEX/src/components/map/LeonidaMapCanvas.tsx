'use client'

import 'leaflet/dist/leaflet.css'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import L from 'leaflet'
import { MapContainer, TileLayer, Circle, Marker, Tooltip, Popup, useMap, useMapEvents } from 'react-leaflet'
import type { Entity, EntityType } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { STATUS_LABELS } from '@/lib/entity-labels'
import { LEONIDA_ZONES, LEONIDA_ZONES_SOURCE, type LeonidaZone } from '@/lib/leonida-zones'
import {
  LEONIDA_MAP_VIEW,
  LEONIDA_UNZONED_HOLDING,
  LEONIDA_ZONE_COORDS,
  LEONIDA_ZONE_FLY_ZOOM,
  getLeonidaFullMapBounds,
  locationPinOffset,
} from '@/lib/leonida-map-coordinates'

/** Id "virtual" para el área de espera de ubicaciones sin zona — no es una de las 5 zonas reportadas. */
const UNZONED_HOLDING_ID = '__unzoned__'

interface LeonidaMapCanvasProps {
  locations: Entity[]
  entityType: EntityType
}

interface MapControls {
  recenter: () => void
  flyToZone: (zoneId: string) => void
}

function findLocation(locations: Entity[], slug: string): Entity | undefined {
  return locations.find((loc) => loc.slug === slug)
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max).trimEnd()}…`
}

const pinIcon = (variant: 'default' | 'active' | 'unzoned') =>
  L.divIcon({
    className: 'leonida-pin',
    html: `<span class="leonida-pin__dot leonida-pin__dot--${variant}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })

const FULL_BOUNDS = getLeonidaFullMapBounds()
const FULL_LATLNG_BOUNDS: L.LatLngBoundsExpression = [
  [FULL_BOUNDS.south, FULL_BOUNDS.west],
  [FULL_BOUNDS.north, FULL_BOUNDS.east],
]

/** Cierra el detalle de zona al clickear el mapa fuera de cualquier círculo. */
function MapClickHandler({ onClear }: { onClear: () => void }) {
  useMapEvents({ click: () => onClear() })
  return null
}

/**
 * Encuadra automáticamente las 5 zonas al montar el mapa (sin depender de un
 * zoom fijo que se amontona en pantallas chicas) y vuelve a ajustar el
 * tamaño del mapa cuando cambia el layout (por ejemplo al rotar el celular,
 * o al entrar/salir de pantalla completa). También expone al padre, vía
 * `onReady`, la función de recentrado y la de "volar" hacia una zona puntual
 * (usada por el buscador y por los chips de zona).
 */
function MapBoundsController({ onReady }: { onReady: (controls: MapControls) => void }) {
  const map = useMap()

  useEffect(() => {
    const recenter = () => {
      map.fitBounds(FULL_LATLNG_BOUNDS, { padding: [24, 24] })
    }
    const flyToZone = (zoneId: string) => {
      const coords = zoneId === UNZONED_HOLDING_ID ? LEONIDA_UNZONED_HOLDING : LEONIDA_ZONE_COORDS[zoneId]
      if (!coords) return
      map.flyTo(coords.center, LEONIDA_ZONE_FLY_ZOOM, { duration: 0.8 })
    }

    recenter()
    onReady({ recenter, flyToZone })

    const handleResize = () => {
      map.invalidateSize()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  return null
}

/** Vuelve a calcular el tamaño del mapa cuando cambia entre modo normal y pantalla completa. */
function MapResizeOnFullscreen({ isFullscreen }: { isFullscreen: boolean }) {
  const map = useMap()
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 260)
    return () => window.clearTimeout(id)
  }, [isFullscreen, map])
  return null
}

export function LeonidaMapCanvas({ locations, entityType }: LeonidaMapCanvasProps) {
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null)
  const [hoverZoneId, setHoverZoneId] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const controlsRef = useRef<MapControls | null>(null)

  const zoneByLocationSlug = useMemo(() => {
    const map = new Map<string, LeonidaZone>()
    for (const zone of LEONIDA_ZONES) {
      for (const slug of zone.locationSlugs) map.set(slug, zone)
    }
    return map
  }, [])

  const unzonedLocations = useMemo(
    () => locations.filter((loc) => !zoneByLocationSlug.has(loc.slug)),
    [locations, zoneByLocationSlug]
  )

  const confirmedZonesCount = useMemo(
    () => LEONIDA_ZONES.filter((z) => z.locationSlugs.length > 0).length,
    []
  )
  const totalLocatedCount = useMemo(
    () => LEONIDA_ZONES.reduce((sum, z) => sum + z.locationSlugs.length, 0),
    []
  )

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (q.length < 2) return []
    return locations.filter((loc) => loc.title.toLowerCase().includes(q)).slice(0, 7)
  }, [locations, searchQuery])

  const activeZone: LeonidaZone | null = activeZoneId
    ? LEONIDA_ZONES.find((z) => z.id === activeZoneId) ?? null
    : null
  const isUnzonedHoldingActive = activeZoneId === UNZONED_HOLDING_ID

  // Escape cierra la pantalla completa, y evita que la página de fondo scrollee mientras está activa.
  useEffect(() => {
    if (!isFullscreen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKey)
    }
  }, [isFullscreen])

  const goToZone = (zoneId: string) => {
    setActiveZoneId((current) => (current === zoneId ? current : zoneId))
    controlsRef.current?.flyToZone(zoneId)
  }

  const handleSearchSelect = (loc: Entity) => {
    setSearchQuery('')
    setSearchOpen(false)
    const zone = zoneByLocationSlug.get(loc.slug)
    goToZone(zone ? zone.id : UNZONED_HOLDING_ID)
  }

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-[100] flex flex-col gap-3 overflow-y-auto bg-gta-darker p-3 md:gap-4 md:p-5'
          : ''
      }
    >
      {isFullscreen && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gta-text">Mapa de Leonida — pantalla completa</p>
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="leonida-fullscreen-btn"
            aria-label="Salir de pantalla completa"
          >
            ✕ Cerrar
          </button>
        </div>
      )}

      <div className={isFullscreen ? 'grid gap-4 lg:grid-cols-[1.7fr_1fr]' : 'grid gap-6 lg:grid-cols-[1.7fr_1fr]'}>
        <div className="relative flex flex-col overflow-hidden rounded-xl border border-gta-border bg-gta-card p-4 md:p-6">
          {!isFullscreen && (
            <div className="mb-3 flex flex-wrap items-start gap-2 rounded-lg border border-gta-accent-warning/25 bg-gta-accent-warning/10 px-3 py-2.5 text-xs leading-relaxed text-gta-accent-warning">
              <span aria-hidden="true" className="mt-0.5">
                ⚠
              </span>
              <span>
                Mapa real de Florida usado como referencia — las zonas y posiciones están basadas en la cobertura
                periodística de la filtración CYBERLEEK ({LEONIDA_ZONES_SOURCE.leakDate}), no en un mapa confirmado
                por Rockstar Games ni en coordenadas reales del juego.
              </span>
            </div>
          )}

          {/* Barra de estadísticas: da una lectura instantánea del estado del mapa sin tener que clickear nada */}
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="leonida-stat">
              <span className="leonida-stat__value">5</span>
              <span className="leonida-stat__label">zonas reportadas</span>
            </div>
            <div className="leonida-stat leonida-stat--confirmed">
              <span className="leonida-stat__value">{confirmedZonesCount}</span>
              <span className="leonida-stat__label">con ubicaciones</span>
            </div>
            <div className="leonida-stat leonida-stat--gold">
              <span className="leonida-stat__value">{totalLocatedCount}</span>
              <span className="leonida-stat__label">ubicaciones en zona</span>
            </div>
            <div className="leonida-stat">
              <span className="leonida-stat__value">{unzonedLocations.length}</span>
              <span className="leonida-stat__label">sin zona asignada</span>
            </div>
          </div>

          {/* Buscador: encontrá una ubicación por nombre y volá directo a su zona */}
          <div className="leonida-search-wrap">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setSearchOpen(true)
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
              placeholder="Buscar una ubicación… (ej. Port Gellhorn)"
              className="leonida-search-input"
              aria-label="Buscar ubicación en el mapa"
            />
            {searchOpen && searchQuery.trim().length >= 2 && (
              <div className="leonida-search-results">
                {searchResults.length === 0 ? (
                  <p className="leonida-search-empty">Sin resultados para “{searchQuery}”.</p>
                ) : (
                  searchResults.map((loc) => {
                    const zone = zoneByLocationSlug.get(loc.slug)
                    return (
                      <button
                        key={loc.slug}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSearchSelect(loc)}
                        className="leonida-search-result"
                      >
                        <span>{loc.title}</span>
                        <span className="leonida-search-result__zone">
                          {zone ? zone.leakName : 'sin zona asignada'}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* Chips de zona: navegación directa, y refuerza que los círculos del mapa son clickeables */}
          <div className="leonida-chip-row">
            {LEONIDA_ZONES.map((zone) => {
              const hasLocations = zone.locationSlugs.length > 0
              const isActive = zone.id === activeZoneId
              return (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => goToZone(zone.id)}
                  className={`leonida-chip ${isActive ? 'leonida-chip--active' : ''} ${
                    hasLocations ? 'leonida-chip--confirmed' : 'leonida-chip--pending'
                  }`}
                >
                  <span className="leonida-chip__dot" aria-hidden="true" />
                  {zone.leakName}
                  <span className="leonida-chip__count">{hasLocations ? zone.locationSlugs.length : '—'}</span>
                </button>
              )
            })}
            {unzonedLocations.length > 0 && (
              <button
                type="button"
                onClick={() => goToZone(UNZONED_HOLDING_ID)}
                className={`leonida-chip leonida-chip--unzoned ${
                  isUnzonedHoldingActive ? 'leonida-chip--active' : ''
                }`}
              >
                <span className="leonida-chip__dot" aria-hidden="true" />
                Sin zona asignada
                <span className="leonida-chip__count">{unzonedLocations.length}</span>
              </button>
            )}
          </div>

          <div className="mb-3 mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-gta-border bg-gta-darker/70 px-3 py-2 text-xs text-gta-text-secondary">
            <span className="font-semibold text-gta-text">Cómo se usa:</span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gta-accent-orange/20 text-[10px] font-bold text-gta-accent-orange">
                1
              </span>
              tocá un círculo o un chip para ver el detalle de esa zona
            </span>
            <span className="text-gta-border-strong">·</span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gta-gold/20 text-[10px] font-bold text-gta-gold">
                2
              </span>
              tocá un punto dorado para ver el resumen de esa ubicación
            </span>
            <span className="text-gta-border-strong">·</span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gta-accent-strong/20 text-[10px] font-bold text-gta-accent-strong">
                3
              </span>
              usá el buscador para saltar directo a una ubicación
            </span>
          </div>

          <div
            className={`leonida-leaflet-wrap relative w-full overflow-hidden rounded-lg border border-gta-border-strong/60 ${
              isFullscreen
                ? 'h-[58vh] min-h-[360px] sm:h-[64vh] lg:h-[72vh]'
                : 'h-[440px] sm:h-[560px] md:h-[640px] lg:h-[720px]'
            }`}
          >
            <MapContainer
              center={LEONIDA_MAP_VIEW.center}
              zoom={LEONIDA_MAP_VIEW.zoom}
              minZoom={5}
              maxZoom={LEONIDA_MAP_VIEW.maxZoom}
              scrollWheelZoom
              style={{ height: '100%', width: '100%', background: '#050308' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              <MapClickHandler onClear={() => setActiveZoneId(null)} />
              <MapBoundsController onReady={(controls) => (controlsRef.current = controls)} />
              <MapResizeOnFullscreen isFullscreen={isFullscreen} />

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
                        weight: isActive ? 3 : 1.5,
                        fillColor: color,
                        fillOpacity: isActive ? 0.24 : isHover ? 0.16 : hasLocations ? 0.1 : 0.04,
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
                      <Tooltip
                        direction="center"
                        permanent
                        className={`leonida-zone-tooltip ${isActive ? 'leonida-zone-tooltip--active' : ''}`}
                        opacity={1}
                      >
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
                        <span className="leonida-zone-tooltip__cta">Tocá para ver el detalle →</span>
                      </Tooltip>
                    </Circle>

                    {zoneLocations.map((loc, i) => {
                      const { dLat, dLng } = locationPinOffset(i, zoneLocations.length)
                      const pos: [number, number] = [coords.center[0] + dLat, coords.center[1] + dLng]
                      return (
                        <Marker key={loc.slug} position={pos} icon={pinIcon(isActive ? 'active' : 'default')}>
                          <Tooltip direction="top" offset={[0, -10]}>
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

              {unzonedLocations.length > 0 && (
                <Fragment>
                  <Circle
                    center={LEONIDA_UNZONED_HOLDING.center}
                    radius={LEONIDA_UNZONED_HOLDING.radiusMeters}
                    pathOptions={{
                      color: isUnzonedHoldingActive ? '#ff7ec4' : '#6b5d7d',
                      weight: isUnzonedHoldingActive ? 3 : 1.5,
                      fillColor: isUnzonedHoldingActive ? '#ff7ec4' : '#6b5d7d',
                      fillOpacity: isUnzonedHoldingActive ? 0.2 : 0.06,
                      dashArray: '4 6',
                    }}
                    eventHandlers={{
                      click: (e) => {
                        L.DomEvent.stopPropagation(e)
                        setActiveZoneId(isUnzonedHoldingActive ? null : UNZONED_HOLDING_ID)
                      },
                    }}
                  >
                    <Tooltip
                      direction="center"
                      permanent
                      className={`leonida-zone-tooltip leonida-zone-tooltip--unzoned ${
                        isUnzonedHoldingActive ? 'leonida-zone-tooltip--active' : ''
                      }`}
                      opacity={1}
                    >
                      <span className="leonida-zone-tooltip__row">
                        <span className="leonida-zone-tooltip__name">Sin zona asignada</span>
                        <span className="leonida-zone-tooltip__position">ilustrativo</span>
                      </span>
                      <span className="leonida-zone-tooltip__status leonida-zone-tooltip__status--unconfirmed">
                        ⚠ {unzonedLocations.length} ubicación{unzonedLocations.length === 1 ? '' : 'es'} sin zona
                        confirmada
                      </span>
                      <span className="leonida-zone-tooltip__cta">Tocá para ver el detalle →</span>
                    </Tooltip>
                  </Circle>

                  {unzonedLocations.map((loc, i) => {
                    const { dLat, dLng } = locationPinOffset(i, unzonedLocations.length, 0.55)
                    const pos: [number, number] = [
                      LEONIDA_UNZONED_HOLDING.center[0] + dLat,
                      LEONIDA_UNZONED_HOLDING.center[1] + dLng,
                    ]
                    return (
                      <Marker key={loc.slug} position={pos} icon={pinIcon('unzoned')}>
                        <Tooltip direction="top" offset={[0, -10]}>
                          {loc.title}
                        </Tooltip>
                        <Popup className="leonida-pin-popup leonida-pin-popup--unzoned" closeButton minWidth={220} maxWidth={260}>
                          <div className="leonida-pin-popup__inner">
                            <div className="leonida-pin-popup__head">
                              <span className="leonida-pin-popup__title">{loc.title}</span>
                              <Badge variant="status" status={loc.status}>
                                {STATUS_LABELS[loc.status as keyof typeof STATUS_LABELS] || loc.status}
                              </Badge>
                            </div>
                            <p className="leonida-pin-popup__unzoned-note">
                              ⚠ Sin zona confirmada — posición ilustrativa, no real.
                            </p>
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
              )}
            </MapContainer>

            <button
              type="button"
              onClick={() => controlsRef.current?.recenter()}
              className="leonida-recenter-btn"
              aria-label="Volver a mostrar el mapa completo"
            >
              ⤢ Ver mapa completo
            </button>

            {!isFullscreen && (
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="leonida-fullscreen-btn leonida-fullscreen-btn--float"
                aria-label="Expandir el mapa a pantalla completa"
              >
                ⛶ Pantalla completa
              </button>
            )}
          </div>

          {!isFullscreen && (
            <div className="mt-4 rounded-lg border border-gta-border bg-gta-darker/50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gta-text-tertiary">
                Cómo leer este mapa
              </p>
              <div className="grid grid-cols-1 gap-x-5 gap-y-2 text-xs text-gta-text-tertiary sm:grid-cols-2">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: 'rgba(34,211,238,0.2)', border: '1.5px solid #22d3ee' }}
                  />
                  Círculo cian = zona con al menos una ubicación confirmada
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-4 shrink-0 rounded-sm"
                    style={{ border: '1.5px dashed #453163' }}
                  />
                  Círculo gris punteado = zona reportada, sin confirmar todavía
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: 'rgba(255,126,196,0.25)', border: '1.5px solid #ff7ec4' }}
                  />
                  Círculo rosa = zona seleccionada (mostrando su detalle a la derecha)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-gta-gold" />
                  Punto dorado = ubicación catalogada — tocalo para ver un resumen
                </span>
                <span className="inline-flex items-center gap-1.5 sm:col-span-2">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: 'rgba(107,93,125,0.5)', border: '1.5px dashed #6b5d7d' }}
                  />
                  Punto gris en el Golfo (recuadro punteado, alejado de tierra) = ubicaciones sin zona confirmada
                  todavía — no representa una posición real dentro del juego, es solo para que no queden ocultas
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-y-auto rounded-xl border border-gta-border bg-gta-card p-4 md:p-6">
          {!activeZone ? (
            <div>
              <h3 className="font-display text-lg font-semibold text-gta-text">Ubicaciones sin zona asignada</h3>
              <p className="mt-1 text-sm text-gta-text-secondary">
                Tocá una zona del mapa (o un chip de arriba) para ver su detalle. Estas {unzonedLocations.length}{' '}
                ubicaciones del catálogo no tienen todavía un dato confirmado que las sitúe en alguna de las 5 zonas
                reportadas — por eso también aparecen agrupadas en un recuadro punteado en pleno Golfo de México,
                lejos de tierra firme, y no dentro de ninguna zona real.
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
    </div>
  )
}
