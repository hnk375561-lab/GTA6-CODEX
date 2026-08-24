'use client'

import { memo, useEffect, useRef, type ReactNode } from 'react'
import { useSectionSceneFocus } from '@/lib/hooks/useSectionSceneFocus'
import { webglSceneBus } from '@/lib/webgl/scene-bus'

/**
 * `SceneSection` — el conducto semántico entre la UI real y el motor WebGL
 * (ver `scene-bus.ts` y `engine.ts`). No dibuja nada propio ni sabe de
 * Three.js: instrumenta un `<section>` con un sensor de visibilidad
 * (`useSectionSceneFocus`, sin tocar) para que el motor sepa qué parte
 * *semántica* de la interfaz está viendo el usuario, y traduzca eso a mood,
 * ciclo día/noche, niebla, cámara, partículas, etc. — todo lo que ya orquesta
 * `engine.ts` a partir de un puñado de escalares (`sceneMood`, `scrollProgress`,
 * `entityAtmosphere`...). `SceneSection` no reimplementa ninguna de esas
 * decisiones visuales: su trabajo es entregarle al bus la señal correcta,
 * con la menor fricción posible para quien agregue una sección nueva.
 *
 * --------------------------------------------------------------------------
 * Corrección real (no cosmética): alineación de vocabulario con el motor
 * --------------------------------------------------------------------------
 * `engine.ts` mapea mood por `sectionId` contra una tabla fija (`SECTION_MOOD`)
 * y `scene-bus.ts` reconoce el hero por un id exacto (`'hero'`) — ninguno de
 * los dos archivos es tocable acá. En el uso real del sitio, sin embargo, los
 * `sceneId` que se pasan hoy son `"home-hero"`, `"home-categories"` y
 * `"home-featured"` (ver `src/app/page.tsx`): ninguno calza contra `hero` /
 * `categories` / `featured`, así que la home nunca activaba el mood por
 * sección ni el estado de hero que el motor ya sabe calcular — quedaban
 * "conectados" en el papel pero mudos en la práctica. La página de ficha
 * (`entity-header` / `entity-content`) sí calza exacto y no se toca.
 *
 * La solución vive enteramente acá, sin tocar `engine.ts` ni `scene-bus.ts`:
 * `SceneSection` sigue publicando el `sceneId` tal cual se lo pasan (mismo
 * `data-scene-section` de siempre, cero riesgo para quien ya lo lea/estilice),
 * pero internamente resuelve un `engineSectionId` — el id "canónico" que sí
 * reconoce el motor — y es ese el que se envía al bus. La resolución nunca
 * puede dejar una sección peor de lo que estaba: si no reconoce nada, usa el
 * id tal cual llegó (idéntico al comportamiento actual). Documentado como
 * mapeo manual porque `SECTION_MOOD`/`HERO_SECTION_ID` no se exportan; si esa
 * tabla cambia en `engine.ts`, actualizar `ENGINE_MOOD_VOCABULARY` acá.
 *
 * --------------------------------------------------------------------------
 * Por qué no hay props como `mood`, `haze`, `parallax`, `warmth`, etc.
 * --------------------------------------------------------------------------
 * El contrato del bus (`SceneFocus`) es deliberadamente angosto:
 * `{ sectionId, progress }`. Todo lo demás — profundidad, parallax,
 * iluminación, temperatura de color, partículas, niebla, velocidad ambiental,
 * transiciones, composición cinematográfica — el motor lo *deriva* de ese
 * mood (más `entityAtmosphere`, que publica `EntityAtmosphereBridge`, y
 * `pointerIntent`, que publican `Card`/`MagicCard`), no lo recibe como un
 * campo aparte por sección. Agregar acá props sueltas para "controlar" esos
 * efectos no tendría ningún destino real en el motor (no hay ningún campo en
 * `SceneFocus` que los reciba) y sería configuración decorativa que miente
 * sobre lo que hace. `sceneId` (correctamente resuelto) sigue siendo, hoy, el
 * único control real y verdadero que una sección tiene sobre la atmósfera.
 *
 * --------------------------------------------------------------------------
 * `onFocusChange` — opcional, cero costo si no se usa
 * --------------------------------------------------------------------------
 * Extensión puramente aditiva para que la sección pueda reaccionar en React
 * a su propio estado de foco (pausar un video quieto, animar un CTA cuando
 * la sección pasa a ser la dominante, etc.) sin abrir un segundo
 * `IntersectionObserver`: reutiliza la misma señal `focus` que ya publica el
 * bus y que `useSectionSceneFocus` ya alimenta, comparando el `sectionId`
 * activo contra el `engineSectionId` de esta instancia. Solo se suscribe si
 * se pasa el callback, y solo lo invoca cuando el valor calculado (activo +
 * progreso) realmente cambia — no en cada emisión del bus — para no forzar
 * renders río abajo. Si no se pasa `onFocusChange`, el componente se
 * comporta exactamente igual que antes: cero suscripciones extra.
 */

interface SceneSectionProps {
  /** Id semántico para el motor WebGL (ej. "categories"). Distinto del id HTML. */
  sceneId: string
  children: ReactNode
  className?: string
  /** Id HTML real, para anclas/CSS existentes (independiente de `sceneId`). */
  htmlId?: string
  /**
   * Notifica cambios de foco de ESTA sección, derivados de la misma señal
   * que ya consume el motor WebGL (sin observers adicionales). No afecta a
   * la escena 3D ni al bus — es una salida de solo lectura para el árbol de
   * React. Opcional; no se usa hoy en ningún caller.
   */
  onFocusChange?: (state: SceneSectionFocusState) => void
}

