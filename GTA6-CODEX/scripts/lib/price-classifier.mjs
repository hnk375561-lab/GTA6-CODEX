/**
 * scripts/lib/price-classifier.mjs
 * ============================================================
 * Lógica de clasificación del campo `price` (texto libre) de
 * src/content/vehiculos/*.json en un modelo estructurado, sin inventar
 * ningún dato (ver FASE 1 — price data foundation).
 *
 * Compartido por:
 *   - scripts/audit-price-formats.mjs (Paso 1: solo reporta, no escribe)
 *   - scripts/migrate-price-structure.mjs (Paso 6: escribe `priceStructured`)
 *
 * Reglas duras (ver instrucciones de la fase):
 *   - Nunca se inventa un precio, una moneda, ni una conversión.
 *   - Si no se puede estructurar con seguridad, `type: 'unstructured'` y
 *     `currency: null` — el string original en `raw` es la única fuente
 *     de verdad, nunca se pierde.
 *   - Un precio con más de una moneda mencionada (p. ej. "USD 38.000
 *     (referencia regional / desde aprox. 40.109 € en Europa)") NUNCA se
 *     interpreta como rango — un rango solo existe cuando ambos extremos
 *     están en la MISMA moneda y conectados explícitamente por "-", "–",
 *     " a " o "hasta".
 *
 * Este módulo es puro (sin I/O) para poder testearlo y reutilizarlo desde
 * ambos scripts sin duplicar la clasificación.
 */

import assert from 'node:assert/strict'

// Códigos de moneda reconocidos tal como aparecen en el dataset real (ver
// auditoría Paso 1). No es una lista exhaustiva de monedas del mundo: es
// exactamente el conjunto de códigos que el contenido actual usa.
const CODES = [
  'USD', 'ARS', 'EUR', 'GBP', 'JPY', 'MYR', 'CAD', 'CHF',
  'BRL', 'MXN', 'CNY', 'KRW', 'AUD', 'CLP', 'COP',
]

// Alias/símbolos que se resuelven a un código anterior, solo cuando el
// símbolo es inequívoco (€/£/¥ no se usan para ninguna otra moneda en el
// dataset). El símbolo "$" NUNCA se resuelve automáticamente (lo usan
// USD/ARS/MXN/CLP indistintamente en el texto real) — un precio con "$"
// suelto y sin código explícito queda `unstructured`.
const ALIAS_MAP = { 'U$S': 'USD', 'US$': 'USD', 'R$': 'BRL', 'RM': 'MYR', '€': 'EUR', '£': 'GBP', '¥': 'JPY' }
const ALIAS_KEYS = ['U\\$S', 'US\\$', 'R\\$', 'RM', '€', '£', '¥']
const SUFFIX_SYMBOLS = ['€', '£', '¥']

const NUM = String.raw`\d+(?:[.,]\d+)*`
const CODE_ALT = CODES.join('|')
const TOKEN = `(?:${CODE_ALT}|${ALIAS_KEYS.join('|')})`
const SUFFIX_ALT = `(?:${SUFFIX_SYMBOLS.join('|')}|${CODE_ALT})`

const patPrefixCode = new RegExp(String.raw`\b(${CODE_ALT})\s*\$?\.?\s*(${NUM})`, 'g')
const patPrefixAlias = new RegExp(String.raw`(U\$S|US\$|R\$|RM|€|£|¥)\s*\.?\s*(${NUM})`, 'g')
const patSuffixDollarCode = new RegExp(String.raw`\$\s*(${NUM})\s*(${CODE_ALT})\b`, 'g')
const patSuffixCode = new RegExp(String.raw`(${NUM})\s*(${CODE_ALT})\b`, 'g')
const patSuffixSymbol = new RegExp(String.raw`(${NUM})\s*(€|£|¥)`, 'g')

const rangePatPrefix = new RegExp(
  String.raw`(${TOKEN})\s*\$?\.?\s*(${NUM})\s*(?:\([^)]{0,60}\))?\s*(-|–|\ba\b|\bhasta\b)\s*(${TOKEN})?\s*\$?\.?\s*(${NUM})`
)
const rangePatSuffix = new RegExp(
  String.raw`(${NUM})\s*(${SUFFIX_ALT})\s*(?:\([^)]{0,60}\))?\s*(-|–|\ba\b|\bhasta\b)\s*(${NUM})\s*(${SUFFIX_ALT})?`
)

