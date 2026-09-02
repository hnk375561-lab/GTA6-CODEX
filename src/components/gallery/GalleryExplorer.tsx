'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Fuse from 'fuse.js'
import type { GalleryCategoryCount, GalleryItem } from '@/lib/gallery'
import { Badge } from '@/components/ui/Badge'
import { Reveal } from '@/components/ui/Reveal'
import { ZoomableImage } from '@/components/ui/ZoomableImage'
import { YouTubeEmbed } from '@/components/media/YouTubeEmbed'
import { VideoEmbed } from '@/components/media/VideoEmbed'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { useModalFocus } from '@/lib/hooks/useModalFocus'
import { STATUS_LABELS } from '@/lib/entity-labels'
import { cn } from '@/lib/utils'

interface GalleryExplorerProps {
  items: GalleryItem[]
  categories: GalleryCategoryCount[]
}

/**
 * Superficie interactiva completa de /galeria: barra de búsqueda + pills de
 * categoría (mismo patrón que EntityListExplorer, reutilizado para
 * consistencia) sobre un grid editorial de densidad variable (las piezas
 * destacadas ocupan 2×2, el resto 1×1) y un lightbox propio con navegación
 * por teclado, metadata completa y relación con trailers.
 */
export function GalleryExplorer({ items, categories }: GalleryExplorerProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('todas')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const debouncedQuery = useDebouncedValue(query, 200)

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: [
          { name: 'title', weight: 0.5 },
          { name: 'description', weight: 0.3 },
          { name: 'tags', weight: 0.1 },
          { name: 'categoryLabel', weight: 0.1 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [items]
  )

  const filtered = useMemo(() => {
    const base = debouncedQuery.trim() ? fuse.search(debouncedQuery).map((r) => r.item) : items
    if (category === 'todas') return base
    return base.filter((i) => i.categorySlug === category)
  }, [fuse, debouncedQuery, items, category])

  const isFiltering = debouncedQuery.trim().length > 0 || category !== 'todas'

  /** Mismo patrón que el listado de Vehículos (`EntityListExplorer`): la
   *  galería agrega imágenes de TODOS los tipos de entidad + key art +
   *  videos, así que es el grid más grande del sitio — fácilmente 100+
   *  tiles montados de una sin este tope. `content-visibility: auto` en
   *  `.gallery-tile-viewport` (globals.css) ya evita pintar los que están
   *  fuera de pantalla; esto además reduce cuántos existen en el DOM. */
  const PAGE_SIZE = 40
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [filtered])

  const visibleItems = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const openLightbox = useCallback(
    (item: GalleryItem) => {
      const idx = filtered.findIndex((i) => i.id === item.id)
      setLightboxIndex(idx === -1 ? null : idx)
    },
    [filtered]
  )

  const closeLightbox = useCallback(() => setLightboxIndex(null), [])

  const step = useCallback(
    (delta: number) => {
      setLightboxIndex((current) => {
        if (current === null || filtered.length === 0) return current
        return (current + delta + filtered.length) % filtered.length
      })
    },
    [filtered.length]
  )

  // Si el filtro/búsqueda cambia mientras el lightbox está abierto y el
  // índice actual queda fuera de rango, lo cerramos en vez de mostrar un
  // ítem que ya no pertenece al set filtrado.
  useEffect(() => {
    if (lightboxIndex !== null && lightboxIndex >= filtered.length) {
      setLightboxIndex(filtered.length > 0 ? 0 : null)
    }
  }, [filtered.length, lightboxIndex])

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            placeholder="Buscar en la galería..."
            aria-label="Buscar en la galería"
            className="glass-surface w-full rounded-lg border border-edge py-2.5 pl-10 pr-9 text-sm text-neutral-900 placeholder:text-neutral-400 transition-all focus:border-auto-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpiar búsqueda"
              className="tap-scale absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-surface-alt hover:text-neutral-900"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
          <button
            type="button"
            onClick={() => setCategory('todas')}
            aria-pressed={category === 'todas'}
            className={cn(
              'tap-scale rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
              category === 'todas'
                ? 'border-auto-accent bg-auto-accent/15 text-auto-accent'
                : 'border-edge text-neutral-500 hover:border-edge-strong hover:text-neutral-900'
            )}
          >
            Todas
            <span className="ml-1.5 text-neutral-500/80">{items.length}</span>
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => setCategory(c.slug)}
              aria-pressed={category === c.slug}
              className={cn(
                'tap-scale rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
                category === c.slug
                  ? 'border-auto-accent bg-auto-accent/15 text-auto-accent'
                  : 'border-edge text-neutral-500 hover:border-edge-strong hover:text-neutral-900'
              )}
            >
              {c.label}
              <span className="ml-1.5 text-neutral-500/80">{c.count}</span>
            </button>
          ))}
        </div>
      </div>

      {isFiltering && (
        <p className="mb-5 text-sm text-neutral-500" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
          {query.trim() && <> para &ldquo;{query}&rdquo;</>}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-edge bg-surface-card px-6 py-14 text-center">
          <p className="mb-1 font-semibold text-neutral-900">Sin resultados</p>
          <p className="mb-4 text-sm text-neutral-500">
            Probá con otro término de búsqueda o quitá el filtro de categoría.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setCategory('todas')
            }}
            className="text-sm font-semibold text-auto-accent hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 lg:gap-2.5">
          {visibleItems.map((item, i) => (
            <Reveal
              key={item.id}
              delay={(i % 8) * 60}
              className="gallery-tile-viewport"
            >
              <GalleryTile item={item} featured={!!item.featured} onOpen={() => openLightbox(item)} />
            </Reveal>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
            className="tap-scale rounded-full border border-edge px-5 py-2.5 text-sm font-semibold text-neutral-500 transition-colors hover:border-auto-accent hover:text-auto-accent"
          >
            Cargar más ({filtered.length - visibleCount} restantes)
          </button>
        </div>
      )}

      {lightboxIndex !== null && filtered[lightboxIndex] && (
        <GalleryLightbox
          item={filtered[lightboxIndex]}
          index={lightboxIndex}
          total={filtered.length}
          onClose={closeLightbox}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
        />
      )}
    </div>
  )
}

