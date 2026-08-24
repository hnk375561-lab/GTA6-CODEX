'use client'

/**
 * VERSIÓN MEJORADA del LeonidaMapCanvas
 *
 * Cambios principales:
 * - MarkerCluster para agrupar ubicaciones (vía react-leaflet-cluster,
 *   el único wrapper de leaflet.markercluster compatible con react-leaflet 5
 *   + React 19 — leaflet.markercluster en sí es un plugin vanilla de Leaflet
 *   y no expone un componente de React)
 * - Filtros avanzados (categorías, zonas)
 * - Zoom automático post-filtro
 * - Mejor manejo de estado
 * - Estadísticas en vivo
 *
 * Activación: ver `LeonidaMapExplorer.tsx` — se activa con la env var
 * NEXT_PUBLIC_MAP_V2=true. Por defecto sigue corriendo V1.
 */

import 'leaflet/dist/leaflet.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css'
import '@/styles/leaflet-cluster.css'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import L from 'leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { MapContainer, TileLayer, Circle, Marker, Tooltip, Popup, useMap, useMapEvents } from 'react-leaflet'
import type { Entity } from '@/types'
import { EntityType } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { STATUS_LABELS } from '@/lib/entity-labels'
import { LEONIDA_ZONES, type LeonidaZone } from '@/lib/leonida-zones'
import {
  LEONIDA_MAP_VIEW,
  LEONIDA_UNZONED_HOLDING,
  LEONIDA_ZONE_COORDS,
  LEONIDA_ZONE_FLY_ZOOM,
  getLeonidaFullMapBounds,
  locationPinOffset,
} from '@/lib/leonida-map-coordinates'
import {
  MAP_CATEGORIES,
  MAP_CATEGORY_TYPES,
  getMapCategoryConfig,
  resolveEntityLocationSlug,
  type MapCategoryConfig,
} from '@/lib/map-entities'

const UNZONED_HOLDING_ID = '__unzoned__'

interface MapFilters {
  categories: Set<EntityType>
  zones: Set<string>
  searchQuery: string
}

interface MapControls {
  recenter: () => void
  flyToZone: (zoneId: string) => void
}

interface MapStats {
  totalVisible: number
  byCategory: Record<string, number>
}

