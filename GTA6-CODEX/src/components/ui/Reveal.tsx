'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { webglSceneBus } from '@/lib/webgl/scene-bus'

interface RevealProps {
  children: ReactNode
  className?: string
  /** Retraso en ms aplicado cuando el elemento entra en pantalla */
  delay?: number
  /** Dirección de entrada. 'curtain' = cortina en clip-path (ver globals.css),
   *  para secciones donde se quiere un reveal más cinematográfico que el
   *  fade+slide de las demás direcciones. */
  direction?: 'up' | 'left' | 'right' | 'zoom' | 'curtain'
  /** Si es true, la animación se repite cada vez que reingresa al viewport */
  once?: boolean
  /**
   * Apaga el parallax continuo de abajo (--rv-offset) y deja solo el
   * fade+slide de entrada de un solo disparo, como el <Reveal> original.
   * Pensado para bloques donde el drift no suma (ej. texto legal largo,
   * footers) o donde ya hay otra animación en `transform` con la que
   * competiría.
   */
  disableMotion?: boolean
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Envuelve a sus hijos y les agrega dos animaciones distintas, ambas
 * disparadas por IntersectionObserver y sin dependencias externas:
 *
 * 1. Reveal de entrada (fade + slide/curtain), un solo disparo por
 *    default: el comportamiento original de este componente, sin cambios
 *    — controla la clase `.reveal-visible` vía React state.
 *
 * 2. Parallax continuo ("--rv-offset" / "--rv-mag" / "--rv-skew" en
 *    globals.css): un segundo observer, más fino (33 umbrales), que NO
 *    toca React state — escribe las custom properties directo en el
 *    nodo del DOM en cada cruce de umbral. Esto es intencional: usar
 *    setState acá dispararía un re-render de React en cada uno de esos
 *    ~33 pasos por elemento, algo que se vuelve costoso rápido en
 *    listados grandes (/vehiculos, 62 `EntityCard`, cada una envuelta
 *    en `<Reveal>`). Escribir el CSS var directo evita esa cascada de
 *    renders: el navegador solo repinta ese elemento, y
 *    `content-visibility: auto` en las cards (ver globals.css) ya se
 *    encarga de que las que están fuera de pantalla ni siquiera lleguen
 *    a esta fase. Corre para las 5 direcciones, `curtain` incluida: el
 *    clip-path de la cortina y el drift de acá conviven sin pisarse
 *    (son propiedades CSS distintas).
 *
 *    Mientras el elemento está efectivamente visible, además se
 *    suscribe al `webglSceneBus` (la misma señal de velocidad de scroll
 *    que ya alimenta al motor WebGL, ver `lenis-provider.tsx`) para
 *    aplicar un leve `skewX` proporcional a qué tan rápido se está
 *    scrolleando en ese instante — el gesto característico de
 *    rockstargames.com/VI: el contenido se "inclina" con la velocidad
 *    real del scroll, no con su posición. Se desuscribe apenas el
 *    elemento sale de pantalla, así que en cualquier momento hay como
 *    mucho una decena de suscriptores vivos, no uno por cada `<Reveal>`
 *    del sitio.
 *
 * A diferencia del observer de entrada, este segundo observer NO se
 * desconecta con `once` — el drift tiene que seguir actualizándose
 * durante todo el tránsito del elemento por el viewport, no solo en el
 * primer 15% que dispara el fade-in. Como IntersectionObserver solo
 * llama al callback en los cruces de umbral (no en cada frame de
 * scroll), dejarlo montado el resto de la vida del componente es barato:
 * en un scroll típico de viewport a viewport son ~25 llamadas, no miles.
 */
export function Reveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  once = true,
  disableMotion = false,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const revealObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          if (once) revealObserver.unobserve(node)
        } else if (!once) {
          setVisible(false)
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    revealObserver.observe(node)

    let motionObserver: IntersectionObserver | undefined
    let busUnsubscribe: (() => void) | undefined

    if (!disableMotion) {
      const thresholds = Array.from({ length: 33 }, (_, i) => i / 32)
      motionObserver = new IntersectionObserver(
        ([entry]) => {
          const rootHeight = entry.rootBounds?.height ?? window.innerHeight
          const elCenter = entry.boundingClientRect.top + entry.boundingClientRect.height / 2
          // -1 = el elemento todavía está por debajo del centro del
          // viewport (recién entrando), 0 = centrado, 1 = ya lo pasó
          // (saliendo por arriba). Con esto el drift cambia de signo a
          // mitad de camino: entra "cayendo" y sale "flotando", en vez
          // de una traslación monótona en una sola dirección.
          const offset = clamp((elCenter - rootHeight / 2) / (rootHeight / 2), -1, 1)
          node.style.setProperty('--rv-offset', offset.toFixed(3))
          node.style.setProperty('--rv-mag', Math.abs(offset).toFixed(3))

          // Suscripción al `webglSceneBus` de velocidad de scroll SOLO
          // mientras el elemento está realmente en pantalla (no antes,
          // no después) — el bus emite en cada tick de Lenis mientras
          // hay scroll activo (~60/s), así que suscribir esto de forma
          // permanente en cada <Reveal> del sitio sería cientos de
          // listeners despiertos todo el tiempo. Acotado a "elementos
          // actualmente visibles" el conteo real de suscriptores vivos
          // en cualquier momento es, como mucho, los pocos que entran en
          // un viewport (una decena, no cientos).
          if (entry.isIntersecting && !busUnsubscribe) {
            busUnsubscribe = webglSceneBus.subscribe(() => {
              const { velocity } = webglSceneBus.getSnapshot().scroll
              // tanh satura suave en vez de un clamp seco: a velocidad
              // de scroll normal el skew es sutil, en un "scrolleo"
              // brusco satura en ±9° en vez de irse a un ángulo
              // absurdo con un solo salto de rueda grande.
              const skew = Math.tanh(velocity * 0.05) * 9
              node.style.setProperty('--rv-skew', skew.toFixed(2))
            })
          } else if (!entry.isIntersecting && busUnsubscribe) {
            busUnsubscribe()
            busUnsubscribe = undefined
            node.style.setProperty('--rv-skew', '0')
          }
        },
        { threshold: thresholds }
      )
      motionObserver.observe(node)
    }

    return () => {
      revealObserver.disconnect()
      motionObserver?.disconnect()
      busUnsubscribe?.()
    }
  }, [once, disableMotion])

  return (
    <div
      ref={ref}
      data-dir={direction}
      className={`reveal ${visible ? 'reveal-visible' : ''} ${className}`.trim()}
      style={{ ['--reveal-delay' as string]: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
