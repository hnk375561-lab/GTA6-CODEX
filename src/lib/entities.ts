import { Entity, EntityType, BaseEntity } from '@/types'
import { safeParseEntity, safeParseVehicle, safeParseManufacturer } from '@/types/schemas'
import { clearRelationCache } from './relations'
import { CONTENT_BUNDLE } from './generated/content-bundle'

/**
 * Validación adicional específica de tipo, para entidades cuyo contrato
 * va más allá de BaseEntity (Vehicle tiene `performance` con forma propia).
 * Se ejecuta después de `validateEntity` (que ya garantiza el contrato
 * base) y solo agrega chequeos extra; nunca afloja lo que `validateEntity`
 * ya exige. Los `GenericEntity` (noticias, guias) no tienen caso acá a
 * propósito: ya quedan cubiertos por `validateEntity` (BaseEntitySchema)
 * y su contrato es intencionalmente abierto.
 */
/** Extrae `slug` de un valor no validado solo para mensajes de log; no asume forma. */
function slugForLog(entity: unknown): string {
  if (entity && typeof entity === 'object' && 'slug' in entity && typeof (entity as { slug: unknown }).slug === 'string') {
    return (entity as { slug: string }).slug
  }
  return '(sin slug)'
}

function validateTypeSpecific(type: EntityType, entity: unknown, contextLabel: string): boolean {
  let result: ReturnType<typeof safeParseVehicle> | ReturnType<typeof safeParseManufacturer> | null = null

  if (type === EntityType.VEHICLE) {
    result = safeParseVehicle(entity)
  } else if (type === EntityType.MANUFACTURER) {
    result = safeParseManufacturer(entity)
  }

  if (result && !result.success) {
    console.warn(`[entities] Entidad inválida (${type}) en ${contextLabel}: ${result.error.message}`)
    return false
  }
  return true
}



/**
 * CACHÉ EN MEMORIA
 * ==================
 * Todo el contenido está embebido en el bundle (generado en build time,
 * sin I/O de runtime). Cachear siempre es seguro y gratis: la única "fuente
 * de verdad" en runtime es el objeto `CONTENT_BUNDLE` en memoria.
 * En `next dev`, los cambios a JSON requieren `npm run build` (o solo
 * `node scripts/generate-content-bundle.mjs`) para que se reflejen.
 */
const CACHE_ENABLED = true

const typeCache = new Map<EntityType, Entity[]>()
const singleEntityCache = new Map<string, Entity | null>()
/**
 * Índice por slug para búsquedas O(1) en lugar de O(n).
 * Solo se construye cuando se carga un tipo completo por primera vez.
 * Clave: "type/slug", Valor: Entity
 */
const slugIndex = new Map<string, Entity>()

/**
 * Genera clave de caché única para una entidad específica.
 * @param type - Tipo de entidad
 * @param slug - Slug de la entidad
 * @returns Clave de caché en formato "type/slug"
 */
function entityCacheKey(type: EntityType, slug: string): string {
  return `${type}/${slug}`
}

/**
 * Limpia toda la caché en memoria. Expuesto para tests / scripts que
 * necesiten releer contenido dentro del mismo proceso (ej. watchers).
 * También limpia el caché de relaciones bidireccionales ya que dependen
 * del contenido de entidades.
 */
export function clearEntityCache(): void {
  typeCache.clear()
  singleEntityCache.clear()
  slugIndex.clear()
  clearRelationCache()
}

/**
 * Core síncrono de carga: valida todos los datos de un tipo desde el bundle.
 * El bundle fue generado en build time (scripts/generate-content-bundle.mjs),
 * y ahora vive completamente en memoria — cero I/O de runtime, cero CPU timeout.
 * 
 * @param type - Tipo de entidad a cargar
 * @returns Array de entidades válidas del tipo especificado
 */
