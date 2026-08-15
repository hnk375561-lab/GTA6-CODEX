import { Entity, EntityType } from '@/types'
import { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gta-6-codex.vercel.app'
const SITE_NAME = 'GTA6 Codex'
const SITE_DESCRIPTION = 'Un wiki editorial de primer nivel sobre Grand Theft Auto 6'

/**
 * Genera metadata para una entidad
 */
export function generateEntityMetadata(entity: Entity): Metadata {
  const title = entity.seoTitle || entity.title
  const description = entity.seoDescription || entity.description
  const url = `${SITE_URL}/${entity.type}/${entity.slug}`
  const image = `${SITE_URL}/og-image.png`

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
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
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
export function generateListMetadata(
  type: EntityType,
  count: number
): Metadata {
  const typeLabel = {
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
  }

  const label = typeLabel[type] || type
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
    },
    twitter: {
      card: 'summary_large_image',
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
    },
  }
}

/**
 * Genera JSON-LD structured data para una entidad
 */
export function generateEntityJsonLd(entity: Entity): object {
  const url = `${SITE_URL}/${entity.type}/${entity.slug}`

  return {
    '@context': 'https://schema.org',
    '@type': 'Thing',
    name: entity.title,
    description: entity.description,
    url,
    datePublished: entity.createdAt,
    dateModified: entity.updatedAt,
    inLanguage: 'es-ES',
    mainEntity: {
      '@type': 'WebPage',
      url,
    },
  }
}

/**
 * Genera JSON-LD para BreadcrumbList
 */
export function generateBreadcrumbJsonLd(
  items: Array<{ label: string; url: string }>
): object {
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
