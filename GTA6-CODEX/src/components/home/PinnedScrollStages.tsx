'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
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

/** Progreso [0,1] → [0,1] con aceleración/desaceleración simétrica: los
 * paneles arrancan y terminan su crossfade suave, en vez de a velocidad
 * constante como una interpolación lineal — la diferencia que separa un
 * fundido "calculado" de uno que se siente pulido. */
function easeInOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2
}

/**
 * Reemplazo del homepage "scrolleable normal" por un viewport que se
 * mantiene fijo (100dvh, `position: sticky`) mientras el usuario scrollea:
 * en vez de que la página suba/baje sección por sección, cada scroll hace
 * que un panel se disuelva en el siguiente dentro del mismo encuadre.
 *
 * Técnica: el wrapper exterior mide `stages.length * 100dvh` — eso es lo
 * que le da "distancia de scroll" al usuario para recorrer — pero el
 * contenido real vive en un hijo `sticky top-0` de `100dvh` (dynamic
 * viewport height, no `100vh`: en Safari/Chrome mobile `vh` incluye el
 * espacio de la barra de URL aunque esté colapsada, lo que deja un
 * borde muerto o un salto cuando el navegador la muestra/oculta durante
 * el scroll — `dvh` sigue el viewport real en cada frame), así que
 * visualmente nunca se mueve verticalmente. Cada panel es
 * `position: absolute; inset: 0` (todos superpuestos en el mismo lugar) y
 * su opacidad/traslación se calculan en función de qué tan cerca está el
 * scroll actual de "su" índice — de ahí el crossfade sin salto.
 *
 * Es JS (no `animation-timeline: scroll()` nativo) a propósito: acá los
 * paneles no se desplazan por la pantalla (están apilados en el mismo
 * punto), así que no hay un "view" real que timelinear — se necesita leer
 * el progreso de scroll del propio track.
 *
 * Profundidad: además de opacidad, cada panel escala levemente (0.94→1)
 * según qué tan activo está — no es un fundido plano, hay una sutil
 * sensación de acercamiento/alejamiento en Z, mismo lenguaje que los
 * "depth crossfade" de sitios tipo Apple/Vercel.
 *
 * Suavizado: el scroll nativo (rueda/trackpad/touch) ya trae su propia
 * inercia del sistema operativo, pero leerlo con rAF y aplicarlo directo
 * al crossfade igual se siente "a los saltos" en inputs entrecortados
 * (rueda de mouse por muescas). Por eso el progreso *objetivo* (medido del
 * scroll real) se separa del progreso *mostrado*, que persigue al
 * objetivo con un lerp continuo — nunca se rompe la relación 1:1 entre
 * "cuánto scrolleaste" y "dónde estás" (no es scroll-jacking), solo se le
 * saca el temblor de muestreo a la animación visual.
 *
 * Soporte de `prefers-reduced-motion`: si está activo, se abandona el
 * pineo por completo y los paneles se listan en flujo normal, cada uno
 * simplemente visible — mismo contenido, cero movimiento inventado.
 */
