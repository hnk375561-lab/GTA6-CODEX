import { Entity, EntityRelation, EntityType } from '@/types'

/**
 * Obtiene todas las entidades relacionadas a una entidad
 * 
 * STUB Fase 1: Cuando tengamos datos, implementar búsqueda eficiente
 */
export async function getRelatedEntities(
  entity: Entity,
  limit?: number
): Promise<Entity[]> {
  // STUB: Fase 1
  // Implementar: Buscar en todas las entidades las que están en relations
  // y cargarlas
  return []
}

/**
 * Obtiene relaciones bidireccionales
 * (Si A relaciona con B, también retornar B relacionando con A)
 */
export async function getBidirectionalRelations(
  entity: Entity
): Promise<EntityRelation[]> {
  // STUB: Fase 1
  return []
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

  // Validar que targetType sea un EntityType válido
  const validTypes = Object.values(EntityType)
  if (!validTypes.includes(relation.targetType)) {
    return false
  }

  // Validar que targetSlug no esté vacío
  if (typeof relation.targetSlug !== 'string' || relation.targetSlug.trim().length === 0) {
    return false
  }

  return true
}

/**
 * Obtiene el label readable de una relación
 * Útil para mostrar en UI
 */
export function getRelationLabel(relation: string): string {
  const labels: Record<string, string> = {
    'aparece_en': 'Aparece en',
    'ubicado_en': 'Ubicado en',
    'conducido_por': 'Conducido por',
    'lidera': 'Lidera',
    'amigo_de': 'Amigo de',
    'enemigo_de': 'Enemigo de',
    'trabaja_para': 'Trabaja para',
    'pertenece_a': 'Pertenece a',
    'relacionado_con': 'Relacionado con',
    'parte_de': 'Parte de',
    'contiene': 'Contiene',
    'involve': 'Involucra',
  }

  return labels[relation] || relation
}

/**
 * Genera breadcrumb desde relaciones
 * Útil para navegación contextual
 */
export function generateBreadcrumbFromRelations(
  entity: Entity,
  relations: EntityRelation[]
): Array<{ label: string; type: EntityType; slug: string }> {
  const breadcrumb: Array<{ label: string; type: EntityType; slug: string }> = [
    { label: entity.title, type: entity.type, slug: entity.slug },
  ]

  // Agregar hasta 2 relaciones principales al breadcrumb
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
 * Detecta si hay relaciones circulares
 * STUB: Implementar cuando sea necesario
 */
export function detectCircularRelations(
  entity: Entity,
  maxDepth: number = 5
): EntityRelation[] {
  // STUB: Fase 1
  return []
}
