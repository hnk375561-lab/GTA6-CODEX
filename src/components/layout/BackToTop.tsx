'use client'

import { useEffect, useState } from 'react'
import { smoothScrollTo } from '@/lib/scroll/smooth-scroll'
import { getFabLayout, subscribeFabLayout } from '@/lib/scroll/fab-layer'

/**
 * BackToTop — botón flotante global "Volver arriba" (layout.tsx).
 *
 * DÓNDE VIVE EL SISTEMA DE REGRESO
 *   Este FAB es el mecanismo general (documento): aparece solo cuando la
 *   persona scrolleó lo suficiente como para que volver arriba aporte
 *   valor, se oculta al volver cerca del inicio, y convive sin tapar nada
 *   con los otros elementos fijos del pie (anuncio ancla, barra del
 *   comparador, panel del comparador) vía `src/lib/scroll/fab-layer.ts`.
 *   El footer agrega el "Volver arriba" textual al final de la página
 *   (Footer.tsx), y los contenedores internos con scroll propio NO se
 *   tocan acá: este botón siempre scrollea el documento (`window`), nunca
 *   secuestra un scroll interno.
 *
 * VISIBILIDAD (performance)
 *   Un solo listener de scroll pasivo + rAF (una actualización por frame,
 *   nada por scroll-event) cuyo único trabajo es comparar `scrollY`
 *   contra un umbral ~media viewport en altura, y otro de `resize` para
 *   re-derivar el umbral en cambios de orientación/zoom. No hay
 *   IntersectionObserver ni layout thrashing: solo se lee `scrollY`.
 *
 * MOVIMIENTO
 *   Aparece/desaparece con fade + ascenso corto (ver `.fab-back-to-top`
 *   en globals.css, con `prefers-reduced-motion` cubierto). El scroll de
 *   subida usa `smoothScrollTo` — que ya degrada solo a instantáneo con
 *   reduced-motion (ver smooth-scroll.ts).
 *
 * ACCESIBILIDAD
 *   `<button>` semántico con nombre accesible ("Volver arriba"), fuera
 *   del tab-order cuando está oculto (`inert`), focus ring heredado del
 *   `:focus-visible` global naranja, y target táctil de 44×44 px.
 */

// Umbral de aparición: ~mitad de un viewport de alto, acotado entre 320px
// y 480px — suficiente para no aparecer en páginas cortas o en el
// arranque, rápido en móviles chicos, prudente en desktop alto.
function computeThreshold(): number {
  const vh = typeof window === 'undefined' ? 0 : window.innerHeight
  return Math.min(480, Math.max(320, Math.round(vh * 0.5)))
}

export function BackToTop() {
  const [visible, setVisible] = useState(false)
  // Altura acumulada de los docks del pie (ancla + barra comparador) para
  // desplazar el FAB por encima de ellos, y flag para ocultarlo si una
  // capa lo cubre (p.ej. el panel comparador abierto).
  const [dockHeight, setDockHeight] = useState(0)
  const [layerHidden, setLayerHidden] = useState(false)

  useEffect(() => {
    let rafId: number | null = null
    const update = () => {
      rafId = null
      setVisible(window.scrollY > computeThreshold())
    }
    const onScrollOrResize = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('resize', onScrollOrResize)
      if (rafId !== null) window.cancelAnimationFrame(rafId)
    }
  }, [])

  useEffect(
    () =>
      subscribeFabLayout(() => {
        const layout = getFabLayout()
        setDockHeight(layout.dockHeight)
        setLayerHidden(layout.hidden)
      }),
    []
  )

  const canShow = visible && !layerHidden

  return (
    <button
      type="button"
      onClick={() => smoothScrollTo(0)}
      aria-label="Volver arriba"
      aria-hidden={!canShow}
      inert={!canShow ? true : undefined}
      data-visible={canShow}
      className="fab-back-to-top"
      style={{
        bottom: `calc(${dockHeight}px + env(safe-area-inset-bottom) + var(--fab-gap))`,
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m18 15-6-6-6 6" />
      </svg>
    </button>
  )
}