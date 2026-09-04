import type { ImageLoaderProps } from 'next/image'

/**
 * LOADER PERSONALIZADO DE next/image
 * ====================================
 * Reemplaza la Vercel Image Optimization API (cuota mensual limitada en
 * el plan Hobby) por variantes pregeneradas y subidas a VERCEL BLOB por
 * scripts/upload-images-to-blob.mjs (corrido localmente, no en cada
 * build — ver ese script para el porqué).
 *
 * Este archivo se bundlea TANTO para servidor como para navegador, así
 * que:
 *   - No puede usar `fs`, `path` de Node, ni importar next.config.js.
 *   - Tiene que ser una función pura: mismo `src`+`width` → misma URL,
 *     siempre, sin tocar el filesystem para "ver qué existe".
 *
 * Por eso WIDTHS está duplicado acá en vez de importado desde
 * next.config.js — ver la nota de sincronización en la constante.
 */

/**
 * Unión de `images.deviceSizes` ∪ `images.imageSizes` de next.config.js,
 * ordenada ascendente. DEBE coincidir exactamente con la constante
 * homónima de scripts/lib/image-usage-manifest.mjs (ALL_WIDTHS) — ese es
 * el módulo que usa scripts/upload-images-to-blob.mjs para saber qué
 * anchos subir. Si se edita un array, hay que editar los tres lugares:
 *   1. next.config.js → images.deviceSizes / images.imageSizes
 *   2. scripts/lib/image-usage-manifest.mjs → ALL_WIDTHS
 *   3. este archivo → WIDTHS
 */
const WIDTHS = [256, 320, 384, 512, 640, 750, 828, 1024, 1440, 1920, 2560, 3840] as const

/**
 * URL base del store de Vercel Blob, ej:
 *   https://abc123xyz.public.blob.vercel-storage.com/images/_optimized
 *
 * Tiene que ser NEXT_PUBLIC_ porque este loader corre también en el
 * navegador (next/image lo llama ahí para construir el srcSet). Se
 * configura en Vercel → Settings → Environment Variables (Production +
 * Preview) con el valor que imprime scripts/upload-images-to-blob.mjs
 * al terminar, y en .env.local para dev/build local.
 *
 * Si no está seteada, se cae de vuelta a la carpeta local histórica —
 * útil en dev si todavía no migraste a Blob — pero en producción SIEMPRE
 * tiene que estar seteada o las imágenes quedan rotas.
 */
const BLOB_BASE_URL = process.env.NEXT_PUBLIC_BLOB_BASE_URL || '/images/_optimized'

/**
 * Único prefijo con variantes pregeneradas. El resto de public/images/
 * (por ahora solo public/images/ui/, íconos chicos ya en su tamaño
 * final) no las tiene — se sirve tal cual, sin pasar nunca por la Image
 * Optimization API de Vercel (este loader jamás la invoca).
 */
const ENTITIES_PREFIX = '/images/entities/'

function pickWidth(requested: number): number {
  for (const w of WIDTHS) {
    if (requested <= w) return w
  }
  return WIDTHS[WIDTHS.length - 1]
}

export default function imageLoader({ src, width }: ImageLoaderProps): string {
  // Imágenes remotas (miniaturas de YouTube — ver next.config.js
  // `images.remotePatterns`, usadas por YouTubeEmbed.tsx vía <Image>):
  // no tienen variante pregenerada y ya vienen del tamaño fijo correcto,
  // así que se sirven sin modificar.
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

  return `${BLOB_BASE_URL}/${relPath}-w${resolvedWidth}.webp`
}
