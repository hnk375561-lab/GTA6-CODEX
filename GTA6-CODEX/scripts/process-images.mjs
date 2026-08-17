#!/usr/bin/env node
/**
 * scripts/process-images.mjs
 * ============================================================
 * Pipeline de ingesta de imágenes para GTA6 Codex.
 *
 * QUÉ HACE:
 *   1. Lee todos los archivos de /incoming-images/ (no recursivo por
 *      ahora; subcarpetas por categoría son opcionales, ver más abajo)
 *   2. Para cada archivo, intenta identificar a qué entidad pertenece:
 *        a) por nombre exacto de archivo == slug (ej. lucia-caminos.jpg)
 *        b) por coincidencia difusa contra el `title` de las entidades
 *           reales en src/content/**.json (ej. "Lucia Caminos 01.jpg")
 *   3. Si no puede identificar la entidad con confianza, NO la mueve:
 *      la deja en incoming-images/_sin-identificar/ y lo reporta.
 *   4. Si la entidad ya tiene imagen (public/images/entities/{type}/{slug}.*),
 *      NO la sobreescribe automáticamente — la dejá en
 *      incoming-images/_duplicados-posibles/ para revisión manual,
 *      salvo que se pase --overwrite.
 *   5. Optimiza con sharp: convierte a WebP en resolución nativa (sin
 *      resize, se preserva el tamaño original tal cual) y calidad 100
 *      (visualmente sin pérdida, ajustable).
 *   6. Calcula un hash de contenido (sha1 del buffer decodificado) para
 *      detectar duplicados exactos entre archivos de incoming-images/,
 *      incluso si tienen nombres distintos.
 *   7. Mueve el resultado a public/images/entities/{type}/{slug}.webp
 *   8. Imprime un reporte final: procesadas, identificadas, movidas,
 *      duplicadas, sin identificar, con error.
 *
 * USO:
 *   node scripts/process-images.mjs           # dry-run (no mueve nada)
 *   node scripts/process-images.mjs --apply    # ejecuta de verdad
 *   node scripts/process-images.mjs --apply --overwrite
 *   node scripts/process-images.mjs --apply --concurrency=8
 *
 * CONCURRENCIA:
 *   El procesamiento de cada archivo corre con un pool de concurrencia
 *   acotada (CONCURRENCY, default 4, configurable con --concurrency=N).
 *   La parte que decide duplicados exactos (lectura + hash + chequeo/set
 *   en seenHashes) es síncrona y corre de un tirón sin ningún await en el
 *   medio, así que no hay condición de carrera entre workers aunque se
 *   ejecuten en paralelo. Cada archivo mantiene su propio temp file de
 *   escritura atómica, así que tampoco hay colisión entre workers ahí.
 *
 * IMPORTANTE:
 *   Este script NO descarga nada de internet. Solo procesa archivos que
 *   el usuario ya puso manualmente en /incoming-images/.
 * ============================================================
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import CATEGORIES from '../src/config/entity-image-categories.json' with { type: 'json' }

const ROOT = process.cwd()
const INCOMING_DIR = path.join(ROOT, 'incoming-images')
const CONTENT_DIR = path.join(ROOT, 'src', 'content')
const PUBLIC_ENTITIES_DIR = path.join(ROOT, 'public', 'images', 'entities')
const ORIGINALS_DIR = path.join(ROOT, 'assets-originals')
const UNIDENTIFIED_DIR = path.join(INCOMING_DIR, '_sin-identificar')
const POSSIBLE_DUP_DIR = path.join(INCOMING_DIR, '_duplicados-posibles')
const ERROR_DIR = path.join(INCOMING_DIR, '_errores')

const VALID_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])
const WEBP_QUALITY = 100

const APPLY = process.argv.includes('--apply')
const OVERWRITE = process.argv.includes('--overwrite')

const concurrencyArg = process.argv.find((a) => a.startsWith('--concurrency='))
const CONCURRENCY = concurrencyArg ? Math.max(1, parseInt(concurrencyArg.split('=')[1], 10) || 4) : 4

/**
 * Pool de concurrencia acotada, sin dependencias nuevas.
 * Corre `worker(item)` para cada elemento de `items`, nunca más de `limit`
 * a la vez. Preserva el orden de `items` solo en el sentido de que todos se
 * lanzan y se esperan; el orden de finalización puede variar.
 */
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

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Un slug válido es exactamente lo que normalize() puede producir: minúsculas,
// dígitos y guiones simples, sin separadores de path, sin '..', sin espacios.
// Se usa para SANITIZAR entity.slug antes de que se use para construir
// destPath — nunca se confía en el valor crudo del JSON de contenido.
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

