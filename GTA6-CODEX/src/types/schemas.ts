import { z } from 'zod'
import { EntityType } from '@/types'

/**
 * Schemas de Zod que reflejan los contratos definidos en `src/types/entity.ts`.
 *
 * Objetivo: dar validación de runtime real sobre los JSON de contenido
 * (que no pasan por el compilador de TypeScript) con mensajes de error
 * claros, en vez de checks manuales campo por campo.
 */

export const InformationStatusSchema = z.enum(['confirmado', 'rumor', 'nuestro'])

export const EntityTypeSchema = z.nativeEnum(EntityType)

export const EntityRelationSchema = z.object({
  targetType: EntityTypeSchema,
  targetSlug: z.string().min(1),
  relation: z.string().min(1),
  direction: z.enum(['to', 'from', 'bidirectional']).optional(),
})

export const EvidenceSchema = z.object({
  level: z.enum(['oficial-nombrado', 'oficial-visual', 'respaldado', 'especulativo']),
  primarySource: z.string().optional(),
  secondarySource: z.string().optional(),
  note: z.string().optional(),
  limitations: z.array(z.string()).optional(),
})

export const ImageProvenanceSchema = z.object({
  source: z.enum(['official', 'secondary', 'unverified']),
  sourceName: z.string().optional(),
  sourceUrl: z.string().optional(),
  retrievedAt: z.string().optional(),
  credit: z.string().optional(),
  alt: z.string().optional(),
})

/**
 * Contrato base compartido por toda entidad, sin importar su tipo específico.
 * Los campos propios de cada tipo (Character, Vehicle, etc.) se mantienen
 * como `unknown`/opcionales acá a propósito: ese detalle fino ya vive en
 * TypeScript, y no vale la pena duplicar toda la unión discriminada en Zod
 * solo para validar JSON en disco.
 */
export const BaseEntitySchema = z.object({
  slug: z.string().min(1, 'slug no puede estar vacío'),
  type: EntityTypeSchema,
  title: z.string().min(1, 'title no puede estar vacío'),
  description: z.string().min(1, 'description no puede estar vacía'),
  content: z.string().optional(),
  status: InformationStatusSchema,
  tags: z.array(z.string()).optional(),
  createdAt: z.string().min(1, 'createdAt requerido'),
  updatedAt: z.string().min(1, 'updatedAt requerido'),
  relations: z.array(EntityRelationSchema).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  featured: z.boolean().optional(),
  evidence: EvidenceSchema.optional(),
  image: ImageProvenanceSchema.optional(),
})

export type ValidatedBaseEntity = z.infer<typeof BaseEntitySchema>

/**
 * Valida un valor desconocido (JSON parseado) contra el contrato base.
 * Devuelve `{ success: true, data }` o `{ success: false, error }` con el
 * detalle legible de Zod, para poder loguear qué campo exacto falló.
 */
export function safeParseEntity(entity: unknown) {
  return BaseEntitySchema.safeParse(entity)
}
