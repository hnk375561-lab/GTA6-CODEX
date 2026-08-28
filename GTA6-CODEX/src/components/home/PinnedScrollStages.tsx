'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export interface Stage {
  id: string
  label: string
  content: ReactNode
}

/**
 * Publica si el panel que envuelve a un `<Stagger>` está "activo" (cerca
 * del foco de scroll). No se puede pasar como función-prop (`content:
 * (active) => ReactNode`) porque este árbol nace en un Server Component
 * (`page.tsx`) y las funciones no cruzan ese límite hacia un Client
 * Component — solo elementos ya renderizados. Context sí cruza: el
 * `Provider` vive acá (Client Component) envolviendo el `ReactNode` ya
 * construido en el servidor, y `Stagger` (también Client Component) lo
 * lee con `useContext` en el momento en que React lo monta en el cliente.
 */
export const StageActiveContext = createContext(false)
export function useStageActive() {
  return useContext(StageActiveContext)
}

interface PinnedScrollStagesProps {
  stages: Stage[]
}

const MOBILE_BREAKPOINT_PX = 640
const SNAP_IDLE_MS = 160

/**
 * Reemplazo del homepage "scrolleable normal" por un viewport que se
 * mantiene fijo (100vh, `position: sticky`) mientras el usuario scrollea:
 * en vez de que la página suba/baje sección por sección, cada scroll hace
 * que un panel se disuelva en el siguiente dentro del mismo encuadre.
 *
 * Técnica: el wrapper exterior mide `stages.length * 100vh` — eso es lo
 * que le da "distancia de scroll" al usuario para recorrer — pero el
 * contenido real vive en un hijo `sticky top-0 h-screen`, así que
 * visualmente nunca se mueve verticalmente. Cada panel es
 * `position: absolute; inset: 0` (todos superpuestos en el mismo lugar) y
 * su opacidad/escala/rotación/blur se calculan en función de qué tan cerca
 * está el scroll actual de "su" índice — de ahí el crossfade con
 * profundidad (no un simple fundido plano).
 *
 * Snap magnético: 160ms después de que el usuario deja de scrollear, si
 * quedó a mitad de camino entre dos paneles, se anima solo hasta el más
 * cercano — el "click" de encastre que hace que el gesto se sienta
 * intencional en vez de quedar la mitad de un panel montado sobre el otro.
 *
 * Fallbacks deliberados a scroll normal (mismo contenido, cero pineo):
 * - `prefers-reduced-motion: reduce` → nunca tiene sentido animar esto.
 * - Viewports angostos (< 640px) → el pineo por `sticky` + `100vh` es
 *   notoriamente inestable en mobile (la barra de URL se esconde/aparece
 *   y corre el 100vh en cada scroll), y la ganancia de "viewport fijo" se
 *   pierde igual en pantallas chicas donde cada panel ya casi no cabe.
 */