function isValidSlug(slug) {
  return typeof slug === 'string' && SLUG_PATTERN.test(slug)
}

/** Carga { slug, type, title, normalizedTitle }[] desde src/content/**.json */
function loadEntityIndex() {
  const index = []
  for (const category of CATEGORIES) {
    const dir = path.join(CONTENT_DIR, category)
    if (!fs.existsSync(dir)) continue
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'))
        const slug = raw.slug || file.replace(/\.json$/, '')

        if (!isValidSlug(slug)) {
          console.warn(
            `  ADVERTENCIA: ${path.join(category, file)} tiene un slug inválido/inseguro ("${slug}") — entidad excluida del índice, no se le asignará ninguna imagen.`
          )
          continue
        }

        index.push({
          slug,
          type: category,
          title: raw.title || raw.slug,
          normalizedTitle: normalize(raw.title || ''),
        })
      } catch {
        // JSON inválido: se ignora, no es responsabilidad de este script
      }
    }
  }
  return index
}

/**
 * Dado un conjunto de candidatos { entity, length }, determina si hay un
 * ganador inequívoco: el de mayor `length`, y solo si nadie más empata con
 * ese máximo. Nunca depende del orden del array de entrada.
 */
function pickMostSpecific(candidates) {
  if (candidates.length === 0) return { status: 'none' }
  const maxLength = Math.max(...candidates.map((c) => c.length))
  const mostSpecific = candidates.filter((c) => c.length === maxLength)
  if (mostSpecific.length > 1) {
    return { status: 'ambiguous', candidates: mostSpecific.map((c) => c.entity) }
  }
  return { status: 'match', entity: mostSpecific[0].entity }
}

/**
 * Resuelve un nombre de archivo normalizado a una entidad conocida.
 *
 * Reemplaza los antiguos index.find() (que devolvían la PRIMERA entidad que
 * matcheaba, dependiendo del orden de fs.readdirSync) por una resolución
 * por tiers que reúne TODOS los candidatos de cada tier y solo asigna
 * cuando hay un candidato estrictamente más específico que el resto.
 *
 * Tiers, en orden de prioridad (un tier superior siempre gana, aunque un
 * tier inferior tenga un candidato "más largo"):
 *   1. exact-slug    — norm === slug
 *   2. slug-prefix    — norm.startsWith(slug + '-'), desambiguado por
 *                       longitud de slug
 *   3. title-prefix   — norm.startsWith(normalizedTitle), desambiguado por
 *                       longitud de título; solo se evalúa si el tier 2 no
 *                       produjo NINGÚN candidato (ni único ni ambiguo)
 *
 * Devuelve siempre uno de:
 *   { status: 'match', entity, confidence }
 *   { status: 'ambiguous', tier, candidates }
 *   { status: 'none' }
 */
