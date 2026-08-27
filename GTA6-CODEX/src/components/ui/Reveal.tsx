'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'

interface RevealProps {
  children: ReactNode
  className?: string
  /** Retraso en ms aplicado cuando el elemento entra en pantalla */
  delay?: number
  /** Dirección de entrada. 'curtain' = cortina en clip-path (ver globals.css),
   *  para secciones donde se quiere un reveal más cinematográfico que el
   *  fade+slide de las demás direcciones. */
  direction?: 'up' | 'left' | 'right' | 'zoom' | 'curtain'
  /** Si es true, la animación se repite cada vez que reingresa al viewport */
  once?: boolean
}

/**
 * Envuelve a sus hijos y les agrega una animación de aparición (fade + slide)
 * disparada por IntersectionObserver, usando las utilidades .reveal /
 * .reveal-visible definidas en globals.css. Cero dependencias externas.
 */
export function Reveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          if (once) observer.unobserve(node)
        } else if (!once) {
          setVisible(false)
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [once])

  return (
    <div
      ref={ref}
      data-dir={direction}
      className={`reveal ${visible ? 'reveal-visible' : ''} ${className}`.trim()}
      style={{ ['--reveal-delay' as string]: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
