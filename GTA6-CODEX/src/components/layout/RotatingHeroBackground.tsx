'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

/**
 * Fondos rotativos del hero de la home, en resolución nativa 4K/8K (WebP
 * calidad 92, sin redimensionar — decisión deliberada del usuario, distinta
 * de la política de resize a 1600px que usa scripts/process-images.mjs para
 * imágenes de fichas de entidad). next/image + el optimizador de Next en
 * Vercel generan variantes responsive on-demand (deviceSizes hasta 3840px en
 * next.config.js), así que el navegador nunca descarga el archivo crudo
 * completo salvo en pantallas que realmente lo necesiten.
 *
 * Todas las imágenes fueron revisadas por procedencia: se excluyó una
 * (fan art con firma de autor visible) por no ser material propio ni
 * oficial de Rockstar. Las dos últimas incorporadas (dock-sunset y
 * hotel-neon) son key art oficial del Vintage Vice City Pack, elegidas por
 * ser composiciones panorámicas tipo "postal" — se descartó el resto del
 * pack (primeros planos de personajes, detalles de vehículo/armas) por no
 * funcionar como fondo de página completa.
 */

const HERO_BACKGROUNDS = [
  '/images/heroes/hero-vice-sunset.webp',
  '/images/heroes/hero-vi-logo.webp',
  '/images/heroes/hero-vintage-dock-sunset.webp',
  '/images/heroes/hero-vintage-hotel-neon.webp',
] as const

const ROTATE_INTERVAL_MS = 7000
const CROSSFADE_MS = 1500

export function RotatingHeroBackground() {
  const [index, setIndex] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mql.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (reducedMotion || HERO_BACKGROUNDS.length < 2) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % HERO_BACKGROUNDS.length)
    }, ROTATE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [reducedMotion])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {HERO_BACKGROUNDS.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          priority={i === 0}
          sizes="100vw"
          quality={90}
          className="object-cover"
          style={{
            opacity: i === index ? 0.32 : 0,
            transition: `opacity ${CROSSFADE_MS}ms ease-in-out`,
          }}
        />
      ))}
      {/* Overlay: mantiene el contraste del contenido y el tono gta-dark del resto del sitio */}
      <div className="absolute inset-0 bg-gradient-to-b from-gta-dark/75 via-gta-dark/55 to-gta-dark" />
    </div>
  )
}
