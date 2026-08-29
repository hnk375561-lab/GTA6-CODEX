import { EntityType } from '@/types'
import type { InformationStatus } from '@/types'

/**
 * Labels legibles por tipo de entidad. Mismo texto que ya usan
 * `[entityType]/page.tsx` y `[entityType]/[slug]/page.tsx` (no se tocan
 * esos archivos para no arriesgar una regresión visual en rutas ya
 * estables); este módulo es la fuente compartida para los componentes
 * nuevos del archivo de tráilers, que si necesitan agrupar/etiquetar por
 * tipo de entidad en varios lugares distintos.
 */
export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  [EntityType.VEHICLE]: 'Vehículos',
  [EntityType.NEWS]: 'Noticias',
  [EntityType.GUIDE]: 'Guías',
}

/**
 * Orden editorial preferido al agrupar relaciones por tipo: primero el
 * vehículo en sí, después noticias y guías relacionadas.
 */
export const ENTITY_TYPE_GROUP_ORDER: EntityType[] = [
  EntityType.VEHICLE,
  EntityType.NEWS,
  EntityType.GUIDE,
]

/**
 * Label legible del estado editorial (`InformationStatus`). Antes vivía
 * copiado idéntico en 4 componentes distintos (`GalleryExplorer`,
 * `EntityListExplorer`, `EntityCard`, `TrailerScenes`); se consolida acá
 * junto al resto de labels compartidos para que un cambio de texto futuro
 * (ej. "Nuestro" -> "Especulación editorial") se haga en un solo lugar.
 */
export const STATUS_LABELS: Record<InformationStatus, string> = {
  confirmado: 'Confirmado',
  rumor: 'Rumor',
  nuestro: 'Recreación no oficial (IA)',
}
