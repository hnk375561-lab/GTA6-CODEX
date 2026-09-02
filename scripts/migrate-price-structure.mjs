#!/usr/bin/env node
/**
 * scripts/migrate-price-structure.mjs
 * ============================================================
 * FASE 1 — price data foundation, Paso 6.
 *
 * Migración reproducible que agrega el campo `priceStructured` a cada
 * vehículo de `src/content/vehiculos/*.json`, derivado únicamente del
 * `price` (texto libre) ya existente — ver `scripts/lib/price-classifier.mjs`
 * para la lógica de clasificación y las reglas de "no inventar".
 *
 * Esta migración es ADITIVA, no destructiva:
 *   - `price` (el string original) NUNCA se modifica ni se borra. Sigue
 *     siendo la fuente de verdad para el display humano (Paso 4 de la
 *     fase) y ningún componente que hoy lo consume se rompe.
 *   - `priceStructured` es un campo nuevo, opcional, que además conserva
 *     el string original en `priceStructured.raw` por trazabilidad.
 *   - No se tocan otros campos, IDs ni slugs.
 *
 * Idempotencia: correr el script dos veces produce el mismo resultado.
 * Si `priceStructured` ya existe y coincide con lo que produciría
 * reclasificar el `price` actual, el archivo se deja intacto (no se
 * reescribe ni se cuenta como cambio). Si no coincide (p. ej. el `price`
 * cambió desde la última corrida), se recalcula.
 *
 * Uso:
 *   node scripts/migrate-price-structure.mjs            # dry-run, solo reporta
 *   node scripts/migrate-price-structure.mjs --apply     # escribe los cambios
 *   node scripts/migrate-price-structure.mjs --apply --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { classifyPrice } from './lib/price-classifier.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content', 'vehiculos')
const APPLY = process.argv.includes('--apply')
const AS_JSON = process.argv.includes('--json')

function structuredEquals(a, b) {
  if (!a || !b) return a === b
  return (
    a.type === b.type &&
    a.currency === b.currency &&
    a.amount === b.amount &&
    a.min === b.min &&
    a.max === b.max &&
    a.raw === b.raw
  )
}

/** Reconstruye el objeto del vehículo insertando `priceStructured`
 *  inmediatamente después de `price`, para que el diff sea legible y no
 *  reordene el resto del archivo. */
function withPriceStructured(json, structured) {
  const out = {}
  let inserted = false
  for (const [key, value] of Object.entries(json)) {
    out[key] = value
    if (key === 'price') {
      out.priceStructured = structured
      inserted = true
    }
  }
  if (!inserted) out.priceStructured = structured // por si algún día `price` faltara
  return out
}

function runMigration() {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json')).sort()

  let unchanged = 0
  let updated = 0
  let created = 0
  const errors = []
  const byType = { single: 0, starting: 0, range: 0, unstructured: 0 }

  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file)
    let json
    try {
      json = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    } catch (err) {
      errors.push({ file, error: `JSON inválido: ${err.message}` })
      continue
    }

    const structured = classifyPrice(json.price)
    byType[structured.type] = (byType[structured.type] ?? 0) + 1

    const existing = json.priceStructured ?? null
    if (structuredEquals(existing, structured)) {
      unchanged++
      continue
    }

    if (existing == null) created++
    else updated++

    if (APPLY) {
      const next = withPriceStructured(json, structured)
      fs.writeFileSync(filePath, JSON.stringify(next, null, 2) + '\n', 'utf-8')
    }
  }

  return {
    totalVehiculos: files.length,
    creados: created,
    actualizados: updated,
    sinCambios: unchanged,
    porTipo: byType,
    errores: errors,
    modo: APPLY ? 'apply' : 'dry-run',
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = runMigration()
  if (AS_JSON) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(`Modo: ${report.modo}`)
    console.log('Vehículos auditados:', report.totalVehiculos)
    console.log('priceStructured creados:', report.creados)
    console.log('priceStructured actualizados:', report.actualizados)
    console.log('Sin cambios (idempotente):', report.sinCambios)
    console.log('Por tipo:', report.porTipo)
    if (report.errores.length > 0) {
      console.log('ERRORES:')
      for (const e of report.errores) console.log(`- ${e.file}: ${e.error}`)
    }
    if (!APPLY) {
      console.log()
      console.log('Dry-run: no se escribió ningún archivo. Correr con --apply para aplicar.')
    }
  }
  if (report.errores.length > 0) process.exitCode = 1
}

export { runMigration }