function resolveMatch(norm, index, categoryHint) {
  const inCategory = (e) => !categoryHint || e.type === categoryHint

  // Tier 1: match exacto de slug
  const exactCandidates = index.filter((e) => norm === e.slug && inCategory(e))
  if (exactCandidates.length > 0) {
    if (exactCandidates.length > 1) {
      return { status: 'ambiguous', tier: 'exact-slug', candidates: exactCandidates }
    }
    return { status: 'match', entity: exactCandidates[0], confidence: 'exact-slug' }
  }

  // Tier 2: prefijo de slug (ej. lucia-caminos-01.jpg → lucia-caminos)
  const slugPrefixCandidates = index
    .filter((e) => norm.startsWith(e.slug + '-') && inCategory(e))
    .map((e) => ({ entity: e, length: e.slug.length }))
  if (slugPrefixCandidates.length > 0) {
    const result = pickMostSpecific(slugPrefixCandidates)
    if (result.status === 'ambiguous') {
      return { status: 'ambiguous', tier: 'slug-prefix', candidates: result.candidates }
    }
    return { status: 'match', entity: result.entity, confidence: 'slug-prefix' }
  }

  // Tier 3: prefijo de título normalizado. Solo se evalúa si el tier 2 no
  // produjo ningún candidato (evita mezclar especificidad entre tiers).
  const titlePrefixCandidates = index
    .filter((e) => e.normalizedTitle.length > 0 && norm.startsWith(e.normalizedTitle) && inCategory(e))
    .map((e) => ({ entity: e, length: e.normalizedTitle.length }))
  if (titlePrefixCandidates.length > 0) {
    const result = pickMostSpecific(titlePrefixCandidates)
    if (result.status === 'ambiguous') {
      return { status: 'ambiguous', tier: 'title-prefix', candidates: result.candidates }
    }
    return { status: 'match', entity: result.entity, confidence: 'title-prefix' }
  }

  return { status: 'none' }
}

/** Intenta resolver un nombre de archivo a una entidad conocida */
function matchEntity(fileBaseName, index, categoryHint) {
  const norm = normalize(fileBaseName)
  return resolveMatch(norm, index, categoryHint)
}

function sha1(buffer) {
  return crypto.createHash('sha1').update(buffer).digest('hex')
}