function groupByCategory(list: Entity[]): { category: MapCategoryConfig; items: Entity[] }[] {
  return MAP_CATEGORIES.map((category) => ({
    category,
    items: list.filter((e) => e.type === category.type),
  })).filter((group) => group.items.length > 0)
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max).trimEnd()}…`
}

/** Ícono SVG por categoría — reemplaza el emoji plano del V1 por un pin con sombra. */
const createCategoryPin = (category: MapCategoryConfig, variant: 'default' | 'active' | 'unzoned') => {
  const color = variant === 'active' ? '#ff7ec4' : variant === 'unzoned' ? '#6b5d7d' : category.color

  const svg = `<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
      </filter>
    </defs>
    <path d="M16 2C9.4 2 4 7.4 4 14c0 8 12 22 12 22s12-14 12-22c0-6.6-5.4-12-12-12z"
          fill="${color}"
          stroke="white"
          stroke-width="2"
          filter="url(#shadow)"/>
    <text x="16" y="14" text-anchor="middle" font-size="14" fill="white" font-weight="bold" dominant-baseline="central">
      ${category.glyph}
    </text>
  </svg>`

  return L.divIcon({
    className: 'category-pin',
    html: svg,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  })
}

const FULL_BOUNDS = getLeonidaFullMapBounds()
const FULL_LATLNG_BOUNDS: L.LatLngBoundsExpression = [
  [FULL_BOUNDS.south, FULL_BOUNDS.west],
  [FULL_BOUNDS.north, FULL_BOUNDS.east],
]

function MapClickHandler({ onClear }: { onClear: () => void }) {
  useMapEvents({ click: () => onClear() })
  return null
}

/**
 * Igual que en V1: recentra al montar y expone los controles al padre.
 * El callback `onReady` se pasa por ref (no por dependencia del efecto)
 * a propósito — es una función nueva en cada render del padre, así que
 * incluirla en el array de deps re-dispara `recenter()` en cada render
 * y hace que el mapa "salte" solo. Ese era un bug real de la primera
 * versión de este archivo, corregido acá.
 */
function MapBoundsController({ onReady }: { onReady: (controls: MapControls) => void }) {
  const map = useMap()
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

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
    onReadyRef.current({ recenter, flyToZone })

    const handleResize = () => {
      map.invalidateSize()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [map])

  return null
}

function MapResizeOnFullscreen({ isFullscreen }: { isFullscreen: boolean }) {
  const map = useMap()
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 260)
    return () => window.clearTimeout(id)
  }, [isFullscreen, map])
  return null
}

export function LeonidaMapCanvasV2({ entities }: { entities: Entity[] }) {
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const [filters, setFilters] = useState<MapFilters>({
    categories: new Set(MAP_CATEGORY_TYPES),
    zones: new Set(LEONIDA_ZONES.map((z) => z.id)),
    searchQuery: '',
  })

  const controlsRef = useRef<MapControls | null>(null)

  const locations = useMemo(() => entities.filter((e) => e.type === EntityType.LOCATION), [entities])

  const zoneByLocationSlug = useMemo(() => {
    const map = new Map<string, LeonidaZone>()
    for (const zone of LEONIDA_ZONES) {
      for (const slug of zone.locationSlugs) map.set(slug, zone)
    }
    return map
  }, [])

  const filteredEntities = useMemo(() => {
    let result = entities

    if (filters.categories.size > 0) {
      result = result.filter((e) => filters.categories.has(e.type))
    }

    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase()
      result = result.filter((e) => e.title.toLowerCase().includes(q))
    }

    if (filters.zones.size > 0) {
      result = result.filter((e) => {
        if (e.type === EntityType.LOCATION) {
          const zone = zoneByLocationSlug.get(e.slug)
          return zone && filters.zones.has(zone.id)
        }
        const locationSlug = resolveEntityLocationSlug(e)
        if (!locationSlug) return true
        const zone = zoneByLocationSlug.get(locationSlug)
        return zone && filters.zones.has(zone.id)
      })
    }

    return result
  }, [entities, filters, zoneByLocationSlug])

  const mapStats = useMemo((): MapStats => {
    const stats: MapStats = {
      totalVisible: filteredEntities.length,
      byCategory: {},
    }
    for (const category of MAP_CATEGORIES) {
      stats.byCategory[category.type] = filteredEntities.filter((e) => e.type === category.type).length
    }
    return stats
  }, [filteredEntities])

  const toggleCategory = (type: EntityType) => {
    setFilters((prev) => {
      const next = new Set(prev.categories)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return { ...prev, categories: next }
    })
  }

  const toggleZone = (zoneId: string) => {
    setFilters((prev) => {
      const next = new Set(prev.zones)
      if (next.has(zoneId)) next.delete(zoneId)
      else next.add(zoneId)
      return { ...prev, zones: next }
    })
  }

  const clearAllFilters = () => {
    setFilters({
      categories: new Set(MAP_CATEGORY_TYPES),
      zones: new Set(LEONIDA_ZONES.map((z) => z.id)),
      searchQuery: '',
    })
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setFilters((prev) => ({ ...prev, searchQuery: query }))
  }

  const activeZone =
    activeZoneId && activeZoneId !== UNZONED_HOLDING_ID
      ? LEONIDA_ZONES.find((z) => z.id === activeZoneId) ?? null
      : null

  const entitiesByZone = useMemo(() => {
    const map = new Map<string, Entity[]>()
    for (const zone of LEONIDA_ZONES) map.set(zone.id, [])
    for (const entity of filteredEntities) {
      const locationSlug =
        entity.type === EntityType.LOCATION ? entity.slug : resolveEntityLocationSlug(entity)
      if (!locationSlug) continue
      const zone = zoneByLocationSlug.get(locationSlug)
      if (zone) map.get(zone.id)?.push(entity)
    }
    return map
  }, [filteredEntities, zoneByLocationSlug])

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (q.length < 2) return []
    return locations.filter((loc) => loc.title.toLowerCase().includes(q)).slice(0, 7)
  }, [locations, searchQuery])

  const hasActiveFilters =
    filters.searchQuery.trim().length > 0 ||
    filters.categories.size < MAP_CATEGORY_TYPES.length ||
    filters.zones.size < LEONIDA_ZONES.length

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
        {isFullscreen && (
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="leonida-fullscreen-btn absolute right-4 top-4 z-10"
            aria-label="Salir de pantalla completa"
          >
            ✕ Cerrar
          </button>
        )}

        <div
          className="relative overflow-hidden rounded-xl border border-gta-border bg-gta-darker"
          style={{ height: isFullscreen ? '100vh' : '520px' }}
        >
          {/* Panel de filtros */}
          <div className="max-h-32 space-y-2 overflow-y-auto border-b border-gta-border bg-gta-card p-3">
            <div className="leonida-search-wrap">
              <input
                type="text"
                placeholder="Buscar una ubicación… (mín. 2 caracteres)"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
                className="leonida-search-input"
                aria-label="Buscar ubicación en el mapa"
              />
              {searchOpen && searchQuery.trim().length >= 2 && (
                <div className="leonida-search-results">
                  {searchResults.length === 0 ? (
                    <p className="leonida-search-empty">Sin resultados para “{searchQuery}”.</p>
                  ) : (
                    searchResults.map((loc) => (
                      <button
                        key={loc.slug}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          handleSearch(loc.title)
                          setSearchOpen(false)
                        }}
                        className="leonida-search-result"
                      >
                        <span>{loc.title}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {MAP_CATEGORIES.map((category) => (
                <button
                  key={category.type}
                  type="button"
                  onClick={() => toggleCategory(category.type)}
                  aria-pressed={filters.categories.has(category.type)}
                  className={`leonida-category-chip ${
                    filters.categories.has(category.type) ? 'leonida-category-chip--on' : 'leonida-category-chip--off'
                  }`}
                >
                  <span aria-hidden="true">{category.glyph}</span> {category.label}
                </button>
              ))}
            </div>

            <div className="leonida-chip-row">
              {LEONIDA_ZONES.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => toggleZone(zone.id)}
                  className={`leonida-chip ${filters.zones.has(zone.id) ? 'leonida-chip--active' : ''}`}
                >
                  {zone.leakName}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-gta-text-tertiary">
              <span>📊 {mapStats.totalVisible} resultados</span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-gta-accent transition-colors hover:text-gta-accent-strong"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {filteredEntities.length === 0 && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50">
              <div className="rounded border border-gta-border bg-gta-card p-4 text-center">
                <p className="mb-2 text-gta-text">⚠ Sin resultados para los filtros actuales</p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-sm text-gta-accent hover:text-gta-accent-strong"
                >
                  Mostrar todo
                </button>
              </div>
            </div>
          )}

          <MapContainer
            center={LEONIDA_MAP_VIEW.center}
            zoom={LEONIDA_MAP_VIEW.zoom}
            minZoom={5}
            maxZoom={LEONIDA_MAP_VIEW.maxZoom}
            scrollWheelZoom
            className="h-full"
            style={{ background: '#050308' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            <MapBoundsController onReady={(controls) => (controlsRef.current = controls)} />
            <MapResizeOnFullscreen isFullscreen={isFullscreen} />
            <MapClickHandler onClear={() => setActiveZoneId(null)} />

            {Array.from(filters.zones).map((zoneId) => {
              const zone = LEONIDA_ZONES.find((z) => z.id === zoneId)
              if (!zone) return null
              const coords = LEONIDA_ZONE_COORDS[zone.id]
              if (!coords) return null

              const isActive = activeZoneId === zone.id
              const color = isActive ? '#ff7ec4' : '#22d3ee'
              const dashArray = zone.locationSlugs.length > 0 ? undefined : '5, 5'

              return (
                <Circle
                  key={zone.id}
                  center={coords.center}
                  radius={coords.radiusMeters}
                  pathOptions={{
                    color,
                    fill: true,
                    fillColor: color,
                    fillOpacity: isActive ? 0.25 : 0.1,
                    weight: isActive ? 2 : 1.5,
                    dashArray,
                  }}
                  eventHandlers={{
                    click: (e) => {
                      L.DomEvent.stopPropagation(e)
                      setActiveZoneId(isActive ? null : zone.id)
                    },
                  }}
                >
                  <Tooltip>{zone.leakName}</Tooltip>
                </Circle>
              )
            })}

            {filteredEntities.length > 0 && (
              <MarkerClusterGroup
                maxClusterRadius={80}
                iconCreateFunction={(cluster) => {
                  const childCount = cluster.getChildCount()
                  const size = childCount > 100 ? 40 : childCount > 10 ? 35 : 30
                  return L.divIcon({
                    html: `<div style="background:#ff7ec4;border:2px solid white;border-radius:50%;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-weight:bold;color:white;font-size:12px;">${childCount}</div>`,
                    iconSize: [size, size],
                    className: 'marker-cluster',
                  })
                }}
              >
                {filteredEntities.map((entity) => {
                  const category = getMapCategoryConfig(entity.type)
                  let coords: [number, number] | null = null

                  if (entity.type === EntityType.LOCATION) {
                    const zone = zoneByLocationSlug.get(entity.slug)
                    if (zone) {
                      const zoneCoords = LEONIDA_ZONE_COORDS[zone.id]
                      const offset = locationPinOffset(
                        zone.locationSlugs.indexOf(entity.slug),
                        zone.locationSlugs.length
                      )
                      coords = [zoneCoords.center[0] + offset.dLat, zoneCoords.center[1] + offset.dLng]
                    }
                  } else {
                    const locationSlug = resolveEntityLocationSlug(entity)
                    if (locationSlug) {
                      const zone = zoneByLocationSlug.get(locationSlug)
                      if (zone) {
                        const zoneCoords = LEONIDA_ZONE_COORDS[zone.id]
                        const offset = locationPinOffset(0, 1)
                        coords = [zoneCoords.center[0] + offset.dLat, zoneCoords.center[1] + offset.dLng]
                      }
                    }
                  }

                  if (!coords) return null

                  return (
                    <Marker
                      key={`${entity.type}-${entity.slug}`}
                      position={coords}
                      icon={createCategoryPin(category, 'default')}
                    >
                      <Popup className="leonida-pin-popup">
                        <div className="leonida-pin-popup__inner">
                          <div className="leonida-pin-popup__head">
                            <span className="leonida-pin-popup__title">{entity.title}</span>
                            <Badge variant="status" status={entity.status}>
                              {STATUS_LABELS[entity.status as keyof typeof STATUS_LABELS] || entity.status}
                            </Badge>
                          </div>
                          <span className="leonida-pin-popup__category" style={{ color: category.color }}>
                            {category.glyph} {category.label}
                          </span>
                          {entity.description && (
                            <p className="leonida-pin-popup__desc">{truncate(entity.description, 150)}</p>
                          )}
                          <Link href={`/${entity.type}/${entity.slug}`} className="leonida-pin-popup__link">
                            Ver ficha completa →
                          </Link>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}
              </MarkerClusterGroup>
            )}
          </MapContainer>

          <button
            type="button"
            onClick={() => controlsRef.current?.recenter()}
            className="leonida-recenter-btn absolute bottom-4 left-4 z-10"
            aria-label="Volver a mostrar el mapa completo"
          >
            ⤢ Ver mapa completo
          </button>

          {!isFullscreen && (
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="leonida-fullscreen-btn absolute bottom-4 right-4 z-10"
              aria-label="Expandir el mapa a pantalla completa"
            >
              ⛶ Pantalla completa
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[520px] overflow-y-auto rounded-xl border border-gta-border bg-gta-card p-4 md:p-6">
        {!activeZone ? (
          <div>
            <h3 className="font-display text-lg font-semibold text-gta-text">Información</h3>
            <div className="mt-3 space-y-2 text-sm text-gta-text-secondary">
              {MAP_CATEGORIES.map((category) => (
                <p key={category.type}>
                  {category.glyph} {mapStats.byCategory[category.type] || 0} {category.label.toLowerCase()}
                </p>
              ))}
            </div>
            <p className="mt-4 text-xs text-gta-text-tertiary">Tocá una zona del mapa para ver su detalle</p>
          </div>
        ) : (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-gta-text">{activeZone.leakName}</h3>
              <Badge variant="default">{activeZone.position}</Badge>
            </div>
            <p className="text-sm text-gta-text-secondary">{activeZone.description}</p>

            <div className="mt-3 rounded-lg border border-gta-border bg-gta-darker/60 p-2 text-xs text-gta-text-tertiary">
              {activeZone.sourceNote}
            </div>

            <h4 className="mt-4 text-sm font-semibold text-gta-text">Catalogado en esta zona</h4>
            {(() => {
              const zoneEntities = entitiesByZone.get(activeZone.id) ?? []
              if (zoneEntities.length === 0) {
                return <p className="mt-2 text-xs text-gta-text-secondary">Nada en las categorías activas</p>
              }
              return groupByCategory(zoneEntities).map(({ category, items }) => (
                <div key={category.type} className="mt-3">
                  <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-gta-text-tertiary">
                    <span aria-hidden="true">{category.glyph}</span>
                    {category.label}
                    <span>({items.length})</span>
                  </h5>
                  <ul className="mt-1.5 space-y-1">
                    {items.map((entity) => (
                      <li key={entity.slug}>
                        <Fragment>
                          <Link
                            href={`/${entity.type}/${entity.slug}`}
                            className="text-xs text-gta-text transition-colors hover:text-gta-accent-strong"
                          >
                            {entity.title}
                          </Link>
                        </Fragment>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            })()}

            <button
              type="button"
              onClick={() => setActiveZoneId(null)}
              className="mt-4 text-xs font-semibold text-gta-accent-orange transition-colors hover:text-gta-accent-strong"
            >
              ← Volver
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
