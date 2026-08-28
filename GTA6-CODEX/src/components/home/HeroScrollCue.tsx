'use client'

import { smoothScrollTo } from '@/lib/scroll/scroll-telemetry'

/**
 * Invitación a seguir scrolleando debajo del hero. Antes era un `<div>`
 * puramente decorativo (aria-hidden, sin interacción); ahora es un botón
 * real que hace scroll suave a la sección siguiente al hacer click/Enter,
 * y queda en el orden de tabulación normal para quien navega con teclado
 * o lector de pantalla. Vive en su propio Client Component porque
 * `src/app/page.tsx` es un Server Component (async) y no puede pasar
 * handlers de evento inline a elementos del DOM.
 *
 * Usa `smoothScrollTo` (`scroll-telemetry.tsx`), que centraliza el salto
 * puntual con `scrollIntoView`/`scrollTo` nativo — sitio estático, sin un
 * segundo motor de scroll con inercia propia.
 */
export function HeroScrollCue() {
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const heroSection = e.currentTarget.closest('section')
    const next = heroSection?.nextElementSibling
    if (next instanceof HTMLElement) smoothScrollTo(next)
  }

  return (
    <button
      type="button"
      className="hero-scroll-cue"
      aria-label="Desplazarse a la siguiente sección"
      onClick={handleClick}
    >
      <span className="hero-scroll-cue-label">Desplazate</span>
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
        <path d="M12 5v14M5 12l7 7 7-7" />
      </svg>
    </button>
  )
}
