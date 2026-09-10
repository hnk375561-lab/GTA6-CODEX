import { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { TrendingBar } from '@/components/layout/TrendingBar'
import { Footer } from '@/components/layout/Footer'
import { ConsentBanner } from '@/components/layout/ConsentBanner'
import { PageTransitionBridge } from '@/components/layout/PageTransitionBridge'
import { ScrollRestorationBridge } from '@/components/layout/ScrollRestorationBridge'
import { HideOnHome } from '@/components/layout/HideOnHome'
import { BackToTop } from '@/components/layout/BackToTop'
import { StickyAdUnit } from '@/components/monetization/StickyAdUnit'

import { SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/config/site'

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID
const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
const CF_ANALYTICS_TOKEN = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN

// OPTIMIZACIÓN: Migración de @fontsource a next/font para reducir CSS crítico y mejorar CLS.
//
// 10/09/2026 — de next/font/google a next/font/local: next/font/google
// descarga los archivos de fuente en build time desde
// fonts.googleapis.com/fonts.gstatic.com. En GitHub Actions (y en
// cualquier entorno de build sin acceso libre a esos hosts) esa descarga
// puede devolver 403/timeout de forma intermitente y tumbar el build
// entero (`next build` falla con "Failed to fetch <fuente> from Google
// Fonts") — exactamente lo que rompió el deploy a GitHub Pages. Los
// archivos .woff2 en src/fonts/ son variable fonts reales de Google
// Fonts (mismo binario que serviría fonts.gstatic.com), traídos una sola
// vez vía los paquetes @fontsource-variable/* (devDependency, ver
// package.json) y commiteados acá — el build ya no depende de la
// disponibilidad de ningún host externo para resolver las fuentes.
const inter = localFont({
  src: '../fonts/inter-latin-variable.woff2',
  variable: '--font-sans',
  display: 'swap',
  weight: '100 900',
})

const spaceGrotesk = localFont({
  src: '../fonts/space-grotesk-latin-variable.woff2',
  variable: '--font-display',
  display: 'swap',
  weight: '300 700',
})

const jetbrainsMono = localFont({
  src: '../fonts/jetbrains-mono-latin-variable.woff2',
  variable: '--font-mono',
  display: 'swap',
  weight: '100 800',
})

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
  return (
    <html lang="es" className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Cloudflare Web Analytics — lightweight, privacy-first, no cookies */}
        {CF_ANALYTICS_TOKEN && (
          <script
            defer
            data-cf-beacon={`{"token": "${CF_ANALYTICS_TOKEN}"}`}
            src="https://static.cloudflareinsights.com/beacon.min.js"
          />
        )}
      </head>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        {/* Anti-FOUC de dark mode (sept 2026): corre antes del primer
            paint, sin esperar el bundle de React. Resuelve la preferencia
            persistida ('sinfrenos:theme') contra prefers-color-scheme y
            setea `.dark` sobre <html> si corresponde — sin esto, quien
            navega en oscuro vería un destello blanco en cada carga/
            navegación. Lógica duplicada a propósito de lib/theme.ts (acá
            no puede haber imports de módulos todavía). */}
        <script
          dangerouslySetInnerHTML={{
            __html: "(function(){try{var k='sinfrenos:theme';var p=localStorage.getItem(k);var dark=p==='dark'||((!p||p==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(dark){document.documentElement.classList.add('dark')}}catch(e){}})();",
          }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-auto-dark focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
        <HideOnHome>
          <StickyAdUnit />
        </HideOnHome>
        {/* Al final del body, fuera de `#page-content`: el FAB vive en el
            stacking global de la página, no dentro de ningún contexto de
            apilamiento de una ruta. */}
        <BackToTop />
      </body>
    </html>
  )
}
