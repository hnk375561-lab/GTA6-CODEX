/**
 * Fuente única de verdad para el nombre y la URL del sitio.
 *
 * Antes cada page.tsx definía su propia constante local `SITE_NAME =
 * 'GTA6 Zona'` (10+ copias idénticas). Eso significaba que rebrandear el
 * sitio era un find-and-replace riesgoso en vez de un cambio en un solo
 * lugar. Este módulo reemplaza todas esas copias.
 */
export const SITE_NAME = 'Sin Frenos'

export const SITE_TAGLINE = 'Fichas técnicas y comparador de autos y motos'

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sinfreno.vercel.app'
