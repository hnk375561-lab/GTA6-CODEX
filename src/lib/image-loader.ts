import type { ImageLoaderProps } from 'next/image'

/**
 * LOADER PERSONALIZADO DE next/image
 * ====================================
 * Reemplaza la Vercel Image Optimization API (cuota mensual limitada en
 * el plan Hobby, ~1000 transformaciones — ver next.config.js
 * `images.loader`/`images.loaderFile`) por archivos ya redimensionados
 * en build time por scripts/pregenerate-image-variants.mjs.
 *
 * Este archivo se bundlea TANTO para servidor como para navegador (Next
 * lo empaqueta con webpack porque next/image lo llama también en el
 * cliente al construir el `srcSet`), así que:
 *   - No puede usar `fs`, `path` de Node, ni importar next.config.js
 *     (arrastraría código de servidor al bundle del cliente).
 *   - Tiene que ser una función pura: mismo `src`+`width` → misma URL,
 *     siempre, sin tocar el filesystem para "ver qué existe".
 *
 * Por eso WIDTHS está duplicado acá en vez de importado desde
 * next.config.js — ver la nota de sincronización en la constante.
 */

/**
 * Unión de `images.deviceSizes` ∪ `images.imageSizes` de next.config.js,
 * ordenada ascendente. DEBE coincidir exactamente con la constante
 * homónima de scripts/pregenerate-image-variants.mjs (ese script es el
 * que efectivamente escribe un archivo por cada uno de estos anchos). Si
 * se edita un array, hay que editar los tres lugares:
 *   1. next.config.js → images.deviceSizes / images.imageSizes
 *   2. scripts/pregenerate-image-variants.mjs → WIDTHS
 *   3. este archivo → WIDTHS
 */
const WIDTHS = [256, 320, 384, 512, 640, 750, 828, 1024, 1440, 1920, 2560, 3840] as const

/** Carpeta pública donde el script de build deja las variantes. */
const OPTIMIZED_DIR = '/images/_optimized'

/**
 * Único prefijo con variantes pregeneradas. El resto de public/images/
 * (por ahora solo public/images/ui/, íconos chicos ya en su tamaño
 * final) no las tiene — se sirve tal cual, igual sin pasar nunca por la
 * Image Optimization API de Vercel (este loader jamás la invoca).
 */
const ENTITIES_PREFIX = '/images/entities/'

function pickWidth(requested: number): number {
  for (const w of WIDTHS) {
    if (requested <= w) return w
  }
  return WIDTHS[WIDTHS.length - 1]
}

export default function imageLoader({ src, width }: ImageLoaderProps): string {
  // Imágenes remotas (miniaturas de YouTube, img.youtube.com/i.ytimg.com
  // — ver next.config.js `images.remotePatterns`, usadas por
  // YouTubeEmbed.tsx vía <Image>): no tienen variante local pregenerada
  // y ya vienen del tamaño fijo correcto (thumbnails de YouTube), así
  // que se sirven sin modificar.
  if (/^https?:\/\//i.test(src)) {
    return src
  }

  if (!src.startsWith(ENTITIES_PREFIX)) {
    return src
  }

  const dotIndex = src.lastIndexOf('.')
  const withoutExt = dotIndex === -1 ? src : src.slice(0, dotIndex)
  const relPath = withoutExt.slice(ENTITIES_PREFIX.length)
  const resolvedWidth = pickWidth(width)

  return `${OPTIMIZED_DIR}/${relPath}-w${resolvedWidth}.webp`
}
