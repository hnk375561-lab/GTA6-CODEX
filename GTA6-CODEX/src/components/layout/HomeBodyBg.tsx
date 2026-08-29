'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * `body`/`html` son globales por definición (`color-scheme: dark` y el
 * fondo `bg-auto-dark` de globals.css) — el resto del sitio (fichas,
 * listados) sigue viviendo en el tema oscuro "Leonida Nights" y no hay que
 * tocar eso. Pero la home rediseñada es blanca de punta a punta, y sin
 * este puente el `body` oscuro de fondo se alcanza a ver: en el
 * overscroll/rubber-band de iOS al pasar el borde superior o inferior del
 * panel pineado, y en el área de safe-inset detrás del notch/home-indicator
 * en dispositivos con recorte. Ahí el usuario vería un destello oscuro
 * rompiendo el blanco "full-bleed" que se pidió.
 *
 * Se aplica/retira vía clase en el montaje según la ruta en vez de CSS
 * condicional por server, porque `html`/`body` viven en el layout raíz
 * (compartido por todas las rutas) y no hay forma de darles props
 * distintas por página sin esto.
 */
export function HomeBodyBg() {
  const pathname = usePathname()

  useEffect(() => {
    const isHome = pathname === '/'
    const root = document.documentElement
    const { body } = document

    if (isHome) {
      root.style.colorScheme = 'light'
      body.classList.add('home-bg-white')
    }

    return () => {
      root.style.colorScheme = ''
      body.classList.remove('home-bg-white')
    }
  }, [pathname])

  return null
}
