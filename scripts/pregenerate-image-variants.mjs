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
 * CALIDAD:
 *   quality:100 fijo para TODAS las variantes (ver OUTPUT_QUALITY) — es
 *   igual o superior al quality={} más alto que pide cualquier componente
 *   hoy (100, en EntityGallery.tsx / GalleryExplorer.tsx / SimpleLightbox
 *   vía ZoomableImage.tsx, para la vista ampliada/lightbox). Como el
 *   loader (ver src/lib/image-loader.ts) resuelve el ARCHIVO solo por
 *   ancho — no por el `quality` que pida cada <Image> — generar variantes
 *   por ancho a distinta calidad podría terminar sirviéndole quality:90 a
 *   un componente que pidió quality:97/100 según qué ancho le tocara en
 *   ese viewport/DPR puntual. Fijar 100 en el generador evita esa
 *   combinatoria (ancho × calidad) por completo y garantiza que ningún
 *   componente reciba nunca menos calidad que la que ya pedía.
 *
 *   Contrapartida esperada (avisar al usuario): esto genera archivos más
 *   pesados que si cada variante llevara la calidad mínima que en
 *   realidad necesita su uso más chico — es la única forma simple de no
 *   arriesgar una regresión de nitidez como la ya corregida en
 *   HeroVehicleShowcaseV2.tsx.
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
 *
 * IMPORTANTE: si se cambia deviceSizes/imageSizes en next.config.js, hay
 * que reflejar el cambio ACÁ y en la constante homónima de
 * src/lib/image-loader.ts (ese archivo se bundlea para el navegador y no
 * puede importar next.config.js sin arrastrar código de servidor al
 * cliente, así que se mantiene el valor duplicado a propósito, con esta
 * misma referencia cruzada en ambos archivos).
 */
const WIDTHS = [256, 320, 384, 512, 640, 750, 828, 1024, 1440, 1920, 2560, 3840]

const SOURCE_EXTENSIONS = new Set(['.webp', '.avif', '.jpg', '.jpeg', '.png'])

/** Ver bloque "CALIDAD" en el comment-header de arriba. */
const OUTPUT_QUALITY = 100

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
        .webp({ quality: OUTPUT_QUALITY })
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

  console.log(
    `[pregenerate-image-variants] Procesando ${images.length} imágenes × ${WIDTHS.length} anchos ` +
      `(quality=${OUTPUT_QUALITY}, concurrencia=${CONCURRENCY})...`
  )

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
