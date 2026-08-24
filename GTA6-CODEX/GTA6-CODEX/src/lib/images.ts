import fs from 'fs'
import path from 'path'
import { Entity, EntityType } from '@/types'
import entityImageCategorySlugs from '@/config/entity-image-categories.json'
import { getEntitiesByTypeSync } from './entities'

/**
 * SISTEMA DE RESOLUCIÓN DE IMÁGENES POR CONVENCIÓN
 * ==================================================
 *
 * No hay una tabla ni un campo `image.url` en los JSON de contenido.
 * La imagen de una entidad se busca por convención de nombre de archivo:
 *
 *   public/images/entities/{type}/{slug}.{ext}
 *
 * probando extensiones en este orden (mejor formato primero):
 *   webp > avif > jpg > jpeg > png
 *
 * Esto es intencional: permite soltar archivos nuevos en
 * public/images/entities/{type}/ (a mano o vía scripts/process-images.mjs)
 * y que la ficha/card los recoja automáticamente en el próximo build,
 * sin editar código ni contenido.
 *
 * Es un chequeo de filesystem (fs.existsSync), igual que el resto de
 * src/lib/entities.ts — funciona en Server Components / build time,
 * coherente con next.config.js (sin remotePatterns: nunca se hotlinkea
 * una imagen externa, solo se sirven archivos ya descargados al repo).
 */

const IMAGE_EXTENSIONS = ['webp', 'avif', 'jpg', 'jpeg', 'png'] as const

const PUBLIC_DIR = path.join(process.cwd(), 'public')
const ENTITY_IMAGES_DIR = path.join(PUBLIC_DIR, 'images', 'entities')

export interface ResolvedEntityImage {
  /** Ruta pública servible por next/image, ej: /images/entities/personajes/lucia-caminos.webp */
  src: string
  /** Extensión real encontrada */
  extension: (typeof IMAGE_EXTENSIONS)[number]
  /** Alt accesible: entity.image.alt si existe, si no un default razonable */
  alt: string
}

/**
 * Forma "display-ready" de una imagen ya resuelta (local o remota), la
 * misma que antes calculaba `EntityImage.tsx` en cliente. Se define acá
 * (junto al resto de la resolución de imágenes, que depende de `fs` y por
 * lo tanto SOLO puede ejecutarse en servidor) para que `EntityImage` deje
 * de importar `fs` transitivamente: los callers server-side resuelven esto
 * y lo pasan como prop plano (serializable) a los componentes cliente.
 */
export interface ResolvedDisplayImage {
  src: string
  alt: string
  remote: boolean
}

/**
 * CACHÉ DE LISTADOS DE DIRECTORIO
 * ==================================
 * `resolveEntityImage` original hacía hasta 5 `fs.existsSync` (uno por
 * extensión candidata) POR entidad, cada vez que se llamaba — y se llama
 * una vez por card en cada listado, más una vez por ficha, más una vez
 * por ítem de galería. Para N entidades de un tipo eso es hasta 5×N
 * syscalls repetidos en cada página que renderiza ese listado.
 *
 * En vez de eso, se lista el directorio UNA vez por tipo (`fs.readdirSync`)
 * y se cachea como `Set<string>` de nombres de archivo; resolver una
 * entidad pasa a ser una búsqueda en memoria (`set.has(...)`), sin tocar
 * fs de nuevo. Igual que en `entities.ts`, la caché solo se activa en
 * producción/build para no esconder imágenes nuevas agregadas en `next dev`.
 */
const CACHE_ENABLED = process.env.NODE_ENV === 'production'
const dirListingCache = new Map<EntityType, Set<string> | null>()

function getDirListing(type: EntityType): Set<string> | null {
  if (CACHE_ENABLED && dirListingCache.has(type)) {
    return dirListingCache.get(type)!
  }

  const dir = path.join(ENTITY_IMAGES_DIR, type)
  let listing: Set<string> | null = null
  if (fs.existsSync(dir)) {
    listing = new Set(fs.readdirSync(dir))
  }

  if (CACHE_ENABLED) dirListingCache.set(type, listing)
  return listing
}

/**
 * Busca en disco si existe una imagen local para esta entidad.
 * Devuelve null si no hay ninguna — el caller debe manejar el fallback.
 */
export function resolveEntityImage(entity: Entity): ResolvedEntityImage | null {
  const listing = getDirListing(entity.type)
  if (!listing) return null

  for (const ext of IMAGE_EXTENSIONS) {
    const filename = `${entity.slug}.${ext}`
    if (listing.has(filename)) {
      return {
        src: `/images/entities/${entity.type}/${filename}`,
        extension: ext,
        alt: entity.image?.alt || entity.title,
      }
    }
  }

  return null
}

/**
 * Cuenta cuántas entidades de un listado ya tienen imagen local resuelta.
 * Útil para reportes/paneles de cobertura; no se usa en el render normal.
 */
export function countEntitiesWithImage(entities: Entity[]): number {
  return entities.filter((e) => resolveEntityImage(e) !== null).length
}

/**
 * Imagen de portada para una card de CATEGORÍA (home → "Explorá por
 * sección"): la primera imagen local resuelta entre las entidades de ese
 * tipo, en el mismo orden en que ya vienen listadas (no hay ranking
 * propio — es una vista previa, no un "destacado" editorial). Devuelve
 * null si ninguna entidad del tipo tiene imagen local todavía, y el
 * caller cae a un fondo 100% CSS (mismo criterio que `EntityImage`).
 */
export function getCategoryPreviewImage(type: EntityType): ResolvedEntityImage | null {
  for (const entity of getEntitiesByTypeSync(type)) {
    const resolved = resolveEntityImage(entity)
    if (resolved) return resolved
  }
  return null
}

/**
 * Variante de `getCategoryPreviewImage` que devuelve hasta `limit`
 * imágenes locales reales de la categoría en vez de solo la primera
 * (Fase 8, etapa F — mini-collage de home: fondo principal + hasta 2
 * miniaturas superpuestas, ver `CategoryCardMedia`). Mismo criterio que
 * la variante singular: recorre las entidades del tipo en el orden en
 * que ya vienen listadas (no hay ranking propio, es una vista previa) y
 * nunca inventa una imagen — si el tipo tiene menos de `limit` entidades
 * con imagen local, devuelve las que haya (incluido un array vacío).
 */
export function getCategoryPreviewImages(type: EntityType, limit = 3): ResolvedEntityImage[] {
  const found: ResolvedEntityImage[] = []
  for (const entity of getEntitiesByTypeSync(type)) {
    if (found.length >= limit) break
    const resolved = resolveEntityImage(entity)
    if (resolved) found.push(resolved)
  }
  return found
}

/**
 * Categorías núcleo con carpeta de imágenes propia. La lista vive en
 * src/config/entity-image-categories.json — fuente única de verdad
 * compartida con scripts/process-images.mjs, para que ambos queden
 * sincronizados por construcción y no por convención manual.
 */
export const ENTITY_IMAGE_CATEGORIES: EntityType[] = entityImageCategorySlugs as EntityType[]