function GalleryTile({
  item,
  featured,
  onOpen,
}: {
  item: GalleryItem
  featured: boolean
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-featured={featured}
      className={cn(
        'tap-scale gallery-tile group relative block h-full w-full overflow-hidden rounded-xl border border-edge bg-surface-card text-left flex flex-col'
      )}
      aria-label={`Ampliar imagen: ${item.title}`}
    >
      {/* Contenedor de imagen - ocupa espacio flexible */}
      <div className="relative flex-1 w-full overflow-hidden flex items-center justify-center">
        {item.kind === 'video' && item.src ? (
          // eslint-disable-next-line @next/next/no-img-element -- miniatura pública de i.ytimg.com (YouTube), fuera del dominio propio configurado en next/image
          <img
            src={item.src}
            alt={item.alt}
            loading="lazy"
            className="gallery-tile-image w-full h-full"
          />
        ) : item.kind === 'video' ? (
          <div className="w-full h-full bg-gradient-to-br from-neutral-800 via-auto-darker to-black" aria-hidden="true" />
        ) : (
          <Image
            src={item.src}
            alt={item.alt}
            fill
            sizes={featured ? '(min-width: 1920px) 1400px, (min-width: 1536px) 1100px, (min-width: 1280px) 1000px, (min-width: 1024px) 900px, (min-width: 768px) 95vw, 100vw' : '(min-width: 1920px) 750px, (min-width: 1536px) 700px, (min-width: 1280px) 650px, (min-width: 1024px) 600px, (min-width: 768px) 60vw, 90vw'}
            className="gallery-tile-image"
            quality={94}
          />
        )}
        <div className="gallery-tile-overlay absolute inset-0" aria-hidden="true" />
        {item.kind === 'video' && (
          <span
            className="absolute inset-0 flex items-center justify-center bg-black/20"
            aria-hidden="true"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white backdrop-blur-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        )}
      </div>

      {/* Contenedor de texto - siempre visible */}
      <div className="px-4 py-3 bg-gradient-to-t from-auto-darker/80 to-transparent">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          {item.status && (
            <Badge variant="status" status={item.status}>
              {STATUS_LABELS[item.status]}
            </Badge>
          )}
          <Badge variant="tag">{item.categoryLabel}</Badge>
        </div>
        <p className="font-display text-xs font-semibold leading-tight text-neutral-900 drop-shadow-md line-clamp-2">
          {item.title}
        </p>
      </div>

      <div className="gallery-tile-zoom-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M11 8v6M8 11h6M21 21l-4.3-4.3" />
        </svg>
      </div>
    </button>
  )
}

