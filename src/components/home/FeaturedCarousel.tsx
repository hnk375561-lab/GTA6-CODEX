'use client'

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

interface FeaturedCarouselProps {
  children: ReactNode
  className?: string
  /** Nombre accesible de la región (ej. "Vehículos destacados"). Opcional
   *  y retrocompatible: si no se pasa, el componente no agrega `role` ni
   *  `aria-label` propios — el consumidor puede seguir etiquetando el
   *  carrusel desde afuera (como hace `HeroVehicleShowcase.tsx`, que
   *  envuelve esto en su propio `<section aria-label>`). */
  ariaLabel?: string
}

/** Umbral en píxeles para confirmar un gesto como arrastre real (mouse).
 *  6px evita disparar arrastre por temblor de click, pero no tanto que haga
 *  falta un movimiento visible para iniciar el drag. */
const DRAG_THRESHOLD_PX = 8

/** Fracción del ancho visible del track que avanza cada `ArrowLeft` /
 *  `ArrowRight` (0.85 ≈ ancho de una card + gap visible). */
const KEYBOARD_SCROLL_FRACTION = 0.85

export const FeaturedCarousel = forwardRef<HTMLDivElement, FeaturedCarouselProps>(function FeaturedCarousel(
  { children, className, ariaLabel },
  forwardedRef
) {
  const trackRef = useRef<HTMLDivElement>(null)
  useImperativeHandle(forwardedRef, () => trackRef.current as HTMLDivElement)
  const dragStateRef = useRef<{
    pointerId: number
    startX: number
    startScrollLeft: number
    /** true recién cuando el movimiento superó el umbral y se confirmó
     *  como arrastre real (y por lo tanto ya se capturó el puntero) —
     *  antes de eso, `pointermove` solo mide distancia, nunca toca
     *  `scrollLeft` ni el estado visual de "arrastrando". */
    dragging: boolean
  } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return
    const track = trackRef.current
    if (!track) return
    // Sin `setPointerCapture` acá: se confirma recién en `onPointerMove`
    // si el gesto resulta ser un arrastre real (ver comentario arriba).
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: track.scrollLeft,
      dragging: false,
    }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    const drag = dragStateRef.current
    if (!track || !drag || drag.pointerId !== event.pointerId) return

    const deltaX = event.clientX - drag.startX

    if (!drag.dragging) {
      if (Math.abs(deltaX) < DRAG_THRESHOLD_PX) return
      // Recién ahora se confirma como arrastre real: se captura el
      // puntero y se activa el estado visual — todo lo que pasó antes
      // (el click limpio, si de eso se trataba) queda sin tocar.
      drag.dragging = true
      track.setPointerCapture(event.pointerId)
      setIsDragging(true)
    }

    track.scrollLeft = drag.startScrollLeft - deltaX
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    const drag = dragStateRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (drag.dragging) {
      track?.releasePointerCapture(event.pointerId)
      setIsDragging(false)
    }
    dragStateRef.current = null
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const track = trackRef.current
    if (!track) return
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    track.scrollBy({
      left: track.clientWidth * KEYBOARD_SCROLL_FRACTION * direction,
      behavior: 'smooth',
    })
  }

  return (
    <div
      ref={trackRef}
      role={ariaLabel ? 'region' : undefined}
      aria-roledescription={ariaLabel ? 'carrusel' : undefined}
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
      onKeyDown={onKeyDown}
      className={cn(
        'flex snap-x gap-3 overflow-x-auto overscroll-x-contain touch-pan-x pb-2',
        'scroll-padding-inline-6', // espacio para primera/última card (1.5rem = 24px)
        isDragging ? 'snap-none cursor-grabbing select-none' : 'snap-mandatory cursor-grab',
        className
      )}
    >
      {children}
    </div>
  )
})