function loadEntitiesByTypeSync(type: EntityType): Entity[] {
  if (typeCache.has(type)) {
    return typeCache.get(type)!
  }

  // El bundle está tipado como Entity[] pero en runtime es JSON crudo sin
  // validar todavía (por eso `validateEntity` existe) — se itera como
  // `unknown` para que el type guard narrowe de verdad en vez de partir
  // de un `never` cuando falla.
  const raw = (CONTENT_BUNDLE[type] ?? []) as unknown[]
  const entities: Entity[] = []

  for (const parsed of raw) {
    if (!validateEntity(parsed)) {
      console.warn(`[entities] Entidad inválida ignorada: ${type}/${slugForLog(parsed)}`)
      continue
    }

    if (!validateTypeSpecific(type, parsed, `${type}/${parsed.slug}`)) {
      continue
    }

    entities.push(parsed as Entity)
  }

  entities.sort((a, b) => a.title.localeCompare(b.title, 'es'))

  typeCache.set(type, entities)
  // Construir índice por slug para búsquedas O(1)
  entities.forEach(entity => {
    slugIndex.set(entityCacheKey(type, entity.slug), entity)
  })

  return entities
}

/**
 * Variante síncrona de `getEntitiesByType`, para código que no puede (o no
 * necesita) usar `await` — ej. módulos que se ejecutan fuera de un Server
 * Component async, o utilidades que se apoyan en varias entidades a la vez
 * dentro de una función síncrona.
 * 
 * @param type - Tipo de entidad a cargar
 * @returns Array de entidades del tipo especificado
 */
export function getEntitiesByTypeSync(type: EntityType): Entity[] {
  return loadEntitiesByTypeSync(type)
}

/**
 * Carga todas las entidades de un tipo específico.
 * Lee todos los archivos .json en /content/{type}/
 * 
 * @param type - Tipo de entidad a cargar
 * @returns Array de entidades del tipo especificado
 */
export async function getEntitiesByType(type: EntityType): Promise<Entity[]> {
  return loadEntitiesByTypeSync(type)
}

/**
 * Obtiene una entidad específica por tipo y slug.
 * 
 * @param type - Tipo de entidad
 * @param slug - Slug de la entidad
 * @returns La entidad si existe, null si no
 */
export async function getEntity(type: EntityType, slug: string): Promise<Entity | null> {
  const cacheKey = entityCacheKey(type, slug)
  if (singleEntityCache.has(cacheKey)) {
    return singleEntityCache.get(cacheKey)!
  }

  // Si ya cacheamos el tipo completo, resolvemos desde el índice O(1)
  if (slugIndex.has(cacheKey)) {
    const found = slugIndex.get(cacheKey) || null
    singleEntityCache.set(cacheKey, found)
    return found
  }

  // Fuerza la carga completa del tipo (llena slugIndex) y reintenta
  loadEntitiesByTypeSync(type)
  const found = slugIndex.get(cacheKey) || null
  singleEntityCache.set(cacheKey, found)
  return found
}

/**
 * Obtiene todos los slugs de un tipo (para generación de rutas estáticas).
 * 
 * @param type - Tipo de entidad
 * @returns Array de slugs para generar rutas estáticas
 */
export async function getEntitySlugs(type: EntityType): Promise<string[]> {
  return loadEntitiesByTypeSync(type).map((e) => e.slug)
}

/**
 * Obtiene todas las entidades de todos los tipos.
 * Nota: Carga todas las entidades en memoria. Para volúmenes grandes
 * (1000+ entidades), considerar implementación con paginación o lazy loading.
 * 
 * @returns Array con todas las entidades de todos los tipos
 */
export async function getAllEntities(): Promise<Entity[]> {
  const all: Entity[] = []
  for (const type of Object.values(EntityType)) {
    all.push(...loadEntitiesByTypeSync(type))
  }
  return all
}

/**
 * Obtiene las entidades marcadas como destacadas ("featured").
 *
 * @param limit - Cantidad máxima de entidades a retornar (default: 6)
 * @param type - Si se pasa, filtra solo destacadas de ese tipo (p. ej.
 *   `EntityType.VEHICLE`). Sin `type`, se comporta igual que antes: mezcla
 *   todos los tipos. Se agregó para la sección "Destacados" de la home, que
 *   solo quiere vehículos (son los únicos con foto real hoy — mezclar
 *   guías/noticias ahí dejaba cards sin imagen).
 * @returns Array de entidades destacadas ordenadas por fecha de actualización
 */
