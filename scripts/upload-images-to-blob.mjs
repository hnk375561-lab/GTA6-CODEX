#!/usr/bin/env node
/**
 * scripts/upload-images-to-blob.mjs
 * ============================================================
 * REEMPLAZA a scripts/pregenerate-image-variants.mjs como paso de BUILD.
 *
 * POR QUÉ:
 *   pregenerate-image-variants.mjs escribía ~2900 archivos (242 imágenes
 *   × 12 anchos) en public/images/_optimized/ EN CADA BUILD de Vercel.
 *   Como Next.js empaqueta toda public/ en el output del deploy, eso
 *   generaba ~1.5-1.8 GB nuevos por build y agotaba el disco del
 *   contenedor (ENOSPC).
 *
 *   Este script hace lo mismo (mismas 12 variantes, misma calidad por
 *   ancho) pero las SUBE a Vercel Blob en vez de escribirlas en public/.
 *   Se corre UNA VEZ localmente (o cada vez que cambian las imágenes
 *   fuente) — NO en cada build de Vercel. El build de Vercel deja de
 *   tocar imágenes por completo: solo lee las URLs de Blob a través de
 *   src/lib/image-loader.ts.
 *
 * REQUISITOS:
 *   1. npm install @vercel/blob
 *   2. Crear un Blob store en Vercel (Dashboard → Storage → Create →
 *      Blob) y conectarlo a este proyecto. Eso agrega automáticamente
 *      la env var BLOB_READ_WRITE_TOKEN al proyecto en Vercel.
 *   3. Para correr este script LOCALMENTE necesitás ese mismo token en
 *      tu .env local: `vercel env pull .env.local` lo trae, o copialo a
 *      mano desde Vercel → Storage → tu store → ".env.local" tab.
 *
 * USO:
 *   node scripts/upload-images-to-blob.mjs
 *   node scripts/upload-images-to-blob.mjs --concurrency=8
 *   node scripts/upload-images-to-blob.mjs --force   (re-sube todo)
 *
 * SALIDA:
 *   - Sube cada variante a Blob en la ruta:
 *       images/_optimized/{type}/{slug}-w{width}.webp
 *     con addRandomSuffix:false (URL determinística) y allowOverwrite
 *     true (para poder re-correr el script sin acumular basura).
 *   - Escribe src/config/entity-images-manifest.json: qué slugs de cada
 *     tipo TIENEN imagen. src/lib/images.ts lee este archivo (chiquito,
 *     sí se commitea) en vez de escanear public/images/entities/** con
 *     fs — así el repo deployado ya NO necesita tener los binarios de
 *     imagen, solo este manifest.
 *   - Imprime la URL base de Blob que hay que poner en la env var
 *     NEXT_PUBLIC_BLOB_BASE_URL (Vercel → Settings → Environment
 *     Variables, en Production y Preview).
 * ============================================================
 */

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { put } from '@vercel/blob'
import { fileURLToPath } from 'url'
import { ALL_WIDTHS, buildQualityByWidth } from './lib/image-usage-manifest.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

// Misma carpeta de siempre. OJO: esta carpeta pasa a ser SOLO un
// insumo local para este script — ya no hace falta que esté commiteada
// en git ni presente en el deploy de Vercel (ver .gitignore).
const SOURCE_DIR = path.join(ROOT, 'public', 'images', 'entities')
const MANIFEST_PATH = path.join(ROOT, 'src', 'config', 'entity-images-manifest.json')

const WIDTHS = ALL_WIDTHS
const SOURCE_EXTENSIONS = new Set(['.webp', '.avif', '.jpg', '.jpeg', '.png'])
const QUALITY_BY_WIDTH = buildQualityByWidth()

const APPLY_FORCE = process.argv.includes('--force')
const concurrencyArg = process.argv.find((a) => a.startsWith('--concurrency='))
const CONCURRENCY = concurrencyArg ? Math.max(1, parseInt(concurrencyArg.split('=')[1], 10) || 4) : 4

// Vercel Blob ahora autentica por defecto con OIDC (BLOB_STORE_ID +
// VERCEL_OIDC_TOKEN, ambos de corta duración y rotados solos) en vez del
// BLOB_READ_WRITE_TOKEN de larga duración de antes. `vercel env pull`
// trae las dos automáticamente si el store está conectado al proyecto —
// el SDK de @vercel/blob las detecta solo, no hay que pasarle nada.
const hasOidcAuth = Boolean(process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN)
const hasLegacyToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN)

