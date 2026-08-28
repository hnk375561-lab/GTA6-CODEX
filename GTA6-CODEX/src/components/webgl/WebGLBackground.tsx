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
 * Capítulo 8.4 — primera visita vs. visita recurrente.
 * `sessionStorage` (no `localStorage`: el show de apertura completo vuelve
 * a tener sentido en una sesión de navegador nueva, no solo "la primera
 * vez en la vida del visitante") marca si ya se vio la coreografía de
 * apertura. Se lee y se marca en el mismo tick para que una recarga
 * inmediata de la misma pestaña ya cuente como "recurrente".
 */
function hasSeenIntroThisSession(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const seen = window.sessionStorage.getItem('af-intro-seen') === '1'
    window.sessionStorage.setItem('af-intro-seen', '1')
    return seen
  } catch {
    // Modo privado o storage bloqueado: degradar a "primera visita" siempre
    // (el show completo) en vez de romper el render del fondo.
    return false
  }
}

/**
 * Capa WebGL de fondo, fija a toda la ventana, detrás del contenido
 * (ver layout.tsx: z-0 aquí, z-10 en el wrapper de contenido).
 * El motor (Three.js) se carga de forma perezosa y solo en cliente.
 *
 * Con Save-Data activo (o una conexión declarada 2g/slow-2g) ni siquiera
 * se descarga el chunk del motor — desde el rediseño "horizonte vivo" el
 * motor es Canvas 2D puro, sin three.js/WebGL (se sacó la dependencia por
 * completo: ver `engine.ts`), así que el chunk ya es liviano de por sí,
 * pero igual no tiene sentido bajarlo si el usuario pidió menos datos. El
 * `<canvas>` queda transparente y se ve el fondo estático (`bg-auto-dark`
 * en layout.tsx).
 *
 * Capítulo 6.3 — persistencia entre páginas (auditado, no requirió cambio)
 * Este componente se monta en `app/layout.tsx`, el ÚNICO `layout.tsx` del
 * proyecto (no hay layouts anidados ni `template.tsx` en `src/app`), fuera
 * de `{children}`. En App Router de Next.js eso significa que React lo
 * mantiene montado a través de navegaciones entre rutas — `{children}` es
 * lo único que se reemplaza, este `<canvas>` y la instancia de
 * `AutoFichaWebGLEngine` que contiene NUNCA se desmontan ni reinstancian
 * al navegar. El ciclo día/noche y el mood de la escena ya persisten solos;
 * no había nada que arreglar acá. `data-webgl-canvas` (ver abajo) es la
 * única adición: un identificador para que `PageTransitionBridge` (6.1/6.2)
 * pueda ubicar este canvas y tomarle una foto congelada al navegar, sin
 * acoplarse a la instancia del motor.
 */
export function WebGLBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    if (prefersReducedData()) return

    let engine: import('@/lib/webgl/engine').AutoFichaWebGLEngine | null = null
    let cancelled = false

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')

    import('@/lib/webgl/engine')
      .then(({ AutoFichaWebGLEngine }) => {
        if (cancelled || !canvasRef.current) return
        engine = new AutoFichaWebGLEngine(canvasRef.current, {
          reducedMotion: mql.matches,
          returningVisitor: hasSeenIntroThisSession(),
        })
        engine.start()
      })
      .catch((error) => {
        // Sin este catch, cualquier excepción acá (falla al importar el
        // chunk del motor, o una excepción síncrona en el constructor —
        // p.ej. `assertFullyInitialized()` más abajo en engine.ts) quedaba
        // completamente silenciosa: la promesa rechazada no tenía handler,
        // el canvas se quedaba transparente para siempre y no había ni un
        // log en consola para diagnosticarlo. Degradación elegante: se
        // loguea el error y se deja el fondo estático (`bg-auto-dark` en
        // layout.tsx, visible detrás de este canvas transparente) en vez
        // de un fallo mudo.
        if (cancelled) return
        console.error('[WebGLBackground] No se pudo inicializar el motor, se degrada a fondo estático:', error)
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
      data-webgl-canvas="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-80"
      aria-hidden="true"
    />
  )
}
