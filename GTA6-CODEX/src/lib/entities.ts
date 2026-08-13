import { Entity, EntityType, BaseEntity } from '@/types'

/**
 * Carga todas las entidades de un tipo específico
 * 
 * Nota: En fase 1, esto es un stub. Cuando tengamos contenido,
 * se implementará para leer archivos JSON de /content/{type}/
 */
export async function getEntitiesByType(type: EntityType): Promise<Entity[]> {
  // STUB: Retorna array vacío en fase 1
  // Implementar: Leer archivos JSON de content/{type}/*.json
  return []
}

/**
 * Obtiene una entidad específica por tipo y slug
 */
export async function getEntity(type: EntityType, slug: string): Promise<Entity | null> {
  // STUB: Fase 1
  // Implementar: Leer content/{type}/{slug}.json
  return null
}

/**
 * Obtiene todos los slugs de un tipo (para generación de rutas estáticas)
 */
export async function getEntitySlugs(type: EntityType): Promise<string[]> {
  // STUB: Fase 1
  // Implementar: Listar archivos en content/{type}/ y extraer slugs
  return []
}

/**
 * Obtiene todas las entidades de todos los tipos
 */
export async function getAllEntities(): Promise<Entity[]> {
  // STUB: Fase 1
  // Implementar: Cargar todas las entidades de todos los tipos
  return []
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
