import { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
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

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID
const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID

// OPTIMIZACIÓN: Migración de @fontsource a next/font para reducir CSS crítico y mejorar CLS.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  adjustFontFallback: false,
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
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
      <body className="flex min-h-dvh flex-col font-sans antialiased">
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
        <HideOnHome>
          <StickyAdUnit />
        </HideOnHome>
        <Analytics />
      </body>
    </html>
  )
}