const STARTING_RE = /(desde|a partir de)/i

function normalizeCurrency(token) {
  if (CODES.includes(token)) return token
  return ALIAS_MAP[token] ?? token
}

function normalizeSuffixCurrency(token) {
  if (token === '€') return 'EUR'
  if (token === '£') return 'GBP'
  if (token === '¥') return 'JPY'
  return token
}

/** Convierte "34.900", "34,900" o "969,900" (miles con punto o coma) a
 *  número. Devuelve `null` si no da un número finito. Mismo criterio que
 *  `normalizeAmount` en `src/lib/vehicle-price.ts`. */
function normalizeAmount(raw) {
  const cleaned = raw.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.')
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

function findSingleMatches(text) {
  const matches = []
  for (const re of [patPrefixCode]) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(text))) matches.push({ start: m.index, currency: m[1], num: m[2] })
  }
  patPrefixAlias.lastIndex = 0
  let m
  while ((m = patPrefixAlias.exec(text))) {
    matches.push({ start: m.index, currency: normalizeCurrency(m[1]), num: m[2] })
  }
  patSuffixDollarCode.lastIndex = 0
  while ((m = patSuffixDollarCode.exec(text))) {
    matches.push({ start: m.index, currency: m[2], num: m[1] })
  }
  patSuffixCode.lastIndex = 0
  while ((m = patSuffixCode.exec(text))) {
    matches.push({ start: m.index, currency: m[2], num: m[1] })
  }
  patSuffixSymbol.lastIndex = 0
  while ((m = patSuffixSymbol.exec(text))) {
    matches.push({ start: m.index, currency: normalizeSuffixCurrency(m[2]), num: m[1] })
  }
  matches.sort((a, b) => a.start - b.start)
  const seen = new Set()
  const out = []
  for (const cand of matches) {
    if (seen.has(cand.start)) continue
    seen.add(cand.start)
    out.push(cand)
  }
  return out
}

/**
 * Clasifica el campo `price` (texto libre) de un vehículo en el modelo
 * estructurado. Nunca lanza, nunca inventa: en el peor caso devuelve
 * `type: 'unstructured'`.
 *
 * @param {string | null | undefined} raw
 * @returns {{ type: 'single'|'starting'|'range'|'unstructured', currency: string|null, amount?: number, min?: number, max?: number, raw: string }}
 */
export function classifyPrice(raw) {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') {
    return { type: 'unstructured', currency: null, raw: raw ?? '' }
  }

  // 1. Rango con moneda en prefijo ("USD 33.000 - USD 45.000").
  const rm = rangePatPrefix.exec(raw)
  if (rm) {
    const c1 = normalizeCurrency(rm[1])
    const c2 = rm[4] ? normalizeCurrency(rm[4]) : c1
    if (c1 === c2) {
      const min = normalizeAmount(rm[2])
      const max = normalizeAmount(rm[5])
      if (min !== null && max !== null) {
        return { type: 'range', currency: c1, min, max, raw }
      }
    }
  }

  // 2. Rango con moneda en sufijo ("€56.851 - €72.410").
  const rm2 = rangePatSuffix.exec(raw)
  if (rm2) {
    const c1 = normalizeSuffixCurrency(rm2[2])
    const c2 = rm2[5] ? normalizeSuffixCurrency(rm2[5]) : c1
    if (c1 === c2) {
      const min = normalizeAmount(rm2[1])
      const max = normalizeAmount(rm2[4])
      if (min !== null && max !== null) {
        return { type: 'range', currency: c1, min, max, raw }
      }
    }
  }

  // 3. Valor único (con o sin "desde").
  const matches = findSingleMatches(raw)
  if (matches.length > 0) {
    const first = matches[0]
    const amount = normalizeAmount(first.num)
    if (amount !== null) {
      const prefixText = raw.slice(Math.max(0, first.start - 25), first.start)
      const type = STARTING_RE.test(prefixText) ? 'starting' : 'single'
      return { type, currency: first.currency, amount, raw }
    }
  }

  // 4. No estructurable: sin moneda inequívoca, "consultar", "no
  //    publicado", mezcla de monedas sin desambiguar, etc.
  return { type: 'unstructured', currency: null, raw }
}

