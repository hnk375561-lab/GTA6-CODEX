'use client'

import {
  useCallback,
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

interface PinnedScrollStagesProps {
  stages: Stage[]
}

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
 * su opacidad/traslación se calculan en función de qué tan cerca está el
 * scroll actual de "su" índice — de ahí el crossfade sin salto.
 *
 * Es JS (no `animation-timeline: scroll()` nativo) a propósito: acá los
 * paneles no se desplazan por la pantalla (están apilados en el mismo
 * punto), así que no hay un "view" real que timelinear — se necesita leer
 * el progreso de scroll del propio track. Soporte de `prefers-reduced-motion`: si está activo, se abandona
 * el pineo por completo y los paneles se listan en flujo normal, cada uno
 * simplemente visible — mismo contenido, cero movimiento inventado.
 */
export function PinnedScrollStages({ stages }: PinnedScrollStagesProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0) // índice fraccional [0, stages.length - 1]
  const [reducedMotion, setReducedMotion] = useState(false)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(query.matches)
    const onChange = () => setReducedMotion(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

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

  useEffect(() => {
    if (reducedMotion) return
    function onScroll() {
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        measure()
      })
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [measure, reducedMotion])

  const goToStage = useCallback((index: number) => {
    const el = trackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const viewportH = window.innerHeight
    const scrollable = rect.height - viewportH
    const targetFraction = stages.length > 1 ? index / (stages.length - 1) : 0
    const absoluteTop = window.scrollY + rect.top
    window.scrollTo({ top: absoluteTop + targetFraction * scrollable, behavior: 'smooth' })
  }, [stages.length])

  if (reducedMotion) {
    return (
      <div>
        {stages.map((stage) => (
          <section key={stage.id} aria-label={stage.label} className="min-h-screen w-full">
            {stage.content}
          </section>
        ))}
      </div>
    )
  }

  const activeIndex = Math.round(progress)

  return (
    <div ref={trackRef} style={{ height: `${stages.length * 100}vh` }} className="relative">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-white">
        {stages.map((stage, i) => {
          const diff = progress - i
          const absDiff = Math.abs(diff)
          const opacity = Math.max(0, 1 - absDiff * 1.4)
          const translateY = diff * 32
          const isActive = absDiff < 0.5
          return (
            <div
              key={stage.id}
              aria-hidden={!isActive}
              // `inert` (no solo `aria-hidden` + `pointer-events: none`): sin esto,
              // un usuario de teclado podía Tab hacia links/botones de paneles
              // fuera de foco (invisibles pero seguían en el DOM y en el orden de
              // tabulación), quedando "perdido" en contenido que no ve en pantalla.
              // `inert` saca el subárbol completo del orden de tabulación y del
              // árbol de accesibilidad a la vez — soportado nativo desde React 19.
              inert={!isActive}
              style={{
                opacity,
                transform: `translateY(${translateY}px)`,
                pointerEvents: isActive ? 'auto' : 'none',
                zIndex: isActive ? 2 : 1,
                willChange: 'opacity, transform',
              }}
              className="absolute inset-0 flex items-center justify-center px-6"
            >
              {stage.content}
            </div>
          )
        })}

        {/* Indicador de progreso + navegación directa entre paneles, mismo
            lenguaje que los "page dots" de sitios tipo Apple. Antes solo
            aparecía desde `sm:` — en mobile (la mayoría del tráfico) no había
            ninguna señal de "en qué panel estoy / cuántos quedan" más que la
            flecha de "seguir scrolleando", que además desaparece en el último
            panel. Ahora vive siempre: fila horizontal centrada abajo en
            mobile, columna vertical a la derecha desde `sm:` — mismo
            componente, solo cambia el eje. */}
        <div className="pointer-events-auto absolute inset-x-0 bottom-16 z-20 flex items-center justify-center gap-3 sm:inset-x-auto sm:inset-y-1/2 sm:bottom-auto sm:right-5 sm:flex-col sm:-translate-y-1/2">
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

        {/* Pista textual de que hay más paneles debajo — reemplaza el
            "scroll cue" del hero viejo, ahora aplicado a todo el track. */}
        {activeIndex < stages.length - 1 && (
          <div
            aria-hidden="true"
            className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 animate-bounce text-neutral-400"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
