#!/usr/bin/env node
/**
 * scripts/generate-manifest-from-commons.mjs
 * ============================================================
 * Busca en Wikimedia Commons una foto con licencia libre y compatible
 * con uso comercial (CC0, CC-BY, CC-BY-SA, dominio público) para cada
 * vehículo en src/content/vehiculos/*.json, y genera
 * real-images-manifest.json en el formato que ya espera
 * `import-real-images.mjs`.
 *
 * IMPORTANTE — por qué esto y no scraping de fotos de fabricante:
 * las fotos oficiales de prensa de cada marca (Toyota, BMW, Ferrari,
 * etc.) tienen copyright del fabricante/fotógrafo y sus propios
 * términos de uso, casi nunca compatibles con un sitio con AdSense
 * sin gestionar permiso marca por marca. Wikimedia Commons, en
 * cambio, solo aloja contenido ya publicado bajo una licencia libre
 * explícita — este script respeta esa licencia y la deja registrada
 * en el manifest para que quede trazable de dónde salió cada imagen
 * y bajo qué términos se puede usar.
 *
 * COBERTURA ESPERADA: no todos los 250 vehículos van a tener una foto
 * libre en Commons (autos muy nuevos o de nicho suelen no tenerla
 * todavía). Este script deja constancia en consola de cuáles no
 * encontró nada, para resolverlos aparte (kit de prensa oficial con
 * permiso, banco de fotos pago, o ilustración).
 *
 * Requiere salida a internet real (api.wikimedia.org / commons.wikimedia.org),
 * por eso está pensado para correr en GitHub Actions o en tu máquina,
 * no en el sandbox de una sesión de Claude.
 *
 * USO:
 *   node scripts/generate-manifest-from-commons.mjs           (dry-run, imprime resultado)
 *   node scripts/generate-manifest-from-commons.mjs --write   (escribe real-images-manifest.json)
 * ============================================================
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const VEHICLES_DIR = path.join(ROOT, 'src', 'content', 'vehiculos')
const MANIFEST_PATH = path.join(ROOT, 'real-images-manifest.json')
const CACHE_PATH = path.join(ROOT, '.commons-image-cache.json')

const WRITE = process.argv.includes('--write')
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'

// Licencias que consideramos seguras para uso comercial. CC-BY / CC-BY-SA
// exigen atribución (por eso guardamos `author` y `licenseShortName` en
// el manifest) — NO exigen que el uso sea no comercial.
const ACCEPTABLE_LICENSES = [
  'cc0',
  'public domain',
  'pd',
  'cc-by-2.0',
  'cc-by-3.0',
  'cc-by-4.0',
  'cc-by-sa-2.0',
  'cc-by-sa-3.0',
  'cc-by-sa-4.0',
]

function isAcceptableLicense(licenseShortName) {
  if (!licenseShortName) return false
  const normalized = licenseShortName.toLowerCase().trim()
  return ACCEPTABLE_LICENSES.some((accepted) => normalized.includes(accepted))
}

async function searchCommons(query) {
  const searchUrl = new URL(COMMONS_API)
  searchUrl.search = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: '6', // File:
    gsrlimit: '5',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|size',
    format: 'json',
    origin: '*',
  }).toString()

  const res = await fetch(searchUrl, {
    headers: { 'User-Agent': 'AutoFicha-ManifestBot/1.0 (contacto: proyecto AutoFicha)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const pages = data?.query?.pages
  if (!pages) return []
  return Object.values(pages)
}

function extractLicenseInfo(page) {
  const info = page?.imageinfo?.[0]
  if (!info) return null
  const meta = info.extmetadata || {}
  const licenseShortName = meta.LicenseShortName?.value
  const artist = meta.Artist?.value?.replace(/<[^>]+>/g, '').trim()
  const width = info.width
  const height = info.height
  return {
    url: info.url,
    descriptionUrl: info.descriptionurl,
    licenseShortName,
    artist: artist || 'Autor no especificado en metadata',
    width,
    height,
  }
}

async function findBestImageFor(vehicle) {
  // Probamos primero con marca + modelo completo, y si no hay nada
  // aceptable, con una query más amplia (solo el título).
  const queries = [`${vehicle.manufacturer ?? ''} ${vehicle.title}`.trim(), vehicle.title]

  for (const query of queries) {
    let pages
    try {
      pages = await searchCommons(query)
    } catch (err) {
      console.warn(`  ⚠ error buscando "${query}": ${err.message}`)
      continue
    }

    // Preferimos imágenes de mayor resolución entre las que tengan
    // licencia aceptable.
    const candidates = pages
      .map(extractLicenseInfo)
      .filter((info) => info && isAcceptableLicense(info.licenseShortName))
      .sort((a, b) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0))

    if (candidates.length > 0) {
      return { ...candidates[0], matchedQuery: query }
    }
  }
  return null
}

async function main() {
  const files = fs
    .readdirSync(VEHICLES_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'template.json')

  console.log(`Buscando imágenes libres en Wikimedia Commons para ${files.length} vehículos...\n`)

  // Cache simple para no re-pegarle a la API si se corre de nuevo.
  let cache = {}
  if (fs.existsSync(CACHE_PATH)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'))
    } catch {
      cache = {}
    }
  }

  const manifest = []
  const notFound = []
  let fromCache = 0

  for (const file of files) {
    const raw = fs.readFileSync(path.join(VEHICLES_DIR, file), 'utf8').replace(/^\uFEFF/, '')
    const vehicle = JSON.parse(raw)
    const slug = vehicle.slug

    let result = cache[slug]
    if (result === undefined) {
      result = await findBestImageFor(vehicle)
      cache[slug] = result
      // Pequeña pausa para no golpear la API de Commons demasiado rápido.
      await new Promise((r) => setTimeout(r, 200))
    } else {
      fromCache++
    }

    if (result) {
      manifest.push({
        category: 'vehiculos',
        slug,
        sourceUrl: result.url,
        sourceType: 'wikimedia-commons',
        license: result.licenseShortName,
        attribution: result.artist,
        attributionUrl: result.descriptionUrl,
        note: `Encontrado con query "${result.matchedQuery}". Verificar manualmente que la foto corresponde al modelo/año correcto antes de publicar.`,
      })
      console.log(`✓ ${slug} → ${result.licenseShortName} (${result.width}x${result.height})`)
    } else {
      notFound.push(slug)
      console.log(`✗ ${slug} — sin resultado con licencia libre aceptable`)
    }
  }

  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))

  console.log(`\n============================================================`)
  console.log(`Encontradas: ${manifest.length}/${files.length}`)
  console.log(`Sin resultado: ${notFound.length}/${files.length}`)
  if (fromCache > 0) console.log(`(${fromCache} tomadas de cache local, no se volvió a consultar la API)`)
  if (notFound.length > 0) {
    console.log(`\nVehículos sin foto libre encontrada (resolver aparte):`)
    notFound.forEach((s) => console.log(`  - ${s}`))
  }

  if (WRITE) {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
    console.log(`\n✓ Escrito ${MANIFEST_PATH} con ${manifest.length} entradas.`)
    console.log(`  Revisá el manifest a mano antes de correr import-real-images.mjs --apply:`)
    console.log(`  cada "note" pide confirmar que la foto es del modelo/año correcto.`)
  } else {
    console.log(`\n(dry-run, no se escribió nada — correr con --write para generar el manifest)`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
