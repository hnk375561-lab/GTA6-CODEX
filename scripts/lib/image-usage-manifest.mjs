/**
 * scripts/lib/image-usage-manifest.mjs
 * ============================================================
 * Manifiesto de USO REAL de <Image>/<ZoomableImage> en los 15 archivos
 * que sirven fotos de public/images/entities/** (ver auditoría 3 sep
 * 2026 — che, antes de tocar nada). Reemplaza la calidad plana
 * (quality:100 para los 12 anchos, sin importar qué pide cada
 * componente) por una calidad calculada POR ANCHO: el máximo `quality`
 * que algún componente realmente pide para ESE ancho puntual.
 *
 * CÓMO SE CALCULA "qué ancho pide cada componente":
 *   No es el `width`/`sizes` tal cual — next/image tiene su propio
 *   algoritmo (`getWidths()` en next/dist/.../image-component) que
 *   decide, a partir de `sizes`, cuáles de los anchos configurados en
 *   next.config.js (`deviceSizes` ∪ `imageSizes` = ALL_WIDTHS de abajo)
 *   termina poniendo en el `srcSet`:
 *
 *     - Si `sizes` NO tiene ningún token "NNvw" (p. ej. "600px, 320px" o
 *       "56px" o "7rem" — sin vw), next/image NO filtra nada: pide TODOS
 *       los anchos configurados, sin importar cuán chico sea el `sizes`
 *       real. Es contraintuitivo pero es el comportamiento real del
 *       framework (confirmado leyendo su fuente) — un ícono de 56px sin
 *       vw en su `sizes` igual termina con candidatos de hasta 3840px en
 *       el `srcSet`.
 *     - Si tiene uno o más "NNvw", toma el MENOR porcentaje encontrado,
 *       calcula `cutoff = deviceSizes[0] * (menorPorcentaje / 100)` y
 *       descarta los anchos configurados por debajo de ese cutoff.
 *     - Si el `<Image>` no usa `sizes` (ancho fijo, sin `fill`): pide
 *       como candidatos el primer ancho configurado >= al `width`
 *       declarado y el primer ancho configurado >= `width * 2` (1x/2x).
 *
 *   `computeWidthsForUsage()` de abajo implementa exactamente esa misma
 *   lógica (mismo regex, mismo cutoff) para que el cálculo de qué ancho
 *   hace falta a qué calidad NO dependa de que alguien lo recalcule bien
 *   a mano cada vez que un componente cambia su `sizes`.
 *
 * QUÉ HACE ESTE MÓDULO:
 *   Declara IMAGE_USAGES (una entrada por cada <Image>/<ZoomableImage>
 *   de los 15 archivos, con su `sizes`/`width` y `quality` tal cual
 *   están hoy en el código) y expone `buildQualityByWidth()`, que
 *   devuelve, para cada ancho de ALL_WIDTHS que al menos un componente
 *   realmente pide, la calidad MÁXIMA que algún componente le pide a ESE
 *   ancho — nunca menos que lo que cualquier consumidor real necesita.
 *
 * SI SE AGREGA/CAMBIA UN <Image> QUE SIRVE public/images/entities/**:
 *   Agregar (o editar) su entrada en IMAGE_USAGES acá. Si no se hace,
 *   ese componente puede terminar pidiendo un ancho a una calidad menor
 *   a la que declaró en su prop `quality` — el build no rompe (sigue
 *   sirviendo un archivo válido, solo que a la calidad de OTRO
 *   componente para ese mismo ancho) pero conviene mantenerlo
 *   sincronizado. `verifyManifestCoverage()` ayuda a pescar componentes
 *   con `quality`/`sizes` explícito que ya no coincide con lo declarado
 *   acá (ver scripts/verify-image-usage-manifest.mjs).
 * ============================================================
 */

