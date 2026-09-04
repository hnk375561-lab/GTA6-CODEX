'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * "CONSTELACIÓN DE ACCESOS DIRECTOS" — rediseño del hero (sept. 2026).
 *
 * Reemplaza los 2 links de texto chico que vivían debajo del buscador por
 * un cluster de chips/burbujas clickeables de distinto tamaño, con el
 * mismo peso visual entre sí (decisión explícita del usuario: "todo al
 * mismo nivel, aunque compitan con el buscador").
 *
 * Dos capas de movimiento, ambas baratas (sin canvas/WebGL nuevo):
 *
 * 1. Entrada en cascada tipo "burbuja que aparece" — un solo
 *    `IntersectionObserver` en el contenedor dispara `.is-visible`, cada
 *    chip anima con su propio `--chip-delay` (ver `.hero-chip` en
 *    globals.css). Independiente del stagger scroll-driven del resto del
 *    hero (`StageProgress`/`Reveal`) — este cluster ya vive dentro de un
 *    `Reveal` de bloque, esto es la sub-cascada *dentro* de ese bloque.
 * 2. Hover empuja a los vecinos — `hoveredIndex` en estado, cada chip
 *    calcula su propio desplazamiento en función de la distancia al chip
 *    hovereado (los inmediatos se corren unos px, el resto queda quieto).
 *    Efecto "burbuja que empuja", pedido explícito del usuario.
 *
 * Círculos concéntricos decorativos detrás del cluster (aria-hidden,
 * `pointer-events-none`) dan la sensación de "constelación" — no son
 * clickeables, solo ambientan.
 */

export interface HeroQuickLinkItem {
  href: string
  label: string
  icon: ReactNode
  size: 'lg' | 'md' | 'sm'
}

interface HeroQuickLinksProps {
  items: HeroQuickLinkItem[]
  className?: string
}

export function HeroQuickLinks({ items, className }: HeroQuickLinksProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(node)
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -60px 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className={cn('relative mx-auto w-full max-w-3xl', className)}>
      {/* Círculos decorativos — puramente ambientales, sin interacción */}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="hero-quicklinks-rings pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-0 transition-opacity duration-700"
        style={{ opacity: visible ? undefined : 0 }}
      >
        <circle cx="50" cy="50" r="46" className="hero-quicklinks-ring hero-quicklinks-ring--a" />
        <circle cx="50" cy="50" r="34" className="hero-quicklinks-ring hero-quicklinks-ring--b" />
      </svg>

      <ul className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
        {items.map((item, index) => {
          const isHovered = hoveredIndex === index
          const isNeighbor = hoveredIndex !== null && Math.abs(hoveredIndex - index) === 1
          const pushDirection = hoveredIndex !== null && isNeighbor ? (index > hoveredIndex ? 1 : -1) : 0

          return (
            <li key={item.href} className="list-none">
              <Link
                href={item.href}
                className={cn(
                  'hero-chip tap-scale cta-shine group/chip',
                  `hero-chip--${item.size}`,
                  visible && 'is-visible'
                )}
                style={
                  {
                    '--chip-delay': `${index * 55}ms`,
                    transform: isHovered
                      ? 'scale(1.08) translateY(-2px)'
                      : pushDirection !== 0
                        ? `translateX(${pushDirection * 5}px) scale(0.97)`
                        : undefined,
                  } as React.CSSProperties
                }
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(index)}
                onBlur={() => setHoveredIndex(null)}
              >
                <span aria-hidden="true" className="hero-chip__icon">
                  {item.icon}
                </span>
                <span className="hero-chip__label">{item.label}</span>
                <span
                  aria-hidden="true"
                  className="hero-chip__arrow transition-transform duration-200 group-hover/chip:translate-x-0.5"
                >
                  →
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
