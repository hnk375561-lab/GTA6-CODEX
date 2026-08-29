import { Entity, EntityRelation, EntityType } from '@/types'
import { getEntity, getEntitiesByType } from './entities'

/**
 * CACHÉ DE RELACIONES BIDIRECCIONALES
 * =====================================
 * Para evitar el costo O(n²) de inferir relaciones en cada llamada,
 * cacheamos los resultados por entidad. Clave: "type/slug", Valor: EntityRelation[]
 */
const bidirectionalCache = new Map<string, EntityRelation[]>()

/**
 * Genera clave de caché única para relaciones bidireccionales.
 * @param type - Tipo de entidad
 * @param slug - Slug de la entidad
 * @returns Clave de caché en formato "type/slug"
 */
function relationCacheKey(type: EntityType, slug: string): string {
  return `${type}/${slug}`
}

/**
 * Limpia el caché de relaciones bidireccionales.
 * Expuesto para tests / scripts que necesiten recalcular relaciones.
 */
export function clearRelationCache(): void {
  bidirectionalCache.clear()
}

/**
 * Obtiene todas las entidades relacionadas a una entidad,
 * resolviendo cada EntityRelation contra el contenido real.
 * 
 * @param entity - Entidad origen
 * @param limit - Límite opcional de relaciones a resolver
 * @returns Array de entidades relacionadas y existentes
 */
export async function getRelatedEntities(entity: Entity, limit?: number): Promise<Entity[]> {
  if (!entity.relations || entity.relations.length === 0) return []

  const relations = limit ? entity.relations.slice(0, limit) : entity.relations
  const resolved: Entity[] = []

  for (const rel of relations) {
    const target = await getEntity(rel.targetType, rel.targetSlug)
    if (target) resolved.push(target)
  }

  return resolved
}

/**
 * Igual que getRelatedEntities, pero conserva el tipo de relación
 * (label) junto a cada entidad resuelta, para poder agruparlas
 * visualmente por vínculo (ej. "Ubicado en", "Conduce", "Trabaja para").
 * 
 * @param entity - Entidad origen
 * @param limit - Límite opcional de relaciones a resolver
 * @returns Array de entidades con sus etiquetas de relación
 */
export async function getRelatedEntitiesWithLabel(
  entity: Entity,
  limit?: number
): Promise<Array<{ entity: Entity; relation: string }>> {
  if (!entity.relations || entity.relations.length === 0) return []

  const relations = limit ? entity.relations.slice(0, limit) : entity.relations
  const resolved: Array<{ entity: Entity; relation: string }> = []

  for (const rel of relations) {
    const target = await getEntity(rel.targetType, rel.targetSlug)
    if (target) resolved.push({ entity: target, relation: rel.relation })
  }

  return resolved
}

/**
 * Obtiene relaciones bidireccionales.
 * Si A relaciona con B, también retorna B como relacionado con A,
 * aunque B no declare explícitamente la relación inversa.
 * 
 * NOTA DE ESCALABILIDAD: Esta función tiene complejidad O(n²) porque
 * carga todas las entidades de todos los tipos para inferir relaciones
 * inversas. Para 162 entidades actuales es aceptable, pero para 1000+
 * entidades necesitará optimización (índices invertidos o sistema de
 * grafo dedicado).
 * 
 * @param entity - Entidad origen
 * @returns Array de relaciones directas e inferidas
 */
export async function getBidirectionalRelations(entity: Entity): Promise<EntityRelation[]> {
  const cacheKey = relationCacheKey(entity.type, entity.slug)
  if (bidirectionalCache.has(cacheKey)) {
    return bidirectionalCache.get(cacheKey)!
  }

  const direct = entity.relations || []

  // Relaciones explícitas marcadas como bidireccionales ya cuentan.
  // Para el resto, buscamos entidades del mismo tipo que referencien a esta.
  const inferred: EntityRelation[] = []

  // Se cargan todos los tipos en paralelo una sola vez (en vez de un
  // import() dinámico + lectura secuencial repetida en cada iteración).
  const entitiesByType = await Promise.all(
    Object.values(EntityType).map(async (type) => [type, await getEntitiesByType(type)] as const)
  )

  for (const [, candidates] of entitiesByType) {
    for (const candidate of candidates) {
      if (candidate.slug === entity.slug && candidate.type === entity.type) continue

      const pointsToThis = (candidate.relations || []).find(
        (r) => r.targetType === entity.type && r.targetSlug === entity.slug
      )

      if (pointsToThis) {
        const alreadyListed = direct.some(
          (r) => r.targetType === candidate.type && r.targetSlug === candidate.slug
        )
        if (!alreadyListed) {
          inferred.push({
            targetType: candidate.type,
            targetSlug: candidate.slug,
            relation: pointsToThis.relation,
            direction: 'from',
          })
        }
      }
    }
  }

  const result = [...direct, ...inferred]
  bidirectionalCache.set(cacheKey, result)
  return result
}

