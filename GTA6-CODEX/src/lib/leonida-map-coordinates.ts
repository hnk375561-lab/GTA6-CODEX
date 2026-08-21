/**
 * Coordenadas geográficas REALES aproximadas para el mapa interactivo de Leonida
 * (sección 1.1, ahora sobre un mapa real de Florida vía Leaflet/OpenStreetMap).
 *
 * IMPORTANTE — origen y estándar de evidencia (mismo criterio que leonida-zones.ts):
 * Estas coordenadas NO representan la posición real de ningún lugar dentro del
 * juego. Leonida es una versión ficticia de Florida; no existe un mapa oficial
 * de Rockstar Games que se pueda proyectar sobre el mundo real. Lo que se hace
 * acá es ubicar cada zona/ubicación sobre el mapa REAL de Florida, en el punto
 * geográfico real cuya posición relativa (norte/sur/este/oeste/centro respecto
 * a Miami=Vice City) coincide con la que reportó la cobertura de la filtración
 * CYBERLEEK (18/08/2026) — igual que hacen otros trackers de la comunidad. Es
 * una referencia ilustrativa, no una confirmación de ubicación real.
 *
 * Reemplazar por el mapa in-game real en cuanto Rockstar lo publique.
 */

export interface LeonidaZoneCoords {
  /** Centro aproximado de la zona sobre el mapa real (lat, lng). */
  center: [number, number]
  /** Radio del área ilustrativa en metros. */
  radiusMeters: number
}

/** Un centro de mapa fijo (aprox. centro geográfico de la Florida peninsular) y zoom inicial. */
export const LEONIDA_MAP_VIEW = {
  center: [27.6, -81.6] as [number, number],
  zoom: 6.4,
  minZoom: 5.5,
  maxZoom: 11,
}

/**
 * Centros aproximados por zona, alineados a la disposición geográfica real de
 * Florida: Vice-Dale (Vice City) en el área de Miami, Kelly al oeste sobre la
 * costa del Golfo, Leonard al este sobre la costa Atlántica, Lummox al norte
 * y Mariana al sur (Cayos).
 */
export const LEONIDA_ZONE_COORDS: Record<string, LeonidaZoneCoords> = {
  lummox: { center: [29.85, -82.2], radiusMeters: 95000 },
  kelly: { center: [27.55, -82.55], radiusMeters: 85000 },
  leonard: { center: [27.65, -80.45], radiusMeters: 80000 },
  'vice-dale': { center: [25.85, -80.25], radiusMeters: 70000 },
  mariana: { center: [24.75, -81.15], radiusMeters: 90000 },
}

/**
 * Dispersa los pines de ubicaciones dentro de una zona en un pequeño arco
 * alrededor de su centro, en grados de lat/lng — misma idea que el
 * `pinOffset` del diagrama SVG anterior, pero para coordenadas reales.
 */
export function locationPinOffset(
  index: number,
  total: number,
  spreadDegrees = 0.35
): { dLat: number; dLng: number } {
  if (total <= 1) return { dLat: 0, dLng: 0 }
  const spread = Math.min(total * (spreadDegrees / 3), spreadDegrees)
  const angle = (index / (total - 1)) * Math.PI - Math.PI / 2
  return { dLat: Math.sin(angle) * (spread * 0.6), dLng: Math.cos(angle) * spread }
}

/**
 * Calcula el rectángulo (bounding box) que contiene las 5 zonas completas
 * (centro + radio de cada círculo), con un margen extra para que las
 * etiquetas no queden pegadas al borde del mapa. Se usa para encuadrar el
 * mapa automáticamente al cargar, sin depender de un zoom fijo que podría
 * quedar demasiado cerca (zonas pisándose) o demasiado lejos según la
 * pantalla del usuario.
 */
/**
 * Zoom "cómodo" al volar hacia una zona puntual (búsqueda o click en un chip),
 * más cerrado que el encuadre general de las 5 zonas para que se note el
 * cambio de foco.
 */
export const LEONIDA_ZONE_FLY_ZOOM = 8.3

export function getLeonidaZonesBounds(paddingFactor = 1.35): {
  south: number
  north: number
  west: number
  east: number
} {
  let south = Infinity
  let north = -Infinity
  let west = Infinity
  let east = -Infinity

  for (const { center, radiusMeters } of Object.values(LEONIDA_ZONE_COORDS)) {
    const [lat, lng] = center
    const dLat = (radiusMeters * paddingFactor) / 110574
    const latRad = (lat * Math.PI) / 180
    const dLng = (radiusMeters * paddingFactor) / (111320 * Math.cos(latRad))

    south = Math.min(south, lat - dLat)
    north = Math.max(north, lat + dLat)
    west = Math.min(west, lng - dLng)
    east = Math.max(east, lng + dLng)
  }

  return { south, north, west, east }
}
