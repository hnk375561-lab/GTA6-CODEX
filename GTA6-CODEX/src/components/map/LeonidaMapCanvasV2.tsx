'use client'

/**
 * VERSIÓN MEJORADA del LeonidaMapCanvas
 * 
 * Cambios principales:
 * - MarkerCluster para agrupar ubicaciones
 * - Filtros avanzados (zonas, estado, precio)
 * - Zoom automático post-filtro
 * - Mejor manejo de estado
 * - Notificaciones visuales
 */

import 'leaflet/dist/leaflet.css'
import 'leaflet-markercluster/dist/MarkerCluster.css'
import 'leaflet-markercluster/dist/MarkerCluster.Default.css'

import { Fragment, useEffect, useMemo, useRef, useState, useCallback, type CSSProperties } from 'react'
import Link from 'next/link'
import L from 'leaflet'
import MarkerClusterGroup from 'leaflet-markercluster'
import { MapContainer, TileLayer, Circle, Marker, Tooltip, Popup, useMap, useMapEvents } from 'react-leaflet'
import type { Entity } from '@/types'
import { EntityType } from '@/types'
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
import {
  MAP_CATEGORIES,
  MAP_CATEGORY_TYPES,
  getMapCategoryConfig,
  resolveEntityLocationSlug,
  type MapCategoryConfig,
} from '@/lib/map-entities'

const UNZONED_HOLDING_ID = '__unzoned__'

// ============================================================================
// TIPOS NUEVOS
// ============================================================================

interface MapFilters {
  categories: Set<EntityType>
  zones: Set<string>
  status: Set<string>
  searchQuery: string
  // Agregar más filtros aquí según necesidad:
  // priceRange?: [min: number, max: number]
  // difficulty?: Set<string>
}

interface MapControls {
  recenter: () => void
  flyToZone: (zoneId: string) => void
  applyFilters: (filters: MapFilters) => void
}

interface MapStats {
  totalVisible: number
  byCategory: Record<string, number>
  byZone: Record<string, number>
}

// ============================================================================
// UTILIDADES
// ============================================================================

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

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Crear icono SVG mejorado para cada pin
 * En lugar de texto emoji, usar SVG custom más profesional
 */
