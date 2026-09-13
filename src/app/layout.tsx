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
        {/* CSP vía <meta> (12/09/2026) — mitigación parcial, no headers()
            reales. GitHub Pages es un servidor de archivos puro: no hay
            proceso que evalúe `headers()` de next.config.js en cada
            request (Next.js directamente lo ignora y avisa en build con
            `output: 'export'`), así que no hay forma de emitir un header
            `Content-Security-Policy` real sin poner un CDN/proxy propio
            delante (ej. Cloudflare en modo proxy, sin Workers) que agregue
            Response Headers — esa sigue siendo la única vía para
            `frame-ancestors`, `report-uri` y cualquier directiva que el
            <meta> HTML no soporta (los navegadores las ignoran ahí).
            Esta política cubre los orígenes externos reales que el sitio
            carga hoy: Google Analytics/AdSense (ConsentBanner, AdUnit),
            Cloudflare Web Analytics (beacon de abajo) y miniaturas de
            YouTube (GalleryExplorer/media.ts). Actualizar esta lista si
            se agrega un origen externo nuevo.

            HALLAZGO F-03 (auditoría forense 12/09/2026): `script-src`
            tenía 'unsafe-inline', que anula gran parte del valor del CSP
            (permite ejecutar cualquier <script> inline inyectado, sin
            importar el resto de la política). Se reemplaza por el hash
            SHA-256 del ÚNICO script inline real que este archivo
            necesita ejecutar antes de hidratar (el snippet anti-FOUC de
            dark mode, más abajo) — un nonce no sirve acá porque el sitio
            es `output: 'export'` (no hay servidor por request que pueda
            generar uno nuevo cada vez; un nonce fijo hardcodeado sería
            equivalente a 'unsafe-inline'). Un hash de contenido SÍ es
            seguro en un sitio estático: el contenido del script no
            cambia entre requests, así que un hash fijo lo identifica sin
            abrir la puerta a cualquier otro script inyectado.
            SI SE EDITA EL SCRIPT ANTI-FOUC DE ABAJO, HAY QUE RECALCULAR
            ESTE HASH (si no, el script queda bloqueado por el propio CSP
            y el sitio hace FOUC en dark mode otra vez) — ver
            `scripts/lib/csp-inline-script-hash.mjs`, que lo calcula. */}
        <meta
          httpEquiv="Content-Security-Policy"
          content={[
            "default-src 'self'",
            "script-src 'self' 'sha256-Et25bcpi2pcdHBaSn93xcHoFAgrYLd6nbb0GqBgfPBA=' https://www.googletagmanager.com https://pagead2.googlesyndication.com https://static.cloudflareinsights.com https://*.google.com https://*.doubleclick.net",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https://img.youtube.com https://i.ytimg.com https://*.googlesyndication.com https://*.google.com https://*.gstatic.com https://*.google-analytics.com",
            "font-src 'self' data:",
            "frame-src https://googleads.g.doubleclick.net https://*.google.com",
            "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://static.cloudflareinsights.com https://pagead2.googlesyndication.com https://*.supabase.co",
            "object-src 'none'",
            "base-uri 'self'",
          ].join('; ')}
        />
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
          {/* REDISEÑO 180° (sept 2026): la home dejó de ser un viewport
              pineado de 0-scroll-de-página (`HideOnHome` existía para
              que `TrendingBar`/`Footer` no le robaran alto real a ese
              panel — ver `HideOnHome.tsx`) y pasó a un documento de
              scroll normal como el resto del sitio, así que ambos
              vuelven a renderizarse en `/` igual que en cualquier otra
              ruta. `HideOnHome` no se borra (queda sin uso) por si
              alguna futura sección de la home vuelve a necesitar un
              layout de viewport fijo. */}
          <TrendingBar />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
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
