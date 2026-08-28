'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface WordRotateProps {
  words: string[]
  duration?: number
  className?: string
}

/**
 * Rota una lista de palabras con un crossfade + slide sutil.
 * Reimplementado 100% en CSS (sin `motion/react`): el efecto original
 * dependía de una librería de ~150KB para una transición que CSS resuelve
 * con un par de keyframes. Respeta prefers-reduced-motion vía la regla
 * global de .reveal-like en globals.css (ver .word-rotate-item).
 *
 * Accesibilidad (corrección real): la palabra visible es texto real en el
 * DOM, no `aria-hidden` — un lector de pantalla que pase por acá en medio
 * de la rotación solo capta la palabra que esté montada en ese instante
 * (ej. "personaje"), y nunca se entera de que en realidad son 4 conceptos
 * distintos ("Cada personaje, vehículo, ubicación y misión..."), perdiendo
 * la mitad del sentido de la frase que sí ve cualquier persona vidente
 * mirando la animación completa. La palabra visible ahora se marca
 * `aria-hidden` (es puramente decorativa/visual) y se agrega un span
 * `sr-only` con la lista completa unida en una frase natural — mismo
 * patrón de separar "lo que se ve" de "lo que se anuncia" que usan
 * otros elementos puramente decorativos del sitio (aria-hidden + texto
 * sr-only aparte).
 */
export function WordRotate({ words, duration = 2500, className }: WordRotateProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (words.length <= 1) return
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length)
    }, duration)
    return () => clearInterval(interval)
  }, [words, duration])

  return (
    <span className="word-rotate" aria-live="off">
      <span key={words[index]} className={cn('word-rotate-item', className)} aria-hidden="true">
        {words[index]}
      </span>
      {/* Reserva el ancho de la palabra más larga para evitar layout shift.
          Usa la misma clase que la palabra visible para que la tipografía
          (y por lo tanto el ancho medido) coincida exactamente. */}
      <span className={cn('word-rotate-ghost', className)} aria-hidden="true">
        {words.reduce((a, b) => (a.length > b.length ? a : b), '')}
      </span>
      {/* Única palabra real para lectores de pantalla: la lista completa,
          leída una sola vez, en vez de una palabra al azar según en qué
          punto de la rotación haya llegado el lector a este punto del DOM. */}
      <span className="sr-only">{words.join(', ')}</span>
    </span>
  )
}