// ============================================================
// Self-test (Paso 10 de la fase): node scripts/lib/price-classifier.mjs --self-test
// ============================================================
function selfTest() {
  const cases = [
    // 1. precio entero
    ['USD 34.900', { type: 'single', currency: 'USD', amount: 34900 }],
    // 2. precio decimal (no hay decimales reales en el dataset, pero el
    //    parser no debe romperse ante uno: "USD 34.900,50" -> 34900.5)
    ['USD 34.900,50', { type: 'single', currency: 'USD', amount: 34900.5 }],
    // 3. moneda explícita (código de 3 letras)
    ['EUR 31.500', { type: 'single', currency: 'EUR', amount: 31500 }],
    // 4. separadores de miles (punto)
    ['ARS 4.539.990', { type: 'single', currency: 'ARS', amount: 4539990 }],
    // 5. precio "desde"
    ['Desde aprox. USD 33.000 (referencia regional)', { type: 'starting', currency: 'USD', amount: 33000 }],
    // 6. rango
    ['USD 33.000 - USD 45.000', { type: 'range', currency: 'USD', min: 33000, max: 45000 }],
    // 7. null
    [null, { type: 'unstructured', currency: null }],
    // 8. vacío
    ['', { type: 'unstructured', currency: null }],
    // 9. texto no numérico
    ['Consultar red de concesionarios oficiales', { type: 'unstructured', currency: null }],
    // 10. moneda desconocida / ambigua ("$" sin código)
    ['Desde $33.681.900 (MSRP referencia regional Argentina)', { type: 'unstructured', currency: null }],
    // 11. formato ambiguo (mezcla de monedas sin desambiguar)
    ['ARS / USD (Precio variable según mercado regional)', { type: 'unstructured', currency: null }],
    // Rango con monedas distintas en cada extremo: NUNCA es un rango real
    // (ver docstring del módulo) — debe caer a 'starting' sobre el primer
    // valor, nunca mezclar ARS con USD como si fueran comparables.
    ['Desde USD 65.000 (EE.UU.) hasta más de EUR 210.000 según versiones', { type: 'starting', currency: 'USD', amount: 65000 }],
    // Equivalencia USD entre paréntesis para otra moneda: se toma la
    // moneda principal declarada (JPY), nunca la equivalencia aproximada
    // como si fuera el valor real — no inventar una conversión.
    ['JPY 2.508.000 (~USD 17.000, referencia mercado japonés)', { type: 'single', currency: 'JPY', amount: 2508000 }],
  ]

  for (const [raw, expected] of cases) {
    const result = classifyPrice(raw)
    assert.equal(result.type, expected.type, `type para ${JSON.stringify(raw)}: esperado ${expected.type}, obtuvo ${result.type}`)
    assert.equal(
      result.currency,
      expected.currency,
      `currency para ${JSON.stringify(raw)}: esperado ${expected.currency}, obtuvo ${result.currency}`
    )
    if (expected.amount !== undefined) {
      assert.equal(result.amount, expected.amount, `amount para ${JSON.stringify(raw)}`)
    }
    if (expected.min !== undefined) {
      assert.equal(result.min, expected.min, `min para ${JSON.stringify(raw)}`)
      assert.equal(result.max, expected.max, `max para ${JSON.stringify(raw)}`)
    }
  }

  // 12. precio ya migrado: clasificar dos veces el mismo raw da el mismo
  //     resultado exacto (determinismo, base de la idempotencia).
  const r1 = classifyPrice('USD 44.900')
  const r2 = classifyPrice('USD 44.900')
  assert.deepEqual(r1, r2, 'clasificar el mismo raw dos veces debe dar el mismo resultado')

  console.log(`OK — self-test de price-classifier pasó (${cases.length} casos + determinismo).`)
}

if (typeof process !== 'undefined' && process.argv.includes('--self-test')) {
  selfTest()
}
