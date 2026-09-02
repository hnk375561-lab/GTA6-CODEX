#!/usr/bin/env node
/**
 * scripts/cleanup-category-tipo.mjs
 * ============================================================
 * P3 de la lista de oportunidades: "Limpiar/normalizar category/tipo o
 * eliminarlos en favor de class" — sección 9 del informe documenta la
 * calidad dispar de los tres campos de clasificación superpuestos:
 *
 *   - `class`: bien poblado y consistente ("SUV compacto", "Sedán
 *     eléctrico") — es el que usa hoy el filtro de /vehiculos.
 *   - `category`: 152/250 = valor genérico "otros", sin señal real.
 *   - `tipo`: null en 216/250 (86%), casi sin poblar.
 *
 * Confirmado además (más allá de lo que decía el informe original):
 * ninguno de los dos campos (`category`, `tipo`) está declarado en el
 * schema Zod (`src/types/schemas.ts`). Como ese schema no usa
 * `.passthrough()`, Zod descarta toda clave no declarada al parsear — es
 * decir, `category`/`tipo` YA son datos muertos hoy: ni siquiera
 * sobreviven a la validación para llegar al objeto en runtime. Este
 * script no cambia ningún comportamiento del sitio; solo saca del
 * contenido en disco dos campos que nunca lo alcanzan, para que el
 * dataset no cargue con clasificación redundante y de baja calidad.
 *
 * `class` no se toca — sigue siendo la única fuente de clasificación.
 *
 * USO:
 *   node scripts/cleanup-category-tipo.mjs             # solo reporta
 *   node scripts/cleanup-category-tipo.mjs --apply       # elimina y sobreescribe
 *   node scripts/cleanup-category-tipo.mjs --self-test   # regresión embebida
 * ============================================================
 */

import fs from 'node:fs'
import path from 'node:path'

const CONTENT_DIR = path.join(process.cwd(), 'src/content/vehiculos')
const APPLY = process.argv.includes('--apply')

/** Elimina `category`/`tipo` de un objeto ya parseado (mutación in-place).
 *  Función pura extraída para el self-test, sin tocar el filesystem. */
function stripFields(json) {
  let removed = 0
  if ('category' in json) {
    delete json.category
    removed++
  }
  if ('tipo' in json) {
    delete json.tipo
    removed++
  }
  return removed
}

function runSelfTest() {
  const withBoth = { class: 'SUV compacto', category: 'otros', tipo: null, manufacturer: 'Toyota' }
  const removed = stripFields(withBoth)
  if (removed !== 2) throw new Error(`Self-test falló: esperaba eliminar 2 claves, eliminó ${removed}`)
  if ('category' in withBoth || 'tipo' in withBoth) {
    throw new Error('Self-test falló: category/tipo deberían haberse eliminado')
  }
  if (withBoth.class !== 'SUV compacto' || withBoth.manufacturer !== 'Toyota') {
    throw new Error('Self-test falló: no debería tocar otros campos (class, manufacturer)')
  }

  const withNeither = { class: 'Sedán', manufacturer: 'Honda' }
  const removed2 = stripFields(withNeither)
  if (removed2 !== 0) throw new Error('Self-test falló: no debería reportar remociones si no hay nada que sacar')

  console.log('OK — self-test de cleanup-category-tipo pasó (2 casos).')
}

function main() {
  if (process.argv.includes('--self-test')) {
    runSelfTest()
    return
  }

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'))
  let filesWithCategory = 0
  let filesWithTipo = 0

  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file)
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

    if ('category' in json) filesWithCategory++
    if ('tipo' in json) filesWithTipo++

    if (APPLY) {
      const removed = stripFields(json)
      if (removed > 0) {
        fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf-8')
      }
    }
  }

  console.log(`Archivos analizados: ${files.length}`)
  console.log(`Con \`category\`: ${filesWithCategory}${APPLY ? ' (eliminado)' : ''}`)
  console.log(`Con \`tipo\`: ${filesWithTipo}${APPLY ? ' (eliminado)' : ''}`)
  if (!APPLY && (filesWithCategory > 0 || filesWithTipo > 0)) {
    console.log('\nCorré con --apply para eliminar estos campos (ninguno llega hoy al schema Zod).')
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { stripFields }
