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
      <span key={words[index]} className={cn('word-rotate-item', className)}>
        {words[index]}
      </span>
      {/* Reserva el ancho de la palabra más larga para evitar layout shift.
          Usa la misma clase que la palabra visible para que la tipografía
          (y por lo tanto el ancho medido) coincida exactamente. */}
      <span className={cn('word-rotate-ghost', className)} aria-hidden="true">
        {words.reduce((a, b) => (a.length > b.length ? a : b), '')}
      </span>
    </span>
  )
}
