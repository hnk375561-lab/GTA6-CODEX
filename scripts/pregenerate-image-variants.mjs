#!/usr/bin/env node
/**
 * scripts/pregenerate-image-variants.mjs
 * ============================================================
 * Reemplazo, en build time, de la Vercel Image Optimization API.
 *
 * POR QUÉ EXISTE:
 *   El plan Hobby de Vercel tiene una cuota mensual de ~1000
 *   transformaciones de imagen gratuitas. Con next/image apuntando a
 *   public/images/entities/**\/*.webp (fotos en alta resolución, hasta
 *   3840px de ancho) esa cuota se agota rápido y, al pasarse, Vercel
 *   bloquea las transformaciones NUEVAS — las imágenes ya cacheadas
 *   siguen sirviendo, pero cualquier combinación (ancho, calidad,
 *   formato) todavía no pedida antes queda en blanco.
 *
 *   Esto le pasa toda la responsabilidad de generar los distintos anchos
 *   responsive a ESTE script (con `sharp`, que ya es devDependency), que
 *   corre una sola vez por build. `next.config.js` usa
 *   `images.loader: 'custom'` + `images.loaderFile` (ver
 *   src/lib/image-loader.ts) apuntando a los archivos que este script
 *   deja en public/images/_optimized/ — next/image nunca vuelve a llamar
 *   a la Image Optimization API de Vercel, así que el límite de cuota
 *   deja de aplicar por completo, sin necesidad de plan pago.
 *
 * QUÉ HACE:
 *   Para cada imagen en public/images/entities/**\/*.{webp,avif,jpg,
 *   jpeg,png}, genera una variante WebP por cada ancho de WIDTHS (ver
 *   comentario en esa constante) y la escribe en
 *   public/images/_optimized/<mismo path relativo>-w<ancho>.webp
 *
 *   No hace upscale: si el ancho pedido supera el ancho nativo de la
 *   foto, sharp devuelve la imagen a su tamaño nativo (`withoutEnlargement:
 *   true`) — nunca se "inventan" píxeles de más, así que jamás se ve peor
 *   que el archivo real. Se sigue escribiendo un archivo para ESE ancho de
 *   todos modos (aunque el contenido real sea más chico) para que
 *   `src/lib/image-loader.ts` pueda resolver cualquier ancho de WIDTHS con
 *   una función pura, sin tener que consultar el filesystem en el navegador.
 *
 * CALIDAD (por ancho, no plana — 3 sep 2026):
 *   Antes este script usaba quality:100 fijo para los 12 anchos, sin
 *   importar qué pide cada componente. Eso es seguro pero desperdicia
 *   peso: un componente que declara quality:75/90/92 igual recibía un
 *   archivo a 100 para cualquier ancho.
 *
 *   Ahora la calidad de CADA ancho sale de
 *   scripts/lib/image-usage-manifest.mjs (`buildQualityByWidth()`), que
 *   replica el algoritmo real de next/image (`getWidths()`) para saber
 *   qué anchos configurados termina pidiendo cada uno de los 15
 *   componentes según su `sizes`/`width`, y le asigna a cada ancho la
 *   calidad MÁXIMA entre todos los componentes que lo piden — así ningún
 *   componente recibe nunca menos calidad que la que ya pedía, igual que
 *   antes, pero sin pagar quality:100 en anchos donde nadie lo pide.
 *
 *   RESULTADO REAL (auditado, no estimado — ver
 *   scripts/lib/image-usage-manifest.mjs): de los 12 anchos, 11 terminan
 *   necesitando quality:100 de todos modos (EntityGallery.tsx pieza
 *   principal, GalleryExplorer.tsx zoom y SimpleLightbox.tsx piden esos
 *   anchos a 100, y entre los tres cubren casi todo el rango salvo el
 *   ancho más chico). Solo el ancho 256px baja de 100 a 95. La ganancia
 *   de espacio es real pero chica — se imprime en el resumen final del
 *   build (ver `formatBytes` más abajo) para no subestimarla ni
 *   sobrevenderla.
 *
 * USO:
 *   node scripts/pregenerate-image-variants.mjs
 *   node scripts/pregenerate-image-variants.mjs --concurrency=8
 *   node scripts/pregenerate-image-variants.mjs --force   (ignora caché de mtime)
 *
 *   Se agrega a "scripts".build en package.json, ANTES de `next build`,
 *   así corre automáticamente en cada build (local o en Vercel).
 * ============================================================
 */

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { ALL_WIDTHS, buildQualityByWidth } from './lib/image-usage-manifest.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const SOURCE_DIR = path.join(ROOT, 'public', 'images', 'entities')
const OUTPUT_DIR = path.join(ROOT, 'public', 'images', '_optimized')

/**
 * Unión de `images.deviceSizes` (7 valores) e `images.imageSizes` (7
 * valores) de next.config.js, sin duplicados, ordenada ascendente — son
 * exactamente los anchos que next/image puede llegar a pedir para
 * cualquier combinación de `sizes`/`fill`/`width` usada hoy en el sitio.
 * Vive en scripts/lib/image-usage-manifest.mjs (única fuente) porque ese
 * módulo también la necesita para calcular qué anchos pide cada
 * componente.
 *
 * IMPORTANTE: si se cambia deviceSizes/imageSizes en next.config.js, hay
 * que reflejar el cambio en ALL_WIDTHS de image-usage-manifest.mjs y en
 * la constante homónima de src/lib/image-loader.ts (ese archivo se
 * bundlea para el navegador y no puede importar ningún módulo de
 * scripts/ sin arrastrar código de servidor al cliente, así que ahí se
 * mantiene el valor duplicado a propósito, con la misma referencia
 * cruzada).
 */
