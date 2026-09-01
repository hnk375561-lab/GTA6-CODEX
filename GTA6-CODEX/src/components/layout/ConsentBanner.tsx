'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { useModalFocus } from '@/lib/hooks/useModalFocus'

const STORAGE_KEY = 'sinfrenos-cookie-consent'
// Nota: la key anterior ('gta6zona-cookie-consent') era un resabio del
// nombre viejo del sitio (pivote GTA6 Zona -> AutoFicha). Se renombra acá
// para no arrastrar branding legado en storage del navegador del usuario;
// como efecto secundario, quienes ya habían aceptado/rechazado bajo la key
// vieja van a ver el banner una vez más (trade-off aceptable frente a
// dejar una key con el nombre del proyecto descartado).

type ConsentState = 'accepted' | 'rejected' | null

/**
 * Gatea la carga de Google Analytics y Google AdSense detrás de un
 * consentimiento explícito del usuario (banner aceptar/rechazar), en vez
 * de inyectar esos scripts incondicionalmente apenas hay un
 * `NEXT_PUBLIC_GA_ID`/`NEXT_PUBLIC_ADSENSE_CLIENT_ID` configurado.
 *
 * Por qué: cargar GA o anuncios personalizados sin gating de
 * consentimiento previo es un problema de cumplimiento GDPR/ePrivacy en
 * cuanto el sitio reciba tráfico de la UE/UK — Google además lo exige
 * explícitamente para publishers de AdSense en esas regiones (Consent
 * Mode). Este componente es intencionalmente mínimo (sin librería de CMP
 * de terceros, sin categorías granulares): una sola decisión binaria que
 * gatea ambos scripts por igual.
 *
 * Nota: la CSP (estática, en next.config.js) también necesita permitir el
 * dominio de AdSense en `script-src` para que el script llegue a cargar
 * una vez que el consentimiento esté resuelto.
 *
 * Guardamos la decisión en localStorage (no cookie) a propósito: es
 * exactamente lo que se está decidiendo (si se puede trackear al usuario),
 * así que la propia decisión no debería depender de una cookie que ya
 * requeriría el mismo consentimiento para setearse con TTL largo.
 *
 * E-1 (auditoría, ago 2026) — se probó pasar script-src a nonce por
 * request (sacando 'unsafe-inline'), pero eso obliga a que el layout raíz
 * lea headers() en cada request, lo que fuerza TODAS las rutas del sitio
 * a renderizarse dinámicamente — en Vercel/Hobby cada ruta dinámica es su
 * propia Serverless Function, y el proyecto pasó el tope de 12 y rompió
 * el deploy. Se revirtió a CSP estática con 'unsafe-inline' en
 * script-src (ver next.config.js), así que estos <Script> ya no
 * necesitan/reciben un prop `nonce`.
 */
export function ConsentBanner({
  gaId,
  adsenseClientId,
}: {
  gaId?: string
  adsenseClientId?: string
}) {
  const [consent, setConsent] = useState<ConsentState>(null)
  const [hydrated, setHydrated] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const showBanner = hydrated && consent === null

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'accepted' || stored === 'rejected') {
      setConsent(stored)
    }
    setHydrated(true)
  }, [])

  // El banner no tiene un botón que lo "abra" (aparece solo, ver
  // showBanner arriba) — el hook igual sirve acá para atrapar Tab dentro
  // de sus dos botones mientras está visible; al cerrarse devuelve el
  // foco a lo que estuviera enfocado antes (normalmente nada/body, sin
  // efecto visible).
  useModalFocus(showBanner, dialogRef)

  const decide = (value: 'accepted' | 'rejected') => {
    window.localStorage.setItem(STORAGE_KEY, value)
    setConsent(value)
  }

  return (
    <>
      {consent === 'accepted' && gaId && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
          />
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

      {consent === 'accepted' && adsenseClientId && (
        <Script
          async
          strategy="afterInteractive"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
          crossOrigin="anonymous"
        />
      )}

      {hydrated && consent === null && (
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-label="Consentimiento de cookies"
          className="fixed inset-x-0 bottom-0 z-[200] border-t border-auto-border bg-auto-darker/95 px-4 py-4 backdrop-blur-sm sm:px-6"
        >
          <div className="container-max flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-auto-text-secondary">
              Usamos cookies analíticas y, cuando estén activos, anuncios personalizados, para financiar y
              mejorar el sitio. Podés aceptarlas o rechazarlas — el sitio funciona igual en ambos casos.
            </p>
            <div className="flex shrink-0 gap-3">
              <button
                onClick={() => decide('rejected')}
                className="rounded-lg border border-auto-border px-4 py-2 text-sm font-semibold text-auto-text-secondary transition-colors hover:text-auto-text"
              >
                Rechazar
              </button>
              <button
                onClick={() => decide('accepted')}
                className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold text-auto-darker"
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
