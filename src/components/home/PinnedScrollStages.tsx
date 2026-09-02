'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { StageProgressProvider } from './StageProgress'

export interface Stage {
  id: string
  label: string
  content: ReactNode
  /** Alto de scroll físico de ESTE panel, en `dvh`. Opcional — si se omite
   * usa `DEFAULT_STAGE_SCROLL_VH`. No todos los paneles necesitan el mismo
   * recorrido: uno de lectura (ej. "Evidencia": un dato citado, poco que
   * manipular) puede pedir menos scroll físico que uno de interacción
   * (ej. "Comparador en vivo": elegir versiones, leer una tabla) donde el
   * usuario necesita más tiempo/espacio antes de que tenga sentido avanzar
   * al siguiente panel. Ver `useTrackGeometry` más abajo para cómo este
   * valor por-panel se traduce en distancia de scroll real. */
  scrollVh?: number
}

interface PinnedScrollStagesProps {
  stages: Stage[]
}

/** Progreso [0,1] → [0,1] con aceleración/desaceleración simétrica: los
 * paneles arrancan y terminan su crossfade suave, en vez de a velocidad
 * constante como una interpolación lineal — la diferencia que separa un
 * fundido "calculado" de uno que se siente pulido. */
/** Valor por defecto de alto de scroll físico (en `dvh`) para paneles que
 * no especifican su propio `scrollVh`. Históricamente esta era una única
 * constante global (`STAGE_SCROLL_VH`) compartida por los 5 paneles del
 * track; ahora cada `Stage` puede pedir su propio valor y este queda solo
 * como fallback — ver `Stage.scrollVh` y `useTrackGeometry`. */
const DEFAULT_STAGE_SCROLL_VH = 210

/** Tamaño de sub-grupo para los dots de progreso en mobile. Con 5 paneles
 * una fila de puntos se lee de un vistazo; con hasta 9 (Fase 1–3: +Comparador
 * en vivo, +Un dato-una fuente, +Rankings destacados, +Financiamiento) una
 * fila plana de 9 puntos idénticos se vuelve ruido visual y cuesta ubicar
 * "dónde estoy" sin contar. Agrupar de a `DOT_GROUP_SIZE` con un respiro
 * extra entre grupos (mismo truco que separar un número de teléfono en
 * bloques) resuelve la legibilidad sin agregar texto ni herramientas
 * nuevas. Solo afecta el layout en fila de mobile — en la columna vertical
 * de desktop hay espacio vertical de sobra y los grupos se aplanan. */
const DOT_GROUP_SIZE = 3

function easeInOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size))
  }
  return groups
}

/**
 * Traduce el `scrollVh` (potencialmente distinto) de cada panel a la
 * geometría real del track: cuánto scroll físico total hace falta, y en
 * qué punto de ese recorrido "vive" cada índice de panel.
 *
 * Antes (todos los paneles con el mismo `STAGE_SCROLL_VH`) esto era trivial:
 * el índice avanzaba de forma perfectamente lineal con el scroll. Ahora que
 * cada panel puede pedir su propio ancho de recorrido, un panel "pesado"
 * (scrollVh alto) debe ocupar más distancia física de scroll para
 * atravesarlo que uno "liviano" — el índice ya no avanza a ritmo constante,
 * avanza más lento cerca de los paneles pesados y más rápido cerca de los
 * livianos.
 *
 * Modelo: cada transición entre el panel i y el i+1 ("segmento" i) mide el
 * promedio de los `scrollVh` de ambos — así un panel pesado "empuja" hacia
 * afuera tanto el tramo de scroll para llegar a él como el tramo para
 * dejarlo atrás, sin necesitar un segundo valor separado de "entrada" y
 * "salida" por panel. La suma de todos los segmentos, más una pantalla de
 * margen final (la última pantalla siempre queda pineada un instante), da
 * el alto total del track.
 */
