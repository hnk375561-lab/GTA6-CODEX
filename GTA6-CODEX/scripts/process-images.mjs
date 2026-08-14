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
 *   5. Optimiza con sharp: convierte a WebP, resize máx 1600px en el
 *      lado mayor (no upscalea), y calidad 82 (ajustable).
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

const ROOT = process.cwd()
const INCOMING_DIR = path.join(ROOT, 'incoming-images')
const CONTENT_DIR = path.join(ROOT, 'src', 'content')
const PUBLIC_ENTITIES_DIR = path.join(ROOT, 'public', 'images', 'entities')
const UNIDENTIFIED_DIR = path.join(INCOMING_DIR, '_sin-identificar')
const POSSIBLE_DUP_DIR = path.join(INCOMING_DIR, '_duplicados-posibles')

const CATEGORIES = ['personajes', 'vehiculos', 'ubicaciones', 'organizaciones', 'negocios']
const VALID_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])
const MAX_DIMENSION = 1600
const WEBP_QUALITY = 82

const APPLY = process.argv.includes('--apply')
const OVERWRITE = process.argv.includes('--overwrite')

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
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
        index.push({
          slug: raw.slug || file.replace(/\.json$/, ''),
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

/** Intenta resolver un nombre de archivo a una entidad conocida */
function matchEntity(fileBaseName, index, categoryHint) {
  const norm = normalize(fileBaseName)

  // 1) match exacto por slug
  const exact = index.find((e) => norm === e.slug && (!categoryHint || e.type === categoryHint))
  if (exact) return { entity: exact, confidence: 'exact-slug' }

  // 2) el nombre de archivo empieza con el slug (ej. lucia-caminos-01.jpg)
  const prefixSlug = index.find(
    (e) => norm.startsWith(e.slug + '-') && (!categoryHint || e.type === categoryHint)
  )
  if (prefixSlug) return { entity: prefixSlug, confidence: 'slug-prefix' }

  // 3) el nombre de archivo empieza con el título normalizado (ej. "lucia-caminos-01" == "Lucia Caminos 01")
  const prefixTitle = index.find(
    (e) =>
      e.normalizedTitle.length > 0 &&
      norm.startsWith(e.normalizedTitle) &&
      (!categoryHint || e.type === categoryHint)
  )
  if (prefixTitle) return { entity: prefixTitle, confidence: 'title-prefix' }

  return null
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
  const report = { processed: 0, identified: 0, moved: 0, duplicates: 0, unidentified: 0, errors: 0 }

  if (APPLY) {
    fs.mkdirSync(UNIDENTIFIED_DIR, { recursive: true })
    fs.mkdirSync(POSSIBLE_DUP_DIR, { recursive: true })
  }

  for (const { filePath, categoryHint } of filesToProcess) {
    report.processed++
    const baseName = path.basename(filePath, path.extname(filePath))

    try {
      const inputBuffer = fs.readFileSync(filePath)
      const hash = sha1(inputBuffer)

      if (seenHashes.has(hash)) {
        console.log(`  DUPLICADO EXACTO (mismo contenido que ${seenHashes.get(hash)}): ${filePath}`)
        report.duplicates++
        if (APPLY) fs.renameSync(filePath, path.join(POSSIBLE_DUP_DIR, path.basename(filePath)))
        continue
      }
      seenHashes.set(hash, filePath)

      const match = matchEntity(baseName, entityIndex, categoryHint)
      if (!match) {
        console.log(`  SIN IDENTIFICAR: ${filePath} (no coincide con ningún slug/título conocido)`)
        report.unidentified++
        if (APPLY) fs.renameSync(filePath, path.join(UNIDENTIFIED_DIR, path.basename(filePath)))
        continue
      }

      report.identified++
      const { entity, confidence } = match
      const destDir = path.join(PUBLIC_ENTITIES_DIR, entity.type)
      const destPath = path.join(destDir, `${entity.slug}.webp`)

      if (fs.existsSync(destPath) && !OVERWRITE) {
        console.log(
          `  YA EXISTE imagen para ${entity.type}/${entity.slug} — dejo el archivo en _duplicados-posibles/ (usá --overwrite para reemplazar)`
        )
        report.duplicates++
        if (APPLY) fs.renameSync(filePath, path.join(POSSIBLE_DUP_DIR, path.basename(filePath)))
        continue
      }

      console.log(
        `  ${entity.type}/${entity.slug}  <—  ${path.basename(filePath)}  (match: ${confidence})`
      )

      if (APPLY) {
        fs.mkdirSync(destDir, { recursive: true })
        const image = sharp(inputBuffer)
        const metadata = await image.metadata()
        const needsResize =
          (metadata.width && metadata.width > MAX_DIMENSION) ||
          (metadata.height && metadata.height > MAX_DIMENSION)

        let pipeline = image
        if (needsResize) {
          pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
            fit: 'inside',
            withoutEnlargement: true,
          })
        }

        await pipeline.webp({ quality: WEBP_QUALITY }).toFile(destPath)
        fs.unlinkSync(filePath)
        report.moved++
      }
    } catch (err) {
      console.error(`  ERROR procesando ${filePath}:`, err.message)
      report.errors++
    }
  }

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

main()
