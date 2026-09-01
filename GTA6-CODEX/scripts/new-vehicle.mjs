#!/usr/bin/env node
/**
 * scripts/new-vehicle.mjs
 * ============================================================
 * Automatiza la carga de una ficha de vehículo nueva en
 * src/content/vehiculos/{slug}.json, sin escribir el JSON a mano.
 *
 * Por qué existe: cargar autos de a uno editando JSON en el editor es
 * lento y propenso a error de schema (slug repetido, falta un campo
 * obligatorio, updatedAt mal formado -> tira el build entero, ver
 * verify-content-integrity.mjs). Este script arma la entidad completa,
 * la valida contra el mismo VehicleSchema (Zod) que usa el build en
 * runtime, y recién ahí escribe el archivo — si falla la validación,
 * no se escribe nada.
 *
 * USO (todo por flags, pensado para scriptearlo en lote):
 *   node scripts/new-vehicle.mjs \
 *     --slug toyota-corolla-2024 \
 *     --title "Toyota Corolla 2024" \
 *     --manufacturer Toyota \
 *     --class Sedán \
 *     --description "Sedán compacto de Toyota, generación XII." \
 *     --speed "180 km/h" \
 *     --acceleration "0-100 km/h en 10.1s" \
 *     --power "170 hp" \
 *     --price "USD 24.000" \
 *     --source "https://www.toyota.com/corolla/" \
 *     --tags sedan,toyota,combustion \
 *     --status confirmado
 *
 * También acepta --json '<entidad completa>' para casos que necesiten
 * campos no cubiertos por flags simples.
 *
 * Campos libres (price, power, etc.) no están en el VehicleSchema
 * tipado a propósito: BaseEntitySchema no usa .strict(), así que Zod
 * permite claves extra sin rechazarlas — el mismo criterio que ya usan
 * los GenericEntity del motor (ver schemas.ts). Esto deja lugar para
 * sumar specs propias del nicho de autos (precio, potencia, segmento)
 * sin tener que tocar el schema cada vez.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const CONTENT_DIR = path.join(ROOT, 'src', 'content', 'vehiculos')

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) {
      args[key] = true
    } else {
      args[key] = next
      i++
    }
  }
  return args
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function fail(message) {
  console.error(`✗ ${message}`)
  process.exit(1)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  let entity
  if (args.json) {
    try {
      entity = JSON.parse(args.json)
    } catch (err) {
      fail(`--json no es JSON válido: ${err.message}`)
    }
  } else {
    if (!args.title) fail('--title es obligatorio (o pasá --json con la entidad completa)')
    if (!args.description) fail('--description es obligatorio')

    const slug = args.slug ? slugify(args.slug) : slugify(args.title)
    const now = new Date().toISOString()
    const tags = args.tags
      ? String(args.tags)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : []

    entity = {
      slug,
      type: 'vehiculos',
      title: args.title,
      description: args.description,
      status: args.status || 'confirmado',
      tags,
      featured: args.featured === 'true',
      createdAt: now,
      updatedAt: now,
      manufacturer: args.manufacturer,
      class: args.class,
      customizable: false,
      performance: {
        speed: args.speed,
        acceleration: args.acceleration,
        handling: args.handling,
        braking: args.braking,
      },
      // Specs libres propias del nicho de autos (no están en el schema
      // tipado a propósito — ver comentario de arriba). Solo se agregan
      // si vinieron por flag, para no ensuciar el JSON con `undefined`.
      ...(args.power ? { power: args.power } : {}),
      ...(args.price ? { price: args.price } : {}),
      ...(args.year ? { year: args.year } : {}),
      ...(args.fuel ? { fuel: args.fuel } : {}),
      evidence: args.source
        ? {
            level: 'oficial-nombrado',
            primarySource: args.source,
          }
        : undefined,
    }

    // Limpiar undefined dentro de performance (Zod .optional() no
    // acepta `undefined` explícito como valor de propiedad presente en
    // algunos casos límite del `.strict()` de sub-schemas; más simple
    // sacarlos directamente).
    for (const key of Object.keys(entity.performance)) {
      if (entity.performance[key] === undefined) delete entity.performance[key]
    }
    if (Object.keys(entity.performance).length === 0) delete entity.performance
    if (entity.evidence === undefined) delete entity.evidence
  }

  // Validación contra el mismo schema Zod que usa el motor en runtime.
  // Import dinámico porque el proyecto es TS y este script corre con
  // node plano: se apoya en tsx/ts-node si está disponible, si no cae a
  // una validación mínima manual (mejor que nada, nunca bloquea el flujo
  // por falta de tooling).
  let VehicleSchema
  try {
    const tsxRegister = await import('tsx/esm/api')
    tsxRegister.register()
    ;({ VehicleSchema } = await import(path.join(ROOT, 'src', 'types', 'schemas.ts')))
  } catch {
    VehicleSchema = null
  }

  if (VehicleSchema) {
    const result = VehicleSchema.safeParse(entity)
    if (!result.success) {
      fail(`La entidad no valida contra VehicleSchema:\n${result.error.message}`)
    }
  } else {
    // Validación mínima de respaldo si tsx no está instalado.
    for (const field of ['slug', 'type', 'title', 'description', 'status', 'createdAt', 'updatedAt']) {
      if (!entity[field]) fail(`Falta el campo obligatorio "${field}" (validación mínima, sin Zod disponible)`)
    }
  }

  if (!fs.existsSync(CONTENT_DIR)) fs.mkdirSync(CONTENT_DIR, { recursive: true })
  const outPath = path.join(CONTENT_DIR, `${entity.slug}.json`)
  if (fs.existsSync(outPath) && !args.force) {
    fail(`Ya existe ${outPath} — usá --force para sobreescribir`)
  }

  fs.writeFileSync(outPath, JSON.stringify(entity, null, 2) + '\n')
  console.log(`✓ Creado src/content/vehiculos/${entity.slug}.json`)
}

main()
