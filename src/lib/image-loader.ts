import type { ImageLoaderProps } from 'next/image'

/**
 * LOADER PERSONALIZADO DE next/image
 * ====================================
 * Reemplaza la Vercel Image Optimization API (cuota mensual limitada en
 * el plan Hobby) por variantes WebP pregeneradas en build time.
 *
 * PIPELINE ACTIVO (única fuente de verdad, sept 2026): las variantes las
 * genera scripts/pregenerate-image-variants.mjs, que corre ANTES de
 * `next build` (ver "scripts".build en package.json) y escribe cada
 * imagen en public/images/_optimized/ (carpeta gitignoreada, se regenera
 * en cada build). Este loader resuelve cada pedido a un archivo ya
 * existente de esa carpeta — next/image nunca invoca a la Image
 * Optimization API de Vercel, así que el límite de cuota del plan Hobby
 * deja de aplicar.
 *
 * MIGRACIÓN A VERCEL BLOB (NO ACTIVA): scripts/upload-images-to-blob.mjs
 * prepara el camino a Blob (subir ahí las mismas variantes y servir la
 * URL base desde `NEXT_PUBLIC_BLOB_BASE_URL`). Hoy NO está cableado: el
 * paquete @vercel/blob no es dependencia del proyecto, el script no se
 * enlaza en build y la env var no está configurada en Vercel. Si en el
 * futuro se adopta Blob, el único cambio acá es configurar la env var; el
 * resto del loader no se toca. Mientras tanto este archivo usa el
 * fallback local `'/images/_optimized'`, consistente con el pipeline
 * activo.
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
 * navegador (next/image lo llama ahí para construir el srcSet).
 *
 * HOY ESTÁ EN DESUSO (sept 2026): el pipeline activo es local — ver
 * header de este archivo. Si se migra a Blob, se configura en
 * Vercel → Settings → Environment Variables (Production + Preview) con el
 * valor que imprime scripts/upload-images-to-blob.mjs, y en .env.local
 * para dev/build local.
 *
 * Sin configurar, se cae de vuelta a la carpeta local histórica
 * `/images/_optimized`, generada por scripts/pregenerate-image-variants.mjs
 * en cada build — exactamente el pipeline que está activo hoy.
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
