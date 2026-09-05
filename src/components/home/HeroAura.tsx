'use client'

import { useEffect, useRef } from 'react'

/**
 * Capa atmosférica del hero (ver las clases `.hero-aura-blob-*` en
 * globals.css). Dos glows de gradiente que se desplazan MUY sutilmente en
 * dirección CONTRARIA al cursor: es la capa de fondo de la pila de
 * profundidad del hero — se mueve MÁS que el contenido (`Parallax` del
 * título usa amplitud 8px y y·0.6; esta capa usa ±14px/±10px), así la
 * separación entre fondo y contenido se lee en 3D sin que "la página
 * persiga al cursor".
 *
 * Disciplina:
 *  - Un solo listener `pointermove` en `window`, pasivo y throttled por
 *    rAF (se escribe una vez por frame, sin jitter).
 *  - Solo puntero de tipo `mouse` — en touch no se instala el efecto (en
 *    móvil no hay parallax de puntero, por diseño).
 *  - `prefers-reduced-motion`: sin listener; los glows quedan estáticos
 *    en su opacidad base (la entrada de CSS también se apaga, ver reduce).
 *  - La suavidad de la interpolación sale de la `transition: transform
 *    200ms ease-out` que lleva cada blob: cada destino pequeño del mouse
 *    se persigue con easing en vez de saltar de frame en frame.
 *  - El wrapper `hero-aura` aisla el desborde (overflow: hidden) para que
 *    agrandar los blobs jamás genere scroll horizontal.
 */
export function HeroAura() {
  const blobARef = useRef<HTMLSpanElement>(null)
  const blobBRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')

    let raf = 0
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const nx = (e.clientX / window.innerWidth) * 2 - 1 // [-1, 1]
        const ny = (e.clientY / window.innerHeight) * 2 - 1
        const a = blobARef.current
        const b = blobBRef.current
        if (a) a.style.transform = `translate3d(${nx * 14}px, ${ny * 10}px, 0)`
        if (b) b.style.transform = `translate3d(${nx * -11}px, ${ny * -8}px, 0)`
      })
    }

    // Listener solo mientras no haya prefers-reduced-motion; si cambia en
    // caliente, se agrega/remueve (mismo patrón que `Parallax`).
    const attach = () => window.addEventListener('pointermove', onPointerMove, { passive: true })
    const detach = () => window.removeEventListener('pointermove', onPointerMove)
    const apply = () => (mql.matches ? detach() : attach())

    apply()
    const onChange = () => apply()
    mql.addEventListener('change', onChange)

    return () => {
      detach()
      mql.removeEventListener('change', onChange)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <span className="hero-aura" aria-hidden="true">
      <span ref={blobARef} className="hero-aura-blob hero-aura-blob--a" />
      <span ref={blobBRef} className="hero-aura-blob hero-aura-blob--b" />
    </span>
  )
}