function useTrackGeometry(stages: Stage[]) {
  return useMemo(() => {
    const vh = stages.map((s) => s.scrollVh ?? DEFAULT_STAGE_SCROLL_VH)
    const segmentVh: number[] = []
    for (let i = 0; i < vh.length - 1; i++) {
      segmentVh.push((vh[i] + vh[i + 1]) / 2)
    }
    const cumulativeVh: number[] = [0]
    for (const seg of segmentVh) {
      cumulativeVh.push(cumulativeVh[cumulativeVh.length - 1] + seg)
    }
    const scrollableVh = cumulativeVh[cumulativeVh.length - 1] ?? 0
    const trackVh = scrollableVh + 100 // + 1 viewport de margen final

    /** Convierte una posición de scroll cruda `rawVh` (0..scrollableVh) en
     * un índice continuo de panel (0..stages.length-1), interpolando
     * dentro del segmento correspondiente. */
    function vhToIndex(rawVh: number): number {
      if (stages.length <= 1 || scrollableVh <= 0) return 0
      const clampedVh = Math.min(scrollableVh, Math.max(0, rawVh))
      for (let i = 0; i < segmentVh.length; i++) {
        const segStart = cumulativeVh[i]
        const segEnd = cumulativeVh[i + 1]
        if (clampedVh <= segEnd || i === segmentVh.length - 1) {
          const segLen = segEnd - segStart
          const local = segLen > 0 ? (clampedVh - segStart) / segLen : 0
          return i + local
        }
      }
      return stages.length - 1
    }

    /** Inversa de `vhToIndex`: dado un índice de panel entero, devuelve la
     * posición de scroll (en vh, 0..scrollableVh) donde ese panel queda
     * perfectamente centrado. Usado por `goToStage` para la navegación
     * directa por los dots. */
    function indexToVh(index: number): number {
      const clampedIndex = Math.min(stages.length - 1, Math.max(0, index))
      return cumulativeVh[clampedIndex] ?? 0
    }

    return { scrollableVh, trackVh, vhToIndex, indexToVh }
  }, [stages])
}

