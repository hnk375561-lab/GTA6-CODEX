'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

/**
 * Capítulo 6.1 + 6.2 — Transiciones entre páginas (ver
 * biblia-scroll-rockstar.txt). Maneja su propio estado de React (`phase`,
 * `frozenFrame`) de punta a punta; no depende de `webglSceneBus` para nada
 * de esto — el bus quedó reservado a foco de sección/scroll/hover, que sí
 * consume el motor de fondo.
 *
 * 6.1 — conectar el canal a la navegación real
 * Next.js App Router no expone un evento "la navegación está por
 * empezar" (a diferencia del Pages Router viejo con `routeChangeStart`).
 * La única forma de tener un momento "antes" real es interceptar el click
 * en los links internos nosotros mismos, antes de que el router navegue —
 * eso es lo que hace `handleClick` acá. `usePathname()` es la señal de
 * "la navegación ya terminó, el nuevo `children` ya está montado".
 *
 * 6.2 — fundido con frame congelado del fondo WebGL
 * Al click: se toma una foto (`canvas.toDataURL`) del `<canvas>` que
 * `WebGLBackground` marca con `data-webgl-canvas` (ver ese archivo — el
 * fondo NO se pausa ni se reinstancia, 6.3 ya lo garantiza; esto solo le
 * saca una foto de un frame en movimiento) y se usa como fondo del overlay
 * mientras se funde a opaco. Solo entonces se navega. Cuando el nuevo
 * `children` aparece (`pathname` cambia), se funde de vuelta a transparente.
 * Si `toDataURL` falla (canvas vacío, tainted, o simplemente no existe
 * todavía) se degrada a un fundido liso sobre `bg-auto-dark` — nunca rompe
 * la navegación por esto, ver el `try/catch`.
 *
 * Fuera de alcance a propósito: clicks en links externos, `target="_blank"`,
 * clicks modificados (cmd/ctrl/shift/alt — el usuario está pidiendo abrir en
 * pestaña nueva, no una transición en la misma), descargas, anchors dentro
 * de la misma página (`#hash`), y navegación por atrás/adelante del
 * navegador (no hay "antes" que interceptar ahí — igual reciben el fundido
 * de ENTRADA solo, vía el efecto de `pathname`, como cortesía).
 */
const EXIT_DURATION_MS = 220
const ENTER_DURATION_MS = 220

type TransitionPhase = 'idle' | 'exiting' | 'entering'

function isInternalNavigationClick(event: MouseEvent): HTMLAnchorElement | null {
  if (event.defaultPrevented) return null
  if (event.button !== 0) return null // solo click primario
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null

  const anchor = (event.target as HTMLElement | null)?.closest('a[href]')
  if (!anchor || !(anchor instanceof HTMLAnchorElement)) return null
  if (anchor.target && anchor.target !== '_self') return null
  if (anchor.hasAttribute('download')) return null
  if (anchor.dataset.noTransition !== undefined) return null

  const url = new URL(anchor.href, window.location.href)
  if (url.origin !== window.location.origin) return null
  // Anchors de la misma página (`/ruta#seccion` en la ruta actual) navegan
  // vía scroll nativo/Lenis, no por cambio de página — no corresponde
  // fundido acá, `smoothScrollTo` (scroll-telemetry.tsx) ya los cubre.
  if (url.pathname === window.location.pathname && url.hash) return null
  if (url.pathname === window.location.pathname && url.search === window.location.search) return null

  return anchor
}

/** Foto del canvas WebGL actual, o `null` si no se pudo tomar (degrada a fundido liso). */
function captureFrozenFrame(): string | null {
  try {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-webgl-canvas="true"]')
    if (!canvas || canvas.width === 0 || canvas.height === 0) return null
    return canvas.toDataURL('image/jpeg', 0.72)
  } catch {
    // Canvas "tainted" (CORS) u otro fallo de captura — no es crítico,
    // el overlay liso sigue cumpliendo el objetivo de tapar el salto seco.
    return null
  }
}

export function PageTransitionBridge() {
  const pathname = usePathname()
  const router = useRouter()

  const [phase, setPhase] = useState<TransitionPhase>('idle')
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null)

  const reducedMotionRef = useRef(false)
  const previousPathnameRef = useRef(pathname)
  const enterTimeoutRef = useRef<number | undefined>(undefined)
  // Refleja `phase !== 'idle'` pero como ref: el handler de click vive en un
  // `useEffect` con deps `[router]` (no se re-crea en cada cambio de fase),
  // así que necesita una forma de leer el estado más reciente sin quedarse
  // con un closure viejo. Evita que un doble click dispare dos navegaciones
  // encoladas mientras la primera transición todavía está en curso.
  const transitionInProgressRef = useRef(false)

  // Detecta reduced-motion una vez (no necesita reaccionar a cambios en
  // caliente como `LenisProvider`: si cambia a mitad de una transición ya
  // en curso, dejarla terminar es más predecible que cortarla a mitad).
  useEffect(() => {
    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // Intercepta clicks en links internos. Delegado en `document` (capture)
  // para funcionar sin que cada `<Link>` del sitio tenga que instrumentarse.
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (reducedMotionRef.current) return // sin fundido: navegación normal de Next
      if (transitionInProgressRef.current) return // ya hay una transición en curso

      const anchor = isInternalNavigationClick(event)
      if (!anchor) return

      const url = new URL(anchor.href, window.location.href)
      const targetHref = `${url.pathname}${url.search}${url.hash}`

      event.preventDefault()
      transitionInProgressRef.current = true
      setFrozenFrame(captureFrozenFrame())
      setPhase('exiting')

      window.setTimeout(() => {
        router.push(targetHref)
      }, EXIT_DURATION_MS)
    }

    document.addEventListener('click', handleClick, { capture: true })
    return () => document.removeEventListener('click', handleClick, { capture: true })
  }, [router])

  // `pathname` cambia recién cuando Next.js ya montó el `children` nuevo —
  // es la señal de "llegamos". Cubre tanto la navegación que nosotros
  // disparamos (fase 'exiting' → 'entering') como atrás/adelante del
  // navegador, que no pasó por `handleClick` (entra directo a 'entering'
  // con un fundido corto de cortesía, sin frame congelado porque no hubo
  // "antes" que capturar).
  useEffect(() => {
    if (previousPathnameRef.current === pathname) return
    previousPathnameRef.current = pathname

    if (reducedMotionRef.current) {
      setPhase('idle')
      setFrozenFrame(null)
      transitionInProgressRef.current = false
      return
    }

    setPhase('entering')
    window.clearTimeout(enterTimeoutRef.current)
    enterTimeoutRef.current = window.setTimeout(() => {
      setPhase('idle')
      setFrozenFrame(null)
      transitionInProgressRef.current = false
    }, ENTER_DURATION_MS)

    return () => window.clearTimeout(enterTimeoutRef.current)
  }, [pathname])

  return (
    <div
      aria-hidden="true"
      data-nav-transition-phase={phase}
      className="page-transition-overlay"
      style={frozenFrame ? { backgroundImage: `url(${frozenFrame})` } : undefined}
    />
  )
}
