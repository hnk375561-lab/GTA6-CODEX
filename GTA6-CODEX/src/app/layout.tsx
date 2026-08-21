import { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { TrendingBar } from '@/components/layout/TrendingBar'
import { Footer } from '@/components/layout/Footer'
import { WebGLBackground } from '@/components/webgl/WebGLBackground'
import { SceneAmbientBridge } from '@/components/webgl/SceneAmbientBridge'
import { ConsentBanner } from '@/components/layout/ConsentBanner'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gta-6-zona.vercel.app'
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
  title: 'GTA6 Zona | Wiki Editorial de Grand Theft Auto 6',
  description:
    'Exploración comprensiva de GTA 6: personajes, vehículos, ubicaciones, misiones y más. Información verificada, rumores y análisis profundo.',
  keywords: [
    'GTA6',
    'Grand Theft Auto 6',
    'wiki',
    'personajes',
    'vehículos',
    'ubicaciones',
    'misiones',
  ],
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: SITE_URL,
    siteName: 'GTA6 Zona',
    title: 'GTA6 Zona | Wiki Editorial de Grand Theft Auto 6',
    description:
      'Exploración comprensiva de GTA 6: personajes, vehículos, ubicaciones, misiones y más.',
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@gta6zona',
    title: 'GTA6 Zona',
    description:
      'Exploración comprensiva de GTA 6: personajes, vehículos, ubicaciones, misiones y más.',
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
  other: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
    ? { 'google-adsense-account': process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID }
    : undefined,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="flex flex-col min-h-screen">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-gta-dark focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-gta-text focus:shadow-gta-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Saltar al contenido principal
        </a>
        {GA_MEASUREMENT_ID && <ConsentBanner gaId={GA_MEASUREMENT_ID} />}
        {ADSENSE_CLIENT_ID && (
          <Script
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
          />
        )}
        <WebGLBackground />
        <SceneAmbientBridge />
        {/* Grano fílmico + viñeta: capa atmosférica entre el canvas WebGL
            (z-0) y el contenido (z-10). Ver .gta-atmosphere en globals.css. */}
        <div className="gta-atmosphere" aria-hidden="true" />
        <div className="relative z-10 flex min-h-screen flex-1 flex-col">
          <Header />
          <TrendingBar />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