/**
 * Reemplazo del homepage "scrolleable normal" por un viewport que se
 * mantiene fijo (100dvh, `position: sticky`) mientras el usuario scrollea:
 * en vez de que la página suba/baje sección por sección, cada scroll hace
 * que un panel se disuelva en el siguiente dentro del mismo encuadre.
 *
 * Técnica: el wrapper exterior mide `trackVh` dvh (suma ponderada de los
 * `scrollVh` de cada panel, ver `useTrackGeometry`) — eso es lo que le da
 * "distancia de scroll" al usuario para recorrer — pero el contenido real
 * vive en un hijo `sticky top-0` de `100dvh` (dynamic viewport height, no
 * `100vh`: en Safari/Chrome mobile `vh` incluye el espacio de la barra de
 * URL aunque esté colapsada, lo que deja un borde muerto o un salto cuando
 * el navegador la muestra/oculta durante el scroll — `dvh` sigue el
 * viewport real en cada frame), así que visualmente nunca se mueve
 * verticalmente. Cada panel es `position: absolute; inset: 0` (todos
 * superpuestos en el mismo lugar) y su opacidad/traslación se calculan en
 * función de qué tan cerca está el scroll actual de "su" índice — de ahí
 * el crossfade sin salto.
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
  const geometry = useTrackGeometry(stages)

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
    // `clamped` es fracción [0,1] del recorrido físico total; se traduce a
    // vh recorridos y de ahí a índice de panel vía la geometría ponderada
    // (segmentos de distinto largo según el `scrollVh` de cada panel, en
    // vez de una división uniforme por `stages.length - 1`).
    targetRef.current = geometry.vhToIndex(clamped * geometry.scrollableVh)
  }, [geometry])

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
    const LERP_FACTOR = 0.18 // ajustado para mejor responsividad: 0.11 era
    // demasiado lento, hacía que el scroll se sintiera "raro"/desalineado.
    // 0.18 mantiene el suavizado pero sigue siendo 1:1 con el scroll real,
    // sensación más natural y profesional sin temblor de muestreo.

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
    // Misma geometría ponderada que `measure()`, en sentido inverso: la
    // fracción del recorrido físico que corresponde a "centrar" `index`
    // ya no es `index / (stages.length - 1)` a secas — depende de cuánto
    // `scrollVh` acumularon los paneles anteriores.
    const targetFraction = geometry.scrollableVh > 0 ? geometry.indexToVh(index) / geometry.scrollableVh : 0
    const absoluteTop = window.scrollY + rect.top
    window.scrollTo({ top: absoluteTop + targetFraction * scrollable, behavior: 'smooth' })
  }, [geometry])

  if (reducedMotion) {
    return (
      <div>
        {stages.map((stage) => (
          <section key={stage.id} aria-label={stage.label} className="min-h-dvh w-full">
            <StageProgressProvider progress={1}>{stage.content}</StageProgressProvider>
          </section>
        ))}
      </div>
    )
  }

  const activeIndex = Math.round(displayProgress)
  // Progreso global del recorrido completo [0,1] — para la barra fina de
  // arriba, distinta del progreso *local* de cada panel (ese va de -1 a 1
  // según qué tan lejos está de "su" índice, usado para el crossfade).
  const globalProgress = stages.length > 1 ? displayProgress / (stages.length - 1) : 1
  const compactDots = stages.length > 6
  const dotGroups = chunk(stages.map((stage, i) => ({ stage, i })), DOT_GROUP_SIZE)

  return (
    <div ref={trackRef} style={{ height: `${geometry.trackVh}dvh` }} className="relative">
      <div className="sticky top-0 h-dvh w-full overflow-hidden bg-white">
        {/* Fondo con vida propia: dos manchas de gradiente muy suaves que
            derivan lentamente en función del progreso *global* del scroll
            (no del mouse, no en loop infinito) — dan sensación de que el
            sitio "respira" de fondo sin competir con el contenido ni
            romper la estética blanca/minimalista. `zIndex: 0` explícito
            para que los paneles (z-index 1/2) siempre queden por encima
            sin depender del orden en el DOM. */}
        <div className="pointer-events-none absolute inset-0" style={{ zIndex: 0 }} aria-hidden="true">
          {/* Cada blob es dos capas: la externa lleva el transform atado al
              scroll (inline, calculado arriba de progreso global) y la
              interna lleva la deriva ambiental continua en CSS puro
              (.hero-blob-a/.hero-blob-b, ver globals.css) — así el fondo
              tiene vida propia incluso antes de que alguien scrollee o
              mueva el mouse, en vez de quedar congelado hasta el primer
              gesto del usuario. */}
          <div className="absolute" style={{ transform: `translate3d(${-16 + globalProgress * 46}%, ${-24 + globalProgress * 70}%, 0)` }}>
            <div className="hero-blob-a h-[38rem] w-[38rem] rounded-full bg-orange-200/25 blur-3xl" />
          </div>
          <div
            className="absolute right-0"
            style={{ transform: `translate3d(${18 - globalProgress * 52}%, ${64 - globalProgress * 80}%, 0)` }}
          >
            <div className="hero-blob-b h-[34rem] w-[34rem] rounded-full bg-neutral-200/60 blur-3xl" />
          </div>
        </div>

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
          // Progreso local [0,1]: 0 cuando el panel todavía está a más de
          // "una pantalla" de distancia, 1 cuando está perfectamente
          // centrado — mismo `eased` que ya mueve opacidad/escala del
          // panel, reusado acá para la cascada de sus hijos.
          const localProgress = eased
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
              // `grid place-items-center` en vez de `flex items-center
              // justify-center`: con contenido que puede llegar a superar
              // los 100dvh (paneles con más fichas, como el hero ahora),
              // flexbox tiene un bug conocido de centrado + overflow — el
              // borde superior del contenido queda inaccesible al hacer
              // scroll hacia arriba, aunque el contenedor sea scrolleable.
              // Grid con `place-items: center` no tiene ese problema: el
              // contenido sigue centrado cuando entra entero, y se vuelve
              // scrolleable desde el borde real cuando no entra.
              className="absolute inset-0 grid place-items-center overflow-y-auto"
            >
              <StageProgressProvider progress={localProgress}>{stage.content}</StageProgressProvider>
            </div>
          )
        })}

        {/* Barra de progreso fina del recorrido completo — señal
            "didáctica" adicional a los dots: de un vistazo, cuánto queda
            del sitio por descubrir, sin necesidad de contar puntitos. */}
        <div className="absolute inset-x-0 top-0 z-20 h-[3px] bg-neutral-100" aria-hidden="true">
          <div
            className="h-full bg-neutral-900"
            style={{ width: `${globalProgress * 100}%`, transition: 'width 60ms linear' }}
          />
        </div>

        {/* Contador de panel ("01 / 05 · Categorías"): mismo espíritu que
            los dots pero en texto — para quien prefiera leer "dónde estoy"
            en vez de interpretar puntos. Vive junto a los dots, cruzando
            en fundido con el label activo. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-5 top-[calc(1.25rem+env(safe-area-inset-top))] z-20 hidden items-baseline gap-2 text-neutral-400 sm:flex"
        >
          <span className="font-display text-sm font-semibold tabular-nums text-neutral-900">
            {String(activeIndex + 1).padStart(2, '0')}
          </span>
          <span className="text-sm">/ {String(stages.length).padStart(2, '0')}</span>
          <span className="text-sm">· {stages[activeIndex]?.label}</span>
        </div>

        {/* Indicador de progreso + navegación directa entre paneles, mismo
            lenguaje que los "page dots" de sitios tipo Apple. Antes solo
            aparecía desde `sm:` — en mobile (la mayoría del tráfico) no había
            ninguna señal de "en qué panel estoy / cuántos quedan" más que la
            flecha de "seguir scrolleando", que además desaparece en el último
            panel. Ahora vive siempre: fila horizontal centrada abajo en
            mobile, columna vertical a la derecha desde `sm:` — mismo
            componente, solo cambia el eje. `bottom` usa `max(...)` con
            `safe-area-inset-bottom` para no quedar tapada por el home
            indicator de iOS en landscape.

            Agrupado (mobile): con hasta 9 paneles (Fase 1–3) una fila plana
            de puntos idénticos deja de leerse de un vistazo. Se parte en
            sub-grupos de `DOT_GROUP_SIZE`, con más aire entre grupos
            (`gap-4`) que dentro de cada uno (`gap-2.5`/`gap-3`) — igual que
            separar un número en bloques, no hace falta contar para ubicar
            "más o menos dónde" está el panel activo. En desktop (`sm:`) los
            grupos se aplanan (`sm:contents`) y vuelve a ser una columna
            simple: ahí sobra espacio vertical y agrupar no aporta nada. */}
        {/* `bottom` vía variable CSS + clase arbitraria (no inline style
            directo): un `style.bottom` fijo le ganaría en especificidad a
            `sm:bottom-auto` en cualquier ancho, rompiendo el layout vertical
            centrado de la derecha en desktop. Así, `sm:bottom-auto` sigue
            pudiendo pisar el valor en su propio breakpoint. */}
        <div
          style={{ '--dots-bottom': 'max(4rem, calc(1rem + env(safe-area-inset-bottom)))' } as CSSProperties}
          className="pointer-events-auto absolute inset-x-0 bottom-[var(--dots-bottom)] z-20 flex items-center justify-center gap-4 sm:inset-x-auto sm:inset-y-1/2 sm:bottom-auto sm:right-5 sm:flex-col sm:gap-3 sm:-translate-y-1/2">
          {dotGroups.map((group, gi) => (
            <div key={gi} className="flex items-center gap-2.5 sm:contents">
              {group.map(({ stage, i }) => (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => goToStage(i)}
                  aria-label={`Ir a: ${stage.label}`}
                  aria-current={activeIndex === i}
                  className={`rounded-full border border-neutral-400 transition-all ${
                    compactDots ? 'h-2 w-2' : 'h-2.5 w-2.5'
                  } ${activeIndex === i ? 'scale-125 bg-neutral-900' : 'bg-transparent hover:bg-neutral-300'}`}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Pista textual de que hay más paneles debajo — reemplaza el
            "scroll cue" del hero viejo, ahora aplicado a todo el track.
            Antes era on/off booleano (aparece/desaparece de golpe en el
            último panel); ahora se desvanece de forma continua a medida
            que displayProgress se acerca al final, mismo lenguaje "todo
            es función del progreso, nada es un salto" que el resto del
            componente. */}
        <div
          aria-hidden="true"
          style={{
            bottom: 'max(1.5rem, calc(0.5rem + env(safe-area-inset-bottom)))',
            opacity: 1 - easeInOutCubic(Math.min(1, Math.max(0, displayProgress - (stages.length - 2)))),
          }}
          className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 animate-bounce text-neutral-400"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </div>
    </div>
  )
}
