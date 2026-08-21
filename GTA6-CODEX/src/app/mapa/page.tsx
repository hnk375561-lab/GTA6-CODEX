import type { Metadata } from 'next'
import type { Entity } from '@/types'
import { getEntitiesByType } from '@/lib/entities'
import { MAP_CATEGORY_TYPES } from '@/lib/map-entities'
import { LeonidaMapExplorer } from '@/components/map/LeonidaMapExplorer'
import { Reveal } from '@/components/ui/Reveal'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gta-6-zona.vercel.app'
const SITE_NAME = 'GTA6 Zona'

export const metadata: Metadata = {
  title: `Mapa de Leonida (no oficial) | ${SITE_NAME}`,
  description:
    'Mapa esquemático no oficial de Leonida por condados, basado en la cobertura de la filtración CYBERLEEK, con las ubicaciones de GTA 6 ya confirmadas por Rockstar.',
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: `${SITE_URL}/mapa` },
  openGraph: {
    type: 'website',
    title: `Mapa de Leonida (no oficial) | ${SITE_NAME}`,
    description:
      'Mapa esquemático no oficial de Leonida por condados, basado en la filtración CYBERLEEK, cruzado con las ubicaciones confirmadas del catálogo.',
    url: `${SITE_URL}/mapa`,
    siteName: SITE_NAME,
  },
}

export default async function MapaPage() {
  const entitiesByCategory = await Promise.all(MAP_CATEGORY_TYPES.map((type) => getEntitiesByType(type)))
  const entities: Entity[] = entitiesByCategory.flat()

  return (
    <div className="mx-auto max-w-7xl px-[var(--gutter-width)] py-10 md:py-14">
      <Reveal>
        <h1 className="font-display text-3xl font-bold text-gta-text md:text-4xl">Mapa de Leonida</h1>
        <p className="mt-2 max-w-2xl text-gta-text-secondary">
          Un mapa interactivo de las 5 zonas reportadas en la filtración CYBERLEEK, cruzado con ubicaciones, armas,
          vehículos, misiones y objetos ya catalogados. No es el mapa real del juego.
        </p>
      </Reveal>

      <div className="mt-8">
        <LeonidaMapExplorer entities={entities} />
      </div>
    </div>
  )
}
