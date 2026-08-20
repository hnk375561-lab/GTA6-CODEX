'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Fuse from 'fuse.js'
import type { Entity, EntityType } from '@/types'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { EntityImage } from '@/components/entities/EntityImage'
import type { ResolvedDisplayImage } from '@/lib/images'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { useSyncedSearchParams } from '@/lib/hooks/useSyncedSearchParams'
import { cn } from '@/lib/utils'

interface SearchClientProps {
  entities: Entity[]
  counts: Record<EntityType, number>
  /** type/slug → imagen ya resuelta (ver `getEntityImageMap` en `@/lib/media.ts`).
   *  `SearchClient` es `'use client'`, así que no puede resolver imágenes
   *  por su cuenta con `fs` — el caller server (`/buscar/page.tsx`)
   *  resuelve el mapa completo una sola vez y lo pasa acá. */
  imageBySlug?: Record<string, ResolvedDisplayImage | null>
  /** Query inicial con la que arranca el input, resuelta server-side desde
   *  `?q=` en la URL (ver `/buscar/page.tsx`). Permite deep-linking real
   *  desde otros puntos del sitio (ej. el buscador rápido de la home) en
   *  vez de forzar al usuario a re-escribir la búsqueda. Sigue siendo
   *  100% opcional: sin `?q=`, el comportamiento es idéntico al de antes. */
  initialQuery?: string
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

// Solo las categorías con más volumen de contenido se ofrecen como accesos
// rápidos antes de escribir — evita saturar el estado inicial con 12 chips.
const QUICK_TYPES: EntityType[] = [
  'personajes' as EntityType,
  'vehiculos' as EntityType,
  'ubicaciones' as EntityType,
  'misiones' as EntityType,
  'organizaciones' as EntityType,
  'trailers' as EntityType,
]

export function SearchClient({ entities, counts, imageBySlug, initialQuery }: SearchClientProps) {
  // Estado inicial: `initialQuery` llega resuelto del servidor desde
  // `?q=` (ver /buscar/page.tsx), y acá se suma `?tipo=` para que el
  // filtro de categoría también sea parte del link compartible y del
  // historial del navegador (ver `useSyncedSearchParams`).
  const { searchParams, updateParams } = useSyncedSearchParams()
  const [query, setQuery] = useState(initialQuery ?? searchParams.get('q') ?? '')
  const [activeType, setActiveType] = useState<EntityType | 'todos'>(() => {
    const raw = searchParams.get('tipo')
    return raw && raw in TYPE_LABELS ? (raw as EntityType) : 'todos'
  })
  const debouncedQuery = useDebouncedValue(query, 250)

  // Mantiene `?q=` y `?tipo=` al día con el estado actual, así el link es
  // compartible y el botón "atrás" del navegador restaura la búsqueda tal
  // como estaba (ver comentario largo en `useSyncedSearchParams`).
  useEffect(() => {
    updateParams({
      q: debouncedQuery.trim() || null,
      tipo: activeType !== 'todos' ? activeType : null,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, activeType])

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

  const rawResults = useMemo(() => {
    if (!debouncedQuery.trim()) return []
    return fuse.search(debouncedQuery).slice(0, 60).map((r) => r.item)
  }, [fuse, debouncedQuery])

  const results = useMemo(() => {
    const base = activeType === 'todos' ? rawResults : rawResults.filter((e) => e.type === activeType)
    return base.slice(0, 30)
  }, [rawResults, activeType])

  const typeCountsInResults = useMemo(() => {
    const c = new Map<EntityType, number>()
    for (const e of rawResults) c.set(e.type, (c.get(e.type) ?? 0) + 1)
    return c
  }, [rawResults])

  return (
    <div>
      <div className="relative mb-6">
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
          aria-label="Buscar en GTA6 Zona"
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

      {!query.trim() ? (
        <div>
          <p className="mb-4 text-sm text-gta-text-secondary">
            {entities.length} entidades documentadas — escribí un nombre, o entrá directo por categoría.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {QUICK_TYPES.map((type) => (
              <Link
                key={type}
                href={`/${type}`}
                className="group flex items-center gap-3 rounded-lg border border-gta-border bg-gta-surface/60 px-4 py-3.5 transition-colors hover:border-gta-accent/50 hover:bg-gta-surface-elevated"
              >
                <div className="category-icon-badge flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gta-accent">
                  <CategoryIcon type={type} className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gta-text group-hover:text-gta-accent">
                    {TYPE_LABELS[type]}
                  </p>
                  <p className="text-xs text-gta-text-secondary">{counts[type] ?? 0} entradas</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveType('todos')}
              aria-pressed={activeType === 'todos'}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
                activeType === 'todos'
                  ? 'border-gta-accent bg-gta-accent/15 text-gta-accent'
                  : 'border-gta-border text-gta-text-secondary hover:border-gta-border-strong hover:text-gta-text'
              )}
            >
              Todos <span className="ml-1 text-gta-text-secondary/80">{rawResults.length}</span>
            </button>
            {Array.from(typeCountsInResults.entries()).map(([type, count]) => (
              <button
                key={type}
                type="button"
                onClick={() => setActiveType(type)}
                aria-pressed={activeType === type}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
                  activeType === type
                    ? 'border-gta-accent bg-gta-accent/15 text-gta-accent'
                    : 'border-gta-border text-gta-text-secondary hover:border-gta-border-strong hover:text-gta-text'
                )}
              >
                {TYPE_LABELS[type]} <span className="ml-1 text-gta-text-secondary/80">{count}</span>
              </button>
            ))}
          </div>

          <p className="mb-4 text-sm text-gta-text-secondary" aria-live="polite">
            {results.length} {results.length === 1 ? 'resultado' : 'resultados'} para &ldquo;{query}&rdquo;
          </p>

          {results.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((entity) => (
                <Link key={`${entity.type}-${entity.slug}`} href={`/${entity.type}/${entity.slug}`} className="group block h-full">
                  <Card hoverable className="h-full">
                    <CardBody className="flex gap-3">
                      <EntityImage entity={entity} image={imageBySlug?.[`${entity.type}/${entity.slug}`]} variant="avatar" className="h-12 w-12" />
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant="tag">{TYPE_LABELS[entity.type]}</Badge>
                          <Badge variant="status" status={entity.status}>
                            {entity.status}
                          </Badge>
                        </div>
                        <h3 className="mb-1 truncate font-bold text-gta-text transition-colors group-hover:text-gta-accent">
                          {entity.title}
                        </h3>
                        <p className="line-clamp-2 text-sm text-gta-text-secondary">{entity.description}</p>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {results.length === 0 && (
            <div className="rounded-lg border border-gta-border bg-gta-surface px-6 py-10 text-center">
              <p className="mb-1 font-semibold text-gta-text">
                Sin resultados para &ldquo;{query}&rdquo;
              </p>
              <p className="mb-4 text-sm text-gta-text-secondary">
                {activeType !== 'todos'
                  ? 'Probá quitando el filtro de categoría, o revisá que el nombre esté bien escrito.'
                  : 'Puede que el nombre esté escrito distinto o que todavía no esté documentado.'}
              </p>
              {activeType !== 'todos' ? (
                <button
                  type="button"
                  onClick={() => setActiveType('todos')}
                  className="text-sm font-semibold text-gta-accent hover:underline"
                >
                  Quitar filtro de categoría
                </button>
              ) : (
                <Link href="/" className="text-sm font-semibold text-gta-accent hover:underline">
                  Volver al inicio y explorar por categoría
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
