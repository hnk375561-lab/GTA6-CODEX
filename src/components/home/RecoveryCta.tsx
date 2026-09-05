'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

/* CTA de recuperación del recorrido del expediente (home).

   La home scrollea ~16 viewports dentro del track de `PinnedScrollStages`
   (`data-home-track`). La acción principal (search del hero + chips) vive
   al inicio y el panel de cierre "Decidí" (con sus dos CTAs) al final.
   En el medio hay paneles de solo lectura donde el usuario consume
   contenido sin comprometerse con ninguna card: Evidencia ("un dato, una
   fuente") y el primer tramo de Rankings. Esos son los MOMENTOS en los
   que la persona puede querer "pasar a la acción" y la página no ofrece
   ninguna ruta hacia el catálogo. Esta pill reabre esa ruta con una sola
   acción (`/vehiculos`).

   ZONAS (por diseño, no por píxeles recorridos):
   - Aparece: Evidencia y Rankings — contenido leído, sin formularios,
     sin ads, sin botones que tapar; las grillas (Categorías, Destacados,
     Noticias) quedan fuera porque sus cards YA son CTAs por ítem y una
     pill encima competiría (anti-spam).
   - No aparece: hero (search + chips ya visibles), Comparador y
     Financiamiento (interactivos: botones/inputs que no hay que cubrir),
     y "Decidí" — cuando ese panel asoma, es la mejor acción visible del
     recorrido y la pill se apaga (anti-duplicación visual, regla 7).

   CONDICIONES (lógica mínima, sin Work de scroll):
   - Scroll hacia abajo: bajando se ofrece la continuación; al volver
     hacia arriba la pill se oculta (arriba está el hero con su search,
     no hace falta recuperación).
   - La zona debe estar CENTRADA de verdad en el viewport (IO con banda
     `-20%`): no aparece al rozar un panel en un scroll rápido.
   - Un solo vector de dirección compartido entre el scroll del track
     (`data-home-track`, escucha propia: el scroll interno NO burbujea a
     `window`) y el de `window` (tramo post-track / FAQ), throttled por
     rAF sobre listeners pasivos: no se lee layout por frame, solo el
     offset del scroller activo.

   ACCESSIBILIDAD: `<a>` real, focus-visible heredado; mientras está
   oculto queda fuera del tab-order (`inert`) y del árbol de
   accesibilidad (`aria-hidden`). Reduced-motion solo apaga la transición
   (el CTA sigue apareciendo: es función, no decoración). */
const RECOVERY_ZONE_IDS = ['evidencia', 'rankings']
const FINAL_CTA_STAGE = 'decidir'

export function RecoveryCta() {
  const [canShow, setCanShow] = useState(false)
  const flagsRef = useRef({
    goingDown: true,
    finalCtaVisible: false,
    zoneVisible: {} as Record<string, boolean>,
  })

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-stage-id]'))
    const zoneTargets = sections.filter((el) => RECOVERY_ZONE_IDS.includes(el.dataset.stageId ?? ''))
    const finalTarget = sections.find((el) => el.dataset.stageId === FINAL_CTA_STAGE)
    if (zoneTargets.length === 0 && !finalTarget) return

    const publish = () => {
      const { goingDown, finalCtaVisible, zoneVisible } = flagsRef.current
      setCanShow(
        goingDown && !finalCtaVisible && RECOVERY_ZONE_IDS.some((id) => zoneVisible[id])
      )
    }

    const zoneObserver = new IntersectionObserver(
      (entries) => {
        let changed = false
        for (const entry of entries) {
          const id = entry.target.getAttribute('data-stage-id')
          if (!id || !RECOVERY_ZONE_IDS.includes(id)) continue
          if (flagsRef.current.zoneVisible[id] !== entry.isIntersecting) {
            flagsRef.current.zoneVisible[id] = entry.isIntersecting
            changed = true
          }
        }
        if (changed) publish()
      },
      { rootMargin: '-20% 0px -20% 0px' }
    )

    const finalObserver = new IntersectionObserver(
      (entries) => {
        let changed = false
        for (const entry of entries) {
          const visible = entry.isIntersecting
          if (flagsRef.current.finalCtaVisible !== visible) {
            flagsRef.current.finalCtaVisible = visible
            changed = true
          }
        }
        if (changed) publish()
      },
      { rootMargin: '-10% 0px -10% 0px' }
    )

    let rafId = 0
    let lastY = -1
    const track = document.querySelector<HTMLElement>('[data-home-track]')
    const readScroller = (): number => (track ? track.scrollTop : window.scrollY)
    const onScroll = () => {
      if (rafId) return
      rafId = window.requestAnimationFrame(() => {
        rafId = 0
        const y = readScroller()
        const base = Math.max(0, lastY)
        if (y < base) {
          flagsRef.current.goingDown = false
          publish()
        } else if (y > base || base === 0) {
          flagsRef.current.goingDown = true
          publish()
        }
        lastY = y
      })
    }

    zoneTargets.forEach((el) => zoneObserver.observe(el))
    if (finalTarget) finalObserver.observe(finalTarget)
    lastY = readScroller()
    // Dirección del scroll: el track scrollea INTERNO (el evento no
    // burbujea a `window`), así que el listener va también sobre el
    // contenedor; el de `window` cubre el tramo post-track (FAQ) y el
    // fallback si el contenedor no está. Ambos pasivos y compartiendo el
    // mismo throttle de rAF.
    track?.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      zoneObserver.disconnect()
      finalObserver.disconnect()
      track?.removeEventListener('scroll', onScroll)
      window.removeEventListener('scroll', onScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <Link
      href="/vehiculos"
      inert={!canShow ? true : undefined}
      aria-hidden={!canShow}
      data-visible={canShow}
      className="recovery-fab"
    >
      <span>Ver todos los vehículos</span>
      <svg
        className="recovery-fab__arrow"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    </Link>
  )
}