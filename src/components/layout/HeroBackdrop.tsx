'use client'

import { FlickeringGrid } from '@/components/ui/FlickeringGrid'
import { useParallax } from '@/lib/hooks/useParallax'

/**
 * Fondo decorativo del hero (Capas 0–3): grid, scanline y bloom ambiental.
 * Aislado en su propio client component para poder usar useParallax()
 * sin convertir toda la home en cliente. Contenido (Capa 4+) sigue
 * viviendo en page.tsx como Server Component.
 */
export function HeroBackdrop() {
  const parallaxRef = useParallax<HTMLDivElement>(8)

  return (
    <div ref={parallaxRef} aria-hidden="true">
      {/* Capa 3: bloom ambiental estático, da profundidad detrás del título */}
      <div className="hero-ambient-glow" />

      {/* Capa 2: única fuente de textura de grilla del hero (ver nota en
          globals.css sobre por qué se retiró la grilla duplicada de
          hero-scanline). Oculta en mobile: sin layout box, el
          IntersectionObserver de FlickeringGrid nunca reporta "en vista"
          y el loop de canvas jamás arranca — cero costo, no solo cero opacidad. */}
      <FlickeringGrid
        squareSize={4}
        gridGap={6}
        flickerChance={0.2}
        color="rgb(0, 208, 0)"
        maxOpacity={0.15}
        className="hidden sm:block absolute inset-0 opacity-20 lg:opacity-30"
      />

      {/* Capa 1/accento: barrido de luz (scanline), sin la grilla estática */}
      <div className="hero-scanline" />
    </div>
  )
}
