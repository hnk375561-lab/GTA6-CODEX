import { Entity, EntityType } from '@/types'
import entityImageCategorySlugs from '@/config/entity-image-categories.json'
import entityImagesManifest from '@/config/entity-images-manifest.json'
import { getEntitiesByTypeSync } from './entities'

/**
 * SISTEMA DE RESOLUCIÓN DE IMÁGENES POR CONVENCIÓN (ahora vía Blob)
 * ===================================================================
 *
 * No hay una tabla ni un campo `image.url` en los JSON de contenido.
 * La imagen de una entidad se sigue buscando por convención de nombre:
 *
 *   {slug}.{ext}   (siempre webp en la práctica, ver más abajo)
 *
 * MIGRACIÓN A VERCEL BLOB (evita ENOSPC en el build — ver
 * scripts/upload-images-to-blob.mjs):
 *   Antes esto hacía fs.existsSync/fs.readdirSync contra
 *   public/images/entities/**, que exigía tener los ~291 MB de fotos
 *   fuente commiteados y presentes en el checkout de cada build.
 *
 *   Ahora los binarios de imagen viven en Vercel Blob (subidos por
 *   scripts/upload-images-to-blob.mjs, corrido localmente, NO en cada
 *   build) y el repo solo commitea src/config/entity-images-manifest.json:
 *   un JSON chico (`{ [type]: string[] }`) con qué slugs TIENEN imagen.
 *   Ese manifest es la única fuente de verdad de "existe o no existe" —
 *   ya no se toca el filesystem para esto, así que funciona igual en
 *   local, en build de Vercel, y sin que el repo necesite los binarios.
 *
 *   Para agregar/reemplazar fotos: soltalas en tu public/images/entities/
 *   local (gitignored) y corré `node scripts/upload-images-to-blob.mjs`
 *   — sube las variantes a Blob y regenera el manifest.
 *
 * Extensiones que soporta el manifest (compatibilidad con contenido
 * viejo), aunque scripts/upload-images-to-blob.mjs siempre normaliza a
 * webp al subir:
 *   webp > avif > jpg > jpeg > png
 */

const IMAGE_EXTENSIONS = ['webp', 'avif', 'jpg', 'jpeg', 'png'] as const

type EntityImagesManifest = Record<string, string[]>
const MANIFEST = entityImagesManifest as EntityImagesManifest

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

/**
 * Antes leía public/images/entities/{type}/ con fs.readdirSync. Ahora
 * arma el mismo Set<string> de "nombres de archivo que existen"
 * (ej. "chevrolet-camaro.webp", "chevrolet-camaro-2.webp") a partir del
 * manifest commiteado, sin tocar el filesystem — el manifest solo guarda
 * slugs, así que reconstruimos los nombres con extensión .webp (todo lo
 * subido por scripts/upload-images-to-blob.mjs normaliza a webp).
 */
function getDirListing(type: EntityType): Set<string> | null {
  if (CACHE_ENABLED && dirListingCache.has(type)) {
    return dirListingCache.get(type)!
  }

  const slugs = MANIFEST[type]
  const listing = slugs && slugs.length > 0 ? new Set(slugs.map((slug) => `${slug}.webp`)) : null

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
 * GALERÍA MULTI-IMAGEN POR CONVENCIÓN (FASE 9)
 * ==============================================
 * Extiende la misma convención de `resolveEntityImage` (ningún campo de
 * dato, solo archivos en disco) para soportar más de una imagen por
 * entidad: además de `{slug}.{ext}` (la principal, sin cambios), busca
 * `{slug}-2.{ext}`, `{slug}-3.{ext}`, ... de forma secuencial y se
 * detiene en el primer número faltante (sin huecos: si no existe `-3`,
 * no se sigue buscando `-4` aunque exista por error).
 *
 * Deliberadamente NO se usa el campo `gallery` que ya está en los 250
 * JSON de vehículo: no está en el schema TS/Zod, no lo lee ningún código
 * y está vacío en el 100% de las fichas — ver AUDITORIA-FASE-9, sección
 * 4.1. Preservar "convención sobre configuración" evita una migración de
 * contenido y un campo sin tipar que nadie valida.
 *
 * Devuelve SIEMPRE al menos el array vacío o [principal] — nunca null —
 * para que el caller pueda hacer `.length` sin chequeo extra. La entidad
 * sin imagen sigue devolviendo `[]`, comportamiento idéntico al `null`
 * de `resolveEntityImage` para ese caso.
 */
const MAX_GALLERY_IMAGES = 12

export function resolveEntityImages(entity: Entity): ResolvedEntityImage[] {
  const listing = getDirListing(entity.type)
  if (!listing) return []

  const images: ResolvedEntityImage[] = []

  const primary = resolveEntityImage(entity)
  if (!primary) return []
  images.push(primary)

  for (let n = 2; n <= MAX_GALLERY_IMAGES; n++) {
    let found: ResolvedEntityImage | null = null
    for (const ext of IMAGE_EXTENSIONS) {
      const filename = `${entity.slug}-${n}.${ext}`
      if (listing.has(filename)) {
        found = {
          src: `/images/entities/${entity.type}/${filename}`,
          extension: ext,
          alt: entity.image?.alt ? `${entity.image.alt} (${n})` : `${entity.title} (foto ${n})`,
        }
        break
      }
    }
    if (!found) break
    images.push(found)
  }

  return images
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
