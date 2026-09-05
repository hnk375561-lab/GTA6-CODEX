import type { CSSProperties } from 'react'

/** Desaceleración simple hacia el final — para elementos que "llegan" a su lugar. */
function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return 1 - Math.pow(1 - c, 3)
}

/** Expo-out liviana (== --ease-cine en CSS): arranque rápido + decel
   largo. Para el contenido "grande" de un capítulo (headline, piezas
   dominantes) — entra como un plano de cámara, no como una card. */
function easeOutExpo(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return c === 1 ? 1 : 1 - Math.pow(2, -10 * c)
}

export interface StaggerOptions {
  /** Fracción del progreso total [0,1] que ocupa la cascada completa (resto queda de "aire"). */
  spread?: number
  /** Desplazamiento vertical inicial en px. */
  distance?: number
  /** Arquetipo del elemento dentro del capítulo:
      - `'rise'` (default): asciende y asienta — contenido de lectura.
      - `'swell'`: crece sutilmente en escala — pieza visual dominante
        (showcase/media) que "se acerca" en vez de deslizarse.
      - `'emit'`: solo opacidad, sin desplazamiento — acentos/badges que
        no deben "moverse" dentro del panel (evita animation fatigue). */
  flavor?: 'rise' | 'swell' | 'emit'
  /** Curva del seguidor: `'cine'` usa la expo-out (== ease-cine del CSS). */
  easing?: 'cine' | 'cubic'
}

/**
 * Estilo inline para el N-ésimo de `total` elementos dentro de un panel, en
 * función del progreso *local* de ese panel (0 = recién entrando, 1 =
 * completamente asentado — el mismo `eased` que ya calcula
 * `PinnedScrollStages` para el crossfade del panel).
 *
 * En vez de que todo el contenido de un panel aparezca de golpe con el
 * fundido del panel, cada elemento tiene su propia "ventana" de progreso
 * dentro de esa cascada: el primero termina de entrar rápido, el último
 * recién arranca cuando el panel ya está casi asentado. Da sensación de
 * "vida" (las cosas no llegan todas a la vez) sin agregar ningún listener
 * ni estado nuevo — es puramente una función del mismo progreso que ya se
 * está leyendo por frame.
 *
 * Los defaults preservan exactamente el comportamiento histórico
 * (`rise` + `cubic` + distance 16): los jsonLd de la home existente no
 * cambian de look si no se pide otro arquetipo.
 */
export function staggerStyle(
  progress: number,
  index: number,
  total: number,
  { spread = 0.6, distance = 16, flavor = 'rise', easing = 'cubic' }: StaggerOptions = {}
): CSSProperties {
  const ease = easing === 'cine' ? easeOutExpo : easeOutCubic

  if (total <= 1) {
    const eased = ease(progress)
    return flavorStyle(eased, flavor, distance)
  }
  const step = spread / total
  const start = index * step
  const windowSize = 1 - spread + step // el último elemento igual llega a 1 cuando progress=1
  const local = (progress - start) / windowSize
  const eased = ease(local)
  return flavorStyle(eased, flavor, distance)
}

function flavorStyle(eased: number, flavor: 'rise' | 'swell' | 'emit', distance: number): CSSProperties {
  if (flavor === 'swell') {
    return {
      opacity: eased,
      transform: `scale(${1.045 - 0.045 * eased})`,
    }
  }
  if (flavor === 'emit') {
    return { opacity: eased }
  }
  return {
    opacity: eased,
    transform: `translateY(${(1 - eased) * distance}px)`,
  }
}

/** Progreso de "retirada" de un panel cuando el siguiente empieza a entrar
 *  (0 = el panel manda, 1 = cedió el protagonismo). Es el lado "salida"
 *  del sistema: el capítulo actual se aleja (sube y se difumina) mientras
 *  el siguiente se materializa. Pura función del progreso del panel
 *  siguiente — mismo precio en rAF que ya paga el track. */
export function recedeStyle(pull: number): CSSProperties {
  const p = Math.min(1, Math.max(0, pull))
  if (p <= 0) return {}
  return {
    opacity: 1 - 0.3 * p,
    transform: `translate3d(0, ${-2.2 * p}%, 0) scale(${1 + 0.018 * p})`,
    willChange: p < 1 ? 'transform, opacity' : undefined,
  }
}
