'use client'

import { useEffect, useState } from 'react'
import { AdUnit } from '@/components/monetization/AdUnit'

const DISMISS_KEY = 'sinfrenos-sticky-ad-dismissed'

// Slot de AdSense dedicado para el formato "Anchor ad" (anuncio ancla,
// fijo al pie de pantalla en mobile). Requiere crear ese slot puntual desde
// AdSense (Anuncios → Por unidad de anuncio → In-page → Ancla).
// IMPORTANTE: Reemplazar con tu slotId real de AdSense (formato numérico).
// Instrucciones:
// 1. Ve a Google AdSense > Anuncios > Por unidad de anuncio
// 2. Crea nuevo slot tipo "In-page" > "Ancla (sticky)"
// 3. Copia el ID numérico de 16 dígitos
// 4. Reemplaza '0000000000' con ese ID en las variables de entorno:
//    NEXT_PUBLIC_ADSENSE_ANCHOR_SLOT_ID=tu_slot_id_aqui
const STICKY_AD_SLOT_ID = process.env.NEXT_PUBLIC_ADSENSE_ANCHOR_SLOT_ID || '0000000000'

/**
 * Anuncio ancla (sticky) para mobile — canal nuevo, documentado en
 * `docs/monetizacion-plan.md` sección 2.18.
 *
 * Por qué esto es un canal aparte de los `AdUnit` ya distribuidos por el
 * sitio (ficha, comparador, rankings, etc.): esos son inventario "en
 * línea" (compiten por espacio con el contenido, uno por página). El
 * formato ancla es inventario ADICIONAL que Google reconoce y permite
 * explícitamente además de los anuncios in-page — no cuenta contra el
 * límite de anuncios por pantalla de las políticas de AdSense, así que es
 * ingreso incremental real, no una reordenada de lo que ya había.
 *
 * Por qué solo mobile: en desktop el ancla ocupa una franja fija del
 * viewport de forma mucho más intrusiva relativo al contenido visible —
 * el criterio del sitio en general (ver ConsentBanner, NativeAdUnit) es
 * priorizar que la experiencia no se sienta invadida de anuncios.
 *
 * Dismissible: el botón "✕" guarda la decisión en `sessionStorage` (no
 * localStorage) a propósito — repetir el anuncio en la próxima visita
 * mantiene el inventario mostrándose sin insistir dentro de la misma
 * sesión si la persona ya lo cerró.
 *
 * Fail-closed heredado de `AdUnit.tsx`: sin `NEXT_PUBLIC_ADSENSE_CLIENT_ID`
 * configurado, `<AdUnit>` no renderiza nada y este wrapper tampoco muestra
 * el contenedor/botón de cerrar (nada que cerrar si no hay anuncio).
 */
export function StickyAdUnit() {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    const stored = window.sessionStorage.getItem(DISMISS_KEY)
    setDismissed(stored === '1')
  }, [])

  if (dismissed || !process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID) return null

  const handleDismiss = () => {
    window.sessionStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    /* z-30 (y no z-40 como la barra del comparador): cuando el comparador
       está activo ambos flotan sobre el pie del viewport; la barra del
       comparador queda POR ENCIMA del ancla para que sus botones
       (Limpiar/Comparar) sigan siendo tocables. El consent banner (z-200)
       y los modales (z-50) ya pisan al ancla con o sin este cambio. */
    <div
      className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-edge bg-surface-card/95 px-2 py-1.5 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgba(0,0,0,0.08)] backdrop-blur md:hidden"
      data-tracking="sticky-anchor-ad"
    >
      <div className="min-w-0 flex-1">
        <AdUnit slotId={STICKY_AD_SLOT_ID} format="horizontal" className="my-0" dataTrackingLabel="ad-sticky-anchor" />
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Cerrar anuncio"
        className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-edge bg-white text-neutral-400 transition duration-200 hover:border-neutral-300 hover:text-neutral-700 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']"
      >
        ✕
      </button>
    </div>
  )
}
