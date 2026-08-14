'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Fuse from 'fuse.js'
import type { Entity, EntityType } from '@/types'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Reveal } from '@/components/ui/Reveal'

interface SearchClientProps {
  entities: Entity[]
}

const TYPE_LABELS: Record<EntityType, string> = {
  personajes: 'Personajes',
  vehiculos: 'Vehículos',
  ubicaciones: 'Ubicaciones',
  misiones: 'Misiones',
  armas: 'Armas',
  actividades: 'Actividades',
  organizaciones: 'Organizaciones',
  negocios: 'Negocios',
  objetos: 'Objetos',
  noticias: 'Noticias',
  guias: 'Guías',
} as Record<EntityType, string>

export function SearchClient({ entities }: SearchClientProps) {
  const [query, setQuery] = useState('')

  const fuse = useMemo(
    () =>
      new Fuse(entities, {
        keys: [
          { name: 'title', weight: 0.5 },
          { name: 'description', weight: 0.3 },
          { name: 'tags', weight: 0.2 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [entities]
  )

  const results = useMemo(() => {
    if (!query.trim()) return []
    return fuse.search(query).slice(0, 30).map((r) => r.item)
  }, [fuse, query])

  return (
    <div>
      <div className="mb-8 animate-slide-in">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar personajes, vehículos, ubicaciones..."
          autoFocus
          className="w-full rounded-lg border border-gta-border bg-gta-card px-5 py-4 text-lg text-gta-text placeholder:text-gta-text-secondary transition-all duration-300 focus:border-gta-accent focus:shadow-gta-md focus:outline-none"
        />
      </div>

      {query.trim() && (
        <p key={results.length} className="count-up mb-4 text-sm text-gta-text-secondary">
          {results.length} {results.length === 1 ? 'resultado' : 'resultados'} para &ldquo;{query}&rdquo;
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((entity, i) => (
          <Reveal key={`${entity.type}-${entity.slug}`} delay={Math.min(i, 8) * 60} once={false}>
            <Link href={`/${entity.type}/${entity.slug}`} className="group block h-full">
              <Card level={1} className="h-full">
                <CardBody>
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="tag">{TYPE_LABELS[entity.type]}</Badge>
                    <Badge variant="status" status={entity.status}>
                      {entity.status}
                    </Badge>
                  </div>
                  <h3 className="mb-1 font-bold text-gta-text transition-colors group-hover:text-gta-accent">
                    {entity.title}
                  </h3>
                  <p className="line-clamp-2 text-sm text-gta-text-secondary">{entity.description}</p>
                </CardBody>
              </Card>
            </Link>
          </Reveal>
        ))}
      </div>

      {query.trim() && results.length === 0 && (
        <p className="animate-fade-in text-gta-text-secondary">
          No encontramos nada para esa búsqueda. Probá con otro término.
        </p>
      )}
    </div>
  )
}
