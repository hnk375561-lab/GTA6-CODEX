'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Fuse from 'fuse.js'
import type { GalleryCategoryCount, GalleryItem } from '@/lib/gallery'
import { Badge } from '@/components/ui/Badge'
import { Reveal } from '@/components/ui/Reveal'
import { YouTubeEmbed } from '@/components/media/YouTubeEmbed'
import { VideoEmbed } from '@/components/media/VideoEmbed'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { cn } from '@/lib/utils'

const STATUS_LABELS = {
  confirmado: 'Confirmado',
  rumor: 'Rumor',
  nuestro: 'Nuestro',
} as const

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
            placeholder="Buscar en la galería..."
            aria-label="Buscar en la galería"
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

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
          <button
            type="button"
            onClick={() => setCategory('todas')}
            aria-pressed={category === 'todas'}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
              category === 'todas'
                ? 'border-gta-accent bg-gta-accent/15 text-gta-accent'
                : 'border-gta-border text-gta-text-secondary hover:border-gta-border-strong hover:text-gta-text'
            )}
          >
            Todas
            <span className="ml-1.5 text-gta-text-secondary/80">{items.length}</span>
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => setCategory(c.slug)}
              aria-pressed={category === c.slug}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
                category === c.slug
                  ? 'border-gta-accent bg-gta-accent/15 text-gta-accent'
                  : 'border-gta-border text-gta-text-secondary hover:border-gta-border-strong hover:text-gta-text'
              )}
            >
              {c.label}
              <span className="ml-1.5 text-gta-text-secondary/80">{c.count}</span>
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
        <div className="rounded-lg border border-gta-border bg-gta-surface px-6 py-14 text-center">
          <p className="mb-1 font-semibold text-gta-text">Sin resultados</p>
          <p className="mb-4 text-sm text-gta-text-secondary">
            Probá con otro término de búsqueda o quitá el filtro de categoría.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setCategory('todas')
            }}
            className="text-sm font-semibold text-gta-accent hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="gallery-grid">
          {filtered.map((item, i) => (
            <Reveal key={item.id} delay={(i % 8) * 60} className={item.featured ? 'gallery-grid-item--featured' : undefined}>
              <GalleryTile item={item} featured={!!item.featured} onOpen={() => openLightbox(item)} />
            </Reveal>
          ))}
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
      className={cn(
        'gallery-tile group relative block h-full w-full overflow-hidden rounded-xl border border-gta-border bg-gta-card text-left',
        featured ? 'aspect-square sm:aspect-auto' : 'aspect-[4/5]'
      )}
      aria-label={`Ampliar imagen: ${item.title}`}
    >
      {item.kind === 'video' && item.src ? (
        // eslint-disable-next-line @next/next/no-img-element -- miniatura pública de i.ytimg.com (YouTube), fuera del dominio propio configurado en next/image
        <img
          src={item.src}
          alt={item.alt}
          loading="lazy"
          className="gallery-tile-image absolute inset-0 h-full w-full object-cover"
        />
      ) : item.kind === 'video' ? (
        <div className="absolute inset-0 bg-gradient-to-br from-gta-surface-elevated via-gta-darker to-black" aria-hidden="true" />
      ) : (
        <Image
          src={item.src}
          alt={item.alt}
          fill
          sizes={featured ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw'}
          className="gallery-tile-image object-cover"
        />
      )}
      <div className="gallery-tile-overlay" aria-hidden="true" />
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
      <div className="absolute inset-x-0 bottom-0 translate-y-2 p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          {item.status && (
            <Badge variant="status" status={item.status}>
              {STATUS_LABELS[item.status]}
            </Badge>
          )}
          <Badge variant="tag">{item.categoryLabel}</Badge>
        </div>
        <p className="font-display text-sm font-semibold leading-tight text-gta-text drop-shadow-md">
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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose, onPrev, onNext])

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

      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar visor"
        className="glass-surface absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-gta-border text-gta-text transition-colors hover:border-gta-accent hover:text-gta-accent-strong sm:right-6 sm:top-6"
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
            className="glass-surface absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gta-border text-gta-text transition-colors hover:border-gta-accent hover:text-gta-accent-strong sm:left-6"
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
            className="glass-surface absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gta-border text-gta-text transition-colors hover:border-gta-accent hover:text-gta-accent-strong sm:right-6"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      <div
        className="gallery-lightbox-panel glass-surface relative z-10 grid max-h-[90vh] w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl border border-gta-border shadow-gta-xl md:grid-cols-[1.6fr_1fr]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative min-h-[45vh] bg-gta-darker md:min-h-[70vh]">
          {item.kind === 'video' && item.videoEmbedId ? (
            <div className="flex h-full w-full items-center p-4">
              <YouTubeEmbed embedId={item.videoEmbedId} title={item.title} thumbnailSrc={item.src} autoLoad />
            </div>
          ) : item.kind === 'video' && item.videoSrc ? (
            <div className="flex h-full w-full items-center p-4">
              <VideoEmbed videoSrc={item.videoSrc} title={item.title} autoLoad />
            </div>
          ) : (
            <Image
              key={item.id}
              src={item.src}
              alt={item.alt}
              fill
              sizes="(min-width: 768px) 60vw, 100vw"
              className="object-contain"
              priority
            />
          )}
        </div>

        <div className="flex max-h-[45vh] flex-col overflow-y-auto p-6 md:max-h-[70vh]">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {item.status && (
              <Badge variant="status" status={item.status}>
                {STATUS_LABELS[item.status]}
              </Badge>
            )}
            <Badge variant="tag">{item.categoryLabel}</Badge>
            {item.featured && <Badge variant="tag">Destacado</Badge>}
          </div>

          <h2 className="font-display text-xl font-bold text-gta-text">{item.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-gta-text-secondary">{item.description}</p>

          <dl className="mt-5 space-y-3 border-t border-gta-border pt-4 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gta-text-tertiary">Procedencia</dt>
              <dd className="mt-1 text-gta-text-secondary">{item.credit}</dd>
            </div>
            {item.sourceNote && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gta-text-tertiary">Nota de evidencia</dt>
                <dd className="mt-1 text-gta-text-secondary">{item.sourceNote}</dd>
              </div>
            )}
          </dl>

          {item.trailerAppearances.length > 0 && (
            <div className="mt-5 border-t border-gta-border pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gta-text-tertiary">
                Aparece en tráiler
              </p>
              <ul className="space-y-2">
                {item.trailerAppearances.map((app) => (
                  <li key={`${app.trailerSlug}-${app.sceneId}`}>
                    <Link
                      href={`/trailers/${app.trailerSlug}#${app.sceneId}`}
                      className="group flex items-start gap-2 rounded-lg border border-gta-border bg-gta-card/60 px-3 py-2 transition-colors hover:border-gta-accent/60"
                    >
                      <span className="scene-timestamp mt-0.5 shrink-0 font-mono text-[10px] font-semibold text-gta-dark">
                        {app.timestamp}
                      </span>
                      <span className="text-xs text-gta-text-secondary transition-colors group-hover:text-gta-text">
                        <span className="font-medium text-gta-text">{app.trailerTitle}</span>
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
            <div className="mt-5 flex flex-wrap gap-1.5 border-t border-gta-border pt-4">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-gta-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gta-text-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {item.href && (
            <Link
              href={item.href}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-gta-accent hover:underline"
            >
              Ver ficha completa
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          )}

          <p className="mt-auto pt-6 text-xs text-gta-text-tertiary">
            {index + 1} / {total}
          </p>
        </div>
      </div>
    </div>
  )
}
