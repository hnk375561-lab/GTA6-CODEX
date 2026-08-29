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
 * REQUISITO DE RESOLUCIÓN (agregado): además de la licencia, cada
 * candidato tiene que cumplir un piso de "2K" antes de entrar al
 * manifest — ver MIN_LONG_SIDE/MIN_SHORT_SIDE abajo. Si Commons solo
 * tiene una foto con licencia libre pero por debajo de ese piso, el
 * vehículo queda en `notFound` igual que si no hubiera nada: nunca se
 * hace upscale ni se acepta una imagen de menor resolución solo para
 * completar el listado.
 *
 * MÚLTIPLES PASADAS: `findBestImageFor` ya prueba varias variantes de
 * query por vehículo (marca+modelo, modelo solo, modelo+"car"). El
 * cache en disco (.commons-image-cache.json) permite además correr
 * este script varias veces sin re-consultar lo ya resuelto — si en una
 * corrida algo quedó en notFound, alcanza con borrar esa entrada del
 * cache (o correr con --retry-notfound) para reintentarlo en la
 * siguiente pasada, por ejemplo después de ajustar manualmente el
 * `title`/`manufacturer` de una ficha si la búsqueda no encontraba nada
 * por un nombre poco común.
 *
 * Requiere salida a internet real (api.wikimedia.org / commons.wikimedia.org),
 * por eso está pensado para correr en GitHub Actions o en tu máquina,
 * no en el sandbox de una sesión de Claude.
 *
 * USO:
 *   node scripts/generate-manifest-from-commons.mjs           (dry-run, imprime resultado)
 *   node scripts/generate-manifest-from-commons.mjs --write   (escribe real-images-manifest.json)
 *   node scripts/generate-manifest-from-commons.mjs --write --retry-notfound
 *                                                     (además reintenta lo que quedó sin resultado
 *                                                      en corridas previas, en vez de respetar el cache)
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
const RETRY_NOTFOUND = process.argv.includes('--retry-notfound')
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'

// Piso mínimo de resolución ("2K"). Se exige en ambos lados para cubrir
// tanto orientación horizontal como vertical:
//   - lado mayor >= 2560px (ej. 2560x1440, 3000x2000, 3840x2160)
//   - lado menor >= 1440px (descarta paisajes anchos pero muy bajos, tipo
//     3000x900, que no son realmente "2K" en el sentido que pide el sitio)
// Nunca se hace upscale para llegar a este piso: si la fuente no lo
// cumple de origen, el candidato se descarta directamente.
// Piso subido de 2560x1440 a 3000x1700 (29 ago 2026): el piso anterior
// dejaba pasar candidatos que cumplían el número de píxeles pero no la
// nitidez real (fotos viejas/comprimidas escaladas justo por encima del
// mínimo). Nunca se hace upscale para llegar a esto — ver
// `withoutEnlargement` en import-real-images.mjs.
const MIN_LONG_SIDE = 3000
const MIN_SHORT_SIDE = 1700

function meetsResolutionFloor(width, height) {
  if (!width || !height) return false
  const long = Math.max(width, height)
  const short = Math.min(width, height)
  return long >= MIN_LONG_SIDE && short >= MIN_SHORT_SIDE
}

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

