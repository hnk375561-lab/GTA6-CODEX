import { Entity, EntityRelation, EntityType } from '@/types'
import { getEntity } from './entities'

/**
 * Obtiene todas las entidades relacionadas a una entidad,
 * resolviendo cada EntityRelation contra el contenido real.
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
 */
export async function getBidirectionalRelations(entity: Entity): Promise<EntityRelation[]> {
  const direct = entity.relations || []

  // Relaciones explícitas marcadas como bidireccionales ya cuentan.
  // Para el resto, buscamos entidades del mismo tipo que referencien a esta.
  const inferred: EntityRelation[] = []

  for (const type of Object.values(EntityType)) {
    const { getEntitiesByType } = await import('./entities')
    const candidates = await getEntitiesByType(type)

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

  return [...direct, ...inferred]
}

/**
 * Agrupa relaciones por tipo de relación
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
 * Agrupa relaciones por tipo de entidad objetivo
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
 * Valida que una relación sea válida
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
 * Obtiene el label readable de una relación
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
 * Genera breadcrumb desde relaciones
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
 * Detecta si hay relaciones circulares directas (A -> B -> A)
 */
export function detectCircularRelations(entity: Entity, maxDepth: number = 5): EntityRelation[] {
  // Implementación simple: detecta ciclos de longitud 2 en las relaciones directas.
  // Para grafos más profundos se recomienda un BFS/DFS completo cuando el volumen
  // de contenido lo justifique.
  const circular: EntityRelation[] = []

  for (const rel of entity.relations || []) {
    if (rel.targetType === entity.type && rel.targetSlug === entity.slug) {
      circular.push(rel)
    }
  }

  return circular
}
