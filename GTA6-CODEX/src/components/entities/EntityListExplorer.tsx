'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Fuse from 'fuse.js'
import type { Entity, EntityType, Trailer } from '@/types'
import { EntityType as EntityTypeEnum } from '@/types'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Reveal } from '@/components/ui/Reveal'
import { EntityImage } from '@/components/entities/EntityImage'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { cn } from '@/lib/utils'

const STATUS_LABELS = {
  confirmado: 'Confirmado',
  rumor: 'Rumor',
  nuestro: 'Nuestro',
} as const

type StatusFilter = 'todos' | keyof typeof STATUS_LABELS

function formatTrailerDuration(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

interface EntityListExplorerProps {
  type: EntityType
  entities: Entity[]
  typeLabel: string
}

/**
 * Cliente interactivo de una página de listado (`/[entityType]`): búsqueda
 * en vivo (Fuse.js, mismo motor que /buscar) + filtro por estado editorial,
 * ambos sobre los datos ya resueltos en el servidor (sin fetch adicional,
 * sin romper la generación estática de la ruta).
 *
 * Reemplaza el patrón "Título → grid de cards → fin": agrega una barra de
 * herramientas real con conteos por estado y estados vacíos específicos
 * para "sin resultados de búsqueda" vs. "categoría todavía vacía".
 */
export function EntityListExplorer({ type, entities, typeLabel }: EntityListExplorerProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('todos')
  const debouncedQuery = useDebouncedValue(query, 200)

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { todos: entities.length, confirmado: 0, rumor: 0, nuestro: 0 }
    for (const e of entities) {
      const key = e.status as keyof typeof STATUS_LABELS
      if (key in STATUS_LABELS) c[key] += 1
    }
    return c
  }, [entities])

  const fuse = useMemo(
    () =>
      new Fuse(entities, {
        keys: [
          { name: 'title', weight: 0.6 },
          { name: 'description', weight: 0.25 },
          { name: 'tags', weight: 0.15 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [entities]
  )

  const filtered = useMemo(() => {
    const base = debouncedQuery.trim()
      ? fuse.search(debouncedQuery).map((r) => r.item)
      : entities
    if (status === 'todos') return base
    return base.filter((e) => e.status === status)
  }, [fuse, debouncedQuery, entities, status])

  // Toda card de listado lleva media (imagen local, miniatura de trailer o
  // fallback animado por categoría — ver EntityImage/lib/images.ts): ya no
  // se oculta el slot de imagen para las categorías sin key art propia
  // todavía, para que ninguna card se vea "muerta" mientras se sube el
  // asset real.
  const hasImages = true
  const isFiltering = debouncedQuery.trim().length > 0 || status !== 'todos'

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gta-text-tertiary"
            width="16"
            height="16"
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
            placeholder={`Buscar en ${typeLabel.toLowerCase()}...`}
            aria-label={`Buscar en ${typeLabel}`}
            className="glass-surface w-full rounded-lg border border-gta-border py-2.5 pl-10 pr-9 text-sm text-gta-text placeholder:text-gta-text-tertiary transition-all focus:border-gta-accent focus:shadow-glow-pink focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-gta-text-secondary transition-colors hover:bg-gta-surface-elevated hover:text-gta-text"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
          {(['todos', 'confirmado', 'rumor', 'nuestro'] as StatusFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              aria-pressed={status === key}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
                status === key
                  ? 'border-gta-accent bg-gta-accent/15 text-gta-accent'
                  : 'border-gta-border text-gta-text-secondary hover:border-gta-border-strong hover:text-gta-text'
              )}
            >
              {key === 'todos' ? 'Todos' : STATUS_LABELS[key]}
              <span className="ml-1.5 text-gta-text-secondary/60">{counts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      {isFiltering && (
        <p className="mb-5 text-sm text-gta-text-secondary" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
          {query.trim() && <> para &ldquo;{query}&rdquo;</>}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-gta-border bg-gta-surface px-6 py-10 text-center">
          {entities.length === 0 ? (
            <>
              <p className="mb-1 font-semibold text-gta-text">
                Todavía no hay {typeLabel.toLowerCase()} documentados
              </p>
              <p className="mb-4 text-sm text-gta-text-secondary">
                Esta categoría está vacía por ahora — estamos incorporando contenido a medida que se
                confirma. Volvé pronto.
              </p>
              <Link href="/" className="text-sm font-semibold text-gta-accent hover:underline">
                Explorar otras categorías
              </Link>
            </>
          ) : (
            <>
              <p className="mb-1 font-semibold text-gta-text">Sin resultados</p>
              <p className="mb-4 text-sm text-gta-text-secondary">
                Probá con otro término de búsqueda o quitá el filtro de estado.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setStatus('todos')
                }}
                className="text-sm font-semibold text-gta-accent hover:underline"
              >
                Limpiar filtros
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entity, i) => (
            <Reveal key={entity.slug} delay={(i % 6) * 80}>
              <Link href={`/${type}/${entity.slug}`} className="group block h-full">
                <Card hoverable className={cn('h-full overflow-hidden', hasImages && '!p-0')}>
                  {hasImages && (
                    <div className="relative">
                      <EntityImage entity={entity} variant="thumbnail" className="rounded-none border-x-0 border-t-0" />
                      {type === EntityTypeEnum.TRAILER && 'scenes' in entity && (
                        <div className="trailer-card-overlay">
                          <span className="trailer-card-overlay-chip">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <rect x="3.5" y="5.5" width="17" height="13" rx="1.6" />
                              <path d="M9.7 9.3v5.4l4.6-2.7-4.6-2.7Z" />
                            </svg>
                            {(entity as Trailer).scenes.length} escenas
                          </span>
                          {formatTrailerDuration((entity as Trailer).durationSeconds) && (
                            <span className="trailer-card-overlay-chip">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="8.5" />
                                <path d="M12 7v5l3.2 2" />
                              </svg>
                              {formatTrailerDuration((entity as Trailer).durationSeconds)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <CardBody className={hasImages ? 'p-6' : undefined}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <Badge variant="status" status={entity.status}>
                        {STATUS_LABELS[entity.status as keyof typeof STATUS_LABELS] || entity.status}
                      </Badge>
                      {entity.featured && <Badge variant="tag">Destacado</Badge>}
                    </div>
                    <h2 className="mb-2 text-xl font-bold text-gta-text transition-colors group-hover:text-gta-accent">
                      {entity.title}
                    </h2>
                    <p className="line-clamp-3 text-sm text-gta-text-secondary">{entity.description}</p>
                    {type === EntityTypeEnum.TRAILER && 'scenes' in entity && (
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gta-border pt-3 text-xs text-gta-text-secondary">
                        <span className="inline-flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="3.5" y="5.5" width="17" height="13" rx="1.6" />
                            <path d="M9.7 9.3v5.4l4.6-2.7-4.6-2.7Z" />
                          </svg>
                          {(entity as Trailer).scenes.length} escenas
                        </span>
                        {formatTrailerDuration((entity as Trailer).durationSeconds) && (
                          <span className="inline-flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <circle cx="12" cy="12" r="8.5" />
                              <path d="M12 7v5l3.2 2" />
                            </svg>
                            {formatTrailerDuration((entity as Trailer).durationSeconds)}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="4" y="4.5" width="16" height="15" rx="1.4" />
                            <path d="M7.5 8.5h6M7.5 11.5h9" />
                          </svg>
                          {new Date((entity as Trailer).releaseDate).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  )
}
