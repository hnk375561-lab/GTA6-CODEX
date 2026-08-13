import { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gta6codex.com'

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
        
        {/* GA4 - Placeholder, configurar después */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-XXXXXXXXXX');
            `,
          }}
        />
      </head>
      <body className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
