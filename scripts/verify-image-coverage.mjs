#!/usr/bin/env node
/**
 * scripts/verify-image-coverage.mjs
 * ============================================================
 * Verifica cobertura de imágenes por vehículo.
 *
 * Sin este script, un vehículo sin imagen en
 * public/images/entities/vehiculos/{slug}.webp podía llegar a producción
 * sin que ningún check lo detectara: Zod valida la forma del JSON, no que
 * exista el archivo de imagen correspondiente. Este script cierra ese
 * hueco comparando dos fuentes de verdad en disco:
 *
 *   - src/content/vehiculos/*.json        (qué vehículos existen)
 *   - public/images/entities/vehiculos/*.webp   (qué imágenes existen)
 *
 * Reporta dos cosas distintas, con severidad distinta:
 *
 *   1. FALTANTES (bloqueante, exit code 1): un vehículo publicado sin su
 *      imagen. Esto es lo que hace fallar el build — mismo criterio que
 *      "el propio comando debe fallar, nunca reportar éxito parcial
 *      como éxito total" (sección 14 de la auditoría, aplicado acá al
 *      build en vez de a add-vehicle.mjs).
 *   2. HUÉRFANAS (informativo, no bloquea): un .webp en disco que no
 *      corresponde a ningún vehículo actual (por ejemplo, de un vehículo
 *      renombrado o borrado). No rompe nada en producción, pero vale la
 *      pena saberlo para no versionar peso muerto en Git indefinidamente.
 *
 * USO:
 *   node scripts/verify-image-coverage.mjs
 * ============================================================
 */
import fs from 'node:fs'
import path from 'node:path'

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content', 'vehiculos')
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'entities', 'vehiculos')

const fail = (msg) => console.error(`✗ ${msg}`)
const warn = (msg) => console.warn(`⚠ ${msg}`)
const ok = (msg) => console.log(`✓ ${msg}`)

function readVehicleSlugs() {
  if (!fs.existsSync(CONTENT_DIR)) {
    fail(`No existe ${CONTENT_DIR}`)
    process.exit(1)
  }

  const slugs = []
  for (const file of fs.readdirSync(CONTENT_DIR)) {
    if (!file.endsWith('.json') || file === 'template.json') continue
    const filePath = path.join(CONTENT_DIR, file)
    try {
      const raw = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '')
      const entity = JSON.parse(raw)
      // El nombre de archivo es la fuente de verdad si el campo `slug`
      // interno no coincide (mismo criterio defensivo que otros
      // verify:* del repo) — pero preferimos el campo `slug` cuando
      // existe, porque es el que usa el motor en runtime para resolver
      // la ruta de la imagen.
      slugs.push(entity.slug || file.replace(/\.json$/, ''))
    } catch {
      // Un JSON que no parsea ya es responsabilidad de
      // verify-min-entity-count.mjs / verify-content-integrity.mjs — acá
      // no lo duplicamos, solo lo salteamos para no reportar un falso
      // "falta imagen" sobre un archivo que ya está roto por otro motivo.
    }
  }
  return slugs
}

function readImageSlugs() {
  if (!fs.existsSync(IMAGES_DIR)) return []
  return fs
    .readdirSync(IMAGES_DIR)
    .filter((f) => f.endsWith('.webp'))
    .map((f) => f.replace(/\.webp$/, ''))
}

function main() {
  const vehicleSlugs = readVehicleSlugs()
  const imageSlugs = new Set(readImageSlugs())

  const missing = vehicleSlugs.filter((slug) => !imageSlugs.has(slug)).sort()
  const vehicleSlugSet = new Set(vehicleSlugs)
  const orphaned = [...imageSlugs].filter((slug) => !vehicleSlugSet.has(slug)).sort()

  console.log(`Vehículos en src/content/vehiculos/: ${vehicleSlugs.length}`)
  console.log(`Imágenes en public/images/entities/vehiculos/: ${imageSlugs.size}`)

  if (orphaned.length > 0) {
    warn(`${orphaned.length} imagen(es) huérfana(s) (sin vehículo correspondiente hoy):`)
    for (const slug of orphaned.slice(0, 15)) console.warn(`    - ${slug}.webp`)
    if (orphaned.length > 15) console.warn(`    ... y ${orphaned.length - 15} más`)
  }

  if (missing.length > 0) {
    fail(`${missing.length} vehículo(s) sin imagen en public/images/entities/vehiculos/:`)
    for (const slug of missing.slice(0, 15)) console.error(`    - ${slug}`)
    if (missing.length > 15) console.error(`    ... y ${missing.length - 15} más`)
    console.error(
      '\nverify-image-coverage: FALLÓ — corré "npm run generate:manifest-commons:write" ' +
        'para estos slugs, revisá y mergeá el PR con la imagen antes de este build.'
    )
    process.exit(1)
  }

  ok('verify-image-coverage: OK — todos los vehículos tienen su imagen correspondiente.')
}

main()
