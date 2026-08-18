#!/usr/bin/env node
/**
 * scripts/import-real-images.mjs
 * ============================================================
 * Descarga las imágenes REALES listadas en real-images-manifest.json
 * (fuentes oficiales de Rockstar o secundarias confiables, ya
 * investigadas y verificadas manualmente) y las convierte al mismo
 * formato que usa el resto del sitio: WebP, 1600px de lado mayor,
 * calidad 82, en public/images/entities/{categoria}/{slug}.webp
 *
 * A diferencia de process-images.mjs (que solo procesa archivos ya
 * puestos a mano en incoming-images/), este script SÍ descarga de
 * internet. Por eso está pensado para correr en un runner de GitHub
 * Actions (o cualquier entorno con salida a internet libre), no en
 * el sandbox de una sesión de Claude.
 *
 * USO:
 *   node scripts/import-real-images.mjs           # dry-run (no escribe nada)
 *   node scripts/import-real-images.mjs --apply
 *   node scripts/import-real-images.mjs --apply --overwrite
 *
 * FORMATO de real-images-manifest.json (array plano):
 *   [
 *     { "category": "trailers", "slug": "trailer-1-anuncio",
 *       "sourceUrl": "https://...", "sourceType": "rockstar-official",
 *       "note": "..." },
 *     ...
 *   ]
 * ============================================================
 */

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const MANIFEST_PATH = path.join(ROOT, 'real-images-manifest.json')
const OUT_DIR = path.join(ROOT, 'public', 'images', 'entities')

const APPLY = process.argv.includes('--apply')
const OVERWRITE = process.argv.includes('--overwrite')

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function downloadBuffer(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Referer: 'https://www.google.com/' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  const arrBuf = await res.arrayBuffer()
  return Buffer.from(arrBuf)
}

async function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`No existe ${MANIFEST_PATH}`)
    process.exit(1)
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))

  let ok = 0
  let skipped = 0
  let failed = 0
  const errors = []

  for (const item of manifest) {
    const { category, slug, sourceUrl } = item
    if (!sourceUrl) {
      console.log(`SKIP (sin sourceUrl): ${category}/${slug}`)
      skipped++
      continue
    }

    const outPath = path.join(OUT_DIR, category, `${slug}.webp`)
    if (fs.existsSync(outPath) && !OVERWRITE) {
      console.log(`SKIP (ya existe, usa --overwrite para reemplazar): ${category}/${slug}`)
      skipped++
      continue
    }

    try {
      console.log(`Descargando ${category}/${slug} <- ${sourceUrl}`)
      const buf = await downloadBuffer(sourceUrl)

      const webp = await sharp(buf)
        .resize({ width: 1600, height: 900, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer()

      if (APPLY) {
        fs.mkdirSync(path.dirname(outPath), { recursive: true })
        fs.writeFileSync(outPath, webp)
      }
      console.log(`  OK ${APPLY ? '(escrito)' : '(dry-run, no escrito)'} -> ${outPath}`)
      ok++
    } catch (err) {
      console.error(`  FALLO ${category}/${slug}: ${err.message}`)
      errors.push({ category, slug, sourceUrl, error: err.message })
      failed++
    }
  }

  console.log(`\n== Resumen == OK=${ok} SKIP=${skipped} FAIL=${failed} (modo: ${APPLY ? 'apply' : 'dry-run'})`)

  if (errors.length) {
    fs.mkdirSync(path.join(ROOT, '.ci-debug'), { recursive: true })
    fs.writeFileSync(
      path.join(ROOT, '.ci-debug', 'import-real-images-errors.json'),
      JSON.stringify(errors, null, 2)
    )
  }

  process.env.IMPORT_OK = String(ok)
  process.env.IMPORT_FAIL = String(failed)
  if (process.env.GITHUB_ENV) {
    fs.appendFileSync(process.env.GITHUB_ENV, `IMPORT_OK=${ok}\nIMPORT_FAIL=${failed}\n`)
  }
}

main()
