'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Fuse from 'fuse.js'
import { EntityType, type Entity, type Vehicle } from '@/types'
import { Reveal } from '@/components/ui/Reveal'
import { EntityCard } from '@/components/entities/EntityCard'
import { VehicleCompareBar, VehicleCompareSheet, MAX_COMPARE } from '@/components/entities/VehicleCompareSheet'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { useSyncedSearchParams } from '@/lib/hooks/useSyncedSearchParams'
import type { ResolvedDisplayImage } from '@/lib/images'
import { cn } from '@/lib/utils'
import { STATUS_LABELS } from '@/lib/entity-labels'
import { vehiclePerformanceScore, hasPerformanceData } from '@/lib/vehicle-performance'

type StatusFilter = 'todos' | keyof typeof STATUS_LABELS

type SortOption = 'default' | 'az' | 'za' | 'recent' | 'connections' | 'performance'

const SORT_LABELS: Record<SortOption, string> = {
  default: 'Orden por defecto',
  az: 'A-Z',
  za: 'Z-A',
  recent: 'Más recientes',
  connections: 'Más conexiones',
  performance: 'Mejor rendimiento',
}

type ViewMode = 'grid' | 'catalogo'

/** Un tag/atributo necesita aparecer en al menos 2 entidades del mismo
 *  tipo para contar como "consistente" y mostrarse como filtro — evita
 *  chips inútiles armados a partir de un tag usado una sola vez (ruido,
 *  no una categoría real). */
const MIN_ATTRIBUTE_COUNT = 2
/** Tope de chips de tag visibles (se muestran los más frecuentes
 *  primero). Con tipos de 50+ entidades (ej. vehículos) la cantidad de
 *  tags distintos que ya cumple MIN_ATTRIBUTE_COUNT puede ser alta; este
 *  tope es puramente de presentación (no descarta datos, solo no lista
 *  cola larga) para no "llenar la interfaz de controles". */
const MAX_TAG_OPTIONS = 14

interface EntityListExplorerProps {
  type: EntityType
  entities: Entity[]
  typeLabel: string
  /** slug → URL de clip (mp4), hoy solo relevante para personajes con clip
   *  registrado (ver getCharacterClipUrl en lib/media.ts). El caller server
   *  (`[entityType]/page.tsx`) resuelve este mapa una sola vez. */
  clipUrlBySlug?: Record<string, string>
  /** type/slug → imagen ya resuelta (ver `getEntityImageMap` en `@/lib/media.ts`).
   *  Este componente es `'use client'`, así que no puede resolver imágenes
   *  por su cuenta con `fs` — el caller server (`[entityType]/page.tsx`)
   *  resuelve el mapa completo una sola vez y lo pasa acá. */
  imageBySlug?: Record<string, ResolvedDisplayImage | null>
  /** slug → conteo de conexiones incluyendo relaciones inferidas/
   *  bidireccionales (ver `getBidirectionalRelationCount` en
   *  `@/lib/relations.ts`, Fase 8, hallazgo [7]). Igual patrón que
   *  `imageBySlug`: el caller server resuelve el mapa una sola vez. Si no
   *  se pasa, cada `EntityCard` cae a `entity.relations?.length` (solo
   *  explícitas, comportamiento previo). */
  relationCountBySlug?: Record<string, number>
}

/**
 * Cliente interactivo de una página de listado (`/[entityType]`): búsqueda
 * en vivo (Fuse.js, mismo motor que /buscar) + filtro por estado editorial
 * + ordenamiento + filtros por tag/atributo (Fase 8, etapa C), todos sobre
 * los datos ya resueltos en el servidor (sin fetch adicional, sin romper
 * la generación estática de la ruta).
 *
 * Reemplaza el patrón "Título → grid de cards → fin": agrega una barra de
 * herramientas real con conteos por estado y estados vacíos específicos
 * para "sin resultados de búsqueda" vs. "categoría todavía vacía".
 */
