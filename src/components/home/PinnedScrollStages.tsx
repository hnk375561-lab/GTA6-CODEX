'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { StageProgressProvider } from '@/components/home/StageProgress'

export interface Stage {
  id: string
  label: string
  scrollVh?: number
  content: ReactNode
}

interface Props {
  stages: Stage[]
}

/* Presupuesto de scroll por panel cuando el panel no declara `scrollVh`
   (mismo default que documenta page.tsx: entre el 160 de "Evidencia" y el
   240 de "Financiamiento", ni tan liviano ni tan pesado). */
const DEFAULT_SCROLL_VH = 210
/* Ventana de entrada (en alturas de viewport) sobre la que la cascada de
   cada panel se revela. El progreso local de un panel pasa de 0 → 1
   mientras el CENTRO del viewport se aproxima al tope del panel: los
   elementos `Reveal` (StageProgress) terminan su stagger justo cuando el
   panel llega a su "pose" centrada, y el panel que viene de abajo se va
   materializando sin ningún instante en blanco — a diferencia del
   sistema anterior (snap + IntersectionObserver con umbral 0.6 sobre
   paneles de altura exacta = a mitad de transición AMBOS paneles estaban
   por debajo del umbral → pantalla vacía entre paneles). */
const ENTRY_WINDOW_FACTOR = 0.55
/* Duración de la cascada de "apertura" del primer panel al montar (solo
   si NO hay prefers-reduced-motion): da la entrada sí-no-scroll del hero
   (cada bloque en orden) antes de que el scroll tome el control. */
const BOOT_MS = 700

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function easeOutCubic(t: number): number {
  const c = clamp01(t)
  return 1 - Math.pow(1 - c, 3)
}

/**
 * Track de la home: un scroller interno de viewport completo por el que se
 * recorren los `Stage` del expediente.
 *
 * Arquitectura (en vez de snap + IO, ver nota arriba):
 *  - Cada panel mide `scrollVh` vh (default 210) — el presupuesto de scroll
 *    real que define page.tsx para leer/interactuar cada sección.
 *  - Un solo listener por rAF (throttle nativo del navegador) sobre
 *    `scrollTop` calcula el progreso local de cada panel como función
 *    pura de la posición: `p = (centro - (tope - ventana)) / ventana`,
 *    clampado a [0,1]. Nada se anima por CSS transition: los paneles
 *    siempre están visibles mientras ocupan el viewport (el "crossfade"
 *    real es la cascada de cada `Reveal` interno, ver StageProgress) y el
 *    scroll por rueda queda instantáneo (sin `scroll-smooth`: el smooth
 *    implícito del CSS en Chromium también se le aplica a la rueda — ver
 *    la política documentada en `html` de globals.css).
 *  - El progreso vía `StageProgressProvider` por panel le llega a los
 *    `Reveal` de `page.tsx` (que viven en Server Components) por Context.
 *  - El primer panel arranca con una cascada de apertura de `BOOT_MS` y el
 *    contenedor se posiciona en su "pose" inicial (centro del panel ==
 *    centro del viewport).
 *  - `prefers-reduced-motion`: sin rAF ni cascada — todo el contenido
 *    queda visible de una y solo se mantiene el indicador de progreso de
 *    la barra lateral (un listener de scroll pasivo, sin animaciones).
 */
