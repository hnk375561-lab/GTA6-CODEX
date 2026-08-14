import fs from 'fs'
import path from 'path'
import { Entity, EntityType, BaseEntity } from '@/types'

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content')

function getContentDirForType(type: EntityType): string {
  return path.join(CONTENT_DIR, type)
}

/**
 * Carga todas las entidades de un tipo específico
 * Lee todos los archivos .json en /content/{type}/
 */
export async function getEntitiesByType(type: EntityType): Promise<Entity[]> {
  const dir = getContentDirForType(type)
  if (!fs.existsSync(dir)) return []

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

  return entities.sort((a, b) => a.title.localeCompare(b.title, 'es'))
}

/**
 * Obtiene una entidad específica por tipo y slug
 */
export async function getEntity(type: EntityType, slug: string): Promise<Entity | null> {
  const filePath = path.join(getContentDirForType(type), `${slug}.json`)
  if (!fs.existsSync(filePath)) return null

  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!validateEntity(parsed)) return null
    return parsed as Entity
  } catch (err) {
    console.warn(`[entities] Error leyendo ${type}/${slug}.json:`, err)
    return null
  }
}

/**
 * Obtiene todos los slugs de un tipo (para generación de rutas estáticas)
 */
export async function getEntitySlugs(type: EntityType): Promise<string[]> {
  const dir = getContentDirForType(type)
  if (!fs.existsSync(dir)) return []

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
}

/**
 * Obtiene todas las entidades de todos los tipos
 */
export async function getAllEntities(): Promise<Entity[]> {
  const all: Entity[] = []
  for (const type of Object.values(EntityType)) {
    const entities = await getEntitiesByType(type)
    all.push(...entities)
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
 * Fecha (ISO) de la entidad actualizada más recientemente, o null si no
 * hay entidades. Usada como metadata real del hero ("actualizado el...").
 */
export async function getLastUpdatedAt(): Promise<string | null> {
  const all = await getAllEntities()
  if (all.length === 0) return null
  return all.reduce((latest, e) => (e.updatedAt > latest ? e.updatedAt : latest), all[0].updatedAt)
}

/**
 * Cuenta el total de entidades publicadas (todas las categorías)
 */
export async function getEntityCount(): Promise<number> {
  const all = await getAllEntities()
  return all.length
}

/**
 * Cuenta entidades por tipo. Devuelve un mapa type -> count
 */
export async function getEntityCountsByType(): Promise<Record<EntityType, number>> {
  const counts = {} as Record<EntityType, number>
  for (const type of Object.values(EntityType)) {
    const dir = getContentDirForType(type)
    counts[type] = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).length
      : 0
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

  // Validar que status sea uno de los valores permitidos
  if (!['confirmado', 'rumor', 'nuestro'].includes(e.status as string)) return false

  // Validar que type sea uno de los EntityType válidos
  const validTypes = Object.values(EntityType)
  if (!validTypes.includes(e.type as EntityType)) return false

  return true
}

/**
 * Normaliza un slug a formato URL-safe
 */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Obtiene el path de ruta para una entidad
 */
export function getEntityPath(type: EntityType, slug: string): string {
  return `/${type}/${slug}`
}
