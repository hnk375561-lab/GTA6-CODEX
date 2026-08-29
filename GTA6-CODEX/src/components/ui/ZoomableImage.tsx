'use client'

import { useEffect, useRef } from 'react'
import Image, { type ImageProps } from 'next/image'
import { useImageZoom } from '@/lib/hooks/useImageZoom'
import { cn } from '@/lib/utils'

type ZoomableImageProps = Omit<ImageProps, 'fill' | 'style' | 'onDoubleClick'> & {
  /** Se resetea el zoom cada vez que este valor cambia (ej. al navegar entre imágenes de la galería). */
  resetKey?: string | number
  wrapperClassName?: string
}

/**
 * Envuelve `next/image` (en modo `fill`, pensado para el panel de un
 * lightbox) con zoom real: rueda del mouse, pellizco táctil, arrastre para
 * desplazar cuando está ampliada, doble-click/tap y botones +/- visibles.
 *
 * Toda la lógica de gestos vive en `useImageZoom` — este componente solo la
 * conecta a un `<Image fill>` y dibuja los controles, para que
 * `SimpleLightbox` y el lightbox de `GalleryExplorer` compartan una sola
 * implementación en vez de duplicarla.
 */
export function ZoomableImage({ resetKey, wrapperClassName, className, alt, ...imageProps }: ZoomableImageProps) {
  const { containerRef, containerProps, style, scale, isZoomed, zoomIn, zoomOut, reset, minScale, maxScale } =
    useImageZoom()

  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    reset()
    // Solo cuando cambia la imagen mostrada, no en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  return (
    <div
      ref={containerRef}
      className={cn('zoomable-image-container relative h-full w-full select-none overflow-hidden', wrapperClassName)}
      {...containerProps}
    >
      <div className="pointer-events-none absolute inset-0" style={style}>
        <Image {...imageProps} alt={alt} fill className={cn('pointer-events-none object-contain', className)} />
      </div>

      <div
        className="zoomable-image-controls glass-surface absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-auto-border p-1 sm:bottom-5"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={zoomOut}
          disabled={scale <= minScale + 0.01}
          aria-label="Alejar imagen"
          className="flex h-9 w-9 items-center justify-center rounded-full text-auto-text transition-colors hover:bg-auto-surface-elevated hover:text-auto-accent-strong disabled:pointer-events-none disabled:opacity-35"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M8 11h6M21 21l-4.3-4.3" />
          </svg>
        </button>

        <span className="min-w-[3.2rem] text-center font-mono text-[11px] font-semibold tabular-nums text-auto-text-secondary" aria-live="polite">
          {Math.round(scale * 100)}%
        </span>

        <button
          type="button"
          onClick={zoomIn}
          disabled={scale >= maxScale - 0.01}
          aria-label="Ampliar imagen"
          className="flex h-9 w-9 items-center justify-center rounded-full text-auto-text transition-colors hover:bg-auto-surface-elevated hover:text-auto-accent-strong disabled:pointer-events-none disabled:opacity-35"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M11 8v6M8 11h6M21 21l-4.3-4.3" />
          </svg>
        </button>

        {isZoomed && (
          <>
            <span className="mx-0.5 h-5 w-px bg-auto-border" aria-hidden="true" />
            <button
              type="button"
              onClick={reset}
              aria-label="Restablecer zoom"
              className="flex h-9 w-9 items-center justify-center rounded-full text-auto-text transition-colors hover:bg-auto-surface-elevated hover:text-auto-accent-strong"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