const WIDTHS = ALL_WIDTHS

const SOURCE_EXTENSIONS = new Set(['.webp', '.avif', '.jpg', '.jpeg', '.png'])

/**
 * Map<ancho, calidad> — ver bloque "CALIDAD (por ancho, no plana)" en el
 * comment-header de arriba. Calculado una sola vez a partir del uso real
 * de los 15 componentes (scripts/lib/image-usage-manifest.mjs).
 */
const QUALITY_BY_WIDTH = buildQualityByWidth()

const APPLY_FORCE = process.argv.includes('--force')
const concurrencyArg = process.argv.find((a) => a.startsWith('--concurrency='))
const CONCURRENCY = concurrencyArg ? Math.max(1, parseInt(concurrencyArg.split('=')[1], 10) || 4) : 4

/** Mismo pool de concurrencia acotada que scripts/process-images.mjs. */
async function runWithConcurrency(items, limit, worker) {
  let cursor = 0
  async function runNext() {
    while (cursor < items.length) {
      const index = cursor++
      await worker(items[index], index)
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runNext())
  await Promise.all(workers)
}

/** Lista recursiva de todos los archivos de imagen bajo SOURCE_DIR, con su
 *  ruta relativa a SOURCE_DIR (ej. "vehiculos/abarth-595.webp"). */
function listSourceImages(dir, base = dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...listSourceImages(full, base))
      continue
    }
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!SOURCE_EXTENSIONS.has(ext)) continue
    out.push(path.relative(base, full))
  }
  return out
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function processImage(relPath, stats) {
  const srcPath = path.join(SOURCE_DIR, relPath)
  const ext = path.extname(relPath)
  const withoutExt = relPath.slice(0, -ext.length)
  const srcStat = fs.statSync(srcPath)

  for (const width of WIDTHS) {
    // Ancho que en la práctica ningún componente pide hoy (no debería
    // pasar con los 15 componentes auditados, pero si el manifiesto
    // queda desactualizado es más seguro generarlo igual a máxima
    // calidad que dejar un ancho del srcSet sin archivo.
    const quality = QUALITY_BY_WIDTH.get(width) ?? 100
    const outRelPath = `${withoutExt}-w${width}.webp`
    const outPath = path.join(OUTPUT_DIR, outRelPath)

    if (!APPLY_FORCE && fs.existsSync(outPath)) {
      const outStat = fs.statSync(outPath)
      // Caché simple por mtime: si la variante ya existe y es más nueva
      // que la fuente, no se regenera (acelera reruns locales de `npm run
      // build`; en un build de CI con checkout limpio esto nunca aplica).
      if (outStat.mtimeMs >= srcStat.mtimeMs && outStat.size > 0) {
        stats.skipped++
        stats.totalBytes += outStat.size
        continue
      }
    }

    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    const tmpPath = `${outPath}.tmp-${process.pid}-${width}`

    try {
      const buffer = await sharp(srcPath)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality })
        .toBuffer()

      fs.writeFileSync(tmpPath, buffer)
      fs.renameSync(tmpPath, outPath)

      stats.generated++
      stats.totalBytes += buffer.length
    } catch (err) {
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
      } catch {
        // best-effort cleanup
      }
      stats.errors.push({ relPath, width, message: err instanceof Error ? err.message : String(err) })
    }
  }
}

async function main() {
  const startedAt = Date.now()

  if (!fs.existsSync(SOURCE_DIR)) {
    console.log(`[pregenerate-image-variants] No existe ${path.relative(ROOT, SOURCE_DIR)} — nada que hacer.`)
    return
  }

  const images = listSourceImages(SOURCE_DIR)
  if (images.length === 0) {
    console.log('[pregenerate-image-variants] No se encontraron imágenes fuente — nada que hacer.')
    return
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const stats = { generated: 0, skipped: 0, totalBytes: 0, errors: [] }

  const qualitySummary = WIDTHS.map((w) => `${w}px→q${QUALITY_BY_WIDTH.get(w) ?? 100}`).join(', ')
  console.log(
    `[pregenerate-image-variants] Procesando ${images.length} imágenes × ${WIDTHS.length} anchos ` +
      `(concurrencia=${CONCURRENCY})...`
  )
  console.log(`[pregenerate-image-variants] Calidad por ancho: ${qualitySummary}`)

  await runWithConcurrency(images, CONCURRENCY, (relPath) => processImage(relPath, stats))

  const elapsedS = ((Date.now() - startedAt) / 1000).toFixed(1)
  const totalVariants = stats.generated + stats.skipped

  console.log(
    `[pregenerate-image-variants] Listo en ${elapsedS}s — ${totalVariants} variantes ` +
      `(${stats.generated} generadas, ${stats.skipped} reusadas de una corrida anterior), ` +
      `${formatBytes(stats.totalBytes)} en ${path.relative(ROOT, OUTPUT_DIR)}/`
  )

  if (stats.errors.length > 0) {
    console.error(`[pregenerate-image-variants] ${stats.errors.length} error(es):`)
    for (const e of stats.errors) {
      console.error(`  - ${e.relPath} (ancho ${e.width}): ${e.message}`)
    }
    // Un build con imágenes rotas es peor que un build que falla ruidosamente:
    // mejor cortar acá que dejar pasar variantes faltantes a producción.
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error('[pregenerate-image-variants] Error fatal:', err)
  process.exitCode = 1
})
