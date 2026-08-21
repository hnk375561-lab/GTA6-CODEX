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
 * posición. El resto de las 20 ubicaciones queda sin zona asignada.
 */

export interface LeonidaZone {
  id: string
  /** Nombre tal como lo reportó la cobertura de la filtración CYBERLEEK. */
  leakName: string
  /** Posición aproximada dentro del diagrama esquemático (no geográfica real). */
  position: 'norte' | 'oeste' | 'este' | 'centro' | 'sur'
  /** Forma abstracta del polígono en el SVG (viewBox 0 0 400 300). */
  path: string
  /** Punto de referencia para el label. */
  labelPoint: { x: number; y: number }
  description: string
  /** Slugs de `ubicaciones/` con un dato ya confirmado en su propia ficha que respalda la asignación a esta zona. */
  locationSlugs: string[]
  sourceNote: string
}

export const LEONIDA_ZONES: LeonidaZone[] = [
  {
    id: 'lummox',
    leakName: 'Lummox County',
    position: 'norte',
    path: 'M40,20 L360,20 L340,110 L60,110 Z',
    labelPoint: { x: 200, y: 60 },
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
    path: 'M40,20 L60,110 L110,270 L20,270 L10,120 Z',
    labelPoint: { x: 55, y: 160 },
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
    path: 'M340,110 L390,120 L380,270 L110,270 L110,110 Z',
    labelPoint: { x: 260, y: 190 },
    description: 'Reportado como región al este de Leonida. Sin material oficial de Rockstar que lo confirme.',
    locationSlugs: [],
    sourceNote:
      'Solo referenciado por la cobertura de la filtración CYBERLEEK (18/08/2026); sin ubicación del catálogo confirmada dentro de esta zona todavía.',
  },
  {
    id: 'vice-dale',
    leakName: 'Vice-Dale County',
    position: 'centro',
    path: 'M60,110 L340,110 L340,180 L110,180 L110,270 L60,270 Z',
    labelPoint: { x: 180, y: 150 },
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
    path: 'M110,180 L340,180 L380,270 L110,270 Z',
    labelPoint: { x: 230, y: 230 },
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
