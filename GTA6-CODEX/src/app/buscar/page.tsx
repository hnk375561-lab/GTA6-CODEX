import type { Metadata } from 'next'
import { getAllEntities, getEntityCountsByType } from '@/lib/entities'
import { getEntityImageMap } from '@/lib/media'
import { SearchClient } from '@/components/search/SearchClient'
import { Reveal } from '@/components/ui/Reveal'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gta-6-codex.vercel.app'
const SITE_NAME = 'GTA6 Codex'

// Antes esta página no definía `alternates`, `openGraph` ni `twitter`, así
// que heredaba en silencio los del layout raíz: el canonical y el og:url
// servidos en producción para /buscar apuntaban a la home, no a /buscar
// (mismo patrón ya usado en /galeria — ver src/app/galeria/page.tsx).
const TITLE = 'Buscar | GTA6 Codex'
const DESCRIPTION = 'Busca personajes, vehículos, ubicaciones, misiones y más en GTA6 Codex.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: `${SITE_URL}/buscar` },
  openGraph: {
    type: 'website',
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/buscar`,
    siteName: SITE_NAME,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default async function SearchPage() {
  const [entities, counts] = await Promise.all([getAllEntities(), getEntityCountsByType()])

  return (
    <section className="py-12 sm:py-16">
      <div className="container-max">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gta-text">Buscar</h1>
          <Reveal delay={100}>
            <p className="text-gta-text-secondary">
              Encontrá cualquier personaje, vehículo, ubicación o misión documentada.
            </p>
          </Reveal>
        </div>

        <SearchClient entities={entities} counts={counts} imageBySlug={getEntityImageMap(entities)} />
      </div>
    </section>
  )
}
