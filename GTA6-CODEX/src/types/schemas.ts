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
 * Schema de una escena dentro de un Trailer (ver `TrailerScene` en entity.ts).
 */
export const TrailerSceneSchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  relations: z.array(EntityRelationSchema).optional(),
  status: InformationStatusSchema.optional(),
})

/**
 * Schema completo de un Trailer: BaseEntitySchema + campos propios.
 * Se valida por separado (en vez de sumarlo al schema base genérico)
 * porque `scenes` es obligatorio solo para este tipo.
 */
export const TrailerSchema = BaseEntitySchema.extend({
  type: z.literal(EntityType.TRAILER),
  releaseDate: z.string().min(1, 'releaseDate requerido'),
  officialUrl: z.string().url().optional(),
  durationSeconds: z.number().positive().optional(),
  scenes: z.array(TrailerSceneSchema).min(1, 'un trailer necesita al menos una escena'),
})

export function safeParseTrailer(entity: unknown) {
  return TrailerSchema.safeParse(entity)
}

/**
 * Valida un valor desconocido (JSON parseado) contra el contrato base.
 * Devuelve `{ success: true, data }` o `{ success: false, error }` con el
 * detalle legible de Zod, para poder loguear qué campo exacto falló.
 */
export function safeParseEntity(entity: unknown) {
  return BaseEntitySchema.safeParse(entity)
}

/**
 * Schemas del Media Registry (ver `src/types/media.ts`). Se validan por
 * separado del contrato de entidades porque un `MediaAsset` no es una
 * entidad (no tiene `slug`/`type` de EntityType propio, ni vive en
 * `src/content/{entityType}/`), pero sigue el mismo espíritu: contrato
 * de runtime real sobre JSON en disco, con mensajes de error claros.
 */
export const MediaKindSchema = z.enum(['image', 'video', 'trailer', 'clip', 'artwork'])

export const MediaSourceTypeSchema = z.enum([
  'local-file',
  'youtube-embed',
  'remote-hotlink',
  'external-link',
])

export const MediaValidationStatusSchema = z.enum(['verified', 'pending', 'broken', 'rejected'])

export const MediaSourceSchema = z
  .object({
    type: MediaSourceTypeSchema,
    originalUrl: z.string().min(1, 'originalUrl no puede estar vacía'),
    provider: z.string().min(1, 'provider no puede estar vacío'),
    hotlinkAllowed: z.boolean(),
    hotlinkNote: z.string().optional(),
    retrievedAt: z.string().min(1, 'retrievedAt requerido'),
    localPath: z.string().optional(),
    embedId: z.string().optional(),
  })
  .superRefine((source, ctx) => {
    // Un remote-hotlink sin permiso explícito es una contradicción de
    // modelo: si no está permitido, el tipo correcto es 'external-link'.
    if (source.type === 'remote-hotlink' && !source.hotlinkAllowed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "source.type = 'remote-hotlink' requiere hotlinkAllowed = true; si el hotlink no está permitido, usar type = 'external-link'",
        path: ['hotlinkAllowed'],
      })
    }
    if (source.type === 'local-file' && !source.localPath) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "source.type = 'local-file' requiere localPath",
        path: ['localPath'],
      })
    }
    if (source.type === 'youtube-embed') {
      if (!source.embedId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "source.type = 'youtube-embed' requiere embedId",
          path: ['embedId'],
        })
      } else if (!/^[a-zA-Z0-9_-]{11}$/.test(source.embedId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'embedId no tiene el formato de un video ID de YouTube (11 caracteres)',
          path: ['embedId'],
        })
      }
    }
  })

export const MediaEntityRelationSchema = z.object({
  targetType: EntityTypeSchema,
  targetSlug: z.string().min(1),
  role: z.string().optional(),
})

export const MediaTrailerRelationSchema = z.object({
  trailerSlug: z.string().min(1),
  sceneId: z.string().optional(),
})

export const MediaAssetSchema = z.object({
  id: z.string().min(1, 'id no puede estar vacío'),
  kind: MediaKindSchema,
  title: z.string().min(1, 'title no puede estar vacío'),
  description: z.string().optional(),
  source: MediaSourceSchema,
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  duration: z.number().positive().optional(),
  tags: z.array(z.string()).optional(),
  status: MediaValidationStatusSchema,
  duplicateOf: z.string().optional(),
  relations: z
    .object({
      entities: z.array(MediaEntityRelationSchema).optional(),
      trailer: MediaTrailerRelationSchema.optional(),
    })
    .optional(),
  credit: z.string().optional(),
  createdAt: z.string().min(1, 'createdAt requerido'),
  updatedAt: z.string().min(1, 'updatedAt requerido'),
})

export type ValidatedMediaAsset = z.infer<typeof MediaAssetSchema>

export function safeParseMediaAsset(asset: unknown) {
  return MediaAssetSchema.safeParse(asset)
}
