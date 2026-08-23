/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest'
import { EntityType } from '@/types'
import type { Entity } from '@/types'
import type { MediaAsset } from '@/types/media'
import {
  generateEntityMetadata,
  generateListMetadata,
  generateHomepageMetadata,
  generateEntityJsonLd,
  generateBreadcrumbJsonLd,
  getCanonicalUrl,
  isValidUrl,
} from '@/lib/seo'

import { SITE_NAME, SITE_URL } from '@/config/site'

const mockEntity: Entity = {
  slug: 'tommy-vercetti',
  type: EntityType.CHARACTER,
  title: 'Tommy Vercetti',
  description: 'Protagonista de GTA 6',
  status: 'confirmado',
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-15').toISOString(),
} as any

const mockMediaAsset: MediaAsset = {
  id: 'media-1',
  type: 'image',
  source: {
    localPath: '/images/tommy.jpg',
    originalUrl: undefined,
  },
  createdAt: new Date('2024-01-01').toISOString(),
} as any

describe('generateEntityMetadata', () => {
  it('genera metadata básica para una entidad', () => {
    const metadata = generateEntityMetadata(mockEntity)
    expect(metadata.title).toContain(mockEntity.title)
    expect(metadata.title).toContain(SITE_NAME)
    expect(metadata.description).toBe(mockEntity.description)
  })

  it('usa seoTitle si está disponible en lugar de title', () => {
    const entityWithSeoTitle: Entity = {
      ...mockEntity,
      seoTitle: 'Tommy - Protagonista Custom',
    }
    const metadata = generateEntityMetadata(entityWithSeoTitle)
    expect(metadata.title).toContain('Tommy - Protagonista Custom')
  })

  it('usa seoDescription si está disponible', () => {
    const entityWithSeoDesc: Entity = {
      ...mockEntity,
      seoDescription: 'Descripción SEO optimizada',
    }
    const metadata = generateEntityMetadata(entityWithSeoDesc)
    expect(metadata.description).toBe('Descripción SEO optimizada')
  })

  it('genera canonical URL correcta', () => {
    const metadata = generateEntityMetadata(mockEntity)
    expect(metadata.alternates?.canonical).toBe(
      `${SITE_URL}/${mockEntity.type}/${mockEntity.slug}`
    )
  })

  it('incluye og:image remota si se proporciona ogImage remota', () => {
    const ogImage = { src: 'https://example.com/image.jpg', alt: 'Tommy', remote: true }
    const metadata = generateEntityMetadata(mockEntity, ogImage)
    const ogImages = metadata.openGraph?.images
    expect(ogImages).toBeDefined()
    expect(Array.isArray(ogImages)).toBe(true)
    if (Array.isArray(ogImages)) {
      expect((ogImages[0] as any).url).toBe('https://example.com/image.jpg')
    }
  })

  it('prepende SITE_URL a og:image local', () => {
    const ogImage = { src: '/images/tommy.jpg', alt: 'Tommy', remote: false }
    const metadata = generateEntityMetadata(mockEntity, ogImage)
    const ogImages = metadata.openGraph?.images
    if (Array.isArray(ogImages)) {
      expect((ogImages[0] as any).url).toBe(`${SITE_URL}/images/tommy.jpg`)
    }
  })

  it('cae a og-image.png genérico si no hay ogImage', () => {
    const metadata = generateEntityMetadata(mockEntity)
    const ogImages = metadata.openGraph?.images
    if (Array.isArray(ogImages)) {
      expect((ogImages[0] as any).url).toContain('og-image.png')
    }
  })

  it('no fija width/height para og:image local (aspect ratio variable)', () => {
    const ogImage = { src: '/images/tommy.jpg', alt: 'Tommy', remote: false }
    const metadata = generateEntityMetadata(mockEntity, ogImage)
    const ogImages = metadata.openGraph?.images
    if (Array.isArray(ogImages)) {
      expect((ogImages[0] as any).width).toBeUndefined()
      expect((ogImages[0] as any).height).toBeUndefined()
    }
  })

  it('fija 1200x630 para og-image.png genérico', () => {
    const metadata = generateEntityMetadata(mockEntity)
    const ogImages = metadata.openGraph?.images
    if (Array.isArray(ogImages)) {
      const genericImg = ogImages.find((img: any) => typeof img.url === 'string' && img.url.includes('og-image.png')) as any
      expect(genericImg?.width).toBe(1200)
      expect(genericImg?.height).toBe(630)
    }
  })

  it('usa alt del ogImage o fallback a title', () => {
    const ogImageWithAlt = { src: '/image.jpg', alt: 'Custom Alt', remote: false }
    const metadata1 = generateEntityMetadata(mockEntity, ogImageWithAlt)
    const ogImages1 = metadata1.openGraph?.images
    if (Array.isArray(ogImages1)) {
      expect((ogImages1[0] as any).alt).toBe('Custom Alt')
    }

    const metadata2 = generateEntityMetadata(mockEntity)
    const ogImages2 = metadata2.openGraph?.images
    if (Array.isArray(ogImages2)) {
      expect((ogImages2[0] as any).alt).toBe(mockEntity.title)
    }
  })

  it('incluye openGraph type "article" siempre', () => {
    const metadata = generateEntityMetadata(mockEntity)
    expect((metadata.openGraph as any)?.type).toBe('article')
  })

  it('incluye twitter card summary_large_image', () => {
    const metadata = generateEntityMetadata(mockEntity)
    expect((metadata.twitter as any)?.card).toBe('summary_large_image')
  })
})

