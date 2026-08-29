#!/usr/bin/env node
/**
 * scripts/verify-min-entity-count.mjs
 * ============================================================
 * Test de regresión para el bug del BOM UTF-8 (ver commit que elimina
 * el BOM de src/content/vehiculos/*.json): las 250 fichas de vehículos
 * dejaban de parsearse, el loader (`src/lib/entities.ts`) atrapaba el
 * `SyntaxError` en un try/catch y solo hacía `console.warn` sin abortar
 * el build. Resultado: 0 páginas de ficha generadas, sitemap con 3 URLs
 * en vez de 250+, listado/comparador/buscador/galería vacíos — y el
 * build terminaba con exit code 0, o sea que un deploy publicaba un
 * catálogo fantasma sin que ningún check existente lo detectara
 * (`type-check`, `lint`, `test`, `verify:content` pasaban los tres en
 * verde).
 *
 * Este script cierra ese hueco: cuenta cuántos archivos .json hay en
 * disco para cada tipo de entidad y cuántos de esos realmente
 * PARSEAN como JSON válido, y falla si el conteo cae por debajo de un
 * mínimo esperado. Chequea el disco directamente (no pasa por
 * getEntitiesByTypeSync/loadEntitiesByTypeSync) para que el check sea
 * independiente de dónde esté el bug: un problema en el loader, en el
 * validador Zod, o en los archivos mismos, todos deberían bajar el
 * conteo de "parsean OK" y disparar esta alarma igual.
 *
 * Los mínimos son intencionalmente conservadores (no el conteo exacto
 * actual) para no romper CI cada vez que se agrega o saca una ficha a
 * mano; el objetivo es detectar un colapso del catálogo (0, o casi 0),
 * no cambios normales de contenido.
 *
 * USO:
 *   node scripts/verify-min-entity-count.mjs
 * ============================================================
 */
import fs from 'node:fs'
import path from 'node:path'

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content')

// type -> { min: mínimo de archivos que deben parsear OK, requerido: si
// false, un conteo de 0 solo genera warning (contenido que el propio
// README documenta como "tipos habilitados en código, cero contenido
// publicado" — noticias y guías a la fecha de este script).
const EXPECTATIONS = {
  vehiculos: { min: 200, requerido: true },
  noticias: { min: 0, requerido: false },
  guias: { min: 0, requerido: false },
}

let failed = false
const fail = (msg) => {
  console.error(`✗ ${msg}`)
  failed = true
}
const warn = (msg) => console.warn(`⚠ ${msg}`)
const ok = (msg) => console.log(`✓ ${msg}`)

for (const [type, { min, requerido }] of Object.entries(EXPECTATIONS)) {
  const dir = path.join(CONTENT_DIR, type)

  if (!fs.existsSync(dir)) {
    if (requerido) {
      fail(`${type}: el directorio ${dir} no existe (se esperaban al menos ${min} entidades)`)
    } else {
      warn(`${type}: el directorio ${dir} no existe`)
    }
    continue
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'template.json')

  let parsedOk = 0
  const parseErrors = []
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8')
      // Mismo saneo defensivo que entities.ts: un BOM no debería contar
      // como fallo de parseo si el loader ya lo tolera.
      JSON.parse(raw.replace(/^\uFEFF/, ''))
      parsedOk++
    } catch (err) {
      parseErrors.push(`${file}: ${err.message}`)
    }
  }

  if (parseErrors.length > 0) {
    fail(`${type}: ${parseErrors.length} archivo(s) no parsean como JSON válido:`)
    for (const line of parseErrors.slice(0, 10)) {
      console.error(`    - ${line}`)
    }
    if (parseErrors.length > 10) {
      console.error(`    ... y ${parseErrors.length - 10} más`)
    }
  }

  if (parsedOk < min) {
    const msg = `${type}: solo ${parsedOk} entidad(es) parsean OK de ${files.length} archivo(s) en disco (mínimo esperado: ${min})`
    if (requerido) {
      fail(msg)
    } else {
      warn(msg)
    }
  } else {
    ok(`${type}: ${parsedOk} entidad(es) parsean OK (mínimo esperado: ${min})`)
  }
}

if (failed) {
  console.error('\nverify-min-entity-count: FALLÓ — el catálogo tiene menos contenido cargable del esperado.')
  process.exit(1)
} else {
  console.log('\nverify-min-entity-count: OK')
}
