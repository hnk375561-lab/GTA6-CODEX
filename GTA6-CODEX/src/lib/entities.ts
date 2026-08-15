import fs from 'fs'
import path from 'path'
import { Entity, EntityType, BaseEntity } from '@/types'
import { safeParseTrailer } from '@/types/schemas'

/**
 * Validación adicional específica de tipo, para entidades cuyo contrato
 * va más allá de BaseEntity (ej. Trailer requiere `scenes`). Se ejecuta
 * después de `validateEntity` (que ya garantiza el contrato base) y solo
 * agrega chequeos extra; nunca afloja lo que `validateEntity` ya exige.
 */
function validateTypeSpecific(type: EntityType, entity: unknown, contextLabel: string): boolean {
  if (type === EntityType.TRAILER) {
    const result = safeParseTrailer(entity)
    if (!result.success) {
      console.warn(`[entities] Trailer inválido en ${contextLabel}: ${result.error.message}`)
      return false
    }
  }
  return true
}

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content')

function getContentDirForType(type: EntityType): string {
  return path.join(CONTENT_DIR, type)
}

/**
 * CACHÉ EN MEMORIA
 * ==================
 * Todo el contenido vive en JSON en disco y se lee con fs *sync* (no hay
 * I/O real de red). Sin caché, cada page/build request re-lee y re-parsea
 * los mismos archivos: una entidad con 5 relaciones dispara 5 lecturas de
 * disco completas por página, y funciones que recorren TODO el contenido
 * (`getBidirectionalRelations`, `getAllEntities`, la galería, el sitemap)
 * terminan re-leyendo todo el árbol de contenido una vez por cada entidad
 * que exista — O(n²) I/O en un build que ya de por sí genera cientos de
 * páginas estáticas.
 *
 * Se cachea únicamente en producción/build (`NODE_ENV === 'production'`).
 * En `next dev` se deja el comportamiento original (siempre leer de
 * disco) a propósito: el flujo documentado en el README es "crear/editar
 * un JSON y verlo reflejado en dev sin reiniciar nada"; cachear ahí
 * rompería esa experiencia de autoría de contenido.
 */
const CACHE_ENABLED = process.env.NODE_ENV === 'production'

const typeCache = new Map<EntityType, Entity[]>()
const singleEntityCache = new Map<string, Entity | null>()

function entityCacheKey(type: EntityType, slug: string): string {
  return `${type}/${slug}`
}

/** Limpia toda la caché en memoria. Expuesto para tests / scripts que
 *  necesiten releer contenido dentro del mismo proceso (ej. watchers). */
export function clearEntityCache(): void {
  typeCache.clear()
  singleEntityCache.clear()
}

/**
 * Core síncrono de carga: lee, parsea y valida todos los JSON de un tipo.
 * Separado de `getEntitiesByType` para que otros módulos (ej. `lib/media.ts`,
 * que necesita leer trailers sin poder usar `await`) puedan reutilizar
 * exactamente la misma lógica de lectura/validación/caché en vez de
 * reimplementar su propia lectura de fs por separado.
 */
function loadEntitiesByTypeSync(type: EntityType): Entity[] {
  if (CACHE_ENABLED && typeCache.has(type)) {
    return typeCache.get(type)!
  }

  const dir = getContentDirForType(type)
  if (!fs.existsSync(dir)) {
    if (CACHE_ENABLED) typeCache.set(type, [])
    return []
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
  const entities: Entity[] = []

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8')
      const parsed = JSON.parse(raw)

      if (!validateEntity(parsed)) {
        console.warn(`[entities] Entidad inválida ignorada: ${type}/${file}`)
        continue
      }

      if (!validateTypeSpecific(type, parsed, `${type}/${file}`)) {
        continue
      }

      const expectedSlug = file.replace(/\.json$/, '')
      if (parsed.slug !== expectedSlug) {
        console.warn(
          `[entities] Slug "${parsed.slug}" no coincide con nombre de archivo "${file}" en ${type}`
        )
      }

      entities.push(parsed as Entity)
    } catch (err) {
      console.warn(`[entities] Error leyendo ${type}/${file}:`, err)
    }
  }

  entities.sort((a, b) => a.title.localeCompare(b.title, 'es'))

  if (CACHE_ENABLED) typeCache.set(type, entities)
  return entities
}

/**
 * Variante síncrona de `getEntitiesByType`, para código que no puede (o no
 * necesita) usar `await` — ej. módulos que se ejecutan fuera de un Server
 * Component async, o utilidades que se apoyan en varias entidades a la vez
 * dentro de una función síncrona.
 */
export function getEntitiesByTypeSync(type: EntityType): Entity[] {
  return loadEntitiesByTypeSync(type)
}

/**
 * Carga todas las entidades de un tipo específico.
 * Lee todos los archivos .json en /content/{type}/
 */
