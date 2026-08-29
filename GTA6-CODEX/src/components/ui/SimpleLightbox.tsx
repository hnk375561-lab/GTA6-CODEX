'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
/** Ancho/alto máximo del panel del visor: mismo criterio que antes
 *  (92% del alto de pantalla, 95% del ancho, tope de 1800px), pero ahora
 *  son solo COTAS — el tamaño final sale de `panelSize` respetando el
 *  aspect ratio real de la foto. */
const MAX_HEIGHT_VH = 0.92
const MAX_WIDTH_VW = 0.95
const MAX_WIDTH_PX = 1800

export function SimpleLightbox({ src, alt, children, triggerClassName }: SimpleLightboxProps) {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  // Dimensiones reales de la foto (se miden al abrir) y tamaño de
  // viewport (se recalcula en resize/rotación) — de acá sale el tamaño
  // final del panel. Ver comentario largo en el render de abajo.
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(null)

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

  // Mide la foto real (no el placeholder ni el <Image> optimizado, sino
  // el archivo servido) para conocer su aspect ratio real ni bien se
  // abre el visor. Antes el panel tenía SIEMPRE h-[92vh] w-full: con
  // fotos horizontales (la mayoría, panorámicas) en pantallas verticales
  // eso dejaba un montón de espacio negro arriba/abajo porque
  // `object-contain` termina ajustando por ancho. Ahora el panel toma la
  // forma real de la imagen y así ocupa el máximo posible de pantalla.
  useEffect(() => {
    if (!open) {
      setNatural(null)
      return
    }
    let cancelled = false
    const img = new window.Image()
    img.onload = () => {
      if (!cancelled) setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    }
    img.src = src
    return () => {
      cancelled = true
    }
  }, [open, src])

  useEffect(() => {
    if (!open) return
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [open])

  // Máxima caja con el aspect ratio real de la foto que entra dentro de
  // las cotas de viewport (ancho limitante o alto limitante, según cuál
  // foto sea horizontal/vertical) — el cálculo típico de "letterbox"
  // pero aplicado al contenedor en vez de dejarlo fijo.
  const panelSize = useMemo(() => {
    if (!natural || !viewport) return null
    const maxW = Math.min(viewport.w * MAX_WIDTH_VW, MAX_WIDTH_PX)
    const maxH = viewport.h * MAX_HEIGHT_VH
    const ratio = natural.w / natural.h
    let w = maxW
    let h = w / ratio
    if (h > maxH) {
      h = maxH
      w = h * ratio
    }
    return { width: Math.round(w), height: Math.round(h) }
  }, [natural, viewport])

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

          {/*
            Mientras no midamos la foto (primer frame) se usa el tamaño
            fijo de siempre como fallback vía className, para que no haya
            un "salto" visible sin nada dibujado. Ni bien `panelSize` está
            listo, el style inline (que siempre gana sobre las clases) lo
            reemplaza por el tamaño real, ajustado al aspect ratio real de
            la foto.
          */}
          <div
            className="gallery-lightbox-panel relative z-10 h-[92vh] w-full max-w-[1800px]"
            style={panelSize ? { width: panelSize.width, height: panelSize.height, maxWidth: '95vw', maxHeight: '92vh' } : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            <ZoomableImage
              src={src}
              alt={alt}
              sizes="(min-width: 1920px) 1800px, (min-width: 1280px) 90vw, 95vw"
              quality={100}
              priority
            />
          </div>
        </div>
      )}
    </>
  )
}
