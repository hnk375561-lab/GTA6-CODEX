import { EntityType } from '@/types'

/**
 * Labels legibles por tipo de entidad. Mismo texto que ya usan
 * `[entityType]/page.tsx` y `[entityType]/[slug]/page.tsx` (no se tocan
 * esos archivos para no arriesgar una regresión visual en rutas ya
 * estables); este módulo es la fuente compartida para los componentes
 * nuevos del archivo de tráilers, que si necesitan agrupar/etiquetar por
 * tipo de entidad en varios lugares distintos.
 */
export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  [EntityType.CHARACTER]: 'Personajes',
  [EntityType.VEHICLE]: 'Vehículos',
  [EntityType.LOCATION]: 'Ubicaciones',
  [EntityType.MISSION]: 'Misiones',
  [EntityType.WEAPON]: 'Armas',
  [EntityType.ACTIVITY]: 'Actividades',
  [EntityType.FACTION]: 'Organizaciones',
  [EntityType.BUSINESS]: 'Negocios',
  [EntityType.OBJECT]: 'Objetos',
  [EntityType.NEWS]: 'Noticias',
  [EntityType.GUIDE]: 'Guías',
  [EntityType.TRAILER]: 'Trailers',
}

/**
 * Orden editorial preferido al agrupar relaciones de escena por tipo:
 * primero quiénes (personajes), después dónde (ubicaciones) y qué
 * (vehículos/armas/objetos), el resto al final. Los tipos no listados
 * caen al final en el orden en que aparecen.
 */
export const ENTITY_TYPE_GROUP_ORDER: EntityType[] = [
  EntityType.CHARACTER,
  EntityType.LOCATION,
  EntityType.VEHICLE,
  EntityType.WEAPON,
  EntityType.ACTIVITY,
  EntityType.FACTION,
  EntityType.OBJECT,
  EntityType.BUSINESS,
  EntityType.MISSION,
  EntityType.TRAILER,
  EntityType.NEWS,
  EntityType.GUIDE,
]