/**
 * Unión de `images.deviceSizes` ∪ `images.imageSizes` de next.config.js,
 * ordenada ascendente. Debe coincidir con next.config.js y con
 * src/lib/image-loader.ts (ver la nota de sincronización de ese
 * archivo) — ninguno de los tres puede importar a los otros dos sin
 * arrastrar código de servidor al bundle del navegador.
 */
export const ALL_WIDTHS = [256, 320, 384, 512, 640, 750, 828, 1024, 1440, 1920, 2560, 3840]

/** `images.deviceSizes[0]` de next.config.js — usado como base del cutoff. */
const DEVICE_SIZE_0 = 320

/**
 * Calidad que aplica next/image cuando el <Image> no declara `quality`.
 * No es una elección nuestra: es el default histórico del componente.
 */
const NEXT_DEFAULT_QUALITY = 75

/**
 * Replica getWidths() de next/image. `usage` es o bien
 * `{ sizes: string }` (imagen con `sizes`, `fill` o no) o bien
 * `{ width: number }` (imagen de ancho fijo sin `sizes` ni `fill` — pide
 * candidatos 1x/2x).
 */
export function computeWidthsForUsage(usage) {
  if (usage.sizes) {
    const viewportWidthRe = /(^|\s)(1?\d?\d)vw/g
    const percentSizes = []
    let match
    while ((match = viewportWidthRe.exec(usage.sizes))) {
      percentSizes.push(parseInt(match[2], 10))
    }
    if (percentSizes.length > 0) {
      const smallestRatio = Math.min(...percentSizes) * 0.01
      const cutoff = DEVICE_SIZE_0 * smallestRatio
      return ALL_WIDTHS.filter((w) => w >= cutoff)
    }
    return ALL_WIDTHS.slice()
  }

  if (typeof usage.width === 'number') {
    const candidates = [usage.width, usage.width * 2].map(
      (w) => ALL_WIDTHS.find((p) => p >= w) ?? ALL_WIDTHS[ALL_WIDTHS.length - 1]
    )
    return [...new Set(candidates)]
  }

  // Sin `sizes` ni `width` fijo (p. ej. `fill` sin `sizes` — next/image
  // asume 100vw): tratamos igual que sizes="100vw" para no subestimar.
  return ALL_WIDTHS.filter((w) => w >= DEVICE_SIZE_0)
}

/**
 * Un registro por cada <Image>/<ZoomableImage> real que sirve
 * public/images/entities/** en los 15 archivos auditados (3 sep 2026).
 * `quality: null` = el componente no declara `quality` → default 75.
 *
 * NO incluye YouTubeEmbed.tsx: sirve thumbnails remotos de YouTube
 * (img.youtube.com/i.ytimg.com vía `images.remotePatterns`), no tiene
 * variante local pregenerada (ver src/lib/image-loader.ts, que las
 * devuelve tal cual) y por lo tanto no consume anchos de este
 * manifiesto.
 */