async function main() {
  if (!fs.existsSync(INCOMING_DIR)) {
    console.error(`No existe ${INCOMING_DIR}. Nada que procesar.`)
    process.exit(0)
  }

  const entityIndex = loadEntityIndex()
  console.log(`Índice de entidades cargado: ${entityIndex.length} entidades reales.`)

  // Recorre incoming-images/ (nivel 1, y nivel 2 si hay subcarpetas de categoría)
  const filesToProcess = []
  for (const entry of fs.readdirSync(INCOMING_DIR, { withFileTypes: true })) {
    if (entry.name.startsWith('_')) continue // carpetas de salida del propio script
    const fullPath = path.join(INCOMING_DIR, entry.name)

    if (entry.isDirectory() && CATEGORIES.includes(entry.name)) {
      // subcarpeta con nombre de categoría → hint explícito
      for (const f of fs.readdirSync(fullPath)) {
        const ext = path.extname(f).toLowerCase()
        if (VALID_EXT.has(ext)) {
          filesToProcess.push({ filePath: path.join(fullPath, f), categoryHint: entry.name })
        }
      }
    } else if (entry.isDirectory()) {
      console.warn(
        `  ADVERTENCIA: subcarpeta "${entry.name}/" en incoming-images/ no coincide con ninguna categoría conocida (${CATEGORIES.join(', ')}) — se ignora por completo. ¿Typo?`
      )
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      if (VALID_EXT.has(ext)) {
        filesToProcess.push({ filePath: fullPath, categoryHint: null })
      }
    }
  }

  if (filesToProcess.length === 0) {
    console.log('No hay imágenes nuevas en incoming-images/ (raíz o subcarpetas de categoría).')
    console.log('Colocá archivos ahí, con nombre = slug de la entidad (ej. lucia-caminos.jpg)')
    console.log('o dentro de una subcarpeta con el nombre exacto de categoría (personajes/, vehiculos/, etc.)')
    return
  }

  const seenHashes = new Map() // hash -> filePath ya procesado en esta corrida
  // destPath -> filePath que ya la reservó en esta corrida. Necesario porque con
  // concurrencia > 1, dos workers pueden entrar casi a la vez con archivos que
  // resuelven a la MISMA entidad (ej. lucia-caminos-1.png y lucia-caminos-2.png):
  // sin esto, ambos pasan el chequeo fs.existsSync(destPath) antes de que
  // cualquiera escriba, y el segundo rename() pisa en silencio al primero,
  // saltándose la protección de "_duplicados-posibles/". La reserva es una
  // operación 100% síncrona (sin await en el medio) así que no hay carrera.
  const claimedDestPaths = new Map() // destPath -> filePath que la reservó
  const report = { processed: 0, identified: 0, moved: 0, duplicates: 0, unidentified: 0, errors: 0 }

  if (APPLY) {
    fs.mkdirSync(UNIDENTIFIED_DIR, { recursive: true })
    fs.mkdirSync(POSSIBLE_DUP_DIR, { recursive: true })
    fs.mkdirSync(ERROR_DIR, { recursive: true })
  }

  await runWithConcurrency(filesToProcess, CONCURRENCY, async ({ filePath, categoryHint }) => {
    report.processed++
    const baseName = path.basename(filePath, path.extname(filePath))
    let tempDestPath = null

    try {
      const inputBuffer = fs.readFileSync(filePath)
      const hash = sha1(inputBuffer)

      if (seenHashes.has(hash)) {
        console.log(`  DUPLICADO EXACTO (mismo contenido que ${seenHashes.get(hash)}): ${filePath}`)
        report.duplicates++
        if (APPLY) fs.renameSync(filePath, path.join(POSSIBLE_DUP_DIR, path.basename(filePath)))
        return
      }
      seenHashes.set(hash, filePath)

      const match = matchEntity(baseName, entityIndex, categoryHint)

      if (match.status === 'none') {
        console.log(`  SIN IDENTIFICAR: ${filePath} (no coincide con ningún slug/título conocido)`)
        report.unidentified++
        if (APPLY) fs.renameSync(filePath, path.join(UNIDENTIFIED_DIR, path.basename(filePath)))
        return
      }

      if (match.status === 'ambiguous') {
        const candidateList = match.candidates.map((e) => `${e.type}/${e.slug}`).join(', ')
        console.log(
          `  AMBIGUO (${match.tier}): ${filePath} coincide con más de una entidad (${candidateList}) — no se asigna, va a _sin-identificar/`
        )
        report.unidentified++
        if (APPLY) fs.renameSync(filePath, path.join(UNIDENTIFIED_DIR, path.basename(filePath)))
        return
      }

      report.identified++
      const { entity, confidence } = match
      const destDir = path.join(PUBLIC_ENTITIES_DIR, entity.type)
      const destPath = path.join(destDir, `${entity.slug}.webp`)

      // Chequeo + reserva síncronos, sin ningún await entre medio: si dos
      // archivos de esta misma corrida resuelven a la misma entidad, solo el
      // primero que llega a esta línea la reserva; el resto cae al mismo
      // camino que "ya existe en disco", sin pisar nada.
      if ((fs.existsSync(destPath) || claimedDestPaths.has(destPath)) && !OVERWRITE) {
        const reason = claimedDestPaths.has(destPath)
          ? `otro archivo de esta misma corrida (${claimedDestPaths.get(destPath)}) ya la reservó`
          : 'ya existe en disco'
        console.log(
          `  YA EXISTE imagen para ${entity.type}/${entity.slug} (${reason}) — dejo el archivo en _duplicados-posibles/ (usá --overwrite para reemplazar)`
        )
        report.duplicates++
        if (APPLY) fs.renameSync(filePath, path.join(POSSIBLE_DUP_DIR, path.basename(filePath)))
        return
      }
      claimedDestPaths.set(destPath, filePath)

      console.log(
        `  ${entity.type}/${entity.slug}  <—  ${path.basename(filePath)}  (match: ${confidence})`
      )

      if (APPLY) {
        fs.mkdirSync(destDir, { recursive: true })

        // Respaldo automático del original TAL CUAL llegó (sin procesar,
        // sin recomprimir) en assets-originals/{type}/{slug}.{ext}, antes
        // de tocarlo con sharp. Así, si en el futuro cambia MAX_DIMENSION,
        // WEBP_QUALITY, o cualquier otro parámetro del pipeline, se puede
        // reprocesar TODO el catálogo sin depender de volver a conseguir
        // cada imagen a mano — el problema que motivó este cambio.
        const originalExt = path.extname(filePath) // incluye el punto, ej. '.jpg'
        const originalBackupDir = path.join(ORIGINALS_DIR, entity.type)
        const originalBackupPath = path.join(originalBackupDir, `${entity.slug}${originalExt}`)
        fs.mkdirSync(originalBackupDir, { recursive: true })
        fs.writeFileSync(originalBackupPath, inputBuffer)

        const image = sharp(inputBuffer)

        // Sin resize: se preserva la resolución nativa del original tal
        // cual (decisión deliberada del usuario, mismo criterio que ya
        // usa RotatingHeroBackground.tsx para los heroes). Solo se
        // re-encodea a WebP calidad 100 — visualmente sin pérdida
        // perceptible, sin achicar dimensiones.
        const pipeline = image

        tempDestPath = path.join(destDir, `.${entity.slug}.${process.pid}-${Date.now()}.webp.tmp`)
        await pipeline.webp({ quality: WEBP_QUALITY }).toFile(tempDestPath)
        fs.renameSync(tempDestPath, destPath) // rename es atómico dentro del mismo filesystem
        tempDestPath = null // ya no queda temp que limpiar
        fs.unlinkSync(filePath)
        report.moved++
      }
    } catch (err) {
      console.error(`  ERROR procesando ${filePath}:`, err.message)
      report.errors++

      // Si la escritura con sharp se interrumpió a mitad de camino, el
      // archivo temporal puede haber quedado en disco: se limpia para no
      // dejar basura ni un destino final corrupto (destPath nunca se toca
      // hasta el rename atómico, así que el asset bueno existente, si lo
      // había, nunca se ve afectado).
      if (tempDestPath && fs.existsSync(tempDestPath)) {
        try {
          fs.unlinkSync(tempDestPath)
        } catch {
          // best-effort
        }
      }

      // El archivo original (si sigue en su lugar) se mueve a cuarentena de
      // errores, para no dejarlo mezclado con archivos aún no procesados.
      if (APPLY && fs.existsSync(filePath)) {
        try {
          fs.renameSync(filePath, path.join(ERROR_DIR, path.basename(filePath)))
        } catch (moveErr) {
          console.error(`  No se pudo mover ${filePath} a _errores/:`, moveErr.message)
        }
      }
    }
  })

  console.log('\n=== REPORTE ===')
  console.log(`Archivos vistos:       ${report.processed}`)
  console.log(`Identificados:         ${report.identified}`)
  console.log(`Movidos/optimizados:   ${APPLY ? report.moved : 0}${APPLY ? '' : ' (dry-run, no se movió nada)'}`)
  console.log(`Duplicados/posibles:   ${report.duplicates}`)
  console.log(`Sin identificar:       ${report.unidentified}`)
  console.log(`Errores:               ${report.errors}`)
  if (!APPLY) {
    console.log('\nEsto fue un dry-run. Corré con --apply para mover y optimizar de verdad.')
  }
}

// Solo ejecuta main() cuando el script corre directamente (node scripts/process-images.mjs),
// no cuando se importa desde un test.
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isMainModule) {
  main()
}

export { normalize, loadEntityIndex, matchEntity, resolveMatch, pickMostSpecific, CATEGORIES, isValidSlug }
