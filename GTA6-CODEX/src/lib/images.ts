import fs from 'fs'
import path from 'path'
import { Entity, EntityType } from '@/types'

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
 * Busca en disco si existe una imagen local para esta entidad.
 * Devuelve null si no hay ninguna — el caller debe manejar el fallback.
 */
export function resolveEntityImage(entity: Entity): ResolvedEntityImage | null {
  const dir = path.join(ENTITY_IMAGES_DIR, entity.type)
  if (!fs.existsSync(dir)) return null

  for (const ext of IMAGE_EXTENSIONS) {
    const filePath = path.join(dir, `${entity.slug}.${ext}`)
    if (fs.existsSync(filePath)) {
      return {
        src: `/images/entities/${entity.type}/${entity.slug}.${ext}`,
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
 * Categorías núcleo con carpeta de imágenes propia. Mantenido en un solo
 * lugar para que el script de procesamiento y los componentes usen la
 * misma lista si en algún momento se necesita iterar todas las carpetas.
 */
export const ENTITY_IMAGE_CATEGORIES: EntityType[] = [
  EntityType.CHARACTER,
  EntityType.VEHICLE,
  EntityType.LOCATION,
  EntityType.FACTION,
  EntityType.BUSINESS,
]
