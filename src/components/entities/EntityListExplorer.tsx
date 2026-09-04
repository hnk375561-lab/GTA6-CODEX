'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { EntityType, type Entity } from '@/types'
import { Reveal } from '@/components/ui/Reveal'
import { EntityCard } from '@/components/entities/EntityCard'
import { VehicleCompareBar, VehicleCompareSheet, MAX_COMPARE } from '@/components/entities/VehicleCompareSheet'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { useSyncedSearchParams } from '@/lib/hooks/useSyncedSearchParams'
import { useVehicleCompare } from '@/lib/hooks/useVehicleCompare'
import type { ResolvedDisplayImage } from '@/lib/images'
import { cn } from '@/lib/utils'
import { STATUS_LABELS } from '@/lib/entity-labels'
import {
  type StatusFilter,
  type SortOption,
  SORT_LABELS,
  buildFuse,
  computeClassOptions,
  computeCategoryOptionsForList,
  computeSortOptions,
  computeStatusCounts,
  computeTagOptions,
  filterAndSortEntities,
} from '@/lib/entity-list-filters'
import { VEHICLE_CATEGORIES, type VehicleCategory } from '@/lib/vehicle-category'
import { computePowerBounds } from '@/lib/vehicle-power'
import { computePriceBounds } from '@/lib/vehicle-price'
import { computeYearBounds } from '@/lib/vehicle-year'

type ViewMode = 'grid' | 'catalogo'

interface EntityListExplorerProps {
  type: EntityType
  entities: Entity[]
  typeLabel: string
  /** slug → URL de clip (mp4). Ningún caller pobla este mapa hoy (el
   *  soporte era específico de personajes, tipo eliminado en el pivote a
   *  AutoFicha); queda como prop opcional por si se reintroduce media de
   *  clip para vehículos más adelante. */
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
  // Categoría amplia (filtro de primer nivel sobre `class`, ver
  // `vehicle-category.ts`). Se lee de la URL solo si el valor es una
  // de las categorías válidas — un `?categoria=` corrupto o de otra
  // versión del sitio cae a "sin filtro" en vez de romper el listado.
  const [selectedClassGroup, setSelectedClassGroup] = useState<VehicleCategory | null>(() => {
    const raw = searchParams.get('categoria')
    return raw && (VEHICLE_CATEGORIES as readonly string[]).includes(raw) ? (raw as VehicleCategory) : null
  })
  const [powerRange, setPowerRange] = useState<[number, number] | null>(() => {
    const raw = searchParams.get('potencia')
    if (!raw) return null
    const [minRaw, maxRaw] = raw.split(',')
    const min = Number(minRaw)
    const max = Number(maxRaw)
    return Number.isFinite(min) && Number.isFinite(max) ? [min, max] : null
  })
  const [priceRange, setPriceRange] = useState<[number, number] | null>(() => {
    const raw = searchParams.get('precio')
    if (!raw) return null
    const [minRaw, maxRaw] = raw.split(',')
    const min = Number(minRaw)
    const max = Number(maxRaw)
    return Number.isFinite(min) && Number.isFinite(max) ? [min, max] : null
  })
  // Rango de año de lanzamiento (FASE 2 — filtro de año), mismo patrón de
  // lectura inicial desde la URL que powerRange/priceRange.
  const [yearRange, setYearRange] = useState<[number, number] | null>(() => {
    const raw = searchParams.get('anio')
    if (!raw) return null
    const [minRaw, maxRaw] = raw.split(',')
    const min = Number(minRaw)
    const max = Number(maxRaw)
    return Number.isFinite(min) && Number.isFinite(max) ? [min, max] : null
  })
  const debouncedQuery = useDebouncedValue(query, 200)

  // Vista tipo catálogo (filas compactas) vs. grilla de cards. Solo se
  // ofrece el toggle para Vehículos: es el único tipo con suficientes
  // atributos comparables por fila (fabricante, clase, 4 métricas de
  // rendimiento) para que una vista tabular aporte algo real — en el
  // resto de tipos, la card actual ya es la representación más densa.
  const [viewMode, setViewMode] = useState<ViewMode>(() => (searchParams.get('vista') === 'catalogo' ? 'catalogo' : 'grid'))

