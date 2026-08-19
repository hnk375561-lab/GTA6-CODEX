'use client'

import { useEffect, useRef, useState } from 'react'
import { HeroSceneSVG } from './HeroSceneSVG'

/**
 * Fondos rotativos del hero de la home.
 *
 * IMPORTANTE — historial: esta capa usaba key art oficial de Rockstar
 * Games / Take-Two (boxart de portada de GTA VI, material del Vintage
 * Vice City Pack, promocional "Visit Leonida", logo oficial "GTA VI").
 * Se reemplazó por completo por `HeroSceneSVG`, una escena vectorial
 * 100% original (mismo espíritu "sunset synthwave", sin ningún asset de
 * terceros) para reducir la exposición de propiedad intelectual del
 * sitio, especialmente de cara a monetización (ads/afiliados). Ver PR
 * de referencia para el detalle de la decisión.
 *
 * Parallax: el fondo se desplaza a una fracción de la velocidad del
 * scroll (capa "lejana") y responde levemente al cursor (paralaje sutil,
 * como una cámara con profundidad de campo, no un efecto 3D). Ambos se
 * desactivan por completo con prefers-reduced-motion.
 */

/**
 * Variantes de paleta de la escena SVG, en orden de rotación. Reemplaza
 * al array de rutas de imagen que tenía este componente antes; se
 * mantiene el mismo prop `backgrounds` por compatibilidad con el caller
 * (`src/app/page.tsx`), pero ahora sus valores son ids de variante en
 * vez de rutas de archivo.
 */
const DEFAULT_HERO_BACKGROUNDS = ['magenta', 'cyan'] as const

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
  // Cuántas imágenes del array están montadas en el DOM. Arranca en 1
  // (solo la primera, con `priority`) y se completa de a una — ver el
  // efecto de abajo — en vez de montar las 5-6 de entrada: antes, al
  // estar todas `fill` en la misma posición visible, el navegador las
  // pedía prácticamente a la vez en la carga inicial, compitiendo por
  // ancho de banda con la imagen LCP incluso siendo fondos de varios MB.
  const [mountedCount, setMountedCount] = useState(1)
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
  }, [reducedMotion, HERO_BACKGROUNDS.length])

  // Precarga escalonada: monta (y por lo tanto descarga) una imagen más
  // cada 2s, muy por debajo del intervalo de rotación (7s), así que cada
  // fondo ya está disponible con tiempo de sobra antes de que le toque
  // entrar en el crossfade. Con reduced motion el índice nunca avanza,
  // así que no tiene sentido seguir precargando fondos que no se van a
  // mostrar nunca.
  useEffect(() => {
    if (reducedMotion) return
    if (mountedCount >= HERO_BACKGROUNDS.length) return
    const id = setTimeout(() => {
      setMountedCount((c) => Math.min(c + 1, HERO_BACKGROUNDS.length))
    }, 2000)
    return () => clearTimeout(id)
  }, [reducedMotion, mountedCount, HERO_BACKGROUNDS.length])

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
        {HERO_BACKGROUNDS.slice(0, mountedCount).map((variant, i) => (
          <HeroSceneSVG
            key={variant}
            variant={variant as 'magenta' | 'cyan'}
            className="absolute inset-0 h-full w-full object-cover"
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