export const IMAGE_USAGES = [
  {
    component: 'CompareExplorer.tsx:282',
    sizes: '(min-width: 1024px) 600px, (min-width: 640px) 480px, 320px',
    quality: 92,
  },
  {
    component: 'EntityGallery.tsx:83 (miniatura 64px)',
    sizes: '64px',
    quality: null,
  },
  {
    component: 'EntityGallery.tsx:158 (pieza principal)',
    sizes: '(min-width: 1920px) 1580px, (min-width: 1280px) 82vw, 100vw',
    quality: 100,
  },
  {
    component: 'EntityGallery.tsx:180 (secundaria)',
    sizes: '(min-width: 1024px) 380px, 92vw',
    quality: 90,
  },
  {
    component: 'EntityImage.tsx (variant=thumbnail)',
    sizes: '(min-width: 1024px) 700px, (min-width: 640px) 90vw, 100vw',
    quality: 90,
  },
  {
    component: 'EntityImage.tsx (variant=portrait)',
    sizes: '(min-width: 1024px) 900px, (min-width: 640px) 100vw, 100vw',
    quality: 97,
  },
  {
    component: 'EntityImage.tsx (variant=avatar)',
    sizes: '56px',
    quality: 75,
  },
  {
    component: 'VehicleCompareSheet.tsx:53 (chip 48px, ancho fijo)',
    width: 48,
    quality: null,
  },
  {
    component: 'VehicleCompareSheet.tsx:166 (<=2 vehículos)',
    sizes: '(min-width: 1024px) 900px, (min-width: 640px) 700px, 500px',
    quality: 95,
  },
  {
    component: 'VehicleCompareSheet.tsx:166 (>2 vehículos)',
    sizes: '(min-width: 1024px) 700px, (min-width: 640px) 500px, 400px',
    quality: 95,
  },
  {
    component: 'GalleryExplorer.tsx:276 (featured)',
    sizes:
      '(min-width: 1920px) 1400px, (min-width: 1536px) 1100px, (min-width: 1280px) 1000px, (min-width: 1024px) 900px, (min-width: 768px) 95vw, 100vw',
    quality: 94,
  },
  {
    component: 'GalleryExplorer.tsx:276 (grilla)',
    sizes:
      '(min-width: 1920px) 750px, (min-width: 1536px) 700px, (min-width: 1280px) 650px, (min-width: 1024px) 600px, (min-width: 768px) 60vw, 90vw',
    quality: 94,
  },
  {
    component: 'GalleryExplorer.tsx:468 (zoom ampliado)',
    sizes: '(min-width: 1920px) 1580px, (min-width: 1280px) 82vw, 100vw',
    quality: 100,
  },
  {
    component: 'CompareShowcase.tsx (CrossfadeImage)',
    sizes: '(min-width: 640px) 24rem, 100vw',
    quality: 90,
  },
  {
    component: 'HeroPromoBanner.tsx',
    sizes: '(min-width: 1024px) 360px, 100vw',
    quality: null,
  },
  {
    component: 'HeroSelfPromoCard.tsx',
    sizes: '(min-width: 640px) 7rem, 6rem',
    quality: null,
  },
  {
    component: 'HeroVehicleShowcase.tsx',
    sizes: '(min-width: 1024px) 30rem, (min-width: 640px) 26rem, 78vw',
    quality: null,
  },
  {
    component: 'HeroVehicleShowcaseV2.tsx',
    sizes: '(min-width: 1024px) 33vw, 43vw',
    quality: 95,
  },
  {
    component: 'ManufacturersMarquee.tsx (logo 112x40, ancho fijo)',
    width: 112,
    quality: null,
  },
  {
    component: 'MediaCarousel.tsx',
    sizes: '(min-width: 1024px) 500px, 90vw',
    quality: 92,
  },
  {
    component: 'CategoryCardMedia.tsx (pieza principal)',
    sizes: '(min-width: 1024px) 320px, (min-width: 640px) 45vw, 50vw',
    quality: 95,
  },
  {
    component: 'CategoryCardMedia.tsx:65 (preview 36px)',
    sizes: '36px',
    quality: null,
  },
  {
    component: 'SimpleLightbox.tsx -> ZoomableImage.tsx',
    sizes: '(min-width: 1920px) 1900px, (min-width: 1280px) 92vw, 99vw',
    quality: 100,
  },
]

/**
 * Devuelve un Map<ancho, calidadMáxima> — solo con los anchos que al
 * menos un IMAGE_USAGES realmente pide — calculando para cada uno la
 * calidad MÁXIMA entre todos los componentes que lo piden (así ningún
 * componente recibe nunca menos calidad que la que ya pedía).
 */
export function buildQualityByWidth(usages = IMAGE_USAGES) {
  const byWidth = new Map()
  for (const usage of usages) {
    const quality = usage.quality ?? NEXT_DEFAULT_QUALITY
    const widths = computeWidthsForUsage(usage)
    for (const width of widths) {
      const current = byWidth.get(width) ?? 0
      if (quality > current) byWidth.set(width, quality)
    }
  }
  return byWidth
}
