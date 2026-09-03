'use client'

import { useEffect, useState } from 'react'
import { AdUnit } from '@/components/monetization/AdUnit'

const DISMISS_KEY = 'sinfrenos-sticky-ad-dismissed'

// Slot de AdSense dedicado para el formato "Anchor ad" (anuncio ancla,
// fijo al pie de pantalla en mobile). Requiere crear ese slot puntual desde
// AdSense (Anuncios → Por unidad de anuncio → In-page → Ancla) — NO
// reutilizar uno de los slotId de `format="responsive"` que ya usan las
// otras páginas, porque el formato ancla necesita su propio slot dado de
// alta como tal en la cuenta. Hasta reemplazar este placeholder por el
// slot real, AdSense simplemente no lo va a rellenar (no rompe nada:
// mismo criterio fail-soft que el resto de `AdUnit.tsx`).
const STICKY_AD_SLOT_ID = '0000000000'

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
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-edge bg-surface-card/95 px-2 py-1.5 shadow-[0_-2px_12px_rgba(0,0,0,0.08)] backdrop-blur md:hidden"
      data-tracking="sticky-anchor-ad"
    >
      <div className="min-w-0 flex-1">
        <AdUnit slotId={STICKY_AD_SLOT_ID} format="horizontal" className="my-0" dataTrackingLabel="ad-sticky-anchor" />
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Cerrar anuncio"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-edge bg-white text-neutral-400 hover:text-neutral-700"
      >
        ✕
      </button>
    </div>
  )
}
