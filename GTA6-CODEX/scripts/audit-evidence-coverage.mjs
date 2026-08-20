#!/usr/bin/env node
/**
 * scripts/audit-evidence-coverage.mjs
 * ============================================================
 * Auditoría de cobertura real del campo `evidence` en el contenido.
 *
 * IMPORTANTE: esto es distinto de `npm run verify:content`. Ese script
 * es un test de regresión para un bug de fechas inválidas rompiendo
 * `next build` — no audita `evidence` en absoluto (confirmado: cero
 * scripts existentes en scripts/ mencionan "evidence"). Este es nuevo.
 *
 * Qué hace:
 *   - Recorre todo src/content/<categoria>/*.json (excluye media/).
 *   - Por cada entidad, determina si `evidence` está ausente, presente
 *     pero con `level` inválido/faltante, o presente y válido.
 *   - Agrupa el resultado por categoría de contenido para ver dónde
 *     está la brecha real (el pedido original: "8 noticias, 2 trailers,
 *     13 misiones — categorías chicas, ¿cuánto de eso tiene evidence?").
 *   - Sale con exit code 1 si hay al menos una entidad sin evidencia
 *     válida, para que se pueda enganchar a CI si se quiere.
 *
 * USO:
 *   node scripts/audit-evidence-coverage.mjs
 *   node scripts/audit-evidence-coverage.mjs --json   (salida machine-readable)
 * ============================================================
 */
import fs from 'node:fs'
import path from 'node:path'

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content')
const VALID_LEVELS = new Set([
  'oficial-nombrado',
  'oficial-visual',
  'oficial-visual-multifuente',
  'respaldado',
  'especulativo',
])

const asJson = process.argv.includes('--json')

function listCategories() {
  return fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'media')
    .map((d) => d.name)
    .sort()
}

function listEntityFiles(categoryDir) {
  return fs
    .readdirSync(categoryDir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('__'))
    .sort()
}

function auditEntity(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8')
  let data
  try {
    data = JSON.parse(raw)
  } catch (err) {
    return { status: 'invalid-json', error: err.message }
  }

  if (!('evidence' in data) || data.evidence == null) {
    return { status: 'missing' }
  }

  const evidence = data.evidence
  if (typeof evidence !== 'object' || Array.isArray(evidence)) {
    return { status: 'malformed', detail: 'evidence no es un objeto' }
  }

  if (!evidence.level || !VALID_LEVELS.has(evidence.level)) {
    return { status: 'invalid-level', detail: evidence.level ?? '(vacío)' }
  }

  const hasSource = Boolean(evidence.primarySource || evidence.secondarySource)
  if (!hasSource) {
    // No es un error de schema (ambos son opcionales), pero es una
    // evidencia "vacía" en la práctica: nivel declarado sin ninguna
    // fuente citada. Se reporta aparte para no mezclarlo con lo que sí
    // rompe el schema.
    return { status: 'valid-no-source', level: evidence.level }
  }

  return { status: 'valid', level: evidence.level }
}

function main() {
  const categories = listCategories()
  const report = {}
  let totalEntities = 0
  let totalWithGap = 0

  for (const category of categories) {
    const dir = path.join(CONTENT_DIR, category)
    const files = listEntityFiles(dir)
    const entities = []

    for (const file of files) {
      const result = auditEntity(path.join(dir, file))
      entities.push({ slug: file.replace(/\.json$/, ''), ...result })
    }

    const counts = {
      total: entities.length,
      valid: entities.filter((e) => e.status === 'valid').length,
      validNoSource: entities.filter((e) => e.status === 'valid-no-source').length,
      missing: entities.filter((e) => e.status === 'missing').length,
      invalidLevel: entities.filter((e) => e.status === 'invalid-level').length,
      malformed: entities.filter((e) => e.status === 'malformed').length,
      invalidJson: entities.filter((e) => e.status === 'invalid-json').length,
    }

    const gaps = entities.filter((e) => e.status !== 'valid')
    totalEntities += counts.total
    totalWithGap += gaps.length

    report[category] = { counts, gaps }
  }

  if (asJson) {
    console.log(JSON.stringify(report, null, 2))
    process.exitCode = totalWithGap > 0 ? 1 : 0
    return
  }

  console.log('Auditoría de cobertura de evidencia\n' + '='.repeat(60))
  for (const [category, { counts, gaps }] of Object.entries(report)) {
    if (counts.total === 0) continue
    const pct = ((counts.valid / counts.total) * 100).toFixed(0)
    const flag = counts.valid === counts.total ? '✓' : counts.valid === 0 ? '✗' : '~'
    console.log(
      `\n${flag} ${category.padEnd(16)} ${counts.valid}/${counts.total} con evidencia sólida (${pct}%)`
    )
    if (counts.validNoSource > 0) {
      console.log(`   · ${counts.validNoSource} tienen level pero SIN primarySource/secondarySource`)
    }
    if (counts.missing > 0) {
      console.log(`   · ${counts.missing} sin campo evidence`)
    }
    if (counts.invalidLevel > 0) {
      console.log(`   · ${counts.invalidLevel} con level inválido/vacío`)
    }
    if (counts.malformed > 0) {
      console.log(`   · ${counts.malformed} con evidence malformado`)
    }
    if (counts.invalidJson > 0) {
      console.log(`   · ${counts.invalidJson} con JSON inválido (¡revisar aparte!)`)
    }
    if (gaps.length > 0 && gaps.length <= 20) {
      for (const g of gaps) {
        const extra = g.detail ? ` (${g.detail})` : g.level ? ` (level: ${g.level})` : ''
        console.log(`     - ${g.slug}: ${g.status}${extra}`)
      }
    } else if (gaps.length > 20) {
      console.log(`     (${gaps.length} entidades con brecha — usar --json para el listado completo)`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(
    `TOTAL: ${totalEntities - totalWithGap}/${totalEntities} entidades con evidencia sólida ` +
      `(${(((totalEntities - totalWithGap) / totalEntities) * 100).toFixed(1)}%)`
  )
  if (totalWithGap > 0) {
    console.log(`${totalWithGap} entidades con brecha de evidencia — el sello NO aparece en su card/ficha.`)
  }

  process.exitCode = totalWithGap > 0 ? 1 : 0
}

main()