export function PinnedScrollStages({ stages }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeStageId, setActiveStageId] = useState<string | null>(stages[0]?.id ?? null)
  /* Progreso de cascada (0..1) por panel, indexado igual que `stages`. */
  const [poses, setPoses] = useState<number[]>(() => stages.map(() => 0))

  useEffect(() => {
    const container = containerRef.current
    if (!container || stages.length === 0) return

    const reducedMedia = window.matchMedia('(prefers-reduced-motion: reduce)')

    let tops: number[] = []
    let heights: number[] = []
    let ch = 0
    let windowPx = 0
    let total = 0
    let raf = 0
    let ro: ResizeObserver | null = null
    let onScroll: (() => void) | null = null

    const measure = () => {
      ch = container.clientHeight || window.innerHeight
      heights = stages.map((s) => ((s.scrollVh ?? DEFAULT_SCROLL_VH) / 100) * ch)
      tops = []
      let acc = 0
      for (let i = 0; i < heights.length; i++) {
        tops.push(acc)
        acc += heights[i]
      }
      total = acc
      windowPx = Math.min(640, Math.max(300, ch * ENTRY_WINDOW_FACTOR))
    }

    const activeIdAt = (scrollTop: number): string | null => {
      const center = scrollTop + ch / 2
      let idx = stages.length - 1
      for (let i = 0; i < stages.length; i++) {
        if (center >= tops[i] && center < tops[i] + heights[i]) {
          idx = i
          break
        }
      }
      return stages[idx]?.id ?? null
    }

    const clear = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      if (ro) {
        ro.disconnect()
        ro = null
      }
      if (onScroll) {
        container.removeEventListener('scroll', onScroll)
        onScroll = null
      }
    }

    const start = (reduced: boolean) => {
      clear()
      measure()

      const initialPoseTop = Math.max(
        0,
        Math.min(total - ch, (tops[0] ?? 0) + (heights[0] ?? 0) / 2 - ch / 2)
      )
      container.scrollTo({ top: initialPoseTop })

      ro = new ResizeObserver(() => measure())
      ro.observe(container)

      if (reduced) {
        setPoses(stages.map(() => 1))
        onScroll = () => setActiveStageId(activeIdAt(container.scrollTop))
        container.addEventListener('scroll', onScroll, { passive: true })
        setActiveStageId(activeIdAt(container.scrollTop))
        return
      }

      let prevSignature = ''
      const bootStart = performance.now()
      const tick = (now: number) => {
        raf = requestAnimationFrame(tick)

        const boot = performance.now() - bootStart
        const bootP = boot < BOOT_MS ? easeOutCubic(boot / BOOT_MS) : null
        const scrollTop = container.scrollTop
        const center = scrollTop + ch / 2

        const next = new Array<number>(stages.length)
        for (let i = 0; i < stages.length; i++) {
          const scrollP = clamp01((center - (tops[i] - windowPx)) / windowPx)
          next[i] = Math.round((i === 0 && bootP !== null ? bootP : scrollP) * 1000) / 1000
        }

        const active = activeIdAt(scrollTop)
        const signature = next.join(',') + '|' + active
        if (signature === prevSignature) return
        prevSignature = signature

        setPoses(next)
        setActiveStageId(active)
      }
      raf = requestAnimationFrame(tick)
    }

    start(reducedMedia.matches)
    const onChangeReduced = (e: MediaQueryListEvent) => start(e.matches)
    reducedMedia.addEventListener('change', onChangeReduced)

    return () => {
      clear()
      reducedMedia.removeEventListener('change', onChangeReduced)
    }
  }, [stages])

  if (stages.length === 0) return null

  const goTo = (stage: Stage) => {
    const container = containerRef.current
    const target = container?.querySelector(`[data-stage-id="${stage.id}"]`) as HTMLElement | null
    if (!container || !target) return
    const top =
      target.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop
    container.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-dvh w-full overflow-y-scroll scroll-container-custom"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style jsx global>{`
          .scroll-container-custom::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {stages.map((stage, i) => (
          <section
            key={stage.id}
            data-stage-id={stage.id}
            aria-label={stage.label}
            className="flex w-full items-center justify-center p-4 sm:p-6 lg:p-8"
            style={{ height: `${stage.scrollVh ?? DEFAULT_SCROLL_VH}dvh` }}
          >
            <StageProgressProvider progress={poses[i] ?? 0}>
              <div className="w-full max-w-7xl">{stage.content}</div>
            </StageProgressProvider>
          </section>
        ))}
      </div>

      <nav className="fixed right-4 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col gap-3" aria-label="Progreso de secciones">
        {stages.map((stage) => (
          <button
            key={stage.id}
            onClick={() => goTo(stage)}
            aria-current={activeStageId === stage.id ? 'true' : undefined}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-auto-accent',
              activeStageId === stage.id
                ? 'bg-neutral-900 scale-125'
                : 'bg-neutral-300 hover:bg-neutral-400'
            )}
            aria-label={`Ir a ${stage.label}`}
          />
        ))}
      </nav>
    </div>
  )
}