import type { MetadataRoute } from 'next'

/**
 * Genera /manifest.webmanifest (convención nativa del App Router).
 *
 * NOTA: los íconos 192x192 y 512x512 todavía no existen en
 * `public/images/ui/` (carpeta vacía salvo `.gitkeep`) — hay que generarlos
 * a partir del logo/mark del sitio y colocarlos ahí antes de que esto
 * sirva íconos reales en el picker de "agregar a inicio". Mientras tanto
 * apunta a `/favicon.ico` como fallback para no romper el manifest.
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
      // TODO: agregar /images/ui/icon-192.png e /images/ui/icon-512.png
      // (type: 'image/png') una vez generados los assets reales.
    ],
  }
}