export interface SceneSectionFocusState {
  /** `true` cuando esta sección es la dominante en viewport y superó el umbral de activación. */
  active: boolean
  /** 0..1 — progreso de visibilidad reportado por el bus mientras esta sección es la dominante; 0 en caso contrario. */
  progress: number
}

/**
 * Mismo umbral conceptual que usa `scene-bus.ts` internamente para decidir
 * si el hero está "activo" (no exportado, así que no se puede importar):
 * una sección recién asomando en el viewport no cuenta como enfocada.
 */
const ACTIVE_FOCUS_THRESHOLD = 0.35

/**
 * Espejo manual del vocabulario que `engine.ts` reconoce en `SECTION_MOOD`
 * (incluye el id de hero que usa `scene-bus.ts`). Ninguno de esos dos
 * archivos exporta sus tablas, así que esta lista se mantiene a mano; si
 * cambia `SECTION_MOOD` en `engine.ts`, actualizar acá también.
 */
const ENGINE_MOOD_VOCABULARY = new Set([
  'hero',
  'stats',
  'featured',
  'categories',
  'about',
  'entity-header',
  'entity-content',
])

/**
 * Resuelve el `sceneId` recibido al id que el motor realmente reconoce.
 * 1) Match exacto → se usa tal cual (cubre `entity-header`/`entity-content`).
 * 2) Sin match: si el id tiene forma `"<prefijo>-<sufijo>"`, se prueba el
 *    último segmento (cubre `"home-hero"` → `"hero"`, `"home-categories"` →
 *    `"categories"`, `"home-featured"` → `"featured"`, y cualquier sección
 *    futura nombrada con el mismo patrón `"<página>-<sección>"`).
 * 3) Si tampoco calza, se devuelve el id original sin modificar — igual que
 *    el comportamiento actual: nunca queda peor que antes de este cambio.
 */
function resolveEngineSectionId(sceneId: string): string {
  if (ENGINE_MOOD_VOCABULARY.has(sceneId)) return sceneId
  const suffix = sceneId.slice(sceneId.lastIndexOf('-') + 1)
  if (suffix && ENGINE_MOOD_VOCABULARY.has(suffix)) return suffix
  return sceneId
}

/**
 * Renderiza un `<section>` idéntico al que reemplaza (mismo tag, misma
 * clase, mismos hijos) y agrega el sensor de visibilidad que alimenta al
 * motor WebGL con el id correcto que el motor reconoce. No modifica
 * contenido ni funcionalidad de la sección — sigue siendo puramente
 * instrumentación.
 */
function SceneSectionComponent({ sceneId, children, className, htmlId, onFocusChange }: SceneSectionProps) {
  const engineSectionId = resolveEngineSectionId(sceneId)
  const ref = useSectionSceneFocus<HTMLElement>(engineSectionId)

  // Aviso de desarrollo únicamente: un `sceneId` que no resuelve a ningún
  // mood conocido no rompe nada (el motor conserva el mood previo), pero
  // probablemente sea un typo o una sección nueva que todavía no tiene
  // entrada en `SECTION_MOOD` — mejor detectarlo en dev que en producción
  // silenciosa. `console.warn` corre una sola vez por id distinto montado,
  // nunca en producción.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    if (ENGINE_MOOD_VOCABULARY.has(engineSectionId)) return
    console.warn(
      `[SceneSection] sceneId "${sceneId}" no coincide con ningún mood conocido del motor WebGL ` +
        `(ver SECTION_MOOD en engine.ts). La escena mantendrá el mood anterior en vez de adoptar uno propio. ` +
        `IDs reconocidos: ${Array.from(ENGINE_MOOD_VOCABULARY).join(', ')}.`
    )
  }, [sceneId, engineSectionId])

  // `onFocusChange` es opcional: guardamos la última función en un ref para
  // no tener que re-suscribirnos cada vez que el padre pasa un callback
  // nuevo por identidad (común con arrow functions inline).
  const onFocusChangeRef = useRef(onFocusChange)
  useEffect(() => {
    onFocusChangeRef.current = onFocusChange
  }, [onFocusChange])

  useEffect(() => {
    if (!onFocusChange) return

    const lastState = { active: false, progress: -1 }
    const evaluate = () => {
      const { focus } = webglSceneBus.getSnapshot()
      const isThisSection = focus.sectionId === engineSectionId
      const progress = isThisSection ? focus.progress : 0
      const active = isThisSection && progress >= ACTIVE_FOCUS_THRESHOLD
      if (active === lastState.active && progress === lastState.progress) return
      lastState.active = active
      lastState.progress = progress
      onFocusChangeRef.current?.({ active, progress })
    }

    evaluate()
    return webglSceneBus.subscribe(evaluate)
    // Solo re-suscribe si cambia la sección resuelta o si el callback pasa a
    // existir/dejar de existir — no por cada nueva identidad de función.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineSectionId, Boolean(onFocusChange)])

  return (
    <section
      ref={ref}
      id={htmlId}
      className={className}
      data-scene-section={sceneId}
      data-scene-engine-id={engineSectionId !== sceneId ? engineSectionId : undefined}
    >
      {children}
    </section>
  )
}

SceneSectionComponent.displayName = 'SceneSection'

/**
 * `memo`: evita re-renders cuando el padre se vuelve a renderizar pero las
 * props de esta sección (sceneId/className/htmlId/onFocusChange/children)
 * no cambiaron por referencia — la sección no tiene estado propio que
 * justifique volver a correr su cuerpo en esos casos.
 */
export const SceneSection = memo(SceneSectionComponent)