export function PinnedScrollStages({ stages }: PinnedScrollStagesProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef(0) // progreso objetivo, leído directo del scroll — nunca se anima
  const [displayProgress, setDisplayProgress] = useState(0) // progreso mostrado, persigue al objetivo por lerp
  const [reducedMotion, setReducedMotion] = useState(false)
  const measureRafRef = useRef<number | null>(null)
  const lerpRafRef = useRef<number | null>(null)

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
      targetRef.current = 0
      return
    }
    const raw = -rect.top / scrollable
    const clamped = Math.min(1, Math.max(0, raw))
    targetRef.current = clamped * (stages.length - 1)
  }, [stages.length])

  useEffect(() => {
    if (reducedMotion) return
    function onScroll() {
      if (measureRafRef.current !== null) return
      measureRafRef.current = requestAnimationFrame(() => {
        measureRafRef.current = null
        measure()
      })
    }
    measure()
    setDisplayProgress(targetRef.current)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (measureRafRef.current !== null) cancelAnimationFrame(measureRafRef.current)
    }
  }, [measure, reducedMotion])

  // Loop de suavizado, separado del listener de scroll: corre en todo
  // momento (no solo mientras el usuario scrollea) para que el
  // acercamiento del progreso mostrado al objetivo termine de asentarse
  // aunque el scroll ya se haya frenado, en vez de quedar a mitad de
  // camino cuando el usuario suelta la rueda.
  useEffect(() => {
    if (reducedMotion) return
    let alive = true
    const LERP_FACTOR = 0.16 // ~6-7 frames para alcanzar el 90% del recorrido a 60fps

    function tick() {
      if (!alive) return
      setDisplayProgress((current) => {
        const target = targetRef.current
        const delta = target - current
        if (Math.abs(delta) < 0.001) return target
        return current + delta * LERP_FACTOR
      })
      lerpRafRef.current = requestAnimationFrame(tick)
    }

    lerpRafRef.current = requestAnimationFrame(tick)
    return () => {
      alive = false
      if (lerpRafRef.current !== null) cancelAnimationFrame(lerpRafRef.current)
    }
  }, [reducedMotion])

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
          <section key={stage.id} aria-label={stage.label} className="min-h-dvh w-full">
            {stage.content}
          </section>
        ))}
      </div>
    )
  }

  const activeIndex = Math.round(displayProgress)

  return (
    <div ref={trackRef} style={{ height: `${stages.length * 100}dvh` }} className="relative">
      <div className="sticky top-0 h-dvh w-full overflow-hidden bg-white">
        {stages.map((stage, i) => {
          const diff = displayProgress - i
          const absDiff = Math.abs(diff)
          // Curva ease-in-out en vez de lineal: el panel entrante/saliente
          // acelera y frena su fundido, no lo hace a ritmo constante.
          const eased = easeInOutCubic(1 - Math.min(1, absDiff * 1.4))
          const opacity = eased
          const translateY = Math.sign(diff) * (1 - eased) * 32
          // Profundidad: el panel activo respira a tamaño completo (scale 1)
          // y los que entran/salen quedan levemente encogidos (SCALE_MIN) —
          // mismo lenguaje que el "depth crossfade" de Apple/Vercel: no es
          // solo un fundido plano, hay una sutil sensación de acercamiento/
          // alejamiento en el eje Z. Simétrico (no depende de la dirección):
          // tanto el que se va como el que llega encogen desde/hacia el centro.
          const SCALE_MIN = 0.94
          const scale = SCALE_MIN + eased * (1 - SCALE_MIN)
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
                transform: `translateY(${translateY}px) scale(${scale})`,
                pointerEvents: isActive ? 'auto' : 'none',
                zIndex: isActive ? 2 : 1,
                willChange: 'opacity, transform',
                // Padding en vez de clases fijas: dos cosas a la vez.
                // (1) `paddingTop` deja libre el alto real del header
                // flotante (~4.5rem) + `safe-area-inset-top` (notch/isla
                // dinámica), para que el contenido centrado no quede tapado
                // detrás en viewports bajos (celular en horizontal). (2)
                // `max(1.5rem, env(...))` en los laterales/abajo: mismo
                // padding de siempre (1.5rem, lo que daba `px-6`) en
                // dispositivos sin recorte, pero crece hasta el safe-area
                // real donde sí lo hay (notch lateral en landscape, home
                // indicator abajo) — así el sitio "usa toda la pantalla"
                // sin que ningún control quede debajo del recorte físico.
                paddingTop: 'calc(4.5rem + env(safe-area-inset-top))',
                paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
                paddingLeft: 'max(1.5rem, env(safe-area-inset-left))',
                paddingRight: 'max(1.5rem, env(safe-area-inset-right))',
              }}
              className="absolute inset-0 flex items-center justify-center"
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
            componente, solo cambia el eje. `bottom` usa `max(...)` con
            `safe-area-inset-bottom` para no quedar tapada por el home
            indicator de iOS en landscape. */}
        {/* `bottom` vía variable CSS + clase arbitraria (no inline style
            directo): un `style.bottom` fijo le ganaría en especificidad a
            `sm:bottom-auto` en cualquier ancho, rompiendo el layout vertical
            centrado de la derecha en desktop. Así, `sm:bottom-auto` sigue
            pudiendo pisar el valor en su propio breakpoint. */}
        <div
          style={{ '--dots-bottom': 'max(4rem, calc(1rem + env(safe-area-inset-bottom)))' } as CSSProperties}
          className="pointer-events-auto absolute inset-x-0 bottom-[var(--dots-bottom)] z-20 flex items-center justify-center gap-3 sm:inset-x-auto sm:inset-y-1/2 sm:bottom-auto sm:right-5 sm:flex-col sm:-translate-y-1/2">
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
            style={{ bottom: 'max(1.5rem, calc(0.5rem + env(safe-area-inset-bottom)))' }}
            className="absolute left-1/2 z-20 -translate-x-1/2 animate-bounce text-neutral-400"
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