/**
 * Cuenta relaciones (explícitas + inferidas) sin resolver cada entidad
 * objetivo — solo lo que necesita una card de listado para mostrar
 * "N conexiones" incluyendo las inferidas. Reutiliza `getBidirectionalRelations`
 * (que ya evita resolver entidades completas) y se queda solo con el
 * largo — el caller server-side arma un mapa slug→count una sola vez por
 * listado y lo pasa a los componentes cliente como prop plana, mismo
 * patrón que `imageBySlug`/`clipUrlBySlug`.
 * 
 * @param entity - Entidad origen
 * @returns Total de relaciones (directas + inferidas)
 */
export async function getBidirectionalRelationCount(entity: Entity): Promise<number> {
  const relations = await getBidirectionalRelations(entity)
  return relations.length
}

/**
 * Igual que getRelatedEntitiesWithLabel, pero incluye también las
 * relaciones entrantes inferidas (getBidirectionalRelations), para que
 * una entidad como "leonida" -que no declara relations propias pero es
 * referenciada por 7 ubicaciones con located_in- muestre esos vínculos
 * en su panel "Relacionado" aunque nunca los haya declarado ella misma.
 * 
 * @param entity - Entidad origen
 * @param limit - Límite opcional de relaciones a resolver
 * @returns Array de entidades con sus etiquetas de relación (incluye inferidas)
 */
export async function getBidirectionalRelatedEntitiesWithLabel(
  entity: Entity,
  limit?: number
): Promise<Array<{ entity: Entity; relation: string }>> {
  const relations = await getBidirectionalRelations(entity)
  const sliced = limit ? relations.slice(0, limit) : relations
  const resolved: Array<{ entity: Entity; relation: string }> = []

  for (const rel of sliced) {
    const target = await getEntity(rel.targetType, rel.targetSlug)
    if (target) resolved.push({ entity: target, relation: rel.relation })
  }

  return resolved
}

/**
 * Agrupa relaciones por tipo de relación.
 * Útil para agrupación visual en UI (ej. todas las "ubicado_en" juntas).
 * 
 * @param relations - Array de relaciones a agrupar
 * @returns Map donde la clave es el tipo de relación y el valor es el array de relaciones
 */
export function groupRelationsByType(relations: EntityRelation[]): Map<string, EntityRelation[]> {
  const grouped = new Map<string, EntityRelation[]>()

  for (const relation of relations) {
    if (!grouped.has(relation.relation)) {
      grouped.set(relation.relation, [])
    }
    grouped.get(relation.relation)!.push(relation)
  }

  return grouped
}

/**
 * Agrupa relaciones por tipo de entidad objetivo.
 * Útil para mostrar secciones separadas por categoría (ej. "Personajes relacionados", "Ubicaciones").
 * 
 * @param relations - Array de relaciones a agrupar
 * @returns Map donde la clave es el tipo de entidad y el valor es el array de relaciones
 */
export function groupRelationsByEntityType(relations: EntityRelation[]): Map<EntityType, EntityRelation[]> {
  const grouped = new Map<EntityType, EntityRelation[]>()

  for (const relation of relations) {
    if (!grouped.has(relation.targetType)) {
      grouped.set(relation.targetType, [])
    }
    grouped.get(relation.targetType)!.push(relation)
  }

  return grouped
}

/**
 * Valida que una relación sea válida según el contrato EntityRelation.
 * 
 * @param relation - Relación a validar
 * @returns true si la relación es válida, false si no
 */
export function validateRelation(relation: EntityRelation): boolean {
  if (!relation.targetType || !relation.targetSlug || !relation.relation) {
    return false
  }

  const validTypes = Object.values(EntityType)
  if (!validTypes.includes(relation.targetType)) {
    return false
  }

  if (typeof relation.targetSlug !== 'string' || relation.targetSlug.trim().length === 0) {
    return false
  }

  return true
}

/**
 * Obtiene el label legible en español de una relación.
 * Mapea los códigos internos (ej. "located_in") a etiquetas UI (ej. "Ubicado en").
 * 
 * @param relation - Código de relación a traducir
 * @returns Etiqueta legible en español, o el código original si no hay mapeo
 */
