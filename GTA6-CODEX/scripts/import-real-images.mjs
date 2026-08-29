#!/usr/bin/env node
/**
 * scripts/import-real-images.mjs
 * ============================================================
 * Descarga las imágenes REALES listadas en real-images-manifest.json
 * (fuentes oficiales de Rockstar o secundarias confiables, ya
 * investigadas y verificadas manualmente) y las convierte a WebP,
 * hasta 3840px de lado mayor (4K real, nunca upscaleado — ver
 * `withoutEnlargement`), calidad 92, en
 * public/images/entities/{categoria}/{slug}.webp
 *
 * IMPORTANTE (19 ago 2026): el techo era antes 1600x900/q82, muy por
 * debajo de las fuentes oficiales reales (muchas a 3840px+). Eso
 * aplastaba capturas 4K a menos de 1600px antes de que llegaran al
 * sitio. Se sube el techo a 3840x2160/q92. `fit: 'inside'` +
 * `withoutEnlargement: true` significa que esto NUNCA infla una
 * imagen más allá de su resolución real de origen (a diferencia del
 * pipeline de "súper-resolución" IA que se probó y revirtió el mismo
 * día — ver commits 6e20cfd/ea49655 y sus reverts 75e7b2b/180bb7a —
 * que sí inventaba píxeles falsos). Acá solo se deja pasar más detalle
 * real cuando la fuente lo tiene.
 *
 * A diferencia de process-images.mjs (que solo procesa archivos ya
 * puestos a mano en incoming-images/), este script SÍ descarga de
 * internet. Por eso está pensado para correr en un runner de GitHub
 * Actions (o cualquier entorno con salida a internet libre), no en
 * el sandbox de una sesión de Claude.
 *
 * PISO DE RESOLUCIÓN ("2K"): además del techo de 3840x2160 (nunca
 * upscale — ver `withoutEnlargement`), este script ahora valida la
 * resolución REAL del archivo ya descargado (no la que decía el
 * manifest/la fuente) contra un piso mínimo antes de escribirlo. Si el
 * archivo descargado resulta más chico que el piso, se descarta — no se
 * escribe igual ni se hace upscale para simular que cumple.
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

// Mismo piso que scripts/generate-manifest-from-commons.mjs — ver ahí el
// razonamiento de por qué exigir ambos lados en vez de solo el área.
const MIN_LONG_SIDE = 2560
const MIN_SHORT_SIDE = 1440

function meetsResolutionFloor(width, height) {
  if (!width || !height) return false
  const long = Math.max(width, height)
  const short = Math.min(width, height)
  return long >= MIN_LONG_SIDE && short >= MIN_SHORT_SIDE
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Los runners de GitHub Actions comparten pools de IP muy castigados por
// tráfico automatizado de todo el mundo, así que Wikimedia devuelve 429
// (Too Many Requests) con más frecuencia acá que desde una IP residencial.
// Reintenta con backoff exponencial (respetando Retry-After si viene) en
// vez de descartar la imagen a la primera — evita falsos "sin imagen ≥2K"
// que en realidad sí existían, solo que la primera consulta fue throttled.
const MAX_RETRIES = 4

async function downloadBuffer(url) {
  let lastErr
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const res429RetryAfter = lastErr?.retryAfterMs
      const backoffMs = res429RetryAfter ?? Math.min(2000 * 2 ** (attempt - 1), 20000)
      console.log(`    reintentando en ${Math.round(backoffMs / 1000)}s (intento ${attempt + 1}/${MAX_RETRIES + 1})...`)
      await sleep(backoffMs)
    }
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Referer: 'https://www.google.com/' },
      })
      if (res.status === 429) {
        const retryAfterHeader = res.headers.get('retry-after')
        const err = new Error(`HTTP 429 Too many requests`)
        err.retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined
        lastErr = err
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
      const arrBuf = await res.arrayBuffer()
      return Buffer.from(arrBuf)
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr
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
  const skippedTooSmall = []

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

      // Validar la resolución REAL del archivo ya descargado antes de
      // procesarlo. No confiamos ciegamente en el width/height que traía
      // el manifest (puede haberse generado en otro momento, o la fuente
      // pudo cambiar el archivo detrás de la misma URL).
      const meta = await sharp(buf).metadata()
      if (!meetsResolutionFloor(meta.width, meta.height)) {
        console.log(
          `  DESCARTADA (${meta.width}x${meta.height}, por debajo del piso de 2K) — no se escribe, no se hace upscale: ${category}/${slug}`
        )
        skippedTooSmall.push({ category, slug, sourceUrl, actualResolution: `${meta.width}x${meta.height}` })
        skipped++
        continue
      }

      const webp = await sharp(buf)
        .resize({ width: 3840, height: 2160, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 92 })
        .toBuffer()

      if (APPLY) {
        fs.mkdirSync(path.dirname(outPath), { recursive: true })
        fs.writeFileSync(outPath, webp)
      }
      console.log(`  OK ${APPLY ? '(escrito)' : '(dry-run, no escrito)'} (${meta.width}x${meta.height}) -> ${outPath}`)
      // Pausa corta entre descargas (además del retry/backoff en 429) para
      // no golpear a Wikimedia con ráfagas cuando el manifest crezca a
      // decenas/cientos de entradas.
      await sleep(400)
      ok++
    } catch (err) {
      console.error(`  FALLO ${category}/${slug}: ${err.message}`)
      errors.push({ category, slug, sourceUrl, error: err.message })
      failed++
    }
  }

  console.log(`\n== Resumen == OK=${ok} SKIP=${skipped} FAIL=${failed} (modo: ${APPLY ? 'apply' : 'dry-run'})`)
  if (skippedTooSmall.length > 0) {
    console.log(`  De los SKIP, ${skippedTooSmall.length} fueron por no cumplir el piso de 2K (ver detalle abajo).`)
  }

  if (errors.length || skippedTooSmall.length) {
    fs.mkdirSync(path.join(ROOT, '.ci-debug'), { recursive: true })
    if (errors.length) {
      fs.writeFileSync(
        path.join(ROOT, '.ci-debug', 'import-real-images-errors.json'),
        JSON.stringify(errors, null, 2)
      )
    }
    if (skippedTooSmall.length) {
      fs.writeFileSync(
        path.join(ROOT, '.ci-debug', 'import-real-images-below-2k.json'),
        JSON.stringify(skippedTooSmall, null, 2)
      )
    }
  }

  process.env.IMPORT_OK = String(ok)
  process.env.IMPORT_FAIL = String(failed)
  if (process.env.GITHUB_ENV) {
    fs.appendFileSync(process.env.GITHUB_ENV, `IMPORT_OK=${ok}\nIMPORT_FAIL=${failed}\n`)
  }
}

main()
