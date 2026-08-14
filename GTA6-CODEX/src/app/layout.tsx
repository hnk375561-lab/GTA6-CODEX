import { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { WebGLBackground } from '@/components/webgl/WebGLBackground'
import { SceneAmbientBridge } from '@/components/webgl/SceneAmbientBridge'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gta-6-codex.vercel.app'
// GA4 solo se activa si hay un ID real configurado. Sin esto, un build sin
// NEXT_PUBLIC_GA_ID enviaría eventos a un ID placeholder inexistente.
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'GTA6 Codex | Wiki Editorial de Grand Theft Auto 6',
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
    siteName: 'GTA6 Codex',
    title: 'GTA6 Codex | Wiki Editorial de Grand Theft Auto 6',
    description:
      'Exploración comprensiva de GTA 6: personajes, vehículos, ubicaciones, misiones y más.',
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@gta6codex',
    title: 'GTA6 Codex',
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* Preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="flex flex-col min-h-screen">
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
        <WebGLBackground />
        <SceneAmbientBridge />
        <div className="relative z-10 flex min-h-screen flex-1 flex-col">
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
