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
  // 'oficial-visual-multifuente' (oficial-visual corroborado por más de una
  // fuente independiente) ya se usa en contenido real (ver auditorías de
  // vehículos/ubicaciones/organizaciones/negocios) además de los 4 niveles
  // originales; se agrega acá para que el schema refleje el contrato real
  // en uso, no solo el documentado originalmente.
  level: z.enum([
    'oficial-nombrado',
    'oficial-visual',
    'oficial-visual-multifuente',
    'respaldado',
    'especulativo',
  ]),
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
/**
 * Timestamp ISO que además debe parsear a una fecha válida.
 *
 * No basta con `z.string()`: `sitemap.ts` (y `generateEntityJsonLd` en
 * `seo.ts`) construyen `new Date(...)` a partir de `createdAt`/`updatedAt`,
 * y como `sitemap.xml` se prerenderiza en build time, un `Invalid Date` ahí
 * tira ABAJO `next build` completo (`RangeError: Invalid time value` en
 * `.toISOString()`), no solo esa entidad — bug real, reproducido y cubierto
 * por `scripts/verify-content-integrity.mjs`. Este refine es la versión en
 * Zod del chequeo que antes vivía a mano en `validateEntity()`
 * (`src/lib/entities.ts`); se preserva acá para que unificar la validación
 * en Zod no reabra ese bug.
 */
const isoDateStringSchema = (fieldName: string) =>
  z
    .string()
    .min(1, `${fieldName} requerido`)
    .refine((value) => !isNaN(new Date(value).getTime()), {
      message: `${fieldName} debe ser una fecha parseable (ISO 8601)`,
    })

export const BaseEntitySchema = z.object({
  slug: z.string().min(1, 'slug no puede estar vacío'),
  type: EntityTypeSchema,
  title: z.string().min(1, 'title no puede estar vacío'),
  description: z.string().min(1, 'description no puede estar vacía'),
  content: z.string().optional(),
  status: InformationStatusSchema,
  tags: z.array(z.string()).optional(),
  createdAt: isoDateStringSchema('createdAt'),
  updatedAt: isoDateStringSchema('updatedAt'),
  relations: z.array(EntityRelationSchema).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  featured: z.boolean().optional(),
  evidence: EvidenceSchema.optional(),
  image: ImageProvenanceSchema.optional(),
})

export type ValidatedBaseEntity = z.infer<typeof BaseEntitySchema>

/**
 * Schemas por tipo para las entidades con contrato propio más allá de
 * BaseEntity (ver interfaces homónimas en `src/types/entity.ts`). Mismo
 * criterio que ya usaba `TrailerSchema` más abajo: `BaseEntitySchema.extend`
 * + `type` fijado a un literal. Los 7 `GenericEntity` (armas, actividades,
 * organizaciones, negocios, objetos, noticias, guias) no tienen schema
 * propio a propósito — su contrato es intencionalmente abierto
 * (`[key: string]: unknown`), así que validan solo contra `BaseEntitySchema`.
 */
export const CharacterSchema = BaseEntitySchema.extend({
  type: z.literal(EntityType.CHARACTER),
  alias: z.array(z.string()).optional(),
  // .nullish() (no solo .optional()): contenido real usa `"faction": null`
  // explícito, no solo el campo ausente, para personajes sin facción
  // conocida. Mismo criterio para district/region en LocationSchema.
  faction: z.string().nullish(),
  voice_actor: z.string().optional(),
  appearance: z
    .object({
      age: z.string().optional(),
      height: z.string().optional(),
      build: z.string().optional(),
      characteristics: z.string().optional(),
    })
    .optional(),
})

export function safeParseCharacter(entity: unknown) {
  return CharacterSchema.safeParse(entity)
}

export const VehicleSchema = BaseEntitySchema.extend({
  type: z.literal(EntityType.VEHICLE),
  manufacturer: z.string().optional(),
  class: z.string().optional(),
  driven_by: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  customizable: z.boolean().optional(),
  performance: z
    .object({
      speed: z.string().optional(),
      acceleration: z.string().optional(),
      handling: z.string().optional(),
      braking: z.string().optional(),
    })
    .optional(),
})

export function safeParseVehicle(entity: unknown) {
  return VehicleSchema.safeParse(entity)
}

export const LocationSchema = BaseEntitySchema.extend({
  type: z.literal(EntityType.LOCATION),
  district: z.string().nullish(),
  region: z.string().nullish(),
  coordinates: z.object({ x: z.number(), y: z.number() }).optional(),
  points_of_interest: z.array(z.string()).optional(),
  missions: z.array(z.string()).optional(),
  businesses: z.array(z.string()).optional(),
  environment: z
    .object({
      climate: z.string().optional(),
      fauna: z.array(z.string()).optional(),
      naturalEvents: z.array(z.string()).optional(),
      unconfirmedNote: z.string().optional(),
    })
    .optional(),
})

export function safeParseLocation(entity: unknown) {
  return LocationSchema.safeParse(entity)
}

export const MissionSchema = BaseEntitySchema.extend({
  type: z.literal(EntityType.MISSION),
  giver: z.string().optional(),
  mission_type: z.string().optional(),
  reward: z.string().optional(),
  objectives: z.array(z.string()).optional(),
  location: z.string().optional(),
  characters_involved: z.array(z.string()).optional(),
  prerequisite: z.string().optional(),
})

export function safeParseMission(entity: unknown) {
  return MissionSchema.safeParse(entity)
}

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

export const MediaSourceTypeSchema = z.enum(['youtube', 'vercel-blob', 'official-site', 'local'])

export const MediaValidationStatusSchema = z.enum(['verified', 'unverified'])

export const MediaSourceSchema = z
  .object({
    type: MediaSourceTypeSchema,
    provider: z.string().min(1, 'provider no puede estar vacío'),
    originalUrl: z.string().url().optional(),
    hotlinkAllowed: z.boolean().optional(),
    hotlinkNote: z.string().optional(),
    retrievedAt: z.string().min(1, 'retrievedAt requerido'),
    localPath: z.string().optional(),
    embedId: z.string().optional(),
  })
  .superRefine((source, ctx) => {
    if (source.type === 'local' && !source.localPath) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "source.type = 'local' requiere localPath",
        path: ['localPath'],
      })
    }
    if (source.type !== 'local' && !source.originalUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'las fuentes remotas requieren originalUrl',
        path: ['originalUrl'],
      })
    }
    if (source.type === 'youtube') {
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
  entityType: EntityTypeSchema,
  entitySlug: z.string().min(1),
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
  posterUrl: z.string().min(1).optional(),
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