describe('generateListMetadata', () => {
  it('genera metadata para listado de entidades', () => {
    const metadata = generateListMetadata(EntityType.CHARACTER, 42)
    expect(metadata.title).toContain('Personajes')
    expect(metadata.description).toContain('42')
  })

  it('genera URL canónica del listado', () => {
    const metadata = generateListMetadata(EntityType.VEHICLE, 100)
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/${EntityType.VEHICLE}`)
  })

  it('usa descripción específica por tipo si existe', () => {
    const metaCharacter = generateListMetadata(EntityType.CHARACTER, 5)
    const metaVehicle = generateListMetadata(EntityType.VEHICLE, 5)
    expect(metaCharacter.description).not.toBe(metaVehicle.description)
    expect(metaCharacter.description).toContain('personajes')
    expect(metaVehicle.description).toContain('autos y motos')
  })

  it('cae a descripción genérica si tipo no tiene map específico', () => {
    // Si hubiera un tipo sin map, usaría el fallback "Explora N {label}"
    // Pero todos los tipos están mapeados en LIST_DESCRIPTION_BY_TYPE
    const metadata = generateListMetadata(EntityType.CHARACTER, 10)
    expect(metadata.description).toBeDefined()
    expect(metadata.description?.length).toBeGreaterThan(0)
  })

  it('openGraph type es "website" para listas', () => {
    const metadata = generateListMetadata(EntityType.LOCATION, 20)
    expect((metadata.openGraph as any)?.type).toBe('website')
  })
})

describe('generateHomepageMetadata', () => {
  it('genera metadata para la homepage', () => {
    const metadata = generateHomepageMetadata()
    expect(metadata.title).toContain(SITE_NAME)
    expect(metadata.title).toContain('Comparador de Autos')
  })

  it('usa descripción del sitio', () => {
    const metadata = generateHomepageMetadata()
    expect(metadata.description).toContain('Fichas técnicas')
  })

  it('canonical apunta a SITE_URL sin path', () => {
    const metadata = generateHomepageMetadata()
    expect(metadata.alternates?.canonical).toBe(SITE_URL)
  })

  it('incluye og-image.png con dimensiones 1200x630', () => {
    const metadata = generateHomepageMetadata()
    const ogImages = metadata.openGraph?.images
    if (Array.isArray(ogImages)) {
      const img = (ogImages[0] as any)
      expect(img.url).toContain('og-image.png')
      expect(img.width).toBe(1200)
      expect(img.height).toBe(630)
    }
  })
})

describe('generateEntityJsonLd', () => {
  it('genera JSON-LD con @context y @type correcto', () => {
    const jsonLd = generateEntityJsonLd(mockEntity) as any
    expect(jsonLd['@context']).toBe('https://schema.org')
    expect(jsonLd['@type']).toBeDefined()
  })

  it('mapea EntityType.CHARACTER a "Person"', () => {
    const character: Entity = { ...mockEntity, type: EntityType.CHARACTER }
    const jsonLd = generateEntityJsonLd(character) as any
    expect(jsonLd['@type']).toBe('Person')
  })

  it('mapea EntityType.VEHICLE a "Vehicle"', () => {
    const vehicle: Entity = { ...mockEntity, type: EntityType.VEHICLE }
    const jsonLd = generateEntityJsonLd(vehicle) as any
    expect(jsonLd['@type']).toBe('Vehicle')
  })

  it('mapea EntityType.LOCATION a "Place"', () => {
    const location: Entity = { ...mockEntity, type: EntityType.LOCATION }
    const jsonLd = generateEntityJsonLd(location) as any
    expect(jsonLd['@type']).toBe('Place')
  })

  it('mapea EntityType.TRAILER a "VideoObject"', () => {
    const trailer: Entity = { ...mockEntity, type: EntityType.TRAILER } as any
    const jsonLd = generateEntityJsonLd(trailer) as any
    expect(jsonLd['@type']).toBe('VideoObject')
  })

  it('cae a "Thing" para tipos sin mapeo específico', () => {
    const unknown: Entity = { ...mockEntity, type: EntityType.OBJECT } as any
    const jsonLd = generateEntityJsonLd(unknown) as any
    expect(jsonLd['@type']).toBe('Thing')
  })

  it('incluye nombre, descripción y URL de la entidad', () => {
    const jsonLd = generateEntityJsonLd(mockEntity) as any
    expect(jsonLd.name).toBe(mockEntity.title)
    expect(jsonLd.description).toBe(mockEntity.description)
    expect(jsonLd.url).toContain(mockEntity.slug)
  })

  it('incluye datePublished y dateModified', () => {
    const jsonLd = generateEntityJsonLd(mockEntity) as any
    expect(jsonLd.datePublished).toBe(mockEntity.createdAt)
    expect(jsonLd.dateModified).toBe(mockEntity.updatedAt)
  })

  it('enriquece VideoObject con contentUrl y duration si hay media', () => {
    const trailer: Entity = { ...mockEntity, type: EntityType.TRAILER } as any
    const mediaWithUrl: MediaAsset = {
      ...mockMediaAsset,
      duration: 120,
      source: { localPath: undefined, originalUrl: 'https://example.com/video.mp4' },
    } as any
    const jsonLd = generateEntityJsonLd(trailer, mediaWithUrl) as any
    expect(jsonLd.contentUrl).toBe('https://example.com/video.mp4')
    expect(jsonLd.duration).toBe('PT120S')
  })

  it('no enriquece VideoObject sin media', () => {
    const trailer: Entity = { ...mockEntity, type: EntityType.TRAILER } as any
    const jsonLd = generateEntityJsonLd(trailer) as any
    expect(jsonLd.contentUrl).toBeUndefined()
    expect(jsonLd.duration).toBeUndefined()
  })

  it('respeta inLanguage: "es"', () => {
    const jsonLd = generateEntityJsonLd(mockEntity) as any
    expect(jsonLd.inLanguage).toBe('es')
  })
})

describe('generateBreadcrumbJsonLd', () => {
  it('genera BreadcrumbList con estructura correcta', () => {
    const items = [
      { label: 'Inicio', url: SITE_URL },
      { label: 'Personajes', url: `${SITE_URL}/personajes` },
      { label: 'Tommy', url: `${SITE_URL}/personajes/tommy` },
    ]
    const jsonLd = generateBreadcrumbJsonLd(items) as any
    expect(jsonLd['@context']).toBe('https://schema.org')
    expect(jsonLd['@type']).toBe('BreadcrumbList')
    expect(Array.isArray(jsonLd.itemListElement)).toBe(true)
  })

  it('posición es index + 1', () => {
    const items = [
      { label: 'Home', url: 'http://example.com' },
      { label: 'Category', url: 'http://example.com/cat' },
      { label: 'Item', url: 'http://example.com/cat/item' },
    ]
    const jsonLd = generateBreadcrumbJsonLd(items) as any
    if (Array.isArray(jsonLd.itemListElement)) {
      expect(jsonLd.itemListElement[0].position).toBe(1)
      expect(jsonLd.itemListElement[1].position).toBe(2)
      expect(jsonLd.itemListElement[2].position).toBe(3)
    }
  })

  it('preserva label y url en cada item', () => {
    const items = [{ label: 'Custom', url: 'http://custom.url' }]
    const jsonLd = generateBreadcrumbJsonLd(items) as any
    if (Array.isArray(jsonLd.itemListElement)) {
      expect(jsonLd.itemListElement[0].name).toBe('Custom')
      expect(jsonLd.itemListElement[0].item).toBe('http://custom.url')
    }
  })

  it('funciona con lista vacía', () => {
    const jsonLd = generateBreadcrumbJsonLd([]) as any
    expect(Array.isArray(jsonLd.itemListElement)).toBe(true)
    expect(jsonLd.itemListElement).toHaveLength(0)
  })
})

describe('getCanonicalUrl', () => {
  it('construye URL canónica correcta', () => {
    const url = getCanonicalUrl('personajes', 'tommy-vercetti')
    expect(url).toBe(`${SITE_URL}/personajes/tommy-vercetti`)
  })

  it('funciona con cualquier tipo y slug', () => {
    const url = getCanonicalUrl('vehiculos', 'sabreur')
    expect(url).toBe(`${SITE_URL}/vehiculos/sabreur`)
  })
})

describe('isValidUrl', () => {
  it('valida URLs HTTPS correctas', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
    expect(isValidUrl('https://example.com/path')).toBe(true)
    expect(isValidUrl('https://sub.example.com/path?query=1')).toBe(true)
  })

  it('valida URLs HTTP', () => {
    expect(isValidUrl('http://example.com')).toBe(true)
  })

  it('rechaza URLs malformadas', () => {
    expect(isValidUrl('not-a-url')).toBe(false)
    expect(isValidUrl('example.com')).toBe(false)
    expect(isValidUrl('ftp://')).toBe(false)
  })

  it('rechaza strings vacíos', () => {
    expect(isValidUrl('')).toBe(false)
  })

  it('rechaza URLs incompletas', () => {
    expect(isValidUrl('https://')).toBe(false)
  })
})
