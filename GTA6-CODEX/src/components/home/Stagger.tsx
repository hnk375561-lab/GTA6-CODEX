'use client'

import { Children, type ReactNode } from 'react'
import { useStageActive } from './PinnedScrollStages'

interface StaggerProps {
  className?: string
  /** ms entre la entrada de un hijo y el siguiente. */
  step?: number
  children: ReactNode
}

/**
 * Anima en cascada a sus hijos directos (título, subtítulo, fila de stats,
 * botones... cada uno un hijo separado) en vez de que el panel entero
 * entre como un solo bloque — es lo que le da sensación de "coreografía"
 * a cada stage de `PinnedScrollStages` en vez de un crossfade plano.
 *
 * No usa IntersectionObserver (que en el layout de paneles apilados de
 * `PinnedScrollStages` marcaría "visible" todo el tiempo, ver el comentario
 * de ese componente): el trigger es `useStageActive()`, un Context que
 * publica el panel ancestro más cercano — sincro automática con su
 * crossfade sin tener que pasar la prop a mano por cada nivel.
 */
export function Stagger({ className, step = 70, children }: StaggerProps) {
  const active = useStageActive()
  const items = Children.toArray(children)
  return (
    <div className={className}>
      {items.map((child, i) => (
        <div
          key={i}
          style={{
            transitionDelay: active ? `${i * step}ms` : '0ms',
            opacity: active ? 1 : 0,
            transform: active ? 'translateY(0px)' : 'translateY(28px)',
          }}
          className="transition-[opacity,transform] duration-500 ease-out"
        >
          {child}
        </div>
      ))}
    </div>
  )
}