export function getRelationLabel(relation: string): string {
  const labels: Record<string, string> = {
    aparece_en: 'Aparece en',
    ubicado_en: 'Ubicado en',
    conducido_por: 'Conducido por',
    lidera: 'Lidera',
    amigo_de: 'Amigo de',
    enemigo_de: 'Enemigo de',
    trabaja_para: 'Trabaja para',
    pertenece_a: 'Pertenece a',
    relacionado_con: 'Relacionado con',
    parte_de: 'Parte de',
    contiene: 'Contiene',
    involve: 'Involucra',
    involves: 'Involucra',
    companion: 'Compañero',
    conducts: 'Conduce',
    located_in: 'Ubicado en',
    owns: 'Posee',
    leads: 'Lidera',
    works_for: 'Trabaja para',
    appears_in: 'Aparece en',
    appears_with: 'Aparece con',
    associated_with: 'Asociado con',
    spouse_of: 'Cónyuge de',
    related_line: 'Línea relacionada',
    member_of: 'Miembro de',
    variant_of: 'Variante de',
    partners_with: 'Asociado con',
    invests_in: 'Invierte en',
  }

  return labels[relation] || relation
}

/**
 * Genera breadcrumb desde relaciones.
 * Crea una navegación jerárquica basada en las relaciones de la entidad.
 * 
 * @param entity - Entidad origen
 * @param relations - Relaciones a procesar
 * @returns Array de breadcrumb items
 */
export function generateBreadcrumbFromRelations(
  entity: Entity,
  relations: EntityRelation[]
): Array<{ label: string; type: EntityType; slug: string }> {
  const breadcrumb: Array<{ label: string; type: EntityType; slug: string }> = [
    { label: entity.title, type: entity.type, slug: entity.slug },
  ]

  for (let i = 0; i < Math.min(relations.length, 2); i++) {
    const rel = relations[i]
    breadcrumb.push({
      label: rel.relation,
      type: rel.targetType,
      slug: rel.targetSlug,
    })
  }

  return breadcrumb
}

/**
 * Detecta relaciones circulares (A -> B -> ... -> A) mediante DFS,
 * hasta `maxDepth` saltos. Devuelve las relaciones directas de `entity`
 * que forman parte de al menos un ciclo detectado (incluye tanto
 * auto-referencias A -> A como ciclos más largos, ej. A -> B -> A).
 * 
 * @param entity - Entidad origen a analizar
 * @param maxDepth - Profundidad máxima de búsqueda (default: 5)
 * @returns Array de relaciones que forman parte de ciclos
 */
export async function detectCircularRelations(
  entity: Entity,
  maxDepth: number = 5
): Promise<EntityRelation[]> {
  const circular: EntityRelation[] = []
  const startKey = `${entity.type}/${entity.slug}`

  for (const rel of entity.relations || []) {
    const targetKey = `${rel.targetType}/${rel.targetSlug}`

    // Auto-referencia directa: siempre es un ciclo.
    if (targetKey === startKey) {
      circular.push(rel)
      continue
    }

    // DFS desde el destino de esta relación, buscando un camino de
    // vuelta a `entity` en como máximo maxDepth saltos adicionales.
    const visited = new Set<string>([startKey])
    if (await hasPathBackToStart(rel.targetType, rel.targetSlug, startKey, maxDepth, visited)) {
      circular.push(rel)
    }
  }

  return circular
}

/**
 * Helper recursivo para detectar caminos de vuelta al nodo inicial.
 * Implementa DFS con detección de ciclos para evitar loops infinitos.
 * 
 * @param currentType - Tipo de entidad actual en el recorrido
 * @param currentSlug - Slug de entidad actual en el recorrido
 * @param startKey - Clave del nodo inicial (formato "type/slug")
 * @param depthRemaining - Profundidad restante permitida
 * @param visited - Conjunto de nodos ya visitados en este camino
 * @returns true si existe un camino de vuelta al inicio, false si no
 */
async function hasPathBackToStart(
  currentType: EntityType,
  currentSlug: string,
  startKey: string,
  depthRemaining: number,
  visited: Set<string>
): Promise<boolean> {
  const currentKey = `${currentType}/${currentSlug}`
  if (currentKey === startKey) return true
  if (depthRemaining <= 0 || visited.has(currentKey)) return false

  visited.add(currentKey)

  const current = await getEntity(currentType, currentSlug)
  if (!current) return false

  for (const rel of current.relations || []) {
    if (
      await hasPathBackToStart(rel.targetType, rel.targetSlug, startKey, depthRemaining - 1, visited)
    ) {
      return true
    }
  }

  return false
}
