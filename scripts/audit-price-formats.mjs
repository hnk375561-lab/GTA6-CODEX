#!/usr/bin/env node
/**
 * scripts/audit-price-formats.mjs
 * ============================================================
 * FASE 1 — price data foundation, Paso 1.
 *
 * Audita automáticamente el campo `price` (texto libre) de TODOS los
 * vehículos en `src/content/vehiculos/*.json` y clasifica cada uno según
 * el modelo de `scripts/lib/price-classifier.mjs`.
 *
 * Este script es de solo lectura: nunca modifica archivos. Sirve como
 * base para el reporte del Paso 1 y como verificación independiente de
 * que `scripts/migrate-price-structure.mjs` no dejó ningún vehículo sin
 * clasificar.
 *
 * Uso:
 *   node scripts/audit-price-formats.mjs          # reporte legible
 *   node scripts/audit-price-formats.mjs --json    # reporte en JSON
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { classifyPrice } from './lib/price-classifier.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content', 'vehiculos')
const AS_JSON = process.argv.includes('--json')

function auditAll() {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json')).sort()

  const results = []
  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file)
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    const cls = classifyPrice(json.price)
    results.push({ file, slug: json.slug ?? file.replace(/\.json$/, ''), price: json.price ?? null, ...cls })
  }

  const totalVehiculos = results.length
  const totalConPrice = results.filter((r) => r.price !== null && r.price !== '').length
  const totalSinPrice = totalVehiculos - totalConPrice
  const estructurables = results.filter((r) => r.type === 'single' || r.type === 'starting' || r.type === 'range')
  const noEstructurables = results.filter((r) => r.type === 'unstructured')

  // "Formatos encontrados": agrupación descriptiva de los patrones reales
  // vistos en el dataset (no una taxonomía inventada aparte de los datos).
  const formatCounts = {
    'moneda + número, valor único (ej. "USD 34.900")': results.filter((r) => r.type === 'single').length,
    'moneda + número con prefijo "desde"/"a partir de" (ej. "Desde USD 33.000")': results.filter(
      (r) => r.type === 'starting'
    ).length,
    'rango explícito misma moneda (ej. "USD 33.000 - USD 45.000")': results.filter((r) => r.type === 'range').length,
    'texto sin precio publicado ("Consultar", "No publicado", "Discontinuado")': results.filter(
      (r) => r.type === 'unstructured' && /consultar|no\s+public|no\s+inform|no\s+confirmad|no\s+disponible|discontinuado/i.test(r.raw)
    ).length,
    '"$" sin código de moneda explícito (ambiguo: podría ser USD/ARS/MXN/CLP)': results.filter(
      (r) => r.type === 'unstructured' && /\$/.test(r.raw)
    ).length,
    'mezcla de monedas sin desambiguar (ej. "ARS / USD")': results.filter(
      (r) => r.type === 'unstructured' && /\bARS\s*\/\s*USD\b|\bUSD\s*\/\s*ARS\b/i.test(r.raw)
    ).length,
  }

  const currencyCounts = {}
  for (const r of results) {
    if (r.currency) currencyCounts[r.currency] = (currencyCounts[r.currency] ?? 0) + 1
  }

  const report = {
    totalVehiculos,
    totalConPrice,
    totalSinPrice,
    totalEstructurables: estructurables.length,
    totalAmbiguos: 0, // ver nota abajo: este dataset no tuvo casos "ambiguos pero parcialmente estructurables" — o se resolvió con seguridad (estructurable) o no (unstructured)
    totalNoEstructurables: noEstructurables.length,
    formatosEncontrados: formatCounts,
    monedasDetectadas: currencyCounts,
    casosNoEstructurables: noEstructurables.map((r) => ({ file: r.file, price: r.price })),
  }

  return report
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = auditAll()
  if (AS_JSON) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log('TOTAL VEHÍCULOS:', report.totalVehiculos)
    console.log('TOTAL CON PRICE:', report.totalConPrice)
    console.log('TOTAL SIN PRICE:', report.totalSinPrice)
    console.log('TOTAL ESTRUCTURABLES:', report.totalEstructurables)
    console.log('TOTAL AMBIGUOS:', report.totalAmbiguos)
    console.log('TOTAL NO ESTRUCTURABLES:', report.totalNoEstructurables)
    console.log()
    console.log('FORMATOS ENCONTRADOS:')
    for (const [k, v] of Object.entries(report.formatosEncontrados)) {
      console.log(`- ${k}: ${v}`)
    }
    console.log()
    console.log('MONEDAS DETECTADAS:')
    for (const [k, v] of Object.entries(report.monedasDetectadas).sort((a, b) => b[1] - a[1])) {
      console.log(`- ${k}: ${v}`)
    }
    console.log()
    console.log('CASOS NO ESTRUCTURABLES (excepcionales):')
    for (const c of report.casosNoEstructurables) {
      console.log(`- ${c.file}: ${JSON.stringify(c.price)}`)
    }
  }
}

export { auditAll }