function GalleryLightbox({
  item,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  item: GalleryItem
  index: number
  total: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  // Swipe táctil (mobile): solo para navegar prev/next, no interfiere con
  // el pan/pinch de `ZoomableImage` (que usa touch-action:none y captura
  // sus propios gestos) porque acá solo miramos el delta X del punto de
  // inicio/fin — si el swipe es mayormente vertical o muy corto, se
  // ignora, así un pan diagonal dentro de la imagen no dispara una
  // navegación accidental.
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const SWIPE_THRESHOLD_PX = 60

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current
    touchStartRef.current = null
    if (!start || total <= 1) return
    const touch = e.changedTouches[0]
    if (!touch) return
    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) < Math.abs(deltaY)) return
    if (deltaX < 0) onNext()
    else onPrev()
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose, onPrev, onNext])

  // Este componente solo existe montado mientras el lightbox está
  // abierto (ver el `{lightboxIndex !== null && ... && <GalleryLightbox`
  // condicional del padre), así que "open" es siempre true acá — el
  // hook igual necesita el flag para poder restaurar el foco en su
  // cleanup cuando el padre lo desmonta.
  useModalFocus(true, dialogRef)

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Visor de imagen: ${item.title}`}
      tabIndex={-1}
      className="gallery-lightbox fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-8"
      onClick={onClose}
    >
      <div className="gallery-lightbox-backdrop absolute inset-0" aria-hidden="true" />

      {/* Controles (cerrar, prev/next) van en z-20: el panel de abajo (imagen +
          metadata) es z-10 pero ocupa casi toda la superficie del modal, así
          que si quedaran en el mismo nivel el panel se pinta encima (llega
          después en el DOM) y le "roba" los clics a los botones en las
          esquinas donde se superponen — el bug que hacía que la cruz de
          cerrar no respondiera de forma confiable. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar visor"
        className="tap-scale glass-surface absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-edge text-neutral-900 transition-colors hover:border-auto-accent hover:text-auto-accent-strong sm:right-6 sm:top-6"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onPrev()
            }}
            aria-label="Imagen anterior"
            className="tap-scale glass-surface absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-edge text-neutral-900 transition-colors hover:border-auto-accent hover:text-auto-accent-strong sm:left-6"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onNext()
            }}
            aria-label="Imagen siguiente"
            className="tap-scale glass-surface absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-edge text-neutral-900 transition-colors hover:border-auto-accent hover:text-auto-accent-strong sm:right-6"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      <div
        className="gallery-lightbox-panel glass-surface relative z-10 grid max-h-[94vh] w-full max-w-[1900px] grid-cols-1 overflow-hidden rounded-2xl border border-edge shadow-xl md:grid-cols-[minmax(0,1fr)_320px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative min-h-[60vh] bg-auto-darker md:min-h-[88vh]" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {item.kind === 'video' && item.videoEmbedId ? (
            <div className="flex h-full w-full items-center p-4" key={item.id}>
              <YouTubeEmbed embedId={item.videoEmbedId} title={item.title} thumbnailSrc={item.src} autoLoad />
            </div>
          ) : item.kind === 'video' && item.videoSrc ? (
            <div className="flex h-full w-full items-center p-4" key={item.id}>
              <VideoEmbed videoSrc={item.videoSrc} title={item.title} autoLoad />
            </div>
          ) : (
            <div className="gallery-lightbox-media-enter h-full w-full" key={item.id}>
              <ZoomableImage
                resetKey={item.id}
                src={item.src}
                alt={item.alt}
                sizes="(min-width: 1920px) 1580px, (min-width: 1280px) 82vw, 100vw"
                priority
                quality={100}
              />
            </div>
          )}
        </div>

        <div className="flex max-h-[55vh] flex-col overflow-y-auto p-6 md:max-h-[88vh]">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {item.status && (
              <Badge variant="status" status={item.status}>
                {STATUS_LABELS[item.status]}
              </Badge>
            )}
            <Badge variant="tag">{item.categoryLabel}</Badge>
            {item.featured && <Badge variant="tag">Destacado</Badge>}
          </div>

          <h2 className="font-display text-xl font-bold text-neutral-900">{item.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">{item.description}</p>

          <dl className="mt-5 space-y-3 border-t border-edge pt-4 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Procedencia</dt>
              <dd className="mt-1 text-neutral-500">{item.credit}</dd>
            </div>
            {item.sourceNote && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Nota de evidencia</dt>
                <dd className="mt-1 text-neutral-500">{item.sourceNote}</dd>
              </div>
            )}
          </dl>

          {item.trailerAppearances.length > 0 && (
            <div className="mt-5 border-t border-edge pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Aparece en tráiler
              </p>
              <ul className="space-y-2">
                {item.trailerAppearances.map((app) => (
                  <li key={`${app.trailerSlug}-${app.sceneId}`}>
                    <Link
                      href={`/trailers/${app.trailerSlug}#${app.sceneId}`}
                      className="group flex items-start gap-2 rounded-lg border border-edge bg-surface-card/60 px-3 py-2 transition-colors hover:border-auto-accent/60"
                    >
                      <span className="scene-timestamp mt-0.5 shrink-0 font-mono text-[10px] font-semibold text-neutral-900">
                        {app.timestamp}
                      </span>
                      <span className="text-xs text-neutral-500 transition-colors group-hover:text-neutral-900">
                        <span className="font-medium text-neutral-900">{app.trailerTitle}</span>
                        {' — '}
                        {app.sceneTitle}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.tags && item.tags.length > 0 && (
            /* Mismo criterio que en la ficha de entidad: tags = metadata,
               no filtro/estado, así que van como texto separado por punto
               medio en vez de una fila de pills. */
            <div className="mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-edge pt-4">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs capitalize text-neutral-400 [&:not(:first-child)]:before:mr-2.5 [&:not(:first-child)]:before:text-neutral-400/50 [&:not(:first-child)]:before:content-['·']"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {item.href && (
            <Link
              href={item.href}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-auto-accent hover:underline"
            >
              Ver ficha completa
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          )}

          <p className="mt-auto pt-6 text-xs text-neutral-400">
            {index + 1} / {total}
          </p>
        </div>
      </div>
    </div>
  )
}
