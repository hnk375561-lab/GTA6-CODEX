'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ZoomableImage } from '@/components/ui/ZoomableImage'
import { useModalFocus } from '@/lib/hooks/useModalFocus'
import { cn } from '@/lib/utils'

interface SimpleLightboxProps {
  src: string
  alt: string
  children: ReactNode
  triggerClassName?: string
}

/**
 * Wrapper de "clic para ampliar" para una imagen individual (fuera del
 * contexto de galería con navegación prev/next). Reutiliza las mismas
 * clases visuales que `GalleryExplorer` (`gallery-lightbox*`) para que el
 * visor se sienta consistente en todo el sitio, pero sin la metadata
 * lateral ni la navegación entre ítems que no aplican acá (una sola
 * imagen: el retrato de la ficha, o una pieza suelta del carrusel).
 *
 * El trigger es un <button>, así que este componente NO debe anidarse
 * dentro de otro elemento interactivo (ej. un <Link> de tarjeta) — para
 * esos casos (EntityCard, MediaCarousel con href) el clic ya navega y no
 * corresponde superponer un lightbox.
 */
export function SimpleLightbox({ src, alt, children, triggerClassName }: SimpleLightboxProps) {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, close])

  // Atrapa Tab dentro del modal y devuelve el foco al trigger al cerrar
  // (ver comentario del hook) — complementa el useEffect de arriba, que
  // sigue a cargo de Escape y el scroll lock.
  useModalFocus(open, dialogRef)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ampliar imagen: ${alt}`}
        className={cn('block w-full cursor-zoom-in text-left', triggerClassName)}
      >
        {children}
      </button>

      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Visor de imagen: ${alt}`}
          tabIndex={-1}
          className="gallery-lightbox fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-8"
          onClick={close}
        >
          <div className="gallery-lightbox-backdrop absolute inset-0" aria-hidden="true" />

          <button
            type="button"
            onClick={close}
            aria-label="Cerrar visor"
            className="glass-surface absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-auto-border text-auto-text transition-colors hover:border-auto-accent hover:text-auto-accent-strong sm:right-6 sm:top-6"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>

          <div
            className="gallery-lightbox-panel relative z-10 h-[85vh] w-full max-w-6xl"
            onClick={(e) => e.stopPropagation()}
          >
            <ZoomableImage
              src={src}
              alt={alt}
              sizes="(min-width: 1280px) 1200px, 95vw"
              quality={100}
              priority
            />
          </div>
        </div>
      )}
    </>
  )
}
