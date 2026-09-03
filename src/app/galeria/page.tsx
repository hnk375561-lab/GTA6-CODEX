import type { Metadata } from 'next'
import { getGalleryItems, getGalleryCategoryCounts } from '@/lib/gallery'
import { GalleryHero } from '@/components/gallery/GalleryHero'
import { GalleryExplorer } from '@/components/gallery/GalleryExplorer'
import { AdUnit } from '@/components/monetization/AdUnit'
import { SITE_NAME, SITE_URL } from '@/config/site'
import { serializeJsonLd } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const items = await getGalleryItems()
  const title = `Galería | ${SITE_NAME}`
  const description = `Explorá ${items.length} imágenes de autos y motos, organizadas por marca y modelo.`

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: `${SITE_URL}/galeria` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${SITE_URL}/galeria`,
      siteName: SITE_NAME,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function GaleriaPage() {
  const items = await getGalleryItems()
  const categories = getGalleryCategoryCounts(items)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name: `Galería — ${SITE_NAME}`,
    description: 'Fotografía de stock y propia de autos y motos, organizada por marca y modelo.',
    url: `${SITE_URL}/galeria`,
    numberOfItems: items.length,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <GalleryHero total={items.length} categoryCount={categories.length} />
      <section className="py-12 sm:py-16">
        <div className="container-max">
          <GalleryExplorer items={items} categories={categories} />
          {/* Monetization: mismo slot real de AdSense reusado en el
              resto del sitio (ver rankings/page.tsx para el criterio). */}
          <AdUnit
            slotId="3119092668"
            format="responsive"
            className="mt-12"
            dataTrackingLabel="ad-galeria-index"
          />
        </div>
      </section>
    </>
  )
}
