import type { Metadata } from 'next'
import { getAllEntities } from '@/lib/entities'
import { SearchClient } from '@/components/search/SearchClient'

export const metadata: Metadata = {
  title: 'Buscar | GTA6 Codex',
  description: 'Busca personajes, vehículos, ubicaciones, misiones y más en GTA6 Codex.',
}

export default async function SearchPage() {
  const entities = await getAllEntities()

  return (
    <section className="py-12 sm:py-16">
      <div className="container-max">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gta-text">Buscar</h1>
          <p className="text-gta-text-secondary">
            Encontrá cualquier personaje, vehículo, ubicación o misión documentada.
          </p>
        </div>

        <SearchClient entities={entities} />
      </div>
    </section>
  )
}
