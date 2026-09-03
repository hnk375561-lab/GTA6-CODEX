import { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
// Autohospedadas vía @fontsource (paquetes npm con los .woff2 empaquetados,
// sin llamada a fonts.googleapis.com/fonts.gstatic.com en build ni en
// runtime): antes `--font-sans`/`--font-display`/`--font-mono` en
// globals.css nombraban 'Inter'/'Space Grotesk'/'JetBrains Mono' sin que
// esas fuentes se cargaran en ningún lado del proyecto (ni next/font, ni
// <link>, ni @font-face propio) — el sitio entero, incluido el <h1> del
// hero (candidato a LCP), renderizaba siempre en la fuente de sistema del
// visitante, nunca en la tipografía diseñada. Se importan solo los pesos
// que el CSS realmente usa (400/500/600/700, ver font-bold/font-semibold/
// font-medium/font-normal y los font-weight explícitos en globals.css)
// para no traer pesos muertos. Cada archivo trae `font-display: swap`
// de fábrica, así que el texto es visible con la fuente de fallback
// mientras carga el woff2 (sin FOIT).
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { TrendingBar } from '@/components/layout/TrendingBar'
import { Footer } from '@/components/layout/Footer'
import { ConsentBanner } from '@/components/layout/ConsentBanner'
import { PageTransitionBridge } from '@/components/layout/PageTransitionBridge'
import { ScrollRestorationBridge } from '@/components/layout/ScrollRestorationBridge'
import { HideOnHome } from '@/components/layout/HideOnHome'
import { StickyAdUnit } from '@/components/monetization/StickyAdUnit'

import { SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/config/site'
// GA4 solo se activa si hay un ID real configurado. Sin esto, un build sin
// NEXT_PUBLIC_GA_ID enviaría eventos a un ID placeholder inexistente.
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID
// Google AdSense: mismo criterio que GA4. No se activa hasta que exista
// NEXT_PUBLIC_ADSENSE_CLIENT_ID (formato "ca-pub-XXXXXXXXXXXXXXXX"), que se
// obtiene al aprobar la cuenta de AdSense. Cargar esto sin una cuenta
// aprobada no hace nada útil y solo suma peso a la página, por eso queda
// condicionado igual que GA4.
const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${SITE_NAME} | ${SITE_TAGLINE}`,
  description:
    'Fichas técnicas de autos y motos con specs reales por fabricante, comparador lado a lado y buscador. Datos con fuente primaria.',
  keywords: ['autos', 'motos', 'fichas técnicas', 'comparador de autos', 'specs', 'precio autos'],
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: 'Fichas técnicas de autos y motos con specs reales, comparador lado a lado y buscador.',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: 'Fichas técnicas de autos y motos con specs reales, comparador lado a lado y buscador.',
  },
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
  alternates: {
    canonical: SITE_URL,
  },
  // Google Search Console — verificación de propiedad vía Metadata API
  // (equivalente a pegar <meta name="google-site-verification" .../> a
  // mano en el <head>, pero versionado y sin tocar JSX). Necesario para
  // que Search Console indexe el sitio y podamos enviar el sitemap.
  verification: {
    google: 'pb7e68bu_z5ptG8TL4fg2eoGK7gyXEaFkM6U3buM-LA',
  },
  other: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
    ? { 'google-adsense-account': process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID }
    : undefined,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // E-1 (auditoría, ago 2026) — REVERTIDO 31 ago 2026: se probó pasar a
  // nonce por request (leyendo headers() acá), pero eso fuerza a TODAS las
  // rutas del sitio a renderizarse dinámicamente porque este layout raíz
  // envuelve todo. En Vercel/Hobby cada ruta dinámica es su propia
  // Serverless Function, y el proyecto pasó el tope de 12, rompiendo el
  // deploy. Se vuelve a la CSP estática (ver next.config.js) sin nonce.
  return (
    <html lang="es">
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-neutral-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Saltar al contenido principal
        </a>
        {(GA_MEASUREMENT_ID || ADSENSE_CLIENT_ID) && (
          <ConsentBanner gaId={GA_MEASUREMENT_ID} adsenseClientId={ADSENSE_CLIENT_ID} />
        )}
        <ScrollRestorationBridge />
        <PageTransitionBridge />
        <div id="page-content" className="relative z-10 flex min-h-dvh flex-1 flex-col">
          <Header />
          <HideOnHome>
            <TrendingBar />
          </HideOnHome>
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <HideOnHome>
            <Footer />
          </HideOnHome>
        </div>
        {/* Monetización: anuncio ancla (sticky) mobile, canal nuevo — ver
            StickyAdUnit.tsx y docs/monetizacion-plan.md sección 2.18.
            Oculto en home por el mismo motivo que TrendingBar/Footer (ver
            HideOnHome.tsx): el layout pineado de "/" no tiene margen fijo
            de pantalla para regalarle a una barra inferior. */}
        <HideOnHome>
          <StickyAdUnit />
        </HideOnHome>
        {/* Vercel Analytics: no usa cookies ni almacenamiento persistente
            (a diferencia de GA4), por lo que no requiere pasar por
            ConsentBanner. Solo reporta datos si el sitio está deployado
            en Vercel con Analytics habilitado en el dashboard del
            proyecto; en cualquier otro entorno es un no-op silencioso. */}
        <Analytics />
      </body>
    </html>
  )
}
