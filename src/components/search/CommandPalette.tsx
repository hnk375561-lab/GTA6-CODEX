'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type Fuse from 'fuse.js'
import { type Entity } from '@/types'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { ENTITY_TYPE_LABELS } from '@/lib/entity-labels'
import { buildFuse } from '@/lib/entity-list-filters'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { useModalFocus } from '@/lib/hooks/useModalFocus'
import { cn } from '@/lib/utils'
import { SITE_NAME } from '@/config/site'
import type { SearchIndexResponse } from '@/app/search-index.json/route'

const MAX_RESULTS = 8

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

/**
 * Overlay de búsqueda global invocable con "/" desde cualquier página (ver
 * `Header.tsx`, que también expone el botón de lupa) — resuelve [3.1] de
 * la auditoría UX: antes el único camino era lupa → navegar a /buscar →
 * esperar el fetch+build del índice → recién ahí ver el primer resultado.
 *
 * Reutiliza exactamente la misma fuente de datos que `/buscar`
 * (`SearchClient.tsx`): `/search-index.json` (generado estático en build,
 * ver `src/app/search-index.json/route.ts`) + `buildFuse` de
 * `@/lib/entity-list-filters`. No duplica lógica de búsqueda, solo la
 * presenta en un panel instantáneo sin abandonar la página actual. El
 * índice se descarga una sola vez (al abrirse la primera vez) y se
 * conserva en memoria mientras el layout no se desmonte — igual que
 * `SearchClient`, ninguna tecla dispara una nueva request de red.
 *
 * `/buscar` sigue existiendo tal cual (con todos sus filtros de tipo,
 * estado, orden y tags) para la búsqueda "completa" — este panel es un
 * atajo rápido a lo más probable, no un reemplazo. El footer del panel
 * linkea a `/buscar?q=...` para esa experiencia completa.
 */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsFetchedRef = useRef(false)

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [allItems, setAllItems] = useState<SearchIndexResponse['items']>([])
  const [fuse, setFuse] = useState<Fuse<Entity> | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const debouncedQuery = useDebouncedValue(query, 120)

  // Carga perezosa: recién descarga el índice completo la primera vez que
  // se abre el panel (no en cada render de Header, que vive en TODAS las
  // páginas). Una vez cargado, queda en memoria para el resto de la
  // sesión — el layout raíz que monta `Header` no se desmonta entre
  // navegaciones de Next.js.
  useEffect(() => {
    if (!open || resultsFetchedRef.current) return
    resultsFetchedRef.current = true
    setIsLoading(true)
    const controller = new AbortController()

    fetch('/search-index.json', { signal: controller.signal })
      .then((res) => res.json() as Promise<SearchIndexResponse>)
      .then((data) => {
        setAllItems(data.items)
        setFuse(buildFuse(data.items.map((item) => item.entity)))
        setIsLoading(false)
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          resultsFetchedRef.current = false
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [open])

  // Escape cierra, y el body queda bloqueado mientras el panel está
  // abierto — mismo patrón que `VehicleCompareSheet`/`GalleryExplorer`.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  useModalFocus(open, containerRef)

  // Estado limpio cada vez que se abre: si quedó una búsqueda vieja
  // tipeada la sesión anterior, no tiene sentido mostrarla de entrada.
  // Cascading render intencional y acotado a la transición de apertura
  // (no depende de `query`/`activeIndex`, así que no hay loop) — mismo
  // criterio que ya usa el proyecto en ConsentBanner/CompareExplorer para
  // este mismo patrón de "resetear al abrir".
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('')
      setActiveIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const results = useMemo(() => {
    const trimmed = debouncedQuery.trim()
    if (!trimmed || !fuse) return []
    const itemBySlug = new Map(allItems.map((item) => [`${item.entity.type}/${item.entity.slug}`, item]))
    return fuse
      .search(trimmed)
      .slice(0, MAX_RESULTS)
      .map((r) => itemBySlug.get(`${r.item.type}/${r.item.slug}`))
      .filter((item): item is SearchIndexResponse['items'][number] => Boolean(item))
  }, [debouncedQuery, fuse, allItems])

  // Vuelve al primer resultado cada vez que cambia la búsqueda efectiva
  // (debounced) — evita que quede seleccionado un índice fuera de rango
  // de la lista nueva. Depende solo de `debouncedQuery`, sin loop.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIndex(0)
  }, [debouncedQuery])

  function goTo(entity: Entity) {
    onClose()
    router.push(`/${entity.type}/${entity.slug}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = results[activeIndex]
      if (item) goTo(item.entity)
    }
  }

  if (!open) return null

  const trimmed = debouncedQuery.trim()
  const isSearchPending = query.trim() !== trimmed || (isLoading && trimmed.length > 0)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/50 px-4 pt-[12vh] backdrop-blur-sm sm:pt-[16vh]"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Búsqueda rápida en ${SITE_NAME}`}
        className="glass-surface w-full max-w-xl rounded-sm border border-edge shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative border-b border-edge">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink/40">
            /
          </span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar autos, motos, marcas…"
            aria-label={`Búsqueda rápida en ${SITE_NAME}`}
            aria-activedescendant={results[activeIndex] ? `cmdk-result-${activeIndex}` : undefined}
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="cmdk-results"
            autoComplete="off"
            className="w-full bg-transparent py-4 pl-9 pr-4 text-base text-ink placeholder:text-ink/40 focus:outline-none"
          />
        </div>

        <div id="cmdk-results" role="listbox" className="max-h-[60vh] overflow-y-auto">
          {!trimmed ? (
            <p className="px-4 py-6 text-center text-sm text-ink/50">
              Empezá a tipear para buscar en todo {SITE_NAME}.
            </p>
          ) : isSearchPending ? (
            <p className="px-4 py-6 text-center text-sm text-ink/50">Buscando…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink/50">Sin resultados para &ldquo;{trimmed}&rdquo;.</p>
          ) : (
            <ul>
              {results.map((item, i) => (
                <li key={`${item.entity.type}/${item.entity.slug}`} id={`cmdk-result-${i}`} role="option" aria-selected={i === activeIndex}>
                  <button
                    type="button"
                    onClick={() => goTo(item.entity)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={cn(
                      'flex w-full items-center gap-3 border-b border-edge/60 px-4 py-3 text-left transition-colors last:border-b-0',
                      i === activeIndex ? 'bg-oxide-red/10' : 'hover:bg-surface-alt'
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-edge text-oxide-red">
                      <CategoryIcon type={item.entity.type} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{item.entity.title}</span>
                      <span className="block truncate font-mono text-[10px] uppercase tracking-wide text-ink/40">
                        {ENTITY_TYPE_LABELS[item.entity.type]}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-edge px-4 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink/35">
            ↑↓ navegar · ↵ abrir · esc cerrar
          </span>
          {trimmed && (
            <a
              href={`/buscar?q=${encodeURIComponent(trimmed)}`}
              onClick={onClose}
              className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-oxide-red hover:underline"
            >
              Ver todos los resultados →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