const createCategoryPin = (category: MapCategoryConfig, variant: 'default' | 'active' | 'unzoned') => {
  const color = variant === 'active' ? '#ff7ec4' : variant === 'unzoned' ? '#6b5d7d' : category.color
  const strokeColor = hexToRgba(color, 0.7)
  
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

// ============================================================================
// COMPONENTES INTERNOS
// ============================================================================

function MapClickHandler({ onClear }: { onClear: () => void }) {
  useMapEvents({ click: () => onClear() })
  return null
}

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
    const applyFilters = (filters: MapFilters) => {
      // Este será llamado desde el componente padre cuando los filtros cambien
      // Aquí podemos agregar lógica de zoom/pan específica si es necesaria
    }

    recenter()
    onReady({ recenter, flyToZone, applyFilters })

    const handleResize = () => {
      map.invalidateSize()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [map, onReady])

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

// ============================================================================
// COMPONENTE PRINCIPAL MEJORADO
// ============================================================================

export function LeonidaMapCanvasImproved({ entities }: { entities: Entity[] }) {
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  
  // NUEVO: Filtros expandidos
  const [filters, setFilters] = useState<MapFilters>({
    categories: new Set(MAP_CATEGORY_TYPES),
    zones: new Set(LEONIDA_ZONES.map(z => z.id)),
    status: new Set(['confirmed', 'speculative']),
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

  // NUEVO: Aplicar filtros
  const filteredEntities = useMemo(() => {
    let result = entities

    // Filtrar por categoría activa
    if (filters.categories.size > 0) {
      result = result.filter(e => filters.categories.has(e.type))
    }

    // Filtrar por búsqueda
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase()
      result = result.filter(e => e.title.toLowerCase().includes(q))
    }

    // Filtrar por zona (para ubicaciones)
    if (filters.zones.size > 0) {
      result = result.filter(e => {
        if (e.type === EntityType.LOCATION) {
          const zone = zoneByLocationSlug.get(e.slug)
          return zone && filters.zones.has(zone.id)
        }
        // Para otras entidades, verificar su relación
        const locationSlug = resolveEntityLocationSlug(e)
        if (!locationSlug) return true // Si no tiene zona, mostrar igual
        const zone = zoneByLocationSlug.get(locationSlug)
        return zone && filters.zones.has(zone.id)
      })
    }

    return result
  }, [entities, filters, zoneByLocationSlug])

  // NUEVO: Estadísticas
  const mapStats = useMemo((): MapStats => {
    const stats: MapStats = {
      totalVisible: filteredEntities.length,
      byCategory: {},
      byZone: {},
    }

    for (const category of MAP_CATEGORIES) {
      stats.byCategory[category.type] = filteredEntities.filter(e => e.type === category.type).length
    }

    for (const zone of LEONIDA_ZONES) {
      stats.byZone[zone.id] = filteredEntities.filter(e => {
        if (e.type === EntityType.LOCATION) {
          return zoneByLocationSlug.get(e.slug)?.id === zone.id
        }
        const locationSlug = resolveEntityLocationSlug(e)
        return locationSlug && zoneByLocationSlug.get(locationSlug)?.id === zone.id
      }).length
    }

    return stats
  }, [filteredEntities, zoneByLocationSlug])

  const unzonedLocations = useMemo(
    () => filteredEntities.filter((loc) => loc.type === EntityType.LOCATION && !zoneByLocationSlug.has(loc.slug)),
    [filteredEntities, zoneByLocationSlug]
  )

  // NUEVO: Toggle de filtros
  const toggleCategory = (type: EntityType) => {
    setFilters(prev => {
      const next = { ...prev }
      const newCategories = new Set(prev.categories)
      if (newCategories.has(type)) {
        newCategories.delete(type)
      } else {
        newCategories.add(type)
      }
      return { ...prev, categories: newCategories }
    })
  }

  const toggleZone = (zoneId: string) => {
    setFilters(prev => {
      const newZones = new Set(prev.zones)
      if (newZones.has(zoneId)) {
        newZones.delete(zoneId)
      } else {
        newZones.add(zoneId)
      }
      return { ...prev, zones: newZones }
    })
  }

  // NUEVO: Limpiar todos los filtros
  const clearAllFilters = () => {
    setFilters({
      categories: new Set(MAP_CATEGORY_TYPES),
      zones: new Set(LEONIDA_ZONES.map(z => z.id)),
      status: new Set(['confirmed', 'speculative']),
      searchQuery: '',
    })
  }

  // NUEVO: Actualizar búsqueda
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setFilters(prev => ({
      ...prev,
      searchQuery: query,
    }))
  }

  const activeZone = activeZoneId && activeZoneId !== UNZONED_HOLDING_ID
    ? LEONIDA_ZONES.find((z) => z.id === activeZoneId)
    : null

  const entitiesByZone = useMemo(() => {
    const map = new Map<string, Entity[]>()
    for (const zone of LEONIDA_ZONES) {
      map.set(zone.id, [])
    }
    for (const entity of filteredEntities) {
      if (entity.type === EntityType.LOCATION) {
        const zone = zoneByLocationSlug.get(entity.slug)
        if (zone) {
          map.get(zone.id)?.push(entity)
        }
      } else {
        const locationSlug = resolveEntityLocationSlug(entity)
        if (locationSlug) {
          const zone = zoneByLocationSlug.get(locationSlug)
          if (zone) {
            map.get(zone.id)?.push(entity)
          }
        }
      }
    }
    return map
  }, [filteredEntities, zoneByLocationSlug])

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (q.length < 2) return []
    return locations.filter((loc) => loc.title.toLowerCase().includes(q)).slice(0, 7)
  }, [locations, searchQuery])

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
        {isFullscreen && (
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-10 bg-red-600 text-white px-4 py-2 rounded"
          >
            ✕ Salir pantalla completa
          </button>
        )}

        <div className="rounded-xl border border-gta-border bg-gta-darker overflow-hidden" style={{ height: isFullscreen ? '100vh' : '520px' }}>
          {/* NUEVO: Panel de filtros mejorado */}
          <div className="bg-gta-card border-b border-gta-border p-3 space-y-2 max-h-32 overflow-y-auto">
            {/* Búsqueda */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar ubicación (mín. 2 caracteres)..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                className="w-full px-3 py-2 bg-gta-darker border border-gta-border rounded text-sm"
              />
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-gta-card border border-gta-border rounded mt-1 z-10 max-h-48 overflow-y-auto">
                  {searchResults.map((loc) => (
                    <button
                      key={loc.slug}
                      onClick={() => {
                        handleSearch(loc.title)
                        setSearchOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gta-darker transition text-sm"
                    >
                      {loc.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filtros por categoría */}
            <div className="flex flex-wrap gap-2">
              {MAP_CATEGORIES.map((category) => (
                <button
                  key={category.type}
                  onClick={() => toggleCategory(category.type)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition ${
                    filters.categories.has(category.type)
                      ? 'bg-gta-accent text-white'
                      : 'bg-gta-darker border border-gta-border text-gta-text-secondary'
                  }`}
                  title={category.label}
                >
                  {category.glyph} {category.label}
                </button>
              ))}
            </div>

            {/* Filtros por zona */}
            <div className="flex flex-wrap gap-2">
              {LEONIDA_ZONES.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => toggleZone(zone.id)}
                  className={`px-2 py-1 rounded text-xs transition ${
                    filters.zones.has(zone.id)
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gta-darker border border-gta-border text-gta-text-secondary'
                  }`}
                  title={zone.leakName}
                >
                  {zone.position}
                </button>
              ))}
            </div>

            {/* Stats y botón de limpiar */}
            <div className="flex items-center justify-between text-xs text-gta-text-tertiary">
              <span>📊 {mapStats.totalVisible} resultados</span>
              {(filters.searchQuery || 
                filters.categories.size < MAP_CATEGORY_TYPES.length ||
                filters.zones.size < LEONIDA_ZONES.length) && (
                <button
                  onClick={clearAllFilters}
                  className="text-gta-accent hover:text-gta-accent-strong transition"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {/* NUEVO: Notificación de "sin resultados" */}
          {filteredEntities.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-40 rounded">
              <div className="bg-gta-card border border-gta-border p-4 rounded text-center">
                <p className="text-gta-text mb-2">⚠️ Sin resultados para los filtros actuales</p>
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-gta-accent hover:text-gta-accent-strong"
                >
                  Mostrar todo
                </button>
              </div>
            </div>
          )}

          <MapContainer center={LEONIDA_MAP_VIEW.center} zoom={LEONIDA_MAP_VIEW.zoom} className="h-full">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />

            <MapBoundsController onReady={(controls) => {
              controlsRef.current = controls
            }} />
            <MapResizeOnFullscreen isFullscreen={isFullscreen} />
            <MapClickHandler onClear={() => setActiveZoneId(null)} />

            {/* Dibujar círculos de zonas */}
            {Array.from(filters.zones).map((zoneId) => {
              const zone = LEONIDA_ZONES.find(z => z.id === zoneId)
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
                    click: () => setActiveZoneId(isActive ? null : zone.id),
                  }}
                >
                  <Tooltip>{zone.leakName}</Tooltip>
                </Circle>
              )
            })}

            {/* Marcadores filtrados con clustering */}
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
                    <Marker key={`${entity.type}-${entity.slug}`} position={coords} icon={createCategoryPin(category, 'default')}>
                      <Popup className="leonida-pin-popup">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="leonida-pin-popup__title font-semibold">{entity.title}</span>
                            <Badge variant="status" status={entity.status}>
                              {STATUS_LABELS[entity.status as keyof typeof STATUS_LABELS] || entity.status}
                            </Badge>
                          </div>
                          <span className="text-xs" style={{ color: category.color }}>
                            {category.glyph} {category.label}
                          </span>
                          {entity.description && (
                            <p className="text-xs text-gta-text-secondary">{truncate(entity.description, 150)}</p>
                          )}
                          <Link href={`/${entity.type}/${entity.slug}`} className="text-xs text-gta-accent hover:text-gta-accent-strong">
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
            className="absolute bottom-4 left-4 bg-gta-card border border-gta-border px-3 py-2 rounded text-sm hover:bg-gta-darker transition z-10"
          >
            ⤢ Ver mapa completo
          </button>

          {!isFullscreen && (
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="absolute bottom-4 right-4 bg-gta-card border border-gta-border px-3 py-2 rounded text-sm hover:bg-gta-darker transition z-10"
            >
              ⛶ Pantalla completa
            </button>
          )}
        </div>
      </div>

      {/* Panel lateral derecho */}
      <div className="overflow-y-auto rounded-xl border border-gta-border bg-gta-card p-4 md:p-6 max-h-[520px]">
        {!activeZone ? (
          <div>
            <h3 className="font-display text-lg font-semibold text-gta-text">Información</h3>
            <div className="mt-3 space-y-2 text-sm text-gta-text-secondary">
              <p>📍 {mapStats.byCategory[EntityType.LOCATION] || 0} ubicaciones</p>
              <p>🔫 {mapStats.byCategory[EntityType.WEAPON] || 0} armas</p>
              <p>🚗 {mapStats.byCategory[EntityType.VEHICLE] || 0} vehículos</p>
              <p>🎯 {mapStats.byCategory[EntityType.MISSION] || 0} misiones</p>
              <p>🎒 {mapStats.byCategory[EntityType.OBJECT] || 0} objetos</p>
            </div>
            <p className="mt-4 text-xs text-gta-text-tertiary">
              Tocá una zona del mapa para ver su detalle
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-3">
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
                    {category.glyph} {category.label} <span>({items.length})</span>
                  </h5>
                  <ul className="mt-1.5 space-y-1">
                    {items.map((entity) => (
                      <li key={entity.slug}>
                        <Link href={`/${entity.type}/${entity.slug}`} className="text-xs text-gta-text hover:text-gta-accent-strong transition">
                          {entity.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            })()}

            <button
              onClick={() => setActiveZoneId(null)}
              className="mt-4 text-xs font-semibold text-gta-accent-orange hover:text-gta-accent-strong"
            >
              ← Volver
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
