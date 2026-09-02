'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { EntityType, type Entity, type Vehicle } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { EntityImage } from '@/components/entities/EntityImage'
import type { ResolvedDisplayImage } from '@/lib/images'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { useSyncedSearchParams } from '@/lib/hooks/useSyncedSearchParams'
import { cn } from '@/lib/utils'
import { STATUS_LABELS } from '@/lib/entity-labels'
import { vehiclePerformanceScore, hasPerformanceData } from '@/lib/vehicle-performance'
import { SITE_NAME } from '@/config/site'
import { buildFuse } from '@/lib/entity-list-filters'

type StatusFilter = 'todos' | keyof typeof STATUS_LABELS

type SortOption = 'default' | 'az' | 'za' | 'recent' | 'connections' | 'performance'

const SORT_LABELS: Record<SortOption, string> = {
  default: 'Relevancia',
  az: 'A-Z',
  za: 'Z-A',
  recent: 'Más recientes',
  connections: 'Más conexiones',
  performance: 'Mejor rendimiento',
}

/** Mismo criterio que `EntityListExplorer`: un tag necesita 2+ apariciones
 *  dentro del conjunto de resultados actual para contar como filtro real
 *  (evita chips de un solo uso, que no aportan como categoría). */
const MIN_ATTRIBUTE_COUNT = 2
/** Tope de chips de tag visibles — puramente de presentación, no descarta
 *  resultados, solo no lista una cola larga de tags poco frecuentes. */
const MAX_TAG_OPTIONS = 14

interface SearchClientProps {
  entities: Entity[]
  counts: Record<EntityType, number>
  /** type/slug → imagen ya resuelta (ver `getEntityImageMap` en `@/lib/media.ts`).
   *  `SearchClient` es `'use client'`, así que no puede resolver imágenes
   *  por su cuenta con `fs` — el caller server (`/buscar/page.tsx`)
   *  resuelve el mapa completo una sola vez y lo pasa acá. */
  imageBySlug?: Record<string, ResolvedDisplayImage | null>
  /** type/slug → conteo de conexiones incluyendo relaciones inferidas/
   *  bidireccionales (ver `getBidirectionalRelationCount` en
   *  `@/lib/relations.ts`), mismo patrón que `imageBySlug`. Habilita el
   *  criterio de orden "Más conexiones", igual que en `EntityListExplorer`.
   *  Si no se pasa, ese criterio de orden no se ofrece. */
  relationCountBySlug?: Record<string, number>
  /** Query inicial con la que arranca el input, resuelta server-side desde
   *  `?q=` en la URL (ver `/buscar/page.tsx`). Permite deep-linking real
   *  desde otros puntos del sitio (ej. el buscador rápido de la home) en
   *  vez de forzar al usuario a re-escribir la búsqueda. Sigue siendo
   *  100% opcional: sin `?q=`, el comportamiento es idéntico al de antes. */
  initialQuery?: string
}

// Antes este mapa traía categorías heredadas del sitio de GTA6
// (personajes, ubicaciones, misiones, armas, etc.) que ya no existen en
// `EntityType` desde el pivote a AutoFicha — de ahí el `as Record<...>`
// que enmascaraba el desalineamiento. Se alinea 1:1 con el enum actual.
const TYPE_LABELS: Record<EntityType, string> = {
  [EntityType.VEHICLE]: 'Vehículos',
  [EntityType.NEWS]: 'Noticias',
  [EntityType.GUIDE]: 'Guías',
  [EntityType.MANUFACTURER]: 'Fabricantes',
}

// Antes esta lista era fija (categorías del sitio de GTA6 con más volumen).
// Ahora se calcula dinámicamente a partir de `counts` — solo se muestran
// categorías que realmente tienen contenido cargado, para no mostrar chips
// de acceso rápido con "0 entradas" cuando el sitio recién tiene una sola
// categoría (vehiculos) con fichas.
function getQuickTypes(counts: Record<EntityType, number>): EntityType[] {
  return (Object.keys(counts) as EntityType[])
    .filter((type) => counts[type] > 0)
    .sort((a, b) => counts[b] - counts[a])
    .slice(0, 6)
}

