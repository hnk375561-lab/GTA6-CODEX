'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ResolvedDisplayImage } from '@/lib/images'
import { ZoomableImage } from '@/components/ui/ZoomableImage'
import { ImageReveal } from '@/components/ui/ImageReveal'
import { useModalFocus } from '@/lib/hooks/useModalFocus'
import { cn } from '@/lib/utils'

interface EntityGalleryProps {
  images: ResolvedDisplayImage[]
  /** Usado en el `aria-label` del visor y como alt de respaldo. */
  entityTitle: string
}

/**
 * Galería premium por entidad (FASE 9, punto 2 del audit): imagen
 * principal + tira de miniaturas + lightbox con navegación prev/next y
 * zoom. Deliberadamente SOLO se monta cuando `images.length > 1` — el
 * caller (`[entityType]/[slug]/page.tsx`) sigue usando `EntityImage` sin
 * cambios para las entidades con 0 o 1 imagen, así que este componente
 * nuevo no puede alterar el comportamiento de las 236 fichas que hoy
 * tienen exactamente 1 foto (ver AUDITORIA-FASE-9, restricción final).
 *
 * Reutiliza el mismo lenguaje visual que `SimpleLightbox`/`GalleryExplorer`
 * (clases `gallery-lightbox*`, `ZoomableImage`, `useModalFocus`) en vez de
 * inventar un visor nuevo.
 */
export function EntityGallery({ images, entityTitle }: EntityGalleryProps) {
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  const total = images.length
  const current = images[active] ?? images[0]

  const step = useCallback(
    (delta: number) => {
      setActive((prev) => (prev + delta + total) % total)
    },
    [total]
  )

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'ArrowLeft') step(-1)
      if (e.key === 'ArrowRight') step(1)
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, step])

  useModalFocus(open, dialogRef)

  // Miniaturas: nunca priority (ver criterio ya documentado en
  // EntityImage — priority solo para la primera pieza visible sin
  // scroll, que acá es la imagen principal, no las miniaturas chicas).
  const thumbnails = useMemo(
    () =>
      images.map((img, i) => (
        <button
          key={img.src}
          type="button"
          onClick={() => setActive(i)}
          aria-label={`Ver imagen ${i + 1} de ${total}`}
          aria-current={i === active}
          className={cn(
            'relative aspect-[4/3] shrink-0 overflow-hidden rounded-md border transition-colors',
            i === active ? 'border-auto-accent' : 'border-edge hover:border-edge-strong'
          )}
          style={{ width: 64 }}
        >
          <ImageReveal src={img.src} alt={img.alt} sizes="64px" imgClassName="object-cover" />
        </button>
      )),
    [images, active, total]
  )

  const lightbox = open && (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Visor de imagen: ${entityTitle}`}
      tabIndex={-1}
      className="gallery-lightbox fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        paddingTop: 'max(0.25rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.25rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.25rem, env(safe-area-inset-right))',
      }}
      onClick={() => setOpen(false)}
    >
      <div className="gallery-lightbox-backdrop absolute inset-0" aria-hidden="true" />

      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Cerrar visor"
        className="glass-surface absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-edge text-neutral-900 transition-colors hover:border-auto-accent hover:text-auto-accent-strong sm:right-6 sm:top-6"
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
              step(-1)
            }}
            aria-label="Imagen anterior"
            className="glass-surface absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-edge text-neutral-900 transition-colors hover:border-auto-accent hover:text-auto-accent-strong sm:left-6"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              step(1)
            }}
            aria-label="Imagen siguiente"
            className="glass-surface absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-edge text-neutral-900 transition-colors hover:border-auto-accent hover:text-auto-accent-strong sm:right-6"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      <div
        className="gallery-lightbox-panel relative z-10 h-[90dvh] w-full max-w-[1900px] sm:h-[94dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <ZoomableImage
          key={current.src}
          resetKey={current.src}
          src={current.src}
          alt={current.alt}
          sizes="(min-width: 1920px) 1580px, (min-width: 1280px) 82vw, 100vw"
          quality={100}
          priority
        />
      </div>

      {total > 1 && (
        <p className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 text-xs text-neutral-500 sm:bottom-6">
          {active + 1} / {total}
        </p>
      )}
    </div>
  )

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ampliar imagen: ${current.alt}`}
        className="card-media relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden rounded-lg border border-edge bg-white"
      >
        <ImageReveal
          src={current.src}
          alt={current.alt}
          sizes="(min-width: 1024px) 380px, 92vw"
          quality={90}
          imgClassName="card-media-image-static object-cover"
        />
        <div className="card-media-sheen" aria-hidden="true" />
        <div className="card-media-vignette" aria-hidden="true" />
        <div className="gallery-tile-zoom-icon !opacity-100" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M11 8v6M8 11h6M21 21l-4.3-4.3" />
          </svg>
        </div>
        <span className="absolute bottom-2 right-2 z-10 rounded-full border border-edge bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-neutral-500 backdrop-blur-sm">
          {active + 1} / {total}
        </span>
      </button>

      <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Miniaturas de la galería">
        {thumbnails}
      </div>

      {mounted && lightbox ? createPortal(lightbox, document.body) : null}
    </div>
  )
}