export async function getFeaturedEntities(limit = 6, type?: EntityType): Promise<Entity[]> {
  const all = await getAllEntities()
  return all
    .filter((e) => e.featured && (type === undefined || e.type === type))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, limit)
}

/**
 * `updatedAt` más reciente entre TODAS las entidades del sitio (no solo
 * las destacadas de `getFeaturedEntities`). Usado por el pill del hero
 * en la home para mostrar una señal real de frescura ("Actualizado hace
 * X") — reutiliza el mismo `getAllEntities()` cacheado que ya usa el
 * resto de este módulo, así que no agrega ninguna lectura de disco
 * adicional en producción.
 *
 * @returns ISO string de la actualización más reciente, o null si no hay
 * entidades cargadas (caso borde, no debería pasar en producción).
 */
export async function getMostRecentUpdate(): Promise<string | null> {
  const all = await getAllEntities()
  if (all.length === 0) return null
  return all.reduce((latest, e) => (e.updatedAt > latest ? e.updatedAt : latest), all[0].updatedAt)
}

/**
 * Cuenta el total de entidades publicadas (todas las categorías).
 * 
 * @returns Total de entidades válidas en el sistema
 */
export async function getEntityCount(): Promise<number> {
  const all = await getAllEntities()
  return all.length
}

/**
 * Cuenta entidades por tipo. Devuelve un mapa type -> count.
 * Reutiliza la caché de contenido en vez de solo contar archivos en disco,
 * para que el conteo refleje entidades *válidas* (consistente con el resto
 * de la API) y no archivos crudos que después se descartan por inválidos.
 * 
 * @returns Objeto con el conteo de entidades por tipo
 */
export async function getEntityCountsByType(): Promise<Record<EntityType, number>> {
  const counts = {} as Record<EntityType, number>
  for (const type of Object.values(EntityType)) {
    counts[type] = loadEntitiesByTypeSync(type).length
  }
  return counts
}

/**
 * Valida que una entidad cumpla el contrato base.
 *
 * Delegado íntegramente en `BaseEntitySchema` (Zod, `src/types/schemas.ts`)
 * en vez de reimplementar los mismos chequeos a mano: antes existían dos
 * validadores en paralelo (este, usado en la práctica, y `safeParseEntity`/
 * `BaseEntitySchema`, definidos pero nunca invocados desde ningún caller
 * real), con el riesgo de que evolucionaran distinto sin que nadie lo
 * notara. Se mantiene la firma pública (`entity is BaseEntity`, boolean)
 * para no tocar a ningún caller existente.
 */
export function validateEntity(entity: unknown): entity is BaseEntity {
  return safeParseEntity(entity).success
}

/**
 * Normaliza un slug a formato URL-safe.
 * Incluye normalización de acentos (á, é, í, ó, ú, ñ) para que títulos en
 * español ("Lucía Caminos" -> "lucia-caminos") generen slugs limpios en
 * vez de perder la letra acentuada silenciosamente en el regex de abajo.
 * 
 * @param input - Texto a normalizar (generalmente un título)
 * @returns Slug en formato URL-safe
 */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita diacríticos (incluye ñ -> n)
    .replace(/[^\w\s-]/g, '') // remueve caracteres especiales restantes
    .replace(/\s+/g, '-') // espacios -> guiones
    .replace(/-+/g, '-') // colapsa guiones repetidos
    .replace(/^-+|-+$/g, '') // recorta guiones al inicio/final
}

/**
 * Obtiene el path de ruta para una entidad.
 * 
 * @param type - Tipo de entidad
 * @param slug - Slug de la entidad
 * @returns Path de ruta en formato "/type/slug"
 */
export function getEntityPath(type: EntityType, slug: string): string {
  return `/${type}/${slug}`
}