// BUGFIX (ago 2026): Wikimedia devuelve LicenseShortName con espacios
// ("CC BY-SA 4.0"), no con guiones ("cc-by-sa-4.0" como en
// ACCEPTABLE_LICENSES). El match por `.includes()` nunca daba positivo
// aunque la licencia fuera perfectamente aceptable — normalizamos
// espacios a guiones antes de comparar.
function isAcceptableLicense(licenseShortName) {
  if (!licenseShortName) return false
  const normalized = licenseShortName.toLowerCase().trim().replace(/\s+/g, '-')
  return ACCEPTABLE_LICENSES.some((accepted) => normalized.includes(accepted))
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// BUGFIX (ago 2026): las IPs compartidas de los runners de GitHub Actions
// reciben 429 de la API de Commons casi de inmediato (mismo fenómeno ya
// documentado en import-real-images.mjs para las descargas). Antes esto
// tiraba el query entero como "sin resultado" a la primera; ahora
// reintenta con backoff exponencial (respetando Retry-After si viene).
// TUNING (ago 2026, tras ver un run colgado ~35min sin terminar): con
// 5 reintentos y techo de 20s, un vehículo constantemente 429 podía
// consumir minutos él solo y en el peor caso horas para las 250
// entradas. Bajamos a 3 reintentos / techo 6s: preferimos que un
// vehículo puntual quede "sin resultado esta corrida" (se puede
// reintentar después con --retry-notfound) a que el job entero se
// cuelgue. Combinado con el guardado incremental del cache más abajo,
// ninguna corrida pierde el progreso ya hecho aunque se corte.
const SEARCH_MAX_RETRIES = 3

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

  let lastErr
  for (let attempt = 0; attempt <= SEARCH_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoffMs = lastErr?.retryAfterMs ?? Math.min(1200 * 2 ** (attempt - 1), 6000)
      await sleep(backoffMs)
    }
    let res
    try {
      res = await fetch(searchUrl, {
        headers: { 'User-Agent': 'AutoFicha-ManifestBot/1.0 (contacto: proyecto AutoFicha)' },
      })
    } catch (err) {
      lastErr = err
      continue
    }
    if (res.status === 429 || res.status === 503) {
      const retryAfterHeader = res.headers.get('retry-after')
      const err = new Error(`HTTP ${res.status}`)
      err.retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined
      lastErr = err
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const pages = data?.query?.pages
    if (!pages) return []
    return Object.values(pages)
  }
  throw lastErr
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
  // Varias variantes de query, de más específica a más amplia, para
  // maximizar cobertura sin perder precisión: se prueba la más específica
  // primero y solo se sigue a la siguiente si esa no dio ningún candidato
  // con licencia libre Y resolución >= piso mínimo.
  const manufacturer = (vehicle.manufacturer ?? '').trim()
  const title = (vehicle.title ?? '').trim()
  const queries = [
    `${manufacturer} ${title}`.trim(),
    `${manufacturer} ${title} car`.trim(),
    title,
    `${title} automobile`.trim(),
  ].filter((q, i, arr) => q && arr.indexOf(q) === i) // sin duplicados/vacíos

  let sawLicensedButTooSmall = false
  const debug = []
  let anyQuerySucceeded = false
  let lastError = null

  for (const query of queries) {
    let pages
    try {
      pages = await searchCommons(query)
      anyQuerySucceeded = true
    } catch (err) {
      lastError = err.message
      debug.push({ query, error: err.message })
      continue
    }

    const infos = pages.map(extractLicenseInfo).filter(Boolean)
    const licenses = infos.map((i) => i.licenseShortName)
    const licensed = infos.filter((info) => isAcceptableLicense(info.licenseShortName))

    debug.push({
      query,
      pagesReturned: pages.length,
      infosExtracted: infos.length,
      licensesSeen: licenses,
      licensedCount: licensed.length,
      sampleSizes: infos.slice(0, 3).map((i) => `${i.width}x${i.height}`),
    })

    // Preferimos imágenes de mayor resolución entre las que tengan
    // licencia aceptable Y cumplan el piso de 2K.
    const candidates = licensed
      .filter((info) => meetsResolutionFloor(info.width, info.height))
      .sort((a, b) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0))

    if (candidates.length > 0) {
      return { ...candidates[0], matchedQuery: query, status: 'ok' }
    }

    if (licensed.length > 0) sawLicensedButTooSmall = true
  }

  if (!anyQuerySucceeded) {
    return { status: 'error', error: lastError, debug }
  }

  return { status: sawLicensedButTooSmall ? 'too-small' : 'no-license', debug }
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
  const notFoundNoLicense = []
  const notFoundTooSmall = []
  let fromCache = 0

  // GUARDA DE TIEMPO (ago 2026): un run anterior quedó colgado ~35min sin
  // terminar por los reintentos de 429 acumulados en 250 vehículos. En vez
  // de dejar que el job siga hasta el timeout del runner (y perder todo lo
  // que no llegó a escribirse), cortamos el bucle a los RUN_BUDGET_MS y
  // escribimos igual manifest+cache con lo procesado hasta ahí. Lo que
  // quedó sin tocar simplemente no está en el cache todavía, así que la
  // PRÓXIMA corrida (o esta misma con --retry-notfound) retoma justo donde
  // se cortó, sin repetir trabajo ya hecho.
  const RUN_BUDGET_MS = Number(process.env.RUN_BUDGET_MS || 12 * 60 * 1000)
  const startedAt = Date.now()
  let timeBudgetExceeded = false

  for (const file of files) {
    if (Date.now() - startedAt > RUN_BUDGET_MS) {
      console.log(
        `\n⏱ Presupuesto de tiempo (${Math.round(RUN_BUDGET_MS / 1000)}s) agotado — cortando acá. Lo ya resuelto queda guardado; correr de nuevo para continuar con el resto.`
      )
      timeBudgetExceeded = true
      break
    }

    const raw = fs.readFileSync(path.join(VEHICLES_DIR, file), 'utf8').replace(/^\uFEFF/, '')
    const vehicle = JSON.parse(raw)
    const slug = vehicle.slug

    let result = cache[slug]
    // Si --retry-notfound está activo, ignoramos el cache para cualquier
    // entrada que en una corrida previa haya quedado sin resultado (así
    // una pasada nueva puede encontrar algo que la anterior no encontró,
    // sin tener que re-consultar TODO el catálogo de nuevo).
    const cachedWasMiss = result && result.status !== 'ok'
    if (result === undefined || (RETRY_NOTFOUND && cachedWasMiss)) {
      result = await findBestImageFor(vehicle)
      cache[slug] = result
      // Guardado incremental: si el job se corta/cancela a mitad de
      // camino (timeout del runner, cancelación manual, etc.), lo ya
      // resuelto no se pierde — antes el cache solo se escribía una vez
      // al final de TODO el bucle.
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))
      // Pequeña pausa para no golpear la API de Commons demasiado rápido.
      await new Promise((r) => setTimeout(r, 200))
    } else {
      fromCache++
    }

    if (result.status === 'ok') {
      manifest.push({
        category: 'vehiculos',
        slug,
        sourceUrl: result.url,
        sourceType: 'wikimedia-commons',
        license: result.licenseShortName,
        attribution: result.artist,
        attributionUrl: result.descriptionUrl,
        resolution: `${result.width}x${result.height}`,
        note: `Encontrado con query "${result.matchedQuery}". Resolución ${result.width}x${result.height} (>= piso 2K). Verificar manualmente que la foto corresponde al modelo/año correcto antes de publicar.`,
      })
      console.log(`✓ ${slug} → ${result.licenseShortName} (${result.width}x${result.height})`)
    } else if (result.status === 'too-small') {
      notFoundTooSmall.push(slug)
      console.log(`✗ ${slug} — había foto con licencia libre pero por debajo de 2K, descartada (sin upscale)`)
    } else {
      notFoundNoLicense.push(slug)
      console.log(`✗ ${slug} — sin resultado con licencia libre aceptable`)
    }
  }

  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))

  const notFoundTotal = notFoundNoLicense.length + notFoundTooSmall.length
  console.log(`\n============================================================`)
  console.log(`Encontradas (>= 2K, licencia libre): ${manifest.length}/${files.length}`)
  console.log(`Sin resultado: ${notFoundTotal}/${files.length}`)
  console.log(`  - sin licencia libre encontrada: ${notFoundNoLicense.length}`)
  console.log(`  - licencia libre pero < 2K (descartada, no se hizo upscale): ${notFoundTooSmall.length}`)
  if (fromCache > 0) console.log(`(${fromCache} tomadas de cache local, no se volvió a consultar la API)`)
  if (notFoundTotal > 0) {
    console.log(`\nVehículos sin foto que cumpla licencia + 2K (resolver aparte):`)
    if (notFoundNoLicense.length > 0) {
      console.log(`  Sin licencia libre:`)
      notFoundNoLicense.forEach((s) => console.log(`    - ${s}`))
    }
    if (notFoundTooSmall.length > 0) {
      console.log(`  Con licencia pero < 2K:`)
      notFoundTooSmall.forEach((s) => console.log(`    - ${s}`))
    }
    console.log(
      `\nPara reintentar estos en otra pasada (por si Commons suma contenido nuevo, o tras ajustar el título/manufacturer de la ficha):`
    )
    console.log(`  node scripts/generate-manifest-from-commons.mjs --write --retry-notfound`)
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
