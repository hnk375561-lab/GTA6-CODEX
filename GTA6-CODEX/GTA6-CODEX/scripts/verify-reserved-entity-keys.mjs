#!/usr/bin/env node
/**
 * scripts/verify-reserved-entity-keys.mjs
 * ============================================================
 * `lib/entity-fields.ts` define `RESERVED_ENTITY_KEYS` como una constante
 * plana (array de strings) en vez de derivarla de `BaseEntitySchema` en
 * runtime vía Zod (`BaseEntitySchema.keyof().options`) — ver el comentario
 * largo en ese archivo: la versión con Zod arrastraba la librería entera
 * (~64 KB minificados) al bundle de cliente, porque `entity-fields.ts` lo
 * importa `EntityCard.tsx` (`'use client'`), presente en la home, en las
 * 12 páginas `/[entityType]` y en `/vehiculos/fabricante/[manufacturer]`.
 *
 * El costo de esa ganancia: la constante ahora puede desincronizarse en
 * silencio si alguien agrega/renombra/borra un campo en `BaseEntitySchema`
 * (src/types/schemas.ts) sin actualizar la lista a mano. Ni `tsc` ni
 * `eslint` lo detectan (ambas son `Set<string>`, tipos compatibles). Este
 * script sí: parsea los nombres de campo de `BaseEntitySchema` directo del
 * source (mismo patrón de parseo estático que ya usa
 * verify-tailwind-config.mjs, sin agregar un runner de TypeScript como
 * dependencia nueva solo para este chequeo) y los compara 1:1 contra
 * `RESERVED_ENTITY_KEYS`.
 *
 * USO:
 *   node scripts/verify-reserved-entity-keys.mjs
 * ============================================================
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

let failed = false
const fail = (msg) => {
  console.error(`✗ ${msg}`)
  failed = true
}
const ok = (msg) => console.log(`✓ ${msg}`)

// --- 1. Extraer los nombres de campo de BaseEntitySchema (fuente real) ---
const schemasPath = path.join(root, 'src', 'types', 'schemas.ts')
const schemasSrc = fs.readFileSync(schemasPath, 'utf8')

const schemaBlockMatch = schemasSrc.match(
  /export const BaseEntitySchema = z\.object\(\{([\s\S]*?)\n\}\)/
)
if (!schemaBlockMatch) {
  fail('No se encontró el bloque "export const BaseEntitySchema = z.object({ ... })" en schemas.ts — ¿cambió la forma de declararlo?')
  process.exit(1)
}

// Cada campo es una línea top-level "nombre: ...," dentro del bloque —
// alcanza con la primera palabra de cada línea no vacía.
const schemaFields = schemaBlockMatch[1]
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => line.match(/^(\w+):/))
  .filter(Boolean)
  .map((m) => m[1])
  .sort()

// --- 2. Extraer los strings de RESERVED_ENTITY_KEYS (la constante plana) ---
const fieldsPath = path.join(root, 'src', 'lib', 'entity-fields.ts')
const fieldsSrc = fs.readFileSync(fieldsPath, 'utf8')

const constBlockMatch = fieldsSrc.match(
  /export const RESERVED_ENTITY_KEYS = new Set<string>\(\[([\s\S]*?)\]\)/
)
if (!constBlockMatch) {
  fail('No se encontró "export const RESERVED_ENTITY_KEYS = new Set<string>([ ... ])" en entity-fields.ts — ¿volvió a derivarse de Zod?')
  process.exit(1)
}

const constKeys = [...constBlockMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort()

// --- 3. Comparar ---
const missing = schemaFields.filter((f) => !constKeys.includes(f))
const extra = constKeys.filter((f) => !schemaFields.includes(f))

if (missing.length > 0) {
  fail(`RESERVED_ENTITY_KEYS le falta(n): ${missing.join(', ')} (existen en BaseEntitySchema, no en la constante)`)
}
if (extra.length > 0) {
  fail(`RESERVED_ENTITY_KEYS tiene de más: ${extra.join(', ')} (no existen en BaseEntitySchema)`)
}
if (missing.length === 0 && extra.length === 0) {
  ok(`RESERVED_ENTITY_KEYS coincide 1:1 con BaseEntitySchema (${schemaFields.length} campos)`)
}

if (failed) {
  console.error('\nActualizá el array de RESERVED_ENTITY_KEYS en src/lib/entity-fields.ts a mano.')
  process.exit(1)
}
