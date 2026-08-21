'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'

const STORAGE_KEY = 'gta6zona-cookie-consent'

type ConsentState = 'accepted' | 'rejected' | null

/**
 * Gatea la carga de Google Analytics detrás de un consentimiento explícito
 * del usuario (banner aceptar/rechazar), en vez de inyectar el script de
 * `gtag` incondicionalmente apenas hay un `NEXT_PUBLIC_GA_ID` configurado.
 *
 * Por qué: GA sin gating de consentimiento previo es un problema de
 * cumplimiento GDPR/ePrivacy en cuanto el sitio reciba tráfico de la UE —
 * ver AUDITORIA_CRITICA_VENTA.md sección 6.2. Este componente resuelve
 * solo eso, es intencionalmente mínimo (sin librería de CMP de terceros,
 * sin categorías granulares) y no toca AdSense.
 *
 * Guardamos la decisión en localStorage (no cookie) a propósito: es
 * exactamente lo que se está decidiendo (si se puede trackear al usuario),
 * así que la propia decisión no debería depender de una cookie que ya
 * requeriría el mismo consentimiento para setearse con TTL largo.
 */
export function ConsentBanner({ gaId }: { gaId: string }) {
  const [consent, setConsent] = useState<ConsentState>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'accepted' || stored === 'rejected') {
      setConsent(stored)
    }
    setHydrated(true)
  }, [])

  const decide = (value: 'accepted' | 'rejected') => {
    window.localStorage.setItem(STORAGE_KEY, value)
    setConsent(value)
  }

  return (
    <>
      {consent === 'accepted' && (
        <>
          <Script strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `}
          </Script>
        </>
      )}

      {hydrated && consent === null && (
        <div
          role="dialog"
          aria-label="Consentimiento de cookies"
          className="fixed inset-x-0 bottom-0 z-[200] border-t border-gta-border bg-gta-darker/95 px-4 py-4 backdrop-blur-sm sm:px-6"
        >
          <div className="container-max flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-gta-text-secondary">
              Usamos cookies analíticas para entender cómo se usa el sitio. Podés aceptarlas o rechazarlas —
              el sitio funciona igual en ambos casos.
            </p>
            <div className="flex shrink-0 gap-3">
              <button
                onClick={() => decide('rejected')}
                className="rounded-lg border border-gta-border px-4 py-2 text-sm font-semibold text-gta-text-secondary transition-colors hover:text-gta-text"
              >
                Rechazar
              </button>
              <button
                onClick={() => decide('accepted')}
                className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold text-gta-darker"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
