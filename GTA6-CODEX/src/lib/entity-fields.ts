import { BaseEntitySchema } from '@/types/schemas'

/**
 * Lógica compartida para extraer campos "propios" (no reservados por
 * BaseEntity) de una entidad de forma genérica y data-driven, sin
 * necesitar una rama de código por tipo.
 *
 * Extraído de `EntityMetadata.tsx` (donde alimenta la ficha técnica
 * completa de los 7 `GenericEntity`: armas, actividades, organizaciones,
 * negocios, objetos, noticias, guías) para que `EntityCard.tsx` pueda
 * reutilizar EXACTAMENTE la misma heurística y mostrar 1-2 datos clave
 * también en la tarjeta de listado, sin duplicar la lógica ni arriesgar
 * que ambos lugares diverjan con el tiempo.
 */

/**
 * Claves reservadas del contrato base de toda entidad (ver `BaseEntitySchema`
 * en `src/types/schemas.ts`). Se derivan del schema de Zod ya existente en
 * vez de mantener una lista aparte a mano, para que nunca puedan
 * desincronizarse.
 */
export const RESERVED_ENTITY_KEYS = new Set<string>(BaseEntitySchema.keyof().options as string[])

/**
 * Convierte una key cruda de JSON (snake_case, la convención ya usada en
 * el contenido existente: `voice_actor`, `mission_type`, `driven_by`...)
 * en un label legible. Heurística de mejor esfuerzo, no traducción.
 */
export function humanizeKey(key: string): string {
  const spaced = key.replace(/[_-]+/g, ' ').trim()
  if (!spaced) return key
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export interface GenericFieldEntry {
  label: string
  kind: 'text' | 'list'
  value: string | string[]
}

/**
 * Recolecta, de forma genérica, los campos propios (no reservados por
 * BaseEntity) de una entidad: escalares, arrays de string, y un nivel de
 * anidamiento (objetos planos, en el mismo espíritu que `appearance` en
 * Character o `environment` en Location, pero sin necesitar una rama de
 * código dedicada). Es lo que permite que un tipo `GenericEntity` (o
 * cualquier `EntityType` futuro sin rama propia) muestre cualquier campo
 * que un editor agregue a su JSON, sin editar código.
 *
 * El orden de salida sigue el orden de declaración de claves en el JSON
 * de contenido — se asume que los editores ya ordenan los campos más
 * relevantes primero (mismo criterio que usa `EntityMetadata`).
 */
export function collectGenericFields(entity: Record<string, unknown>): GenericFieldEntry[] {
  const entries: GenericFieldEntry[] = []

  for (const [key, value] of Object.entries(entity)) {
    if (RESERVED_ENTITY_KEYS.has(key)) continue
    if (value === null || value === undefined) continue

    if (typeof value === 'string') {
      if (value.trim().length === 0) continue
      entries.push({ label: humanizeKey(key), kind: 'text', value })
      continue
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      entries.push({ label: humanizeKey(key), kind: 'text', value: String(value) })
      continue
    }

    if (Array.isArray(value)) {
      const items = value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      if (items.length > 0) entries.push({ label: humanizeKey(key), kind: 'list', value: items })
      continue
    }

    if (isPlainObject(value)) {
      // Un nivel de anidamiento: aplana sub-campos con el mismo criterio.
      for (const [subKey, subValue] of Object.entries(value)) {
        if (subValue === null || subValue === undefined) continue
        if (typeof subValue === 'string' && subValue.trim().length > 0) {
          entries.push({ label: humanizeKey(subKey), kind: 'text', value: subValue })
        } else if (typeof subValue === 'number' || typeof subValue === 'boolean') {
          entries.push({ label: humanizeKey(subKey), kind: 'text', value: String(subValue) })
        } else if (Array.isArray(subValue)) {
          const items = subValue.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
          if (items.length > 0) entries.push({ label: humanizeKey(subKey), kind: 'list', value: items })
        }
      }
    }
  }

  return entries
}

/**
 * Variante acotada de `collectGenericFields` para uso en tarjetas de
 * listado (`EntityCard`): devuelve como máximo `limit` campos de tipo
 * `'text'` (los de tipo `'list'` no entran — ocupan demasiado espacio en
 * una card compacta y ya se ven completos en la ficha individual vía
 * `EntityMetadata`/`GenericEntityMetadata`).
 */
export function getGenericQuickFacts(
  entity: Record<string, unknown>,
  limit = 2
): Array<{ label: string; value: string }> {
  return collectGenericFields(entity)
    .filter((f) => f.kind === 'text')
    .slice(0, limit)
    .map((f) => ({ label: f.label, value: f.value as string }))
}
