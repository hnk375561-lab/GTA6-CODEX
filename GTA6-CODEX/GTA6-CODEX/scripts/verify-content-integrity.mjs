#!/usr/bin/env node
/**
 * scripts/verify-content-integrity.mjs
 * ============================================================
 * Test de regresión para un bug real encontrado en la auditoría final de
 * cierre de la Parte A:
 *
 *   validateEntity() (src/lib/entities.ts) solo chequeaba que updatedAt/
 *   createdAt fueran `typeof === 'string'`, sin validar que fueran fechas
 *   parseables. sitemap.ts construye `new Date(entity.updatedAt)` para el
 *   lastModified de cada URL, y como sitemap.xml se prerenderiza en BUILD
 *   TIME, un Invalid Date ahí (`.toISOString()` interno del route handler
 *   de Next) hacía TIRAR ABAJO `next build` COMPLETO — no solo esa
 *   entidad, todo el sitio, ninguna página se generaba. Reproducido y
 *   confirmado antes de la corrección.
 *
 * Corregido en dos capas:
 *   1. validateEntity() ahora rechaza (con warning, mismo patrón que ya
 *      usa para otras entidades con forma inválida) cualquier entidad
 *      cuyo createdAt/updatedAt no parsee a una fecha válida.
 *   2. sitemap.ts usa safeDate() como defensa adicional: si de todos
 *      modos llegara un valor no parseable, cae a la fecha actual en vez
 *      de tirar.
 *
 * Esta verificación prueba la propiedad observable real (el build no se
 * cae) en vez de solo testear validateEntity() de forma aislada, porque
 * así es exactamente como se manifestó el bug originalmente y es la única
 * forma de detectar un error de wireado futuro entre ambas capas.
 *
 * USO:
 *   node scripts/verify-content-integrity.mjs
 *
 * Agrega y remueve un archivo de fixture temporal en
 * src/content/personajes/ — nunca lo deja en el repo, incluso si el
 * script falla a mitad de camino (try/finally).
 * ============================================================
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content', 'personajes')
const FIXTURE_PATH = path.join(CONTENT_DIR, '__verify-content-integrity-fixture.json')

const BAD_ENTITY = {
  slug: '__verify-content-integrity-fixture',
  type: 'personajes',
  title: 'Fixture temporal de verificación — no debería quedar en el repo',
  description: 'Fixture temporal de scripts/verify-content-integrity.mjs',
  status: 'nuestro',
  createdAt: '2026-08-14T00:00:00Z',
  updatedAt: 'esto-no-es-una-fecha-valida',
}

function main() {
  if (fs.existsSync(FIXTURE_PATH)) {
    throw new Error(`Ya existe ${FIXTURE_PATH} de una corrida anterior sin limpiar — abortando.`)
  }

  fs.writeFileSync(FIXTURE_PATH, JSON.stringify(BAD_ENTITY, null, 2))

  try {
    const result = spawnSync('npx', ['next', 'build'], {
      encoding: 'utf-8',
      env: { ...process.env },
    })
    const output = `${result.stdout || ''}${result.stderr || ''}`

    assert.equal(
      result.status,
      0,
      `next build debe completar con éxito pese a la entidad con fecha inválida. Salida:\n${output.slice(-3000)}`
    )
    assert.ok(
      !/RangeError: Invalid time value/.test(output),
      'no debe reaparecer el RangeError que tiraba abajo el build (regresión del bug original)'
    )
    assert.ok(
      /Entidad inválida ignorada.*__verify-content-integrity-fixture/.test(output),
      'la entidad con fecha inválida debe excluirse explícitamente (con warning), no aceptarse silenciosamente'
    )

    console.log('OK — una entidad con updatedAt inválido ya NO tira abajo next build (se excluye con warning).')
  } finally {
    fs.rmSync(FIXTURE_PATH, { force: true })
  }
}

try {
  main()
} catch (err) {
  console.error('FALLÓ la verificación de integridad de contenido:', err.message)
  process.exitCode = 1
}
