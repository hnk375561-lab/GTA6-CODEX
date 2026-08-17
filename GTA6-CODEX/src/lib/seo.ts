import { Entity, EntityType } from '@/types'
import type { MediaAsset } from '@/types/media'
import { Metadata } from 'next'
import { ENTITY_TYPE_LABELS } from './entity-labels'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gta-6-codex.vercel.app'
const SITE_NAME = 'GTA6 Codex'
const SITE_DESCRIPTION = 'Un wiki editorial de primer nivel sobre Grand Theft Auto 6'

/**
 * Tipo de Schema.org más específico por EntityType, para JSON-LD con mejor
 * chance de generar rich snippets (personas, vehículos, lugares) en vez de
 * un genérico `Thing` para todo el sitio. Tipos sin match específico caen
 * a 'Thing' (ver `SCHEMA_TYPE_BY_ENTITY_TYPE[type] || 'Thing'` abajo).
 */
const SCHEMA_TYPE_BY_ENTITY_TYPE: Partial<Record<EntityType, string>> = {
  [EntityType.CHARACTER]: 'Person',
  [EntityType.VEHICLE]: 'Vehicle',
  [EntityType.LOCATION]: 'Place',
  [EntityType.FACTION]: 'Organization',
  [EntityType.BUSINESS]: 'Organization',
  [EntityType.NEWS]: 'NewsArticle',
  [EntityType.GUIDE]: 'Article',
  [EntityType.TRAILER]: 'VideoObject',
}

/**
 * Imagen de entidad ya resuelta (ver `resolveEntityDisplayImage` en
 * `@/lib/media`), en la forma mínima que necesita esta función. Se recibe
 * como parámetro en vez de resolverse acá porque `resolveEntityDisplayImage`
 * depende de `fs` (solo-servidor) y este módulo no tiene por qué asumir
 * ese acoplamiento; el caller (`generateMetadata` en la ruta de la ficha)
 * ya la resuelve para el body de la página y la reutiliza acá.
 */
interface EntityOgImage {
  src: string
  alt: string
  remote: boolean
}

/**
 * Genera metadata para una entidad.
 *
 * `ogImage`: retrato ya resuelto de la entidad (local o remoto). Si no se
 * pasa o la entidad no tiene ninguno, cae al OG genérico del sitio
 * (`/og-image.png`) — antes esto pasaba SIEMPRE, para las 162 entidades por
 * igual, sin importar que muchas ya tuvieran retrato propio. No se fija
 * `width`/`height` fijos (1200x630) para el retrato de entidad porque su
 * aspect ratio real varía por variante (`portrait` ~4:5); forzar esas
 * dimensiones mentiría sobre el tamaño real de la imagen a los crawlers de
 * OG/Twitter. El fallback genérico sí es 1200x630 real, así que ahí se
 * mantienen explícitas.
 */
export function generateEntityMetadata(entity: Entity, ogImage?: EntityOgImage | null): Metadata {
  const title = entity.seoTitle || entity.title
  const description = entity.seoDescription || entity.description
  const url = `${SITE_URL}/${entity.type}/${entity.slug}`
  const fallbackImage = `${SITE_URL}/og-image.png`

  const image = ogImage ? (ogImage.remote ? ogImage.src : `${SITE_URL}${ogImage.src}`) : fallbackImage
  const imageAlt = ogImage?.alt || title

  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: ogImage
        ? [{ url: image, alt: imageAlt }]
        : [{ url: image, width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

/**
 * Genera metadata para páginas de listado
 */
export function generateListMetadata(type: EntityType, count: number): Metadata {
  const label = ENTITY_TYPE_LABELS[type] || type
  const title = `${label} | ${SITE_NAME}`
  const description = `Explora ${count} ${label.toLowerCase()} en GTA 6 Codex`
  const url = `${SITE_URL}/${type}`

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'website',
      title,
      description,
      url,
      siteName: SITE_NAME,
    },
  }
}

/**
 * Genera metadata para la homepage
 */
export function generateHomepageMetadata(): Metadata {
  const image = `${SITE_URL}/og-image.png`

  return {
    title: `${SITE_NAME} | Wiki Editorial de Grand Theft Auto 6`,
    description: SITE_DESCRIPTION,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: SITE_URL,
    },
    openGraph: {
      type: 'website',
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      siteName: SITE_NAME,
      // Mismo og-image.png que ya usa generateEntityMetadata(): la home
      // no tenía imagen propia de preview en redes (Facebook/WhatsApp/
      // Slack caían a una tarjeta sin imagen), sin agregar ningún asset
      // nuevo al repo.
      images: [{ url: image, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [image],
    },
  }
}

/**
 * Genera JSON-LD structured data para una entidad.
 * Usa un `@type` de Schema.org específico por categoría cuando existe
 * mapeo (Person, Vehicle, Place, Organization...) en vez de un `Thing`
 * genérico para todas las entidades del sitio — mejora la elegibilidad
 * para rich snippets en buscadores.
 */
export function generateEntityJsonLd(entity: Entity, primaryMedia?: MediaAsset | null): object {
  const url = `${SITE_URL}/${entity.type}/${entity.slug}`
  const schemaType = SCHEMA_TYPE_BY_ENTITY_TYPE[entity.type] || 'Thing'

  const base = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: entity.title,
    description: entity.description,
    url,
    datePublished: entity.createdAt,
    dateModified: entity.updatedAt,
    inLanguage: 'es',
    mainEntity: {
      '@type': 'WebPage',
      url,
    },
  }

  // VideoObject sólo se enriquece cuando existe un asset editorial real.
  // No se infieren URLs ni duración desde texto de la ficha.
  if (schemaType === 'VideoObject' && primaryMedia) {
    const sourceUrl = primaryMedia.source.originalUrl || primaryMedia.source.localPath
    return {
      ...base,
      ...(sourceUrl ? { contentUrl: sourceUrl } : {}),
      ...(primaryMedia.duration ? { duration: `PT${Math.round(primaryMedia.duration)}S` } : {}),
      uploadDate: primaryMedia.createdAt,
    }
  }

  return base
}

/**
 * Genera JSON-LD para BreadcrumbList
 */
export function generateBreadcrumbJsonLd(items: Array<{ label: string; url: string }>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: item.url,
    })),
  }
}

/**
 * Obtiene el URL canónico de una entidad
 */
export function getCanonicalUrl(type: string, slug: string): string {
  return `${SITE_URL}/${type}/${slug}`
}

/**
 * Valida y normaliza URLs
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
