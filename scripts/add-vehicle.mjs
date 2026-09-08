#!/usr/bin/env node
/**
 * scripts/add-vehicle.mjs
 * ============================================================
 * Fase 2 de docs/auditoria-automatizacion-sinfrenos.md — comando único
 * para el flujo completo de alta de vehículo.
 *
 * Qué hace, en orden:
 *   1. Delega la creación + validación Zod del JSON a new-vehicle.mjs,
 *      SIN reescribirlo ni tocar su código: lo invoca como subproceso
 *      (única forma de "reutilizarlo como módulo" sin modificarlo, porque
 *      ese script corre su main() apenas se lo importa/ejecuta).
 *   2. Corre verify:content, verify:relations y verify:manufacturer-slugs
 *      para dar feedback antes de abrir el PR.
 *      Nota de alcance (léase antes de asumir que esto filtra por
 *      archivo): estos tres scripts no aceptan un flag de slug/archivo —
 *      siempre validan TODO src/content/ (confirmado leyendo su código).
 *      Acotarlos de verdad implicaría reescribirlos, y el plan de la
 *      Fase 2 solo autoriza crear este archivo y modificar package.json,
 *      no tocar los scripts verify:* existentes. Con 250 fichas corren en
 *      segundos, así que el objetivo real ("feedback rápido antes de subir
 *      un PR, sin esperar el pipeline completo de CI") se cumple igual.
 *   3. Chequea si existe la imagen del vehículo en
 *      public/images/entities/vehiculos/{slug}.webp.
 *
 * Nunca reporta éxito total si falta la imagen o si algún verify falló
 * (ver sección 14 de la auditoría, mitigación del riesgo de "falsa
 * sensación de listo"): el proceso termina con exit code 1 y un aviso
 * explícito de qué falta.
 *
 * USO: acepta exactamente los mismos flags que new-vehicle.mjs (se los
 * reenvía tal cual), por ejemplo:
 *   npm run add-vehicle -- \
 *     --slug toyota-corolla-2024 \
 *     --title "Toyota Corolla 2024" \
 *     --manufacturer Toyota \
 *     --class Sedán \
 *     --description "Sedán compacto de Toyota, generación XII." \
 *     --price "USD 24.000" \
 *     --source "https://www.toyota.com/corolla/"
 * ============================================================
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const IMAGES_DIR = path.join(ROOT, 'public', 'images', 'entities', 'vehiculos')

// Copia deliberada del mismo algoritmo de slugify que usa new-vehicle.mjs
// (mismo patrón que ya usan otros scripts del repo para no importar TS en
// runtime de Node plano — ver comentario en verify-manufacturer-slugs.mjs).
function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

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

function runCheck(label, cmd, cmdArgs) {
  console.log(`\n→ ${label}`)
  const result = spawnSync(cmd, cmdArgs, { stdio: 'inherit', cwd: ROOT })
  return result.status === 0
}

function main() {
  const rawArgs = process.argv.slice(2)
  const args = parseArgs(rawArgs)

  if (!args.json && !args.title) {
    console.error(
      '✗ add-vehicle: --title es obligatorio (o --json con la entidad completa) — ver scripts/new-vehicle.mjs'
    )
    process.exit(1)
  }

  console.log('== Paso 1/3: creación de la ficha (new-vehicle.mjs) ==')
  const created = spawnSync('node', [path.join(__dirname, 'new-vehicle.mjs'), ...rawArgs], {
    stdio: 'inherit',
    cwd: ROOT,
  })
  if (created.status !== 0) {
    console.error('\n✗ add-vehicle: abortado — new-vehicle.mjs falló (ver arriba). No se corrió nada más.')
    process.exit(created.status ?? 1)
  }

  // Recalcular el slug real: si vino --json, el slug está adentro del
  // JSON, no en los flags sueltos.
  let slug = args.slug ? slugify(args.slug) : args.title ? slugify(args.title) : null
  if (args.json) {
    try {
      const parsed = JSON.parse(args.json)
      if (parsed.slug) slug = parsed.slug
    } catch {
      // new-vehicle.mjs ya habría fallado antes con el mismo error de parseo.
    }
  }
  if (!slug) {
    console.error('✗ add-vehicle: no se pudo determinar el slug creado. Revisá el JSON manualmente.')
    process.exit(1)
  }

  console.log('\n== Paso 2/3: verificaciones (contenido, relaciones, fabricantes) ==')
  const checks = [
    ['verify:content', 'npm', ['run', 'verify:content']],
    ['verify:relations', 'npm', ['run', 'verify:relations']],
    ['verify:manufacturer-slugs', 'npm', ['run', 'verify:manufacturer-slugs']],
  ]
  let allChecksOk = true
  for (const [label, cmd, cmdArgs] of checks) {
    if (!runCheck(label, cmd, cmdArgs)) allChecksOk = false
  }

  console.log('\n== Paso 3/3: cobertura de imagen ==')
  const imagePath = path.join(IMAGES_DIR, `${slug}.webp`)
  const hasImage = fs.existsSync(imagePath)

  console.log('\n== Resumen ==')
  console.log(`Slug: ${slug}`)
  console.log(`JSON: src/content/vehiculos/${slug}.json`)
  console.log(`Verificaciones: ${allChecksOk ? 'OK' : 'CON ERRORES (ver arriba)'}`)
  console.log(`Imagen: ${hasImage ? `OK (public/images/entities/vehiculos/${slug}.webp)` : 'FALTA'}`)

  if (!hasImage) {
    console.log(
      `\n⚠ INCOMPLETO: falta la imagen. Corré:\n` +
        `  npm run generate:manifest-commons:write -- --retry-notfound\n` +
        `para que el manifest incluya el slug "${slug}", revisá el PR que abre y mergealo ` +
        `antes de dar este vehículo por terminado.`
    )
  }

  if (!allChecksOk || !hasImage) {
    console.log('\n✗ add-vehicle: INCOMPLETO — no está listo para PR todavía (ver detalle arriba).')
    process.exit(1)
  }

  console.log('\n✓ add-vehicle: listo para PR.')
}

main()
