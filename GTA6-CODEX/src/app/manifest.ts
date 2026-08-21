import type { MetadataRoute } from 'next'
/**
 * Genera /manifest.webmanifest (convención nativa del App Router).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GTA6 Zona | Wiki Editorial de Grand Theft Auto 6',
    short_name: 'GTA6 Zona',
    description: 'Wiki editorial de Grand Theft Auto 6: personajes, vehículos, ubicaciones y misiones clasificados por nivel de evidencia.',
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