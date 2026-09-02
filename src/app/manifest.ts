import type { MetadataRoute } from 'next'
import { SITE_NAME, SITE_TAGLINE } from '@/config/site'
/**
 * Genera /manifest.webmanifest (convención nativa del App Router).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} | ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description: 'Fichas técnicas de autos y motos con specs reales, comparador lado a lado y buscador.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0b0f',
    theme_color: '#0b0b0f',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
      {
        src: '/images/ui/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/images/ui/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}