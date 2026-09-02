'use client'

import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FeaturedCarouselProps {
  children: ReactNode
  className?: string
}

/**
 * Carrusel horizontal con scroll-snap + drag para el panel "Destacados"
 * de la home (3.2). Reemplaza el patrón anterior — un grid con
 * `max-h-[46vh] overflow-y-auto` metido dentro de un panel del track
 * pineado, que ya scrollea en su propio eje — por un único eje de scroll
 * horizontal. Ese doble-scroll anidado (vertical del panel + vertical
 * interno del grid) está marcado como riesgoso en §16 de la auditoría:
 * en touch, el gesto vertical queda ambiguo entre "scrollear la página" y
 * "scrollear la grilla interna", y en Safari/iOS ese tipo de contenedor
 * anidado con su propio scroll suele comerse el scroll del padre o
 * quedar trabado a mitad de gesto (D.24). Un solo eje (horizontal acá,
 * vertical en el resto de la página) elimina la ambigüedad.
 *
 * `overflow-x-auto` + `snap-x snap-mandatory` ya cubren touch, trackpad y
 * rueda con Shift de forma nativa — lo que no cubren es click-and-drag
 * con mouse (el patrón "carrusel que se arrastra" que pide 3.2), así que
 * se agrega acá con Pointer Events. Solo se engancha para `pointerType
 * === 'mouse'`: capturar el puntero en touch/pen rompería el gesto
 * táctil nativo del sistema operativo (que ya funciona bien solo).
 *
 * Mientras se arrastra, se desactiva el scroll-snap (`snap-none`) para
 * que la asignación manual de `scrollLeft` no compita cuadro a cuadro
 * contra el snap del navegador; al soltar, se reactiva y el navegador
 * hace el ajuste final al ítem más cercano por sí solo.
 *
 * Server Component (`page.tsx`) no puede llevar handlers de puntero
 * directamente en su JSX — de ahí que el track viva en este componente
 * cliente aparte, mismo patrón que el resto de `components/home/*`
 * (`RankingsSpotlight`, `CompareShowcase`, etc.).
 *
 * Verificación Prioridad D (doble-scroll anidado en Safari/mobile, antes
 * de asumir que este carrusel lo resuelve del todo): el panel pineado que
 * envuelve cada `Stage` (`PinnedScrollStages`) es `overflow-y-auto` como
 * fallback genérico para contenido que no entra en 100dvh (ver comentario
 * de esa clase ahí). Este track vive anidado adentro con su propio eje
 * horizontal — dos ejes distintos, no el mismo eje duplicado como el bug
 * original de §16, así que el gesto vertical/horizontal no queda
 * ambiguo en el caso general (WebKit resuelve el eje dominante del touch
 * contra el contenedor que sí scrollea en esa dirección). El caso límite
 * que sí sobrevive: al llegar al final del recorrido horizontal (`snap`
 * en el primer/último ítem), un swipe horizontal que sigue de largo puede
 * encadenar ("scroll chaining") hacia el panel vertical padre en iOS
 * Safari, y un swipe que arranca muy cerca del borde izquierdo de la
 * pantalla puede confundirse con el gesto nativo de "volver atrás" del
 * navegador. `overscroll-x-contain` corta el chaining hacia el padre en
 * los bordes del carrusel; `touch-pan-x` declara explícitamente al
 * navegador que este contenedor solo maneja paneo horizontal, en vez de
 * dejarlo inferir el eje del primer frame del gesto.
 */
export function FeaturedCarousel({ children, className }: FeaturedCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return
    const track = trackRef.current
    if (!track) return
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: track.scrollLeft,
    }
    track.setPointerCapture(event.pointerId)
    setIsDragging(true)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    const drag = dragStateRef.current
    if (!track || !drag || drag.pointerId !== event.pointerId) return
    track.scrollLeft = drag.startScrollLeft - (event.clientX - drag.startX)
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    const drag = dragStateRef.current
    if (!track || !drag || drag.pointerId !== event.pointerId) return
    track.releasePointerCapture(event.pointerId)
    dragStateRef.current = null
    setIsDragging(false)
  }

  return (
    <div
      ref={trackRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
      className={cn(
        'flex snap-x gap-3 overflow-x-auto overscroll-x-contain touch-pan-x pb-2',
        isDragging ? 'snap-none cursor-grabbing select-none' : 'snap-mandatory cursor-grab',
        className
      )}
    >
      {children}
    </div>
  )
}
