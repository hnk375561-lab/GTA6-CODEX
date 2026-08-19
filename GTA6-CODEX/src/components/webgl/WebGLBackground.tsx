'use client'

import { useEffect, useRef } from 'react'

/**
 * Capa WebGL de fondo, fija a toda la ventana, detrás del contenido
 * (ver layout.tsx: z-0 aquí, z-10 en el wrapper de contenido).
 * El motor (Three.js) se carga de forma perezosa y solo en cliente.
 */
export function WebGLBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

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
