import manufacturerLogoSlugs from '@/config/manufacturer-logos-manifest.json'

/**
 * LOGOS DE FABRICANTE POR CONVENCIÓN (mismo criterio que `images.ts`)
 * =====================================================================
 * No es el mismo sistema que las fotos de vehículos (esas viven en Vercel
 * Blob, ver el comentario largo en `images.ts`): los logos son ~75
 * archivos livianos (PNG recortado/optimizado, <40 KB cada uno, ~900 KB
 * en total), así que se commitean directo al repo en
 * `public/logos/fabricantes/{slug}.png` sin necesidad de Blob/manifest de
 * binarios grandes.
 *
 * `manufacturer-logos-manifest.json` es solo la lista de slugs que SÍ
 * tienen logo (no todos los ~75 fabricantes lo tienen todavía — algunas
 * marcas locales/nicho quedaron sin logo verificado en fuentes abiertas).
 * El fallback (glifo genérico + "Sin imagen verificada") sigue intacto
 * para cualquier slug fuera de esta lista.
 */
const MANIFEST = new Set(manufacturerLogoSlugs as string[])

export function getManufacturerLogoSrc(slug: string): string | null {
  if (!MANIFEST.has(slug)) return null
  return `/logos/fabricantes/${slug}.png`
}