export function PinnedScrollStages({ stages }: PinnedScrollStagesProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0) // índice fraccional [0, stages.length - 1]
  const [reducedMotion, setReducedMotion] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const rafRef = useRef<number | null>(null)
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSnappingRef = useRef(false)
  const touchStartY = useRef<number | null>(null)

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(motionQuery.matches)
    const onMotionChange = () => setReducedMotion(motionQuery.matches)
    motionQuery.addEventListener('change', onMotionChange)

    const widthQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`)
    setIsMobile(widthQuery.matches)
    const onWidthChange = () => setIsMobile(widthQuery.matches)
    widthQuery.addEventListener('change', onWidthChange)

    return () => {
      motionQuery.removeEventListener('change', onMotionChange)
      widthQuery.removeEventListener('change', onWidthChange)
    }
  }, [])

  const pinningDisabled = reducedMotion || isMobile

  const measure = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const viewportH = window.innerHeight
    const scrollable = rect.height - viewportH
    if (scrollable <= 0) {
      setProgress(0)
      return
    }
    const raw = -rect.top / scrollable
    const clamped = Math.min(1, Math.max(0, raw))
    setProgress(clamped * (stages.length - 1))
  }, [stages.length])

  const goToStage = useCallback((index: number) => {
    const el = trackRef.current
    if (!el) return
    const clampedIndex = Math.min(stages.length - 1, Math.max(0, index))
    const rect = el.getBoundingClientRect()
    const viewportH = window.innerHeight
    const scrollable = rect.height - viewportH
    const targetFraction = stages.length > 1 ? clampedIndex / (stages.length - 1) : 0
    const absoluteTop = window.scrollY + rect.top
    isSnappingRef.current = true
    window.scrollTo({ top: absoluteTop + targetFraction * scrollable, behavior: 'smooth' })
    // No hay evento nativo "scrollend" confiable en todos los navegadores
    // todavía, así que se libera el flag de snap por tiempo: suficiente
    // para que termine la animación smooth y no se re-dispare un snap
    // sobre otro snap.
    window.setTimeout(() => {
      isSnappingRef.current = false
    }, 500)
  }, [stages.length])

  useEffect(() => {
    if (pinningDisabled) return

    function scheduleSnap() {
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current)
      snapTimerRef.current = setTimeout(() => {
        if (isSnappingRef.current) return
        const el = trackRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const withinTrack = rect.top < window.innerHeight * 0.5 && rect.bottom > window.innerHeight * 0.5
        if (!withinTrack) return
        setProgress((current) => {
          const nearest = Math.round(current)
          if (Math.abs(current - nearest) > 0.02) goToStage(nearest)
          return current
        })
      }, SNAP_IDLE_MS)
    }

    function onScroll() {
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null
          measure()
        })
      }
      scheduleSnap()
    }

    // Navegación por teclado: flechas/AvPag-RePag/espacio saltan un panel
    // entero, solo cuando el foco no está en un campo de texto (para no
    // robarle las flechas a quien esté escribiendo en el buscador).
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable
      if (isEditable) return
      const el = trackRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const withinTrack = rect.top < window.innerHeight && rect.bottom > 0
      if (!withinTrack) return

      const currentIndex = Math.round(progress)
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault()
        goToStage(currentIndex + 1)
      } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault()
        goToStage(currentIndex - 1)
      }
    }

    // Swipe táctil (para tablets/desktop táctil donde isMobile es false
    // por ancho pero el input sigue siendo touch): un gesto vertical
    // franco salta al panel siguiente/anterior en vez de dejar que el
    // navegador scrollee de a píxeles sobre contenido pineado.
    function onTouchStart(e: TouchEvent) {
      touchStartY.current = e.touches[0]?.clientY ?? null
    }
    function onTouchEnd(e: TouchEvent) {
      if (touchStartY.current === null) return
      const endY = e.changedTouches[0]?.clientY ?? touchStartY.current
      const delta = touchStartY.current - endY
      touchStartY.current = null
      if (Math.abs(delta) < 40) return
      const el = trackRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const withinTrack = rect.top < window.innerHeight && rect.bottom > 0
      if (!withinTrack) return
      const currentIndex = Math.round(progress)
      goToStage(currentIndex + (delta > 0 ? 1 : -1))
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current)
    }
  }, [measure, goToStage, pinningDisabled, progress])

  const activeIndex = Math.round(progress)

  if (pinningDisabled) {
    return (
      <div>
        {stages.map((stage) => (
          <section key={stage.id} aria-label={stage.label} className="flex min-h-screen w-full items-center justify-center px-6 py-16">
            <StageActiveContext.Provider value={true}>{stage.content}</StageActiveContext.Provider>
          </section>
        ))}
      </div>
    )
  }

  return (
    <div ref={trackRef} style={{ height: `${stages.length * 100}vh` }} className="relative">
      {/* Anuncio del panel activo para lectores de pantalla — el contenido
          real de cada panel ya vive en el DOM (no se re-crea), esto solo
          nombra "dónde estamos" cuando cambia, igual que un cambio de
          pestaña. */}
      <p className="sr-only" aria-live="polite">
        {stages[activeIndex]?.label}
      </p>

      {/* Barra de progreso superior — mismo dato que los dots de la
          derecha, pero legible de un vistazo sin tener que ubicar los
          puntos individuales. */}
      <div className="fixed left-0 top-0 z-30 h-0.5 w-full bg-neutral-100">
        <div
          className="h-full bg-neutral-900 transition-[width] duration-150 ease-out"
          style={{ width: `${stages.length > 1 ? (progress / (stages.length - 1)) * 100 : 100}%` }}
        />
      </div>

      <div className="sticky top-0 h-screen w-full overflow-hidden bg-white" style={{ perspective: '1400px' }}>
        {stages.map((stage, i) => {
          // Signo invertido a propósito: un panel "por venir" (i > progress)
          // debe sentirse como que sube desde abajo del pliegue a medida
          // que se scrollea hacia él, no como que ya estaba arriba
          // esperando — de ahí el `-diff` en vez de `diff` directo.
          const diff = progress - i
          const absDiff = Math.abs(diff)
          const opacity = Math.max(0, 1 - absDiff * 1.5)
          const translateY = -diff * 90
          // Leve overshoot: al llegar (absDiff pasando por 0) la escala
          // pasa brevemente de un poco más grande a 1, en vez de crecer
          // monotónicamente hasta 1 y quedarse — más "resorte", menos
          // deslizamiento plano.
          const scale = absDiff < 0.12 ? 1 + (0.12 - absDiff) * 0.35 : Math.max(0.82, 1 - absDiff * 0.16)
          const rotateX = diff * 10
          const blur = Math.min(10, absDiff * 12)
          const isActive = absDiff < 0.5
          return (
            <div
              key={stage.id}
              aria-hidden={!isActive}
              style={{
                opacity,
                transform: `translateY(${translateY}px) scale(${scale}) rotateX(${rotateX}deg)`,
                transformStyle: 'preserve-3d',
                filter: blur > 0.5 ? `blur(${blur}px)` : undefined,
                pointerEvents: isActive ? 'auto' : 'none',
                zIndex: isActive ? 2 : 1,
                transition: 'filter 120ms linear',
              }}
              className="absolute inset-0 flex items-center justify-center px-6"
            >
              <StageActiveContext.Provider value={isActive}>{stage.content}</StageActiveContext.Provider>
            </div>
          )
        })}

        {/* Indicador de progreso + navegación directa entre paneles, mismo
            lenguaje que los "page dots" de sitios tipo Apple. */}
        <div className="pointer-events-auto absolute right-5 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-3 sm:flex">
          {stages.map((stage, i) => (
            <button
              key={stage.id}
              type="button"
              onClick={() => goToStage(i)}
              aria-label={`Ir a: ${stage.label}`}
              aria-current={activeIndex === i}
              className={`h-2.5 w-2.5 rounded-full border border-neutral-400 transition-all ${
                activeIndex === i ? 'scale-125 bg-neutral-900' : 'bg-transparent hover:bg-neutral-300'
              }`}
            />
          ))}
        </div>

        {/* Pista de que hay más paneles debajo — reemplaza el "scroll cue"
            del hero viejo, ahora aplicado a todo el track. */}
        {activeIndex < stages.length - 1 && (
          <button
            type="button"
            onClick={() => goToStage(activeIndex + 1)}
            aria-label="Ir al siguiente panel"
            className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 animate-bounce text-neutral-400 transition-colors hover:text-neutral-700"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