  // Comparador de vehículos (solo EntityType.VEHICLE): hasta MAX_COMPARE
  // slugs seleccionados desde las cards/filas, más el estado de apertura
  // del panel de comparación. Vive en un hook propio (no en EntityCard)
  // porque la selección es compartida entre todas las cards de la lista —
  // ver `useVehicleCompare`.
  const {
    compareSlugs,
    compareOpen,
    compareVehicles,
    setCompareOpen,
    toggleCompare,
    removeCompare,
    clearCompare,
  } = useVehicleCompare(entities)
  const isVehicleList = type === EntityType.VEHICLE

  /** Tope de tarjetas montadas a la vez ("cargar más" en vez de renderizar
   *  todo el listado de una). Listados chicos (la mayoría de los tipos,
   *  ≤21 hoy) nunca llegan a mostrar el botón — solo importa para
   *  Vehículos (62 hoy, el listado más grande por lejos), donde montar
   *  las 62 cards de una implica 62 capas de blur + animación + glow
   *  reactivo al motor WebGL compitiendo por el mismo frame de scroll.
   *  Complementa (no reemplaza) el `content-visibility: auto` de
   *  `.entity-card-viewport`: menos DOM real además de menos pintado. */
  const PAGE_SIZE = 24
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

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
      categoria: selectedClassGroup,
      clase: selectedClass,
      potencia: powerRange ? `${powerRange[0]},${powerRange[1]}` : null,
      precio: priceRange ? `${priceRange[0]},${priceRange[1]}` : null,
      anio: yearRange ? `${yearRange[0]},${yearRange[1]}` : null,
      vista: isVehicleList && viewMode !== 'grid' ? viewMode : null,
    })
    // updateParams se omite adrede: se recrea cuando cambian los
    // searchParams (que nosotros mismos actualizamos), así que incluirla
    // dispararía el efecto en un loop innecesario sin cambiar el
    // resultado — solo nos interesa reaccionar a cambios reales de filtro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedQuery,
    status,
    sortBy,
    selectedTags,
    selectedClassGroup,
    selectedClass,
    powerRange,
    priceRange,
    yearRange,
    viewMode,
    isVehicleList,
  ])

  const counts = useMemo(() => computeStatusCounts(entities), [entities])

  const fuse = useMemo(() => buildFuse(entities), [entities])

  // Criterios de orden disponibles para este tipo. A-Z/Z-A/Más recientes
  // usan campos requeridos en toda entidad (`title`, `updatedAt`) — siempre
  // disponibles. "Más conexiones" solo se ofrece si al menos una entidad de
  // este tipo tiene alguna conexión (explícita o inferida vía
  // `relationCountBySlug`, Fase 8, hallazgo [7]); si no, el criterio no
  // aportaría ningún orden real y no se muestra (nunca se inventa un dato
  // ausente). "Mejor rendimiento" solo se ofrece en Vehículos y solo si al
  // menos una entidad tiene algún dato de performance cargado.
  const sortOptions = useMemo(
    () => computeSortOptions(entities, relationCountBySlug, isVehicleList),
    [entities, relationCountBySlug, isVehicleList]
  )

  // Tags "consistentes" del tipo actual: cualquier tag que ya existe en el
  // contenido y aparece en 2+ entidades. Nunca se inventa una categoría —
  // se deriva 100% de `entity.tags`, presente en toda entidad (BaseEntity).
  const tagOptions = useMemo(() => computeTagOptions(entities), [entities])

  // Filtro por `class`, exclusivo de Vehículos: es el único tipo con un
  // atributo propio (no un tag) que además varía de forma consistente
  // entre entidades (ver auditoría — el resto de tipos con campos propios,
  // como `district`/`region` en Ubicaciones, o no varían o son casi
  // únicos por entidad, así que no aportan un filtro real).
  // Categorías amplias (filtro de primer nivel): SUV/Sedán/Pickup/
  // Hatchback/Deportivo/Moto/Otro, derivadas de `class` sin tocar el dato
  // original (ver `vehicle-category.ts`). El sub-filtro de `class`
  // detallado se acota a la categoría elegida — elegir "SUV" reduce los
  // ~20 valores de `class` visibles a solo los de esa categoría.
  const classGroupOptions = useMemo(() => computeCategoryOptionsForList(entities, type), [entities, type])
  const classOptions = useMemo(
    () => computeClassOptions(entities, type, selectedClassGroup),
    [entities, type, selectedClassGroup]
  )

  // Rango de potencia (hp) disponible entre los vehículos de este
  // listado — `null` si el tipo no es Vehículo o si no hay suficientes
  // vehículos con `power` parseable como para que un filtro de rango
  // aporte algo real (ver `computePowerBounds`).
  const powerBounds = useMemo(() => computePowerBounds(entities, type), [entities, type])

  // Rango de precio (USD) disponible entre los vehículos de este listado
  // — mismo criterio que `powerBounds`, ver `computePriceBounds`. Solo
  // considera vehículos con precio denominado (o declarado equivalente)
  // en USD; el resto simplemente no participa del filtro (Oportunidad #1
  // de la auditoría "AutoFicha: aprovechamiento de datos", fase 2).
  const priceBounds = useMemo(() => computePriceBounds(entities, type), [entities, type])

  // Rango de año de lanzamiento disponible entre los vehículos de este
  // listado — mismo criterio que `powerBounds`/`priceBounds`, ver
  // `computeYearBounds` (FASE 2 — filtro de año).
  const yearBounds = useMemo(() => computeYearBounds(entities, type), [entities, type])

  // "default" respeta el orden ya recibido (relevancia de Fuse mientras se
  // busca; orden alfabético natural del servidor el resto del tiempo) —
  // nunca se reordena de más sin que el usuario elija un criterio. El
  // pipeline completo (búsqueda → filtros → orden) vive en
  // `filterAndSortEntities` (lib/entity-list-filters.ts), pura y testeada
  // por separado del ciclo de render de React.
  const filtered = useMemo(
    () =>
      filterAndSortEntities(
        {
          entities,
          query: debouncedQuery,
          status,
          selectedClass,
          selectedClassGroup,
          selectedTags,
          sortBy,
          relationCountBySlug,
          powerRange,
          priceRange,
          yearRange,
        },
        fuse
      ),
    [
      entities,
      debouncedQuery,
      status,
      selectedClass,
      selectedClassGroup,
      selectedTags,
      sortBy,
      relationCountBySlug,
      powerRange,
      priceRange,
      yearRange,
      fuse,
    ]
  )

  // Vuelve a la primera página cada vez que cambia el conjunto filtrado
  // real (nueva búsqueda/filtro/orden) — nunca en cada render, `filtered`
  // solo cambia de referencia cuando `filterAndSortEntities` produce un
  // resultado distinto (ver sus deps arriba).
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [filtered])

  const visibleEntities = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  // Elegir/deselecionar una categoría amplia limpia siempre el sub-filtro
  // de `class` detallado: el valor seleccionado antes puede no pertenecer
  // a la nueva categoría (o directamente no tener sentido sin ninguna
  // categoría activa), así que arrancar de cero ahí evita un filtro
  // "clase=Sedán ejecutivo" + "categoria=SUV" inconsistente en la URL.
  const toggleClassGroup = (group: VehicleCategory) => {
    setSelectedClassGroup((prev) => (prev === group ? null : group))
    setSelectedClass(null)
  }

  const hasActiveFilters =
    status !== 'todos' ||
    selectedTags.length > 0 ||
    selectedClassGroup !== null ||
    selectedClass !== null ||
    powerRange !== null ||
    priceRange !== null ||
    yearRange !== null

  const clearAllFilters = () => {
    setQuery('')
    setStatus('todos')
    setSortBy('default')
    setSelectedTags([])
    setSelectedClassGroup(null)
    setSelectedClass(null)
    setPowerRange(null)
    setPriceRange(null)
    setYearRange(null)
  }

  const clearAttributeFilters = () => {
    setStatus('todos')
    setSelectedTags([])
    setSelectedClass(null)
    setPowerRange(null)
    setPriceRange(null)
    setYearRange(null)
  }

  // Toda card de listado lleva media (imagen local, miniatura de trailer o
  // fallback animado por categoría — ver EntityImage/lib/images.ts): ya no
  // se oculta el slot de imagen para las categorías sin key art propia
  // todavía, para que ninguna card se vea "muerta" mientras se sube el
  // asset real. La propia card (EntityCard) ya asume esto siempre.
  const isFiltering = debouncedQuery.trim().length > 0 || hasActiveFilters

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
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
            className="glass-surface w-full rounded-lg border border-edge py-2.5 pl-10 pr-9 text-sm text-neutral-900 placeholder:text-neutral-400 transition focus:border-auto-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-surface-alt hover:text-neutral-900"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
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

          {isVehicleList && (
            <div
              className="flex items-center gap-0.5 rounded-lg border border-edge bg-surface-card/60 p-0.5"
              role="group"
              aria-label="Tipo de vista"
            >
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                title="Vista en grilla"
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent',
                  viewMode === 'grid'
                    ? 'bg-auto-accent/15 text-auto-accent'
                    : 'text-neutral-500 hover:text-neutral-900'
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
                  'flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent',
                  viewMode === 'catalogo'
                    ? 'bg-auto-accent/15 text-auto-accent'
                    : 'text-neutral-500 hover:text-neutral-900'
                )}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Nivel de filtros, separado de la fila de arriba a propósito:
          buscar/ordenar/vista son controles de "cómo ver" la lista, esto
          decide "qué subconjunto" se ve — dos categorías de acción
          distintas que antes competían por el mismo peso visual en una
          sola fila (estado mezclado con orden/vista), con clase/tags
          apareciendo recién más abajo en un bloque aparte. Ahora todo
          filtro vive en un único nivel con su propia etiqueta y un borde
          superior que lo desprende visualmente de la fila de utilidad. */}
      <div
        className="mb-6 flex flex-wrap items-center gap-2 border-t border-edge pt-4"
        role="group"
        aria-label="Filtrar resultados"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
          Filtros
        </span>

        {(['todos', 'confirmado', 'rumor', 'nuestro'] as StatusFilter[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatus(key)}
            aria-pressed={status === key}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent',
              status === key
                ? 'border-auto-accent bg-auto-accent/15 text-auto-accent'
                : 'border-edge text-neutral-500 hover:border-edge-strong hover:text-neutral-900'
            )}
          >
            {key === 'todos' ? 'Todos' : STATUS_LABELS[key]}
            <span className="ml-1.5 text-neutral-500/80">{counts[key]}</span>
          </button>
        ))}

        {classGroupOptions.length > 0 && (
          <>
            <span className="ml-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              Categoría
            </span>
            {classGroupOptions.map(({ group, count }) => (
              <button
                key={group}
                type="button"
                onClick={() => toggleClassGroup(group)}
                aria-pressed={selectedClassGroup === group}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent',
                  selectedClassGroup === group
                    ? 'border-auto-accent bg-auto-accent/15 text-auto-accent'
                    : 'border-edge text-neutral-500 hover:border-edge-strong hover:text-neutral-900'
                )}
              >
                {group}
                <span className="ml-1.5 text-neutral-500/80">{count}</span>
              </button>
            ))}
          </>
        )}

        {classOptions.length > 0 && (
          <>
            <span className="ml-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              {selectedClassGroup ? 'Detalle' : 'Clase'}
            </span>
            {classOptions.map(({ value, count }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedClass((prev) => (prev === value ? null : value))}
                aria-pressed={selectedClass === value}
                className={cn(
                  'rounded-full border px-3 py-1 text-[11px] font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent',
                  selectedClass === value
                    ? 'border-auto-accent-orange bg-auto-accent-orange/15 text-auto-accent-orange'
                    : 'border-edge text-neutral-500 hover:border-edge-strong hover:text-neutral-900'
                )}
              >
                {value.replace(/-/g, ' ')}
                <span className="ml-1 text-neutral-500/80">{count}</span>
              </button>
            ))}
          </>
        )}

        {powerBounds && (
          <>
            <span className="ml-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              Potencia (hp)
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                inputMode="numeric"
                min={powerBounds.min}
                max={powerRange?.[1] ?? powerBounds.max}
                step={10}
                value={powerRange?.[0] ?? powerBounds.min}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  if (!Number.isFinite(next)) return
                  const currentMax = powerRange?.[1] ?? powerBounds.max
                  setPowerRange([Math.min(next, currentMax), currentMax])
                }}
                aria-label="Potencia mínima en hp"
                className="w-16 rounded-lg border border-edge bg-surface-card/60 px-2 py-1 text-[11px] font-semibold text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
              />
              <span className="text-[11px] text-neutral-400">–</span>
              <input
                type="number"
                inputMode="numeric"
                min={powerRange?.[0] ?? powerBounds.min}
                max={powerBounds.max}
                step={10}
                value={powerRange?.[1] ?? powerBounds.max}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  if (!Number.isFinite(next)) return
                  const currentMin = powerRange?.[0] ?? powerBounds.min
                  setPowerRange([currentMin, Math.max(next, currentMin)])
                }}
                aria-label="Potencia máxima en hp"
                className="w-16 rounded-lg border border-edge bg-surface-card/60 px-2 py-1 text-[11px] font-semibold text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
              />
              {powerRange && (
                <button
                  type="button"
                  onClick={() => setPowerRange(null)}
                  aria-label="Quitar filtro de potencia"
                  className="flex h-5 w-5 items-center justify-center rounded-full text-neutral-500 transition-colors hover:text-auto-accent"
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </>
        )}

        {priceBounds && (
          <>
            <span className="ml-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              Precio (USD)
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                inputMode="numeric"
                min={priceBounds.min}
                max={priceRange?.[1] ?? priceBounds.max}
                step={100}
                value={priceRange?.[0] ?? priceBounds.min}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  if (!Number.isFinite(next)) return
                  const currentMax = priceRange?.[1] ?? priceBounds.max
                  setPriceRange([Math.min(next, currentMax), currentMax])
                }}
                aria-label="Precio mínimo en USD"
                className="w-20 rounded-lg border border-edge bg-surface-card/60 px-2 py-1 text-[11px] font-semibold text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
              />
              <span className="text-[11px] text-neutral-400">–</span>
              <input
                type="number"
                inputMode="numeric"
                min={priceRange?.[0] ?? priceBounds.min}
                max={priceBounds.max}
                step={100}
                value={priceRange?.[1] ?? priceBounds.max}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  if (!Number.isFinite(next)) return
                  const currentMin = priceRange?.[0] ?? priceBounds.min
                  setPriceRange([currentMin, Math.max(next, currentMin)])
                }}
                aria-label="Precio máximo en USD"
                className="w-20 rounded-lg border border-edge bg-surface-card/60 px-2 py-1 text-[11px] font-semibold text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
              />
              {priceRange && (
                <button
                  type="button"
                  onClick={() => setPriceRange(null)}
                  aria-label="Quitar filtro de precio"
                  className="flex h-5 w-5 items-center justify-center rounded-full text-neutral-500 transition-colors hover:text-auto-accent"
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </>
        )}

        {yearBounds && (
          <>
            <span className="ml-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              Año
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                inputMode="numeric"
                min={yearBounds.min}
                max={yearRange?.[1] ?? yearBounds.max}
                step={1}
                value={yearRange?.[0] ?? yearBounds.min}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  if (!Number.isFinite(next)) return
                  const currentMax = yearRange?.[1] ?? yearBounds.max
                  setYearRange([Math.min(next, currentMax), currentMax])
                }}
                aria-label="Año mínimo"
                className="w-16 rounded-lg border border-edge bg-surface-card/60 px-2 py-1 text-[11px] font-semibold text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
              />
              <span className="text-[11px] text-neutral-400">–</span>
              <input
                type="number"
                inputMode="numeric"
                min={yearRange?.[0] ?? yearBounds.min}
                max={yearBounds.max}
                step={1}
                value={yearRange?.[1] ?? yearBounds.max}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  if (!Number.isFinite(next)) return
                  const currentMin = yearRange?.[0] ?? yearBounds.min
                  setYearRange([currentMin, Math.max(next, currentMin)])
                }}
                aria-label="Año máximo"
                className="w-16 rounded-lg border border-edge bg-surface-card/60 px-2 py-1 text-[11px] font-semibold text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
              />
              {yearRange && (
                <button
                  type="button"
                  onClick={() => setYearRange(null)}
                  aria-label="Quitar filtro de año"
                  className="flex h-5 w-5 items-center justify-center rounded-full text-neutral-500 transition-colors hover:text-auto-accent"
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </>
        )}

        {tagOptions.length > 0 && (
          <>
            <span className="ml-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
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
          </>
        )}

        {hasActiveFilters && (
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

      {isFiltering && (
        <p className="mb-5 text-sm text-neutral-500" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
          {query.trim() && <> para &ldquo;{query}&rdquo;</>}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-edge bg-surface-card px-6 py-10 text-center">
          {entities.length === 0 ? (
            <>
              <p className="mb-1 font-semibold text-neutral-900">
                Todavía no hay {typeLabel.toLowerCase()} documentados
              </p>
              <p className="mb-4 text-sm text-neutral-500">
                Esta categoría está vacía por ahora — estamos incorporando contenido a medida que se
                confirma. Volvé pronto.
              </p>
              <Link href="/" className="text-sm font-semibold text-auto-accent hover:underline">
                Explorar otras categorías
              </Link>
            </>
          ) : (
            <>
              <p className="mb-1 font-semibold text-neutral-900">Sin resultados</p>
              <p className="mb-4 text-sm text-neutral-500">
                Probá con otro término de búsqueda o quitá el filtro de estado.
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-sm font-semibold text-auto-accent hover:underline"
              >
                Limpiar filtros
              </button>
            </>
          )}
        </div>
      ) : isVehicleList && viewMode === 'catalogo' ? (
        <div className={cn('space-y-2', compareSlugs.length > 0 && 'pb-24')}>
          {visibleEntities.map((entity, i) => (
            <Reveal key={entity.slug} delay={(i % 8) * 40} className="entity-card-viewport entity-card-viewport--row">
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
        <div
          className={cn(
            'grid gap-6',
            // Vehículos: 5 columnas en desktop (pedido explícito de catálogo
            // denso tipo "showroom"). El resto de categorías mantiene el
            // grid original de 3 columnas — sus cards tienen más texto
            // (descripción, facts) y a 5 columnas quedarían ilegibles.
            isVehicleList ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5' : 'sm:grid-cols-2 lg:grid-cols-3',
            compareSlugs.length > 0 && 'pb-24',
          )}
        >
          {visibleEntities.map((entity, i) => (
            <Reveal key={entity.slug} delay={(i % 6) * 80} className="entity-card-viewport">
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
                // Solo las primeras cards del grid, las que están sin scroll
                // en la mayoría de viewports (el grid de vehiculos llega a 5
                // columnas en xl — ver docs/audit-performance-2026-08.md
                // sección 3, donde queda marcado como "sospecha sin medir").
                // EntityImage ya soportaba esta prop; lo que faltaba era que
                // el caller (acá) se la pasara a alguna card.
                priority={i < 5}
              />
            </Reveal>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
            className="rounded-full border border-edge px-5 py-2.5 text-sm font-semibold text-neutral-500 transition-colors hover:border-auto-accent hover:text-auto-accent"
          >
            Cargar más ({filtered.length - visibleCount} restantes)
          </button>
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