export async function getEntitiesByType(type: EntityType): Promise<Entity[]> {
  return loadEntitiesByTypeSync(type)
}

/**
 * Obtiene una entidad específica por tipo y slug
 */
export async function getEntity(type: EntityType, slug: string): Promise<Entity | null> {
  const cacheKey = entityCacheKey(type, slug)
  if (CACHE_ENABLED && singleEntityCache.has(cacheKey)) {
    return singleEntityCache.get(cacheKey)!
  }

  // Si ya cacheamos el tipo completo (ej. por una llamada previa a
  // getEntitiesByType/getAllEntities), resolvemos desde ahí sin tocar fs.
  if (CACHE_ENABLED && typeCache.has(type)) {
    const found = typeCache.get(type)!.find((e) => e.slug === slug) || null
    singleEntityCache.set(cacheKey, found)
    return found
  }

  const filePath = path.join(getContentDirForType(type), `${slug}.json`)
  let result: Entity | null = null

  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(raw)
      if (validateEntity(parsed) && validateTypeSpecific(type, parsed, `${type}/${slug}.json`)) {
        result = parsed as Entity
      }
    } catch (err) {
      console.warn(`[entities] Error leyendo ${type}/${slug}.json:`, err)
    }
  }

  if (CACHE_ENABLED) singleEntityCache.set(cacheKey, result)
  return result
}

/**
 * Obtiene todos los slugs de un tipo (para generación de rutas estáticas)
 */
export async function getEntitySlugs(type: EntityType): Promise<string[]> {
  return loadEntitiesByTypeSync(type).map((e) => e.slug)
}

/**
 * Obtiene todas las entidades de todos los tipos
 */
export async function getAllEntities(): Promise<Entity[]> {
  const all: Entity[] = []
  for (const type of Object.values(EntityType)) {
    all.push(...loadEntitiesByTypeSync(type))
  }
  return all
}

/**
 * Obtiene las entidades marcadas como destacadas ("featured")
 */
export async function getFeaturedEntities(limit = 6): Promise<Entity[]> {
  const all = await getAllEntities()
  return all
    .filter((e) => e.featured)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, limit)
}

/**
 * Cuenta el total de entidades publicadas (todas las categorías)
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
 */
export async function getEntityCountsByType(): Promise<Record<EntityType, number>> {
  const counts = {} as Record<EntityType, number>
  for (const type of Object.values(EntityType)) {
    counts[type] = loadEntitiesByTypeSync(type).length
  }
  return counts
}

/**
 * Valida que una entidad cumpla el contrato base
 */
export function validateEntity(entity: unknown): entity is BaseEntity {
  if (!entity || typeof entity !== 'object') return false

  const e = entity as Record<string, unknown>

  // Campos obligatorios
  if (!e.slug || typeof e.slug !== 'string') return false
  if (!e.type || typeof e.type !== 'string') return false
  if (!e.title || typeof e.title !== 'string') return false
  if (!e.description || typeof e.description !== 'string') return false
  if (!e.status || typeof e.status !== 'string') return false
  if (!e.createdAt || typeof e.createdAt !== 'string') return false
  if (!e.updatedAt || typeof e.updatedAt !== 'string') return false

  // createdAt/updatedAt deben ser fechas parseables, no solo strings.
  // sitemap.ts (y generateEntityJsonLd en seo.ts) construyen new Date(...) a
  // partir de estos campos; un string no parseable produce un Invalid Date
  // cuyo .toISOString() TIRA (RangeError: Invalid time value) en vez de
  // fallar silenciosamente. Como sitemap.xml se prerenderiza en build time,
  // una sola entidad con una fecha malformada tira ABAJO TODO `next build`
  // (reproducido y confirmado), no solo esa entidad. Se valida acá, en el
  // mismo lugar donde ya se rechazan otras entidades con forma inválida.
  if (isNaN(new Date(e.createdAt as string).getTime())) return false
  if (isNaN(new Date(e.updatedAt as string).getTime())) return false

  // Validar que status sea uno de los valores permitidos
  if (!['confirmado', 'rumor', 'nuestro'].includes(e.status as string)) return false

  // Validar que type sea uno de los EntityType válidos
  const validTypes = Object.values(EntityType)
  if (!validTypes.includes(e.type as EntityType)) return false

  return true
}

/**
 * Normaliza un slug a formato URL-safe.
 * Incluye normalización de acentos (á, é, í, ó, ú, ñ) para que títulos en
 * español ("Lucía Caminos" -> "lucia-caminos") generen slugs limpios en
 * vez de perder la letra acentuada silenciosamente en el regex de abajo.
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
 * Obtiene el path de ruta para una entidad
 */
export function getEntityPath(type: EntityType, slug: string): string {
  return `/${type}/${slug}`
}