if (!hasOidcAuth && !hasLegacyToken) {
  console.error(
    '[upload-images-to-blob] No encuentro credenciales de Blob en el entorno.\n' +
      '  1. Vercel Dashboard → tu proyecto → Storage → conectá tu Blob store al proyecto\n' +
      '  2. Desde la carpeta del proyecto: `vercel link` y despué `vercel env pull .env.local`\n' +
      '  3. Volvé a correr este script (Node carga .env.local solo si usás `node --env-file=.env.local ...`,\n' +
      '     o si tu package.json ya usa algo como dotenv/next para cargarlo)\n'
  )
  process.exit(1)
}

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

/** Lista recursiva de imágenes fuente, ruta relativa a SOURCE_DIR (ej. "vehiculos/abarth-595.webp"). */
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

async function uploadImage(relPath, stats, manifest) {
  const srcPath = path.join(SOURCE_DIR, relPath)
  const ext = path.extname(relPath)
  const withoutExt = relPath.slice(0, -ext.length) // ej. "vehiculos/abarth-595"
  const [type, ...slugParts] = withoutExt.split(path.sep)
  const slug = slugParts.join(path.sep)

  if (!manifest[type]) manifest[type] = []
  if (!manifest[type].includes(slug)) manifest[type].push(slug)

  for (const width of WIDTHS) {
    const quality = QUALITY_BY_WIDTH.get(width) ?? 100
    const blobPath = `images/_optimized/${withoutExt}-w${width}.webp`

    try {
      const buffer = await sharp(srcPath)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality })
        .toBuffer()

      await put(blobPath, buffer, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'image/webp',
        cacheControlMaxAge: 31536000, // 1 año — son inmutables (nombre incluye ancho)
      })

      stats.uploaded++
      stats.totalBytes += buffer.length
    } catch (err) {
      stats.errors.push({ relPath, width, message: err instanceof Error ? err.message : String(err) })
    }
  }
}

async function main() {
  const startedAt = Date.now()

  if (!fs.existsSync(SOURCE_DIR)) {
    console.log(`[upload-images-to-blob] No existe ${path.relative(ROOT, SOURCE_DIR)} — nada que subir.`)
    return
  }

  const images = listSourceImages(SOURCE_DIR)
  if (images.length === 0) {
    console.log('[upload-images-to-blob] No se encontraron imágenes fuente — nada que hacer.')
    return
  }

  const stats = { uploaded: 0, totalBytes: 0, errors: [] }
  const manifest = {}

  console.log(
    `[upload-images-to-blob] Subiendo ${images.length} imágenes × ${WIDTHS.length} anchos ` +
      `(concurrencia=${CONCURRENCY})...`
  )

  await runWithConcurrency(images, CONCURRENCY, (relPath) => uploadImage(relPath, stats, manifest))

  for (const type of Object.keys(manifest)) manifest[type].sort()

  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true })
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n')

  const elapsedS = ((Date.now() - startedAt) / 1000).toFixed(1)

  console.log(
    `[upload-images-to-blob] Listo en ${elapsedS}s — ${stats.uploaded} variantes subidas, ` +
      `${formatBytes(stats.totalBytes)} totales.`
  )
  console.log(`[upload-images-to-blob] Manifest escrito en ${path.relative(ROOT, MANIFEST_PATH)}`)
  console.log(
    '\n[upload-images-to-blob] Copiá esta URL base a la env var NEXT_PUBLIC_BLOB_BASE_URL ' +
      '(Vercel → Settings → Environment Variables, Production + Preview):\n'
  )
  console.log('  https://<TU-STORE-ID>.public.blob.vercel-storage.com/images/_optimized')
  console.log(
    '\n  (el <TU-STORE-ID> lo ves en Vercel → Storage → tu Blob store → cualquier URL de archivo subido,' +
      ' o corriendo `vercel blob list` y mirando el dominio de una URL devuelta)\n'
  )

  if (stats.errors.length > 0) {
    console.error(`[upload-images-to-blob] ${stats.errors.length} error(es):`)
    for (const e of stats.errors) {
      console.error(`  - ${e.relPath} (ancho ${e.width}): ${e.message}`)
    }
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error('[upload-images-to-blob] Error fatal:', err)
  process.exitCode = 1
})
