#!/usr/bin/env node
/**
 * scripts/verify-manufacturer-slugs.mjs
 * ============================================================
 * Test de regresión para el bug real encontrado en la auditoría final de
 * cierre de release (2026-08): `scripts/generate-manufacturers.mjs` tenía
 * su propia función `slugify()` que NO transliteraba caracteres con
 * diacríticos, solo los eliminaba (`/[^\w\s-]/g` no matchea "ë" porque
 * `\w` es ASCII-only) — "Citroën" se convertía en "Citron" en vez de
 * "citroen". El archivo `src/content/fabricantes/citron.json` quedó así
 * en el repo con un slug incorrecto que no coincidía con el que genera
 * `slugifyManufacturer()` (src/lib/vehicle-manufacturers.ts, la función
 * usada en runtime por la app) para el mismo nombre.
 *
 * Este script valida, para cada fabricante en src/content/fabricantes/:
 *   1. El campo `slug` del JSON coincide con slugifyManufacturer(name)
 *      aplicado a `officialName` (o `title` si falta officialName).
 *   2. El nombre del archivo (sin `.json`) coincide con ese mismo slug.
 *
 * Y además, cruza los `manufacturer` de src/content/vehiculos/ contra los
 * slugs de fabricantes existentes, para detectar fabricantes "huérfanos"
 * (un vehículo con un manufacturer cuyo slug determinístico no tiene
 * ficha de fabricante correspondiente).
 *
 * La función `slugify()` de acá abajo es una copia deliberada del
 * algoritmo de `slugifyManufacturer` en src/lib/vehicle-manufacturers.ts
 * (mismo patrón que ya usan el resto de los scripts en scripts/: no se
 * importa TypeScript en runtime de Node plano, ver comentario en
 * verify-reserved-entity-keys.mjs). Si `slugifyManufacturer` cambia,
 * esta copia debe actualizarse a mano — por eso el self-test más abajo
 * fija un caso concreto (Citroën) que debe mantenerse en sync entre
 * ambas.
 *
 * USO:
 *   node scripts/verify-manufacturer-slugs.mjs
 *   node scripts/verify-manufacturer-slugs.mjs --self-test
 * ============================================================
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')
const FABRICANTES_DIR = path.join(root, 'src', 'content', 'fabricantes')
const VEHICULOS_DIR = path.join(root, 'src', 'content', 'vehiculos')

// Debe coincidir exactamente con slugifyManufacturer en
// src/lib/vehicle-manufacturers.ts.
function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function checkManufacturerSlugs() {
  const errors = []
  const files = fs.readdirSync(FABRICANTES_DIR).filter((f) => f.endsWith('.json'))
  const knownSlugs = new Set()

  for (const file of files) {
    const filePath = path.join(FABRICANTES_DIR, file)
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const filenameSlug = file.replace(/\.json$/, '')
    const sourceName = data.officialName || data.title
    const expectedSlug = slugify(sourceName)

    knownSlugs.add(data.slug)

    if (data.slug !== expectedSlug) {
      errors.push(
        `${file}: slug "${data.slug}" no coincide con slugifyManufacturer("${sourceName}") = "${expectedSlug}"`
      )
    }
    if (filenameSlug !== data.slug) {
      errors.push(`${file}: nombre de archivo ("${filenameSlug}") no coincide con el campo slug ("${data.slug}")`)
    }
  }

  // Cruce: todo `manufacturer` usado en vehículos debe resolver, vía el
  // mismo slug determinístico, a una ficha de fabricante existente.
  const vehicleFiles = fs.readdirSync(VEHICULOS_DIR).filter((f) => f.endsWith('.json'))
  const missingManufacturers = new Map()
  for (const file of vehicleFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(VEHICULOS_DIR, file), 'utf8'))
    if (!data.manufacturer) continue
    const slug = slugify(data.manufacturer)
    if (!knownSlugs.has(slug)) {
      const list = missingManufacturers.get(slug) || []
      list.push(`${file} (manufacturer: "${data.manufacturer}")`)
      missingManufacturers.set(slug, list)
    }
  }
  for (const [slug, vehicles] of missingManufacturers) {
    errors.push(`Ningún fabricante tiene slug "${slug}", pero lo requieren: ${vehicles.join(', ')}`)
  }

  return errors
}

function runAsCheck() {
  const errors = checkManufacturerSlugs()
  if (errors.length > 0) {
    console.error(`FALLÓ verify-manufacturer-slugs: ${errors.length} problema(s):\n`)
    for (const e of errors) console.error(`  - ${e}`)
    process.exitCode = 1
    return
  }
  console.log('OK — todos los slugs de fabricantes coinciden con slugifyManufacturer() y con su nombre de archivo.')
}

function runSelfTest() {
  const fixturePath = path.join(FABRICANTES_DIR, '__verify-manufacturer-slugs-fixture.json')
  if (fs.existsSync(fixturePath)) {
    throw new Error(`Ya existe ${fixturePath} de una corrida anterior sin limpiar — abortando.`)
  }

  // Reproduce el bug real: nombre con diéresis, slug SIN transliterar.
  const brokenFixture = {
    slug: '__verify-manufacturer-slugs-fixture',
    type: 'fabricantes',
    title: 'Citroën Fixture',
    officialName: 'Citroën Fixture',
    description: 'Fixture temporal de scripts/verify-manufacturer-slugs.mjs',
    status: 'nuestro',
    createdAt: '2026-08-30T00:00:00Z',
    updatedAt: '2026-08-30T00:00:00Z',
    relations: [],
  }
  fs.writeFileSync(fixturePath, JSON.stringify(brokenFixture, null, 2))

  try {
    const result = spawnSync('node', [__filename], { encoding: 'utf-8' })
    const output = `${result.stdout || ''}${result.stderr || ''}`
    assert.notEqual(
      result.status,
      0,
      'el script debe fallar cuando el slug del archivo no coincide con slugifyManufacturer()'
    )
    assert.ok(output.includes('__verify-manufacturer-slugs-fixture'), 'el error debe identificar el archivo fixture')
  } finally {
    fs.rmSync(fixturePath, { force: true })
  }

  const result = spawnSync('node', [__filename], { encoding: 'utf-8' })
  assert.equal(result.status, 0, `el contenido real del repo debe pasar sin errores:\n${result.stdout}${result.stderr}`)

  console.log(
    'OK — self-test de verify-manufacturer-slugs pasó (detecta slugs con diacríticos mal generados y no da falsos positivos).'
  )
}

const isSelfTest = process.argv.includes('--self-test')
try {
  if (isSelfTest) {
    runSelfTest()
  } else {
    runAsCheck()
  }
} catch (err) {
  console.error('FALLÓ la verificación de slugs de fabricantes:', err.message)
  process.exitCode = 1
}
