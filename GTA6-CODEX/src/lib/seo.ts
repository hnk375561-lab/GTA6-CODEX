import { Entity, EntityType } from '@/types'
import type { MediaAsset } from '@/types/media'
import { Metadata } from 'next'
import { ENTITY_TYPE_LABELS } from './entity-labels'
import { SITE_NAME, SITE_URL } from '@/config/site'

const SITE_DESCRIPTION =
  'Fichas técnicas y comparador de autos y motos, con specs reales del fabricante — encontrá y compará precio, motor y prestaciones antes de comprar.'

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
/**
 * Descripciones de listado por tipo de entidad (roadmap, prioridad
 * "Bajo": micro-copy variada en vez de "Explora N {categoría} en AutoFicha"
 * repetido igual para todas las categorías). Cada función recibe el
 * conteo real y arma una oración específica de esa categoría — nada de
 * relleno genérico, solo variar la forma en que se presenta el mismo
 * dato real (`count`).
 */
const LIST_DESCRIPTION_BY_TYPE: Partial<Record<EntityType, (count: number, label: string) => string>> = {
  [EntityType.VEHICLE]: (count) =>
    `${count} fichas técnicas de autos y motos, catalogadas por fabricante, clase y rendimiento, con fuente por cada dato.`,
  [EntityType.LOCATION]: (count) => `${count} concesionarias y puntos de interés documentados.`,
  [EntityType.BUSINESS]: (count) => `${count} negocios del rubro automotor documentados.`,
}

export function generateListMetadata(type: EntityType, count: number): Metadata {
  const label = ENTITY_TYPE_LABELS[type] || type
  const title = `${label} | ${SITE_NAME}`
  const description =
    LIST_DESCRIPTION_BY_TYPE[type]?.(count, label) ?? `Explorá ${count} ${label.toLowerCase()} en ${SITE_NAME}`
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
    title: `${SITE_NAME} | Fichas Técnicas y Comparador de Autos`,
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
 * Genera JSON-LD `WebSite` con `SearchAction` para el buscador rápido del
 * hero (`QuickSearchForm.tsx`, `/buscar?q=...`) — habilita el "sitelinks
 * search box" de Google (el cuadro de búsqueda que a veces aparece debajo
 * del resultado del sitio en el buscador) sin agregar ningún campo que el
 * sitio no soporte de verdad: `target` apunta al mismo endpoint GET que ya
 * arma `QuickSearchForm`, y `query-input` describe la misma variable `q`
 * que ese formulario ya envía. No hay overlap con `generateBreadcrumbJsonLd`
 * (tipos de Schema.org distintos, `@graph` no hace falta acá porque Next
 * ya permite múltiples `<script type="application/ld+json">` sueltos en
 * la misma página).
 */
export function generateWebsiteJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'es',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/buscar?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
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
