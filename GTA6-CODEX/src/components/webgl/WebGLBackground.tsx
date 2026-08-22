'use client'

import { useEffect, useRef } from 'react'

/**
 * Detecta Save-Data / conexión lenta (2g, slow-2g vía Network Information
 * API). Mismo criterio y mismo guard defensivo que ya usa
 * `RotatingHeroBackground` para su propio fondo — la API es experimental
 * y no existe en todos los navegadores (notablemente Safari/iOS), así que
 * sin soporte esto simplemente devuelve `false` (comportamiento de
 * siempre).
 */
function prefersReducedData(): boolean {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string }
  }
  const conn = nav.connection
  if (!conn) return false
  const slowEffectiveType = conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g'
  return Boolean(conn.saveData) || slowEffectiveType
}

/**
 * Capa WebGL de fondo, fija a toda la ventana, detrás del contenido
 * (ver layout.tsx: z-0 aquí, z-10 en el wrapper de contenido).
 * El motor (Three.js) se carga de forma perezosa y solo en cliente.
 *
 * Con Save-Data activo (o una conexión declarada 2g/slow-2g) ni siquiera
 * se descarga el chunk del motor: es, con diferencia, el recurso más
 * pesado de toda la home (three.js + ~2000 líneas de escena/shaders/
 * postprocessing) y su costo de GPU es continuo mientras el hero está en
 * pantalla, no un gasto puntual. El `<canvas>` queda transparente y se ve
 * el fondo estático (`bg-gta-dark` en layout.tsx) — la misma degradación
 * elegante que ya aplica `detectQualityProfile` para el tier 'low', solo
 * que acá directamente no hay descarga ni motor que degradar.
 */
export function WebGLBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    if (prefersReducedData()) return

    let engine: import('@/lib/webgl/engine').GTA6ZonaWebGLEngine | null = null
    let cancelled = false

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')

    import('@/lib/webgl/engine').then(({ GTA6ZonaWebGLEngine }) => {
      if (cancelled || !canvasRef.current) return
      engine = new GTA6ZonaWebGLEngine(canvasRef.current, {
        reducedMotion: mql.matches,
      })
      engine.start()
    })

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      engine?.setReducedMotion(e.matches)
    }
    mql.addEventListener('change', handleReducedMotionChange)

    return () => {
      cancelled = true
      mql.removeEventListener('change', handleReducedMotionChange)
      engine?.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      aria-hidden="true"
    />
  )
}
