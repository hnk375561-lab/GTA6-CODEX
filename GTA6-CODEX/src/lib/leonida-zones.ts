/**
 * Zonas esquemáticas de Leonida — mapa interactivo (sección 1.1 del análisis).
 *
 * IMPORTANTE — origen y estándar de evidencia:
 * Estas 5 zonas NO son un mapa oficial de Rockstar Games ni una copia del
 * archivo filtrado por el grupo CYBERLEEK el 18/08/2026 (activamente bajo
 * DMCA de Take-Two). Son una reconstrucción esquemática propia — polígonos
 * abstractos dibujados a mano, sin trazar ni reproducir la imagen filtrada —
 * basada únicamente en la disposición relativa (norte/sur/este/oeste/centro)
 * que reportó la cobertura periodística sobre esa filtración.
 *
 * Reemplazar por el mapa real en cuanto Rockstar confirme uno oficial
 * (presentación Netflix 27/08/2026) o se decida un trazado manual verificado.
 *
 * Vínculos con contenido ya catalogado del sitio: solo se asignan ubicaciones
 * a una zona cuando existe un dato YA confirmado en su propia ficha que lo
 * respalda (ver `locationSlugs` de cada zona) — no se adivinó ninguna
 * posición real de ningún lugar. El resto de las 20 ubicaciones queda sin
 * zona asignada. Los puntos `pinAnchor` marcan solo "en algún lugar de esta
 * zona" a nivel ilustrativo — no son coordenadas reales de la ubicación.
 */

export interface LeonidaZone {
  id: string
  /** Nombre tal como lo reportó la cobertura de la filtración CYBERLEEK. */
  leakName: string
  /** Posición aproximada dentro del diagrama esquemático (no geográfica real). */
  position: 'norte' | 'oeste' | 'este' | 'centro' | 'sur'
  /** Polígono cerrado (viewBox 0 0 480 420). Vértices EXACTOS compartidos con las
   *  zonas vecinas (ver LEONIDA_MAP_VERTICES) — así no quedan huecos ni superposiciones
   *  entre zonas, sin importar el orden en que se dibujen. */
  path: string
  /** Punto de referencia para el label (centroide visual del polígono, no su centroide matemático). */
  labelPoint: { x: number; y: number }
  /** Punto interior donde anclar los pines de ubicación de esta zona (separado del label para que no se pisen). */
  pinAnchor: { x: number; y: number }
  description: string
  /** Slugs de `ubicaciones/` con un dato ya confirmado en su propia ficha que respalda la asignación a esta zona. */
  locationSlugs: string[]
  sourceNote: string
}

/**
 * Vértices compartidos del contorno y las divisorias internas. Definidos una
 * sola vez y reutilizados en los `path` de abajo para garantizar que dos
 * zonas vecinas dibujen exactamente el mismo borde (mismos números, no
 * aproximaciones independientes que podrían dejar un hueco de 1-2px).
 */
export const LEONIDA_MAP_VERTICES = {
  A: '60,40', // esquina noroeste
  B: '420,55', // esquina noreste
  C: '455,140', // costa este, tramo superior
  D: '430,230', // costa este, tramo medio
  E: '370,290', // costa este, antes del istmo sur
  F: '300,340', // punta de la península (norte de los cayos)
  G: '260,340', // punta de la península (lado oeste)
  H: '170,300', // costa oeste, tramo bajo
  I: '90,230', // costa oeste, tramo medio
  J: '55,130', // costa oeste, tramo superior
  P1: '150,150', // divisoria Lummox / Kelly / Vice-Dale
  P2: '330,140', // divisoria Lummox / Leonard / Vice-Dale
  P3: '240,160', // divisoria Lummox / Vice-Dale (tope)
  Q1: '160,260', // divisoria Kelly / Vice-Dale / Mariana
  Q2: '320,250', // divisoria Vice-Dale / Leonard / Mariana
  Q3: '230,300', // divisoria Vice-Dale / Mariana (base)
} as const

const V = LEONIDA_MAP_VERTICES

/** Contorno completo de la masa de tierra (costa), para la silueta de fondo. */
export const LEONIDA_COASTLINE = `M${V.A} L${V.B} L${V.C} L${V.D} L${V.E} L${V.F} L${V.G} L${V.H} L${V.I} L${V.J} Z`

/** Pequeñas islas al sur de la península — sugieren la cadena de cayos sin afirmar formas reales. */
export const LEONIDA_KEYS_ISLANDS = [
  { cx: 305, cy: 368, rx: 14, ry: 7 },
  { cx: 330, cy: 388, rx: 10, ry: 5 },
  { cx: 350, cy: 402, rx: 7, ry: 4 },
]

