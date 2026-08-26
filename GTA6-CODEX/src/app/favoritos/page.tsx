import type { Metadata } from 'next'
import { getAllEntities } from '@/lib/entities'
import { getEntityImageMap } from '@/lib/media'
import { WishlistExplorer } from '@/components/entities/WishlistExplorer'
import { Reveal } from '@/components/ui/Reveal'
import { SITE_NAME, SITE_URL } from '@/config/site'

export const metadata: Metadata = {
  title: `Favoritos | ${SITE_NAME}`,
  description: 'Tus vehículos y fichas guardadas en este navegador.',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: `${SITE_URL}/favoritos`,
  },
  // Página 100% personal (depende de localStorage del visitante), no
  // aporta nada indexable — mismo criterio que /buscar.
  robots: {
    index: false,
    follow: true,
  },
}

/**
 * `/favoritos`: la wishlist en sí vive en `localStorage` (ver
 * `useWishlist`), así que esta página server solo resuelve TODAS las
 * entidades del sitio (no solo vehículos, a diferencia de `/comparar`) y
 * sus imágenes, y deja que `WishlistExplorer` (cliente) filtre contra los
 * ids guardados en el navegador.
 */
export default async function FavoritosPage() {
  const entities = await getAllEntities()
  const imageBySlug = getEntityImageMap(entities)

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Reveal>
        <div className="mb-8 max-w-2xl">
          <h1 className="font-display text-2xl font-bold text-auto-text sm:text-3xl">
            Tus <span className="text-gradient-vice">favoritos</span>
          </h1>
          <p className="mt-2 text-sm text-auto-text-secondary sm:text-base">
            Guardado solo en este navegador — tocá el corazón en cualquier ficha para agregarla.
          </p>
        </div>
      </Reveal>

      <WishlistExplorer entities={entities} imageBySlug={imageBySlug} />
    </div>
  )
}
