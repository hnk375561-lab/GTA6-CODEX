'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

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
 * oficial de Rockstar. dock-sunset y hotel-neon son key art oficial del
 * Vintage Vice City Pack; boxart-sunset es el key art oficial de portada
 * de GTA VI (Jason y Lucia); port-gellhorn-postcard es el material
 * promocional oficial "Visit Leonida" del pueblo de Port Gellhorn. Las
 * cuatro comparten el mismo criterio: composiciones panorámicas tipo
 * "postal", sin recorte, que funcionan como fondo de página completa —
 * se descartó todo primer plano de personaje o detalle de vehículo/arma.
 *
 * Parallax: el fondo se desplaza a una fracción de la velocidad del
 * scroll (capa "lejana") y responde levemente al cursor (paralaje sutil,
 * como una cámara con profundidad de campo, no un efecto 3D). Ambos se
 * desactivan por completo con prefers-reduced-motion.
 */

/**
 * Fallback hardcodeado, usado solo si el caller no pasa `backgrounds`.
 * El caller real (`src/app/page.tsx`) las obtiene del Media Registry
 * (`getKeyArtAssets()` en src/lib/media.ts) para que este componente no
 * tenga que saber nada sobre `MediaAsset`/fuentes — sigue recibiendo un
 * array plano de rutas, como siempre.
 */
const DEFAULT_HERO_BACKGROUNDS = [
  '/images/heroes/hero-vice-sunset.webp',
  '/images/heroes/hero-gta6-boxart-sunset.webp',
  '/images/heroes/hero-vi-logo.webp',
  '/images/heroes/hero-vintage-dock-sunset.webp',
  '/images/heroes/hero-port-gellhorn-postcard.webp',
  '/images/heroes/hero-vintage-hotel-neon.webp',
] as const

const ROTATE_INTERVAL_MS = 7000
const CROSSFADE_MS = 1500
const SCROLL_PARALLAX_STRENGTH = 0.18
const POINTER_PARALLAX_MAX_PX = 10

interface RotatingHeroBackgroundProps {
  /** Rutas públicas de fondo, en orden de rotación. Default: DEFAULT_HERO_BACKGROUNDS. */
  backgrounds?: readonly string[]
}

export function RotatingHeroBackground({ backgrounds = DEFAULT_HERO_BACKGROUNDS }: RotatingHeroBackgroundProps) {
  const HERO_BACKGROUNDS = backgrounds.length > 0 ? backgrounds : DEFAULT_HERO_BACKGROUNDS
  const [index, setIndex] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const layerRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollOffset = useRef(0)
  const pointerOffset = useRef({ x: 0, y: 0 })

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

  // Parallax de scroll (capa lejana) + parallax de cursor (profundidad sutil).
  // Un solo rAF combina ambas fuentes para no pisarse el transform entre sí.
  useEffect(() => {
    if (reducedMotion) return

    let raf = 0
    const applyTransform = () => {
      const layer = layerRef.current
      if (layer) {
        const ty = scrollOffset.current + pointerOffset.current.y
        const tx = pointerOffset.current.x
        layer.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(1.08)`
      }
      raf = 0
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(applyTransform)
    }

    const onScroll = () => {
      const root = rootRef.current
      if (!root) return
      const rect = root.getBoundingClientRect()
      // Progreso 0 (sección arriba del todo) → 1 (sección salió por arriba)
      const progress = Math.min(Math.max(-rect.top / Math.max(rect.height, 1), 0), 1)
      scrollOffset.current = progress * rect.height * SCROLL_PARALLAX_STRENGTH
      schedule()
    }

    const onPointerMove = (e: PointerEvent) => {
      const root = rootRef.current
      if (!root) return
      const rect = root.getBoundingClientRect()
      const nx = (e.clientX - rect.left) / rect.width - 0.5 // -0.5..0.5
      const ny = (e.clientY - rect.top) / rect.height - 0.5
      pointerOffset.current = {
        x: nx * POINTER_PARALLAX_MAX_PX,
        y: ny * POINTER_PARALLAX_MAX_PX,
      }
      schedule()
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onPointerMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [reducedMotion])

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        ref={layerRef}
        className="absolute inset-0"
        style={reducedMotion ? undefined : { willChange: 'transform' }}
      >
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
              opacity: i === index ? 0.5 : 0,
              transition: `opacity ${CROSSFADE_MS}ms ease-in-out`,
            }}
          />
        ))}
      </div>
      {/* Overlay: mantiene el contraste del contenido y el tono gta-dark del resto del sitio */}
      <div className="absolute inset-0 bg-gradient-to-b from-gta-dark/75 via-gta-dark/55 to-gta-dark" />
    </div>
  )
}
