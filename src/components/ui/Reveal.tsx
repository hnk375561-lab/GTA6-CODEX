'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'

interface RevealProps {
  children: ReactNode
  className?: string
  /** Retraso en ms aplicado cuando el elemento entra en pantalla */
  delay?: number
  /** Dirección de entrada. 'curtain' = cortina en clip-path (ver globals.css),
   *  para secciones donde se quiere un reveal más cinematográfico que el
   *  fade+slide de las demás direcciones. 'chapter' = apertura de capítulo
   *  (máscara + ascenso con curva cine) para cabeceras de sección/página;
   *  'glide' = entrada horizontal direccional; 'swell' = crecimiento sutil
   *  para secciones dominadas por media. */
  direction?: 'up' | 'left' | 'right' | 'zoom' | 'curtain' | 'chapter' | 'glide' | 'swell'
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

    // Red de seguridad: si por cualquier motivo (error de hidratación en
    // otro componente de la misma página, IntersectionObserver que nunca
    // dispara, etc.) `.reveal-visible` no llega a aplicarse, el contenido
    // quedaría en opacity:0 PERO seguiría siendo clickeable (el `<Link>`
    // ya está en el DOM desde el SSR) — invisible pero interactivo, el
    // peor de los dos mundos. Este timeout fuerza visible=true igual
    // pasado 1.5s, priorizando "se ve aunque sin animación" por sobre
    // "invisible para siempre".
    const fallback = setTimeout(() => setVisible(true), 1500)

    return () => {
      observer.disconnect()
      clearTimeout(fallback)
    }
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
