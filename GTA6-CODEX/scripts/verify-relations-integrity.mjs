#!/usr/bin/env node
/**
 * scripts/verify-relations-integrity.mjs
 * ============================================================
 * Cierra un gap real encontrado durante la auditoría técnica:
 *
 *   - src/lib/relations.ts exporta validateRelation(), pero no se llama
 *     desde ningún lugar del código (grep confirmado: 0 usos fuera de su
 *     propia definición). Es código muerto.
 *   - Ningún script ni build-time check verifica que las relaciones de
 *     una entidad (relations[].targetType / targetSlug) apunten a una
 *     entidad que realmente existe en src/content/. Una relación rota
 *     (slug con typo, entidad renombrada/eliminada sin actualizar
 *     referencias) pasa el build sin ningún aviso — se manifiesta recién
 *     en runtime como un módulo "también relacionado" vacío o incompleto,
 *     silenciosamente.
 *
 * Este script:
 *   1. Indexa todas las entidades (`type/slug`) leyendo src/content/.
 *   2. Para cada relación de cada entidad, valida forma (mismo criterio
 *      que validateRelation: targetType/targetSlug/relation presentes,
 *      targetType es un tipo de contenido real, targetSlug no vacío)
 *      y que el destino exista en el índice.
 *   3. Reporta cada relación rota con su origen exacto (archivo + índice)
 *      y termina con exit code 1 si encuentra al menos una.
 *
 * USO:
 *   node scripts/verify-relations-integrity.mjs
 *
 * Se auto-testea: agrega un fixture temporal con una relación rota,
 * confirma (en un subproceso) que el script la detecta y falla, limpia
 * el fixture, y confirma que el contenido real del repo pasa sin errores.
 * Nunca deja el fixture en el repo, incluso si algo falla a mitad de
 * camino (try/finally).
 * ============================================================
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const CONTENT_DIR = path.join(process.cwd(), 'src', 'content')

/** Lee todo el contenido y devuelve { entities, contentTypes, index }. */
function loadAllEntities() {
  const contentTypes = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => fs.statSync(path.join(CONTENT_DIR, f)).isDirectory())

  const entities = []
  const index = new Set()

  for (const type of contentTypes) {
    const dir = path.join(CONTENT_DIR, type)
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      let parsed
      try {
        parsed = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'))
      } catch {
        continue // JSON inválido ya lo cubre otro validador; no es responsabilidad de este script
      }
      if (parsed && typeof parsed.slug === 'string') {
        index.add(`${type}/${parsed.slug}`)
      }
      entities.push({ type, file, parsed })
    }
  }

  return { entities, contentTypes, index }
}

/** Misma validación de forma que src/lib/relations.ts:validateRelation(), sin depender de TS. */
function isShapeValid(rel, validTypes) {
  if (!rel || typeof rel !== 'object') return false
  if (!rel.targetType || !rel.targetSlug || !rel.relation) return false
  if (!validTypes.includes(rel.targetType)) return false
  if (typeof rel.targetSlug !== 'string' || rel.targetSlug.trim().length === 0) return false
  return true
}

/** Corre la verificación contra el contenido real. Devuelve la lista de errores encontrados. */
function checkRelations() {
  const { entities, contentTypes, index } = loadAllEntities()
  const errors = []

  for (const { type, file, parsed } of entities) {
    const relations = Array.isArray(parsed?.relations) ? parsed.relations : []
    for (const rel of relations) {
      if (!isShapeValid(rel, contentTypes)) {
        errors.push(
          `${type}/${file}: relación con forma inválida — ${JSON.stringify(rel)}`
        )
        continue
      }
      const key = `${rel.targetType}/${rel.targetSlug}`
      if (!index.has(key)) {
        errors.push(
          `${type}/${file}: relación "${rel.relation}" apunta a "${key}", que no existe`
        )
      }
    }
  }

  return errors
}

function runAsCheck() {
  const errors = checkRelations()
  if (errors.length > 0) {
    console.error(`FALLÓ verify-relations-integrity: ${errors.length} relación(es) rota(s):\n`)
    for (const e of errors) console.error(`  - ${e}`)
    process.exitCode = 1
    return
  }
  console.log('OK — todas las relaciones de todas las entidades apuntan a entidades existentes.')
}

function runSelfTest() {
  const fixtureType = 'personajes'
  const fixtureDir = path.join(CONTENT_DIR, fixtureType)
  const fixturePath = path.join(fixtureDir, '__verify-relations-integrity-fixture.json')

  if (fs.existsSync(fixturePath)) {
    throw new Error(`Ya existe ${fixturePath} de una corrida anterior sin limpiar — abortando.`)
  }

  const brokenFixture = {
    slug: '__verify-relations-integrity-fixture',
    type: fixtureType,
    title: 'Fixture temporal — no debería quedar en el repo',
    description: 'Fixture temporal de scripts/verify-relations-integrity.mjs',
    status: 'nuestro',
    createdAt: '2026-08-14T00:00:00Z',
    updatedAt: '2026-08-14T00:00:00Z',
    relations: [
      { targetType: fixtureType, targetSlug: '__esta-entidad-no-existe__', relation: 'relacionado_con' },
    ],
  }

  fs.writeFileSync(fixturePath, JSON.stringify(brokenFixture, null, 2))

  try {
    const result = spawnSync('node', [__filename], { encoding: 'utf-8' })
    const output = `${result.stdout || ''}${result.stderr || ''}`

    assert.notEqual(result.status, 0, 'el script debe fallar (exit code != 0) cuando hay una relación rota')
    assert.ok(
      output.includes('__esta-entidad-no-existe__'),
      'el error reportado debe identificar el slug destino inexistente'
    )
  } finally {
    fs.rmSync(fixturePath, { force: true })
  }

  // Con el fixture ya limpio, el contenido real del repo debe pasar sin errores.
  const result = spawnSync('node', [__filename], { encoding: 'utf-8' })
  assert.equal(result.status, 0, `el contenido real del repo debe pasar sin relaciones rotas:\n${result.stdout}${result.stderr}`)

  console.log('OK — self-test de verify-relations-integrity pasó (detecta relaciones rotas y no da falsos positivos).')
}

const isSelfTest = process.argv.includes('--self-test')

try {
  if (isSelfTest) {
    runSelfTest()
  } else {
    runAsCheck()
  }
} catch (err) {
  console.error('FALLÓ la verificación de relaciones:', err.message)
  process.exitCode = 1
}
