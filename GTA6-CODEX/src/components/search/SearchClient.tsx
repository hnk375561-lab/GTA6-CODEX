'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Fuse from 'fuse.js'
import type { Entity, EntityType } from '@/types'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'

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
  trailers: 'Trailers',
} as Record<EntityType, string>

export function SearchClient({ entities }: SearchClientProps) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 250)

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
    if (!debouncedQuery.trim()) return []
    return fuse.search(debouncedQuery).slice(0, 30).map((r) => r.item)
  }, [fuse, debouncedQuery])

  return (
    <div>
      <div className="relative mb-8">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gta-text-tertiary"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar personajes, vehículos, ubicaciones..."
          autoFocus
          aria-label="Buscar en GTA6 Codex"
          className="glass-surface w-full rounded-xl border border-gta-border py-4 pl-12 pr-12 text-lg text-gta-text placeholder:text-gta-text-tertiary transition-all focus:border-gta-accent focus:shadow-glow-pink focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Limpiar búsqueda"
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-gta-text-secondary transition-colors hover:bg-gta-surface-elevated hover:text-gta-text"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {query.trim() && (
        <p className="mb-4 text-sm text-gta-text-secondary" aria-live="polite">
          {results.length} {results.length === 1 ? 'resultado' : 'resultados'} para &ldquo;{query}&rdquo;
        </p>
      )}

      {!query.trim() && (
        <p className="mb-4 text-sm text-gta-text-secondary">
          {entities.length} entidades documentadas — escribí un nombre, vehículo, ubicación o misión.
        </p>
      )}

      {results.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((entity) => (
            <Link key={`${entity.type}-${entity.slug}`} href={`/${entity.type}/${entity.slug}`} className="group block h-full">
              <Card hoverable className="h-full">
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
          ))}
        </div>
      )}

      {query.trim() && results.length === 0 && (
        <div className="rounded-lg border border-gta-border bg-gta-surface px-6 py-10 text-center">
          <p className="mb-1 font-semibold text-gta-text">
            Sin resultados para &ldquo;{query}&rdquo;
          </p>
          <p className="mb-4 text-sm text-gta-text-secondary">
            Puede que el nombre esté escrito distinto o que todavía no esté documentado.
          </p>
          <Link href="/" className="text-sm font-semibold text-gta-accent hover:underline">
            Volver al inicio y explorar por categoría
          </Link>
        </div>
      )}
    </div>
  )
}