export const LEONIDA_ZONES: LeonidaZone[] = [
  {
    id: 'lummox',
    leakName: 'Lummox County',
    position: 'norte',
    path: `M${V.J} L${V.A} L${V.B} L${V.C} L${V.P2} L${V.P3} L${V.P1} Z`,
    labelPoint: { x: 230, y: 90 },
    pinAnchor: { x: 230, y: 100 },
    description:
      'Reportado como la región rural del norte de Leonida. No aparece en ningún material oficial de Rockstar hasta la fecha; un proyecto de mapeo de fans (activo desde 2022) cuestionó su autenticidad.',
    locationSlugs: [],
    sourceNote:
      'Solo referenciado por la cobertura de la filtración CYBERLEEK (18/08/2026); sin ubicación del catálogo confirmada dentro de esta zona todavía.',
  },
  {
    id: 'kelly',
    leakName: 'Kelly County',
    position: 'oeste',
    path: `M${V.J} L${V.P1} L${V.Q1} L${V.H} L${V.I} Z`,
    labelPoint: { x: 100, y: 195 },
    pinAnchor: { x: 105, y: 205 },
    description:
      'Condado al suroeste, confirmado por Rockstar en un cartel de la Interestatal 404 en el Trailer 1 — el nombre coincide con el reportado en la filtración. Alberga Port Gellhorn y el Gellhorn International Raceway.',
    locationSlugs: ['kelly-county', 'port-gellhorn'],
    sourceNote:
      'Posición oeste confirmada de forma independiente por Rockstar (Trailer 1, cartel vial) — ver evidencia en la ficha de kelly-county. La existencia del nombre en la filtración es coincidente, no la fuente de esta asignación.',
  },
  {
    id: 'leonard',
    leakName: 'Leonard County',
    position: 'este',
    path: `M${V.P2} L${V.C} L${V.D} L${V.E} L${V.Q2} Z`,
    labelPoint: { x: 390, y: 205 },
    pinAnchor: { x: 385, y: 215 },
    description: 'Reportado como región al este de Leonida. Sin material oficial de Rockstar que lo confirme.',
    locationSlugs: [],
    sourceNote:
      'Solo referenciado por la cobertura de la filtración CYBERLEEK (18/08/2026); sin ubicación del catálogo confirmada dentro de esta zona todavía.',
  },
  {
    id: 'vice-dale',
    leakName: 'Vice-Dale County',
    position: 'centro',
    path: `M${V.P1} L${V.P3} L${V.P2} L${V.Q2} L${V.Q3} L${V.Q1} Z`,
    labelPoint: { x: 240, y: 210 },
    pinAnchor: { x: 240, y: 220 },
    description:
      'Reportado como el condado central y urbano, equivalente en la filtración al área metropolitana de Vice City. Vice City en sí (y sus distritos ya catalogados) es la única entidad de esta zona confirmada por Rockstar de forma directa.',
    locationSlugs: [
      'vice-city',
      'downtown-vice-city',
      'southside-vice-city',
      'little-cuba',
      'ocean-beach',
      'la-perle',
      'tequesta',
      'stockyard',
      'watson-bay',
      'vice-city-port',
    ],
    sourceNote:
      'Vice City y sus distritos están confirmados oficialmente como ubicaciones dentro de Leonida (ver evidencia individual de cada ficha); la etiqueta "Vice-Dale County" y su posición central provienen exclusivamente de la cobertura de la filtración CYBERLEEK, no de Rockstar.',
  },
  {
    id: 'mariana',
    leakName: 'Mariana County',
    position: 'sur',
    path: `M${V.Q1} L${V.Q3} L${V.Q2} L${V.E} L${V.F} L${V.G} L${V.H} Z`,
    labelPoint: { x: 265, y: 320 },
    pinAnchor: { x: 265, y: 330 },
    description:
      'Reportado como la región sur de humedales e islas, similar a los Cayos de Florida — coincide con la ubicación de Leonida Keys ya catalogada, que Rockstar confirmó como cadena de islas al sur.',
    locationSlugs: ['leonida-keys', 'astillero-brian-heder'],
    sourceNote:
      'Leonida Keys está confirmada oficialmente por Rockstar como cadena de islas (ver su propia ficha); la coincidencia con "Mariana County" en posición y carácter (humedales/islas) proviene de la cobertura de la filtración CYBERLEEK, no de una confirmación directa de Rockstar.',
  },
]

export const LEONIDA_ZONES_SOURCE = {
  leakName: 'CYBERLEEK',
  leakDate: '2026-08-18',
  note:
    'Filtración sin autenticar de forma oficial por Rockstar Games o Take-Two Interactive. Varias publicaciones con el material fueron retiradas por avisos DMCA, lo que la cobertura especializada interpreta como indicio (no prueba) de autenticidad. Un proyecto de mapeo de fans activo desde 2022 cuestionó específicamente los condados Lummox y Mariana por no coincidir con ningún material previo.',
}