export function EntityListExplorer({
  type,
  entities,
  typeLabel,
  clipUrlBySlug,
  imageBySlug,
  relationCountBySlug,
}: EntityListExplorerProps) {
  // Estado inicial leído de la URL (`?q=`, `?estado=`, `?orden=`, `?tags=`,
  // `?clase=`, `?vista=`): permite que un link con filtros aplicados sea
  // compartible y que el botón "atrás" del navegador, al volver desde una
  // ficha, restaure la lista tal como estaba en vez de resetearla. Se lee
  // una sola vez al montar (no en cada render) — el efecto más abajo es el
  // que mantiene la URL al día a partir de ahí.
  const { searchParams, updateParams } = useSyncedSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
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
  const [selectedClass, setSelectedClass] = useState<string | null>(() => searchParams.get('clase'))
  const debouncedQuery = useDebouncedValue(query, 200)

  // Vista tipo catálogo (filas compactas) vs. grilla de cards. Solo se
  // ofrece el toggle para Vehículos: es el único tipo con suficientes
  // atributos comparables por fila (fabricante, clase, 4 métricas de
  // rendimiento) para que una vista tabular aporte algo real — en el
  // resto de tipos, la card actual ya es la representación más densa.
  const [viewMode, setViewMode] = useState<ViewMode>(() => (searchParams.get('vista') === 'catalogo' ? 'catalogo' : 'grid'))

  // Comparador de vehículos (solo EntityType.VEHICLE): hasta MAX_COMPARE
  // slugs seleccionados desde las cards/filas, más el estado de apertura
  // del panel de comparación. Vive acá (no en EntityCard) porque la
  // selección es compartida entre todas las cards de la lista.
  const [compareSlugs, setCompareSlugs] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const isVehicleList = type === EntityType.VEHICLE

  // Mantiene la URL al día con el estado actual de filtros (debounced en
  // el caso de la búsqueda, vía `debouncedQuery`, para no reescribir la
  // URL en cada tecla). Cada filtro en su valor "por defecto" se omite de
  // la URL (ver `useSyncedSearchParams`) para no ensuciarla con
  // `?estado=todos&orden=default&vista=grid` en el caso común.
  useEffect(() => {
    updateParams({
      q: debouncedQuery.trim() || null,
      estado: status !== 'todos' ? status : null,
      orden: sortBy !== 'default' ? sortBy : null,
      tags: selectedTags.length > 0 ? selectedTags.join(',') : null,
      clase: selectedClass,
      vista: isVehicleList && viewMode !== 'grid' ? viewMode : null,
    })
    // updateParams se omite adrede: se recrea cuando cambian los
    // searchParams (que nosotros mismos actualizamos), así que incluirla
    // dispararía el efecto en un loop innecesario sin cambiar el
    // resultado — solo nos interesa reaccionar a cambios reales de filtro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, status, sortBy, selectedTags, selectedClass, viewMode, isVehicleList])

  const toggleCompare = (slug: string) => {
    setCompareSlugs((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug)
      if (prev.length >= MAX_COMPARE) return prev
      return [...prev, slug]
    })
  }
  const removeCompare = (slug: string) => setCompareSlugs((prev) => prev.filter((s) => s !== slug))
  const clearCompare = () => {
    setCompareSlugs([])
    setCompareOpen(false)
  }
  const compareVehicles = useMemo(
    () => compareSlugs.map((slug) => entities.find((e) => e.slug === slug)).filter((e): e is Vehicle => Boolean(e)),
    [compareSlugs, entities]
  )

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

  // Criterios de orden disponibles para este tipo. A-Z/Z-A/Más recientes
  // usan campos requeridos en toda entidad (`title`, `updatedAt`) — siempre
  // disponibles. "Más conexiones" solo se ofrece si al menos una entidad de
  // este tipo tiene alguna conexión (explícita o inferida vía
  // `relationCountBySlug`, Fase 8, hallazgo [7]); si no, el criterio no
  // aportaría ningún orden real y no se muestra (nunca se inventa un dato
  // ausente).
  const getRelationCount = (e: Entity) => relationCountBySlug?.[e.slug] ?? e.relations?.length ?? 0

  const sortOptions = useMemo(() => {
    const options: SortOption[] = ['default', 'az', 'za', 'recent']
    if (entities.some((e) => getRelationCount(e) > 0)) options.push('connections')
    // "Mejor rendimiento" solo se ofrece en Vehículos y solo si al menos
    // una entidad tiene algún dato de performance cargado (nunca se
    // inventa un orden sobre datos ausentes).
    if (isVehicleList && entities.some((e) => hasPerformanceData(e as Vehicle))) {
      options.push('performance')
    }
    return options
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities, relationCountBySlug, isVehicleList])

  // Tags "consistentes" del tipo actual: cualquier tag que ya existe en el
  // contenido y aparece en 2+ entidades. Nunca se inventa una categoría —
  // se deriva 100% de `entity.tags`, presente en toda entidad (BaseEntity).
  const tagOptions = useMemo(() => {
    const freq = new Map<string, number>()
    for (const e of entities) {
      for (const tag of e.tags ?? []) {
        freq.set(tag, (freq.get(tag) ?? 0) + 1)
      }
    }
    return Array.from(freq.entries())
      .filter(([, count]) => count >= MIN_ATTRIBUTE_COUNT)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
      .slice(0, MAX_TAG_OPTIONS)
      .map(([tag, count]) => ({ tag, count }))
  }, [entities])

  // Filtro por `class`, exclusivo de Vehículos: es el único tipo con un
  // atributo propio (no un tag) que además varía de forma consistente
  // entre entidades (ver auditoría — el resto de tipos con campos propios,
  // como `district`/`region` en Ubicaciones, o no varían o son casi
  // únicos por entidad, así que no aportan un filtro real).
  const classOptions = useMemo(() => {
    if (type !== EntityType.VEHICLE) return []
    const freq = new Map<string, number>()
    for (const e of entities) {
      const value = (e as Vehicle).class
      if (value) freq.set(value, (freq.get(value) ?? 0) + 1)
    }
    return Array.from(freq.entries())
      .filter(([, count]) => count >= MIN_ATTRIBUTE_COUNT)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
      .map(([value, count]) => ({ value, count }))
  }, [entities, type])

  const hasAttributeFilters = tagOptions.length > 0 || classOptions.length > 0

  const filtered = useMemo(() => {
    let base = debouncedQuery.trim() ? fuse.search(debouncedQuery).map((r) => r.item) : entities

    if (status !== 'todos') base = base.filter((e) => e.status === status)
    if (selectedClass) base = base.filter((e) => (e as Vehicle).class === selectedClass)
    if (selectedTags.length > 0) {
      base = base.filter((e) => e.tags?.some((tag) => selectedTags.includes(tag)))
    }

    // "default" respeta el orden ya recibido (relevancia de Fuse mientras
    // se busca; orden alfabético natural del servidor el resto del tiempo)
    // — nunca se reordena de más sin que el usuario elija un criterio.
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

    return base
    // getRelationCount solo depende de relationCountBySlug (ya en deps) y
    // de `entity.relations`, que viaja dentro de cada `entity` — no hace
    // falta re-crearla como dependencia propia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuse, debouncedQuery, entities, status, selectedClass, selectedTags, sortBy, relationCountBySlug])

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const hasActiveFilters = status !== 'todos' || selectedTags.length > 0 || selectedClass !== null

  const clearAllFilters = () => {
    setQuery('')
    setStatus('todos')
    setSortBy('default')
    setSelectedTags([])
    setSelectedClass(null)
  }

  const clearAttributeFilters = () => {
    setStatus('todos')
    setSelectedTags([])
    setSelectedClass(null)
  }

  // Toda card de listado lleva media (imagen local, miniatura de trailer o
  // fallback animado por categoría — ver EntityImage/lib/images.ts): ya no
  // se oculta el slot de imagen para las categorías sin key art propia
  // todavía, para que ninguna card se vea "muerta" mientras se sube el
  // asset real. La propia card (EntityCard) ya asume esto siempre.
  const isFiltering = debouncedQuery.trim().length > 0 || hasActiveFilters

  return (
    <div>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-gta-text-secondary">
            <span className="hidden uppercase tracking-wide text-gta-text-tertiary sm:inline">Orden</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Ordenar resultados"
              className="rounded-lg border border-gta-border bg-gta-card/60 px-3 py-2 text-xs font-semibold text-gta-text transition-colors hover:border-gta-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gta-accent"
            >
              {sortOptions.map((option) => (
                <option key={option} value={option} className="bg-gta-card text-gta-text">
                  {SORT_LABELS[option]}
                </option>
              ))}
            </select>
          </label>

          {isVehicleList && (
            <div
              className="flex items-center gap-0.5 rounded-lg border border-gta-border bg-gta-card/60 p-0.5"
              role="group"
              aria-label="Tipo de vista"
            >
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                title="Vista en grilla"
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                  viewMode === 'grid'
                    ? 'bg-gta-accent/15 text-gta-accent'
                    : 'text-gta-text-secondary hover:text-gta-text'
                )}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="3" width="8" height="8" rx="1.5" />
                  <rect x="13" y="3" width="8" height="8" rx="1.5" />
                  <rect x="3" y="13" width="8" height="8" rx="1.5" />
                  <rect x="13" y="13" width="8" height="8" rx="1.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('catalogo')}
                aria-pressed={viewMode === 'catalogo'}
                title="Vista de catálogo"
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                  viewMode === 'catalogo'
                    ? 'bg-gta-accent/15 text-gta-accent'
                    : 'text-gta-text-secondary hover:text-gta-text'
                )}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          )}

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
                <span className="ml-1.5 text-gta-text-secondary/80">{counts[key]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {hasAttributeFilters && (
        <div className="mb-8 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por atributo">
          {classOptions.length > 0 && (
            <>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gta-text-tertiary">
                Clase
              </span>
              {classOptions.map(({ value, count }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedClass((prev) => (prev === value ? null : value))}
                  aria-pressed={selectedClass === value}
                  className={cn(
                    'rounded-full border px-3 py-1 text-[11px] font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gta-accent',
                    selectedClass === value
                      ? 'border-gta-accent-orange bg-gta-accent-orange/15 text-gta-accent-orange'
                      : 'border-gta-border text-gta-text-secondary hover:border-gta-border-strong hover:text-gta-text'
                  )}
                >
                  {value.replace(/-/g, ' ')}
                  <span className="ml-1 text-gta-text-secondary/80">{count}</span>
                </button>
              ))}
            </>
          )}

          {tagOptions.length > 0 && (
            <>
              <span
                className={cn(
                  'text-[11px] font-semibold uppercase tracking-wide text-gta-text-tertiary',
                  classOptions.length > 0 && 'ml-2'
                )}
              >
                Tags
              </span>
              {tagOptions.map(({ tag, count }) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={selectedTags.includes(tag)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-[11px] font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gta-accent',
                    selectedTags.includes(tag)
                      ? 'border-gta-accent bg-gta-accent/15 text-gta-accent'
                      : 'border-gta-border text-gta-text-secondary hover:border-gta-border-strong hover:text-gta-text'
                  )}
                >
                  {tag.replace(/-/g, ' ')}
                  <span className="ml-1 text-gta-text-secondary/80">{count}</span>
                </button>
              ))}
            </>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAttributeFilters}
              className="ml-1 flex items-center gap-1 rounded-full border border-transparent px-3 py-1 text-[11px] font-semibold text-gta-text-secondary transition-colors hover:text-gta-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gta-accent"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
              Limpiar filtros
            </button>
          )}
        </div>
      )}

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
                onClick={clearAllFilters}
                className="text-sm font-semibold text-gta-accent hover:underline"
              >
                Limpiar filtros
              </button>
            </>
          )}
        </div>
      ) : isVehicleList && viewMode === 'catalogo' ? (
        <div className={cn('space-y-2', compareSlugs.length > 0 && 'pb-24')}>
          {filtered.map((entity, i) => (
            <Reveal key={entity.slug} delay={(i % 8) * 40}>
              <EntityCard
                entity={entity}
                image={imageBySlug?.[`${entity.type}/${entity.slug}`]}
                typeLabel={typeLabel}
                clipUrl={clipUrlBySlug?.[entity.slug]}
                relationCount={relationCountBySlug?.[entity.slug]}
                layout="row"
                compareEnabled={isVehicleList}
                compareChecked={compareSlugs.includes(entity.slug)}
                onCompareToggle={() => toggleCompare(entity.slug)}
                compareDisabled={!compareSlugs.includes(entity.slug) && compareSlugs.length >= MAX_COMPARE}
              />
            </Reveal>
          ))}
        </div>
      ) : (
        <div className={cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-3', compareSlugs.length > 0 && 'pb-24')}>
          {filtered.map((entity, i) => (
            <Reveal key={entity.slug} delay={(i % 6) * 80}>
              <EntityCard
                entity={entity}
                image={imageBySlug?.[`${entity.type}/${entity.slug}`]}
                typeLabel={typeLabel}
                clipUrl={clipUrlBySlug?.[entity.slug]}
                relationCount={relationCountBySlug?.[entity.slug]}
                compareEnabled={isVehicleList}
                compareChecked={compareSlugs.includes(entity.slug)}
                onCompareToggle={() => toggleCompare(entity.slug)}
                compareDisabled={!compareSlugs.includes(entity.slug) && compareSlugs.length >= MAX_COMPARE}
              />
            </Reveal>
          ))}
        </div>
      )}

      {isVehicleList && (
        <>
          <VehicleCompareBar
            selected={compareVehicles}
            imageBySlug={imageBySlug}
            onRemove={removeCompare}
            onClear={clearCompare}
            onOpen={() => setCompareOpen(true)}
          />
          <VehicleCompareSheet
            open={compareOpen}
            vehicles={compareVehicles}
            imageBySlug={imageBySlug}
            onClose={() => setCompareOpen(false)}
            onRemove={removeCompare}
          />
        </>
      )}
    </div>
  )
}
