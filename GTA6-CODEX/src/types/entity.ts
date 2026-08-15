import fs from 'fs'
import path from 'path'
import { Entity, EntityType, BaseEntity } from '@/types'
import {
  safeParseEntity,
  safeParseTrailer,
  safeParseCharacter,
  safeParseVehicle,
  safeParseLocation,
  safeParseMission,
} from '@/types/schemas'

/**
 * Validación adicional específica de tipo, para entidades cuyo contrato
 * va más allá de BaseEntity (ej. Trailer requiere `scenes`; Vehicle tiene
 * `performance` con forma propia). Se ejecuta después de `validateEntity`
 * (que ya garantiza el contrato base) y solo agrega chequeos extra; nunca
 * afloja lo que `validateEntity` ya exige. Los 7 `GenericEntity` (armas,
 * actividades, organizaciones, negocios, objetos, noticias, guias) no
 * tienen caso acá a propósito: ya quedan cubiertos por `validateEntity`
 * (BaseEntitySchema) y su contrato es intencionalmente abierto.
 */
function validateTypeSpecific(type: EntityType, entity: unknown, contextLabel: string): boolean {
  const result =
    type === EntityType.TRAILER
      ? safeParseTrailer(entity)
      : type === EntityType.CHARACTER
        ? safeParseCharacter(entity)
        : type === EntityType.VEHICLE
          ? safeParseVehicle(entity)
          : type === EntityType.LOCATION
            ? safeParseLocation(entity)
            : type === EntityType.MISSION
              ? safeParseMission(entity)
              : null

  if (result && !result.success) {
    console.warn(`[entities] Entidad inválida (${type}) en ${contextLabel}: ${result.error.message}`)
    return false
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

      // BLOQUEANTE (antes solo advertía y seguía): `getEntitySlugs()` /
      // `generateStaticParams()` usan `parsed.slug` para construir la ruta
      // estática, mientras que `getEntity()` busca el archivo por
      // `${slug}.json`. Si no coinciden, se genera una ruta que en
      // producción resuelve en 404 silencioso. Se excluye la entidad del
      // build (mismo patrón que una entidad inválida) en vez de dejarla
      // pasar con una ruta rota; no se aborta el build completo, para no
      // reintroducir el problema ya corregido de que un solo archivo mal
      // formado tire abajo `next build` entero (ver comentario de
      // `validateEntity` más abajo).
      const expectedSlug = file.replace(/\.json$/, '')
      if (parsed.slug !== expectedSlug) {
        console.error(
          `[entities] Entidad excluida (slug/archivo no coinciden): slug "${parsed.slug}" ` +
            `no coincide con el nombre de archivo "${file}" en ${type}. Renombrá el archivo a ` +
            `"${parsed.slug}.json" o corregí el campo "slug" para que coincida con "${expectedSlug}".`
        )
        continue
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
        // Mismo chequeo bloqueante que `loadEntitiesByTypeSync`: este path
        // se toma en acceso directo por slug (fuera de `generateStaticParams`,
        // ej. request dinámico), así que necesita la misma garantía —si no,
        // una entidad con slug interno desincronizado del nombre de archivo
        // podía servirse igual bajo la URL del archivo, con canonical/JSON-LD
        // apuntando a un slug distinto al de la URL real.
        if (parsed.slug !== slug) {
          console.error(
            `[entities] Entidad excluida (slug/archivo no coinciden): slug "${parsed.slug}" ` +
              `no coincide con el nombre de archivo "${slug}.json" en ${type}.`
          )
        } else {
          result = parsed as Entity
        }
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
