#!/usr/bin/env node
/**
 * Normaliza el campo `dimensiones` de las fichas de vehículos.
 *
 * Problema (auditoría P0-04, septiembre 2026):
 * los vehículos eléctricos (Tesla, BYD, Hyundai, Kia, NIO, Nissan, Porsche
 * Taycan, Renault, Smart, MG4, Chevrolet Bolt, VW ID.4, Wuling Mini EV,
 * Xiaomi SU7 — 25 fichas en total) guardan `dimensiones` como un objeto
 * estructurado `{ largo, ancho, alto, distancia_ejes }` en vez de como
 * string. El `VehicleSchema` (`src/types/schemas.ts`) exige `string`, por lo
 * que `safeParseVehicle` rechaza esas fichas y `entities.ts` las descarta
 * silenciosamente en build time: su página de detalle ni siquiera se
 * genera (no aparecen en `generateStaticParams`), y al visitarla el sitio
 * cae al 404 real (no a un "blank page" como antes).
 *
 * Diagnóstico: fue validado con `scripts/verify-content-integrity.mjs`, que
 * valida cada JSON contra `VehicleSchema` y lista las entradas descartadas.
 *
 * Solución (recomendada por la auditoría: "corregir el schema de esas
 * fichas, dimensiones a string"): normalizar el objeto a un string
 * legible que preserve cada subt campo, manteniendo el mismo formato
 * etiquetado que ya usan las fichas con combustión (ej.
 * "4.687 mm largo x 1.903 mm ancho x 1.648 mm alto"). Se deja el schema
 * estricto (string) porque esa es la fuente de verdad declarada por el
 * contrato de datos, y aflojarlo solo para un par de campos no es el
 * remedio correcto cuando los datos pueden normalizarse de una vez.
 *
 * El formato elegido preserva 100% de la información original:
 *   "4719 mm largo x 1849 mm ancho x 1440 mm alto (2875 mm entre ejes)"
 * (el `distancia_ejes` se incluye entre paréntesis cuando existe).
 *
 * Uso:
 *   node scripts/normalize-dimensiones.mjs           # aplica y sobreescribe los JSON
 *   node scripts/normalize-dimensiones.mjs --dry-run  # solo imprime el reporte
 *   node scripts/normalize-dimensiones.mjs --self-test  # casos de regresión
 */

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const CONTENT_DIR = path.join(process.cwd(), 'src/content/vehiculos')
const DRY_RUN = process.argv.includes('--dry-run')

function dimensionesToString(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value
  }
  const ordered = [
    { key: 'largo', label: 'largo' },
    { key: 'ancho', label: 'ancho' },
    { key: 'alto', label: 'alto' },
  ]
  const parts = ordered
    .map((o) => ({ raw: value[o.key], label: o.label }))
    .filter((p) => typeof p.raw === 'string' && p.raw.trim().length > 0)
    .map((p) => `${p.raw.trim()} ${p.label}`)

  if (parts.length === 0) {
    return value
  }

  let result = parts.join(' x ')
  const ejes = value.distancia_ejes
  if (typeof ejes === 'string' && ejes.trim().length > 0) {
    result += ` (${ejes.trim()} entre ejes)`
  }
  return result
}

function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) {
    throw new Error(`Self-test falló [${label}]: esperado ${e}, obtuvo ${a}`)
  }
}

function runSelfTest() {
  assertEqual(
    dimensionesToString('4643 x 1860 x 1440 mm'),
    '4643 x 1860 x 1440 mm',
    'string existing passes through untouched'
  )
  assertEqual(
    dimensionesToString(null),
    null,
    'null stays null'
  )
  assertEqual(
    dimensionesToString({
      largo: '4719 mm',
      ancho: '1849 mm',
      alto: '1440 mm',
      distancia_ejes: '2875 mm',
    }),
    '4719 mm largo x 1849 mm ancho x 1440 mm alto (2875 mm entre ejes)',
    'tesla-model-3 object with wheelbase'
  )
  assertEqual(
    dimensionesToString({
      largo: '4163 mm',
      ancho: '1769 mm',
      alto: '1533 mm',
    }),
    '4163 mm largo x 1769 mm ancho x 1533 mm alto',
    'chevrolet-bolt-ev object without wheelbase'
  )
  assertEqual(
    dimensionesToString({}),
    {},
    'empty dimensions object left untouched (will be dropped by schema null check upstream)'
  )
  console.log('OK — self-test de normalize-dimensiones pasó (5 casos, incluyendo los 2 formatos reales del dataset EV).')
}

function main() {
  if (process.argv.includes('--self-test')) {
    runSelfTest()
    return
  }

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'))
  let converted = 0
  let alreadyString = 0
  let untouched = 0
  const convertedFiles = []

  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file)
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

    if (Object.prototype.hasOwnProperty.call(json, 'dimensiones')) {
      const before = json.dimensiones
      if (typeof before === 'object' && before !== null && !Array.isArray(before)) {
        const after = dimensionesToString(before)
        if (typeof after === 'string') {
          json.dimensiones = after
          convertedFiles.push(file)
          converted++
          if (!DRY_RUN) {
            fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf-8')
          }
        } else {
          untouched++
        }
      } else {
        alreadyString++
      }
    } else {
      untouched++
    }
  }

  console.log(`Archivos procesados: ${files.length}`)
  console.log(`Convertidos (objeto → string): ${converted}`)
  console.log(`Ya string (sin cambio): ${alreadyString}`)
  console.log(`Sin campo dimensiones / inmutables: ${untouched}`)
  if (convertedFiles.length > 0) {
    console.log('\nArchivos convertidos:')
    for (const f of convertedFiles) console.log(`  - ${f}`)
  }
  if (DRY_RUN) {
    console.log('\n(--dry-run: no se escribió ningún archivo)')
  }
}

// `import.meta.url === 'file://' + process.argv[1]' no es confiable: en
// Windows el prefijo de disco difiere (`file:///C:/...` vs `'file://C:\...'`)
// y ni siquiera con rutas absolutas en POSIX siempre coincide. La comparación
// canónica y cross-platform pasa process.argv[1] por pathToFileURL(resolved),
// que produce el mismo `file:///...` que import.meta.url.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isMain) {
  main()
}