export function SearchClient({ entities, counts, imageBySlug, relationCountBySlug, initialQuery }: SearchClientProps) {
  // Estado inicial: `initialQuery` llega resuelto del servidor desde
  // `?q=` (ver /buscar/page.tsx). El resto de filtros (`tipo`, `estado`,
  // `orden`, `tags`) se leen directo de la URL, igual que en
  // `EntityListExplorer` — mismo criterio de filtros en ambas pantallas
  // (ver `useSyncedSearchParams`).
  const { searchParams, updateParams } = useSyncedSearchParams()
  const [query, setQuery] = useState(initialQuery ?? searchParams.get('q') ?? '')
  const quickTypes = useMemo(() => getQuickTypes(counts), [counts])
  const [activeType, setActiveType] = useState<EntityType | 'todos'>(() => {
    const raw = searchParams.get('tipo')
    return raw && raw in TYPE_LABELS ? (raw as EntityType) : 'todos'
  })
  const [status, setStatus] = useState<StatusFilter>(() => {
    const raw = searchParams.get('estado')
    return raw && raw in STATUS_LABELS ? (raw as StatusFilter) : 'todos'
  })
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const raw = searchParams.get('orden')
    return raw && raw in SORT_LABELS ? (raw as SortOption) : 'default'
  })
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const raw = searchParams.get('tags')
    return raw ? raw.split(',').filter(Boolean) : []
  })
  const debouncedQuery = useDebouncedValue(query, 250)

  // Mantiene `?q=`, `?tipo=`, `?estado=`, `?orden=` y `?tags=` al día con
  // el estado actual, así el link es compartible y el botón "atrás" del
  // navegador restaura la búsqueda tal como estaba (ver comentario largo
  // en `useSyncedSearchParams`). Cada filtro en su valor "por defecto" se
  // omite de la URL para no ensuciarla en el caso común.
  useEffect(() => {
    updateParams({
      q: debouncedQuery.trim() || null,
      tipo: activeType !== 'todos' ? activeType : null,
      estado: status !== 'todos' ? status : null,
      orden: sortBy !== 'default' ? sortBy : null,
      tags: selectedTags.length > 0 ? selectedTags.join(',') : null,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, activeType, status, sortBy, selectedTags])

  // Antes duplicaba acá su propia config de Fuse.js (ligeramente distinta
  // de la de EntityListExplorer/`buildFuse`, sin manufacturer/class) —
  // ahora reutiliza la misma función que el listado de `/vehiculos`, así
  // ambos buscadores del sitio quedan sincronizados en vez de poder
  // divergir con el tiempo (oportunidad P2 #7 de la auditoría "AutoFicha:
  // aprovechamiento de datos").
  const fuse = useMemo(() => buildFuse(entities), [entities])

  const rawResults = useMemo(() => {
    if (!debouncedQuery.trim()) return []
    return fuse.search(debouncedQuery).slice(0, 60).map((r) => r.item)
  }, [fuse, debouncedQuery])

  const typeCountsInResults = useMemo(() => {
    const c = new Map<EntityType, number>()
    for (const e of rawResults) c.set(e.type, (c.get(e.type) ?? 0) + 1)
    return c
  }, [rawResults])

  // Resultados acotados solo por texto + categoría — base para calcular
  // qué criterios de orden y qué tags tiene sentido ofrecer (antes de
  // aplicar estado/tags, que son filtros adicionales sobre esta base).
  const typeFiltered = useMemo(
    () => (activeType === 'todos' ? rawResults : rawResults.filter((e) => e.type === activeType)),
    [rawResults, activeType]
  )

  const getRelationCount = (e: Entity) => relationCountBySlug?.[`${e.type}/${e.slug}`] ?? e.relations?.length ?? 0

  // "Más conexiones" solo se ofrece si al menos un resultado tiene alguna
  // conexión real. "Mejor rendimiento" solo tiene sentido con una sola
  // categoría de vehículos seleccionada (mezclar el puntaje de rendimiento
  // con personajes/ubicaciones no significaría nada) — mismo criterio que
  // ya usa `EntityListExplorer`, acá acotado además a `activeType`.
  const sortOptions = useMemo(() => {
    const options: SortOption[] = ['default', 'az', 'za', 'recent']
    if (typeFiltered.some((e) => getRelationCount(e) > 0)) options.push('connections')
    if (activeType === EntityType.VEHICLE && typeFiltered.some((e) => hasPerformanceData(e as Vehicle))) {
      options.push('performance')
    }
    return options
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFiltered, relationCountBySlug, activeType])

  // Tags "consistentes" del conjunto de resultados actual (post búsqueda +
  // categoría): cualquier tag que aparece en 2+ resultados. Nunca se
  // inventa una categoría — se deriva 100% de `entity.tags`.
  const tagOptions = useMemo(() => {
    const freq = new Map<string, number>()
    for (const e of typeFiltered) {
      for (const tag of e.tags ?? []) {
        freq.set(tag, (freq.get(tag) ?? 0) + 1)
      }
    }
    return Array.from(freq.entries())
      .filter(([, count]) => count >= MIN_ATTRIBUTE_COUNT)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
      .slice(0, MAX_TAG_OPTIONS)
      .map(([tag, count]) => ({ tag, count }))
  }, [typeFiltered])

  const results = useMemo(() => {
    let base = typeFiltered
    if (status !== 'todos') base = base.filter((e) => e.status === status)
    if (selectedTags.length > 0) {
      base = base.filter((e) => e.tags?.some((tag) => selectedTags.includes(tag)))
    }

    if (sortBy === 'az') {
      base = [...base].sort((a, b) => a.title.localeCompare(b.title, 'es'))
    } else if (sortBy === 'za') {
      base = [...base].sort((a, b) => b.title.localeCompare(a.title, 'es'))
    } else if (sortBy === 'recent') {
      base = [...base].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    } else if (sortBy === 'connections') {
      base = [...base].sort((a, b) => getRelationCount(b) - getRelationCount(a))
    } else if (sortBy === 'performance') {
      base = [...base].sort(
        (a, b) => vehiclePerformanceScore(b as Vehicle) - vehiclePerformanceScore(a as Vehicle)
      )
    }

    return base.slice(0, 30)
    // getRelationCount solo depende de relationCountBySlug (ya en deps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFiltered, status, selectedTags, sortBy, relationCountBySlug])

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const hasAttributeFilters = status !== 'todos' || sortBy !== 'default' || selectedTags.length > 0

  const clearAttributeFilters = () => {
    setStatus('todos')
    setSortBy('default')
    setSelectedTags([])
  }

  return (
    <div>
      <div className="relative mb-6">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
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
          placeholder="Buscar autos, motos, marcas..."
          autoFocus
          aria-label={`Buscar en ${SITE_NAME}`}
          className="glass-surface w-full rounded-xl border border-edge py-4 pl-12 pr-12 text-lg text-neutral-900 placeholder:text-neutral-400 transition-all focus:border-auto-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Limpiar búsqueda"
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-surface-alt hover:text-neutral-900"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {!query.trim() ? (
        <div>
          <p className="mb-4 text-sm text-neutral-500">
            {entities.length} entidades documentadas — escribí un nombre, o entrá directo por categoría.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {quickTypes.map((type) => (
              <Link
                key={type}
                href={`/${type}`}
                className="group flex items-center gap-3 rounded-lg border border-edge bg-surface-card/60 px-4 py-3.5 transition-colors hover:border-auto-accent/50 hover:bg-surface-alt"
              >
                <div className="category-icon-badge flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-auto-accent">
                  <CategoryIcon type={type} className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-900 group-hover:text-auto-accent">
                    {TYPE_LABELS[type]}
                  </p>
                  <p className="text-xs text-neutral-500">{counts[type] ?? 0} entradas</p>
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
                  ? 'border-auto-accent bg-auto-accent/15 text-auto-accent'
                  : 'border-edge text-neutral-500 hover:border-edge-strong hover:text-neutral-900'
              )}
            >
              Todos <span className="ml-1 text-neutral-500/80">{rawResults.length}</span>
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
                    ? 'border-auto-accent bg-auto-accent/15 text-auto-accent'
                    : 'border-edge text-neutral-500 hover:border-edge-strong hover:text-neutral-900'
                )}
              >
                {TYPE_LABELS[type]} <span className="ml-1 text-neutral-500/80">{count}</span>
              </button>
            ))}
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-neutral-500">
              <span className="hidden uppercase tracking-wide text-neutral-400 sm:inline">Orden</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Ordenar resultados"
                className="rounded-lg border border-edge bg-surface-card/60 px-3 py-2 text-xs font-semibold text-neutral-900 transition-colors hover:border-edge-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
              >
                {sortOptions.map((option) => (
                  <option key={option} value={option} className="bg-surface-card text-neutral-900">
                    {SORT_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>

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
                      ? 'border-auto-accent bg-auto-accent/15 text-auto-accent'
                      : 'border-edge text-neutral-500 hover:border-edge-strong hover:text-neutral-900'
                  )}
                >
                  {key === 'todos' ? 'Todos los estados' : STATUS_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          {tagOptions.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por tag">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                Tags
              </span>
              {tagOptions.map(({ tag, count }) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={selectedTags.includes(tag)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-[11px] font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent',
                    selectedTags.includes(tag)
                      ? 'border-auto-accent bg-auto-accent/15 text-auto-accent'
                      : 'border-edge text-neutral-500 hover:border-edge-strong hover:text-neutral-900'
                  )}
                >
                  {tag.replace(/-/g, ' ')}
                  <span className="ml-1 text-neutral-500/80">{count}</span>
                </button>
              ))}
              {hasAttributeFilters && (
                <button
                  type="button"
                  onClick={clearAttributeFilters}
                  className="ml-1 flex items-center gap-1 rounded-full border border-transparent px-3 py-1 text-[11px] font-semibold text-neutral-500 transition-colors hover:text-auto-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                  Limpiar filtros
                </button>
              )}
            </div>
          )}

          <p className="mb-4 text-sm text-neutral-500" aria-live="polite">
            {results.length} {results.length === 1 ? 'resultado' : 'resultados'} para &ldquo;{query}&rdquo;
          </p>

          {results.length > 0 && (
            /* Lista de filas, no grid de cards: un resultado de búsqueda se
               escanea de arriba a abajo, no se compara lado a lado como un
               listado de entidades — la misma razón por la que
               `RelationsPanel` (mismo contenido: avatar + título + tipo)
               tampoco envuelve cada fila en una `Card` con borde/sombra
               propios. El único badge que se conserva es el de estado
               (`Badge variant="status"`): es el único que codifica una
               señal real por color; el tipo se resuelve como texto + ícono
               en vez de una segunda pill, igual que en RelationsPanel. */
            <ul className="divide-y divide-edge">
              {results.map((entity) => (
                <li key={`${entity.type}-${entity.slug}`}>
                  <Link
                    href={`/${entity.type}/${entity.slug}`}
                    className="search-result-viewport group -mx-3 flex items-start gap-4 rounded-lg px-3 py-4 transition-colors duration-200 hover:bg-auto-darker/40"
                  >
                    <EntityImage
                      entity={entity}
                      image={imageBySlug?.[`${entity.type}/${entity.slug}`]}
                      variant="avatar"
                      className="h-12 w-12 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                          <CategoryIcon type={entity.type} className="h-3 w-3" />
                          {TYPE_LABELS[entity.type]}
                        </span>
                        <Badge variant="status" status={entity.status}>
                          {entity.status}
                        </Badge>
                      </div>
                      <h3 className="truncate font-bold text-neutral-900 transition-colors group-hover:text-auto-accent">
                        {entity.title}
                      </h3>
                      <p className="line-clamp-1 text-sm text-neutral-500 sm:line-clamp-2">
                        {entity.description}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {results.length === 0 && (
            <div className="rounded-lg border border-edge bg-surface-card px-6 py-10 text-center">
              <p className="mb-1 font-semibold text-neutral-900">
                Sin resultados para &ldquo;{query}&rdquo;
              </p>
              <p className="mb-4 text-sm text-neutral-500">
                {activeType !== 'todos' || hasAttributeFilters
                  ? 'Probá quitando algún filtro, o revisá que el nombre esté bien escrito.'
                  : 'Puede que el nombre esté escrito distinto o que todavía no esté documentado.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {activeType !== 'todos' && (
                  <button
                    type="button"
                    onClick={() => setActiveType('todos')}
                    className="text-sm font-semibold text-auto-accent hover:underline"
                  >
                    Quitar filtro de categoría
                  </button>
                )}
                {hasAttributeFilters && (
                  <button
                    type="button"
                    onClick={clearAttributeFilters}
                    className="text-sm font-semibold text-auto-accent hover:underline"
                  >
                    Limpiar estado/orden/tags
                  </button>
                )}
                {activeType === 'todos' && !hasAttributeFilters && (
                  <Link href="/" className="text-sm font-semibold text-auto-accent hover:underline">
                    Volver al inicio y explorar por categoría
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
