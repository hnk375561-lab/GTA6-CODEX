#!/usr/bin/env node
/**
 * Normaliza el campo `generacion` (texto 100% libre, ver auditoría P2 #9
 * "AutoFicha: aprovechamiento de datos") a un campo nuevo y aditivo
 * `generacionInfo`, sin tocar ni eliminar `generacion`.
 *
 * Por qué aditivo y no un reemplazo: `generacion` mezcla en un solo string
 * libre hasta 4 tipos de información distinta (número ordinal, código de
 * chasis/plataforma, rango de años, facelift) con formato inconsistente
 * entre las 250 fichas (autos y motos, texto en español con abreviaturas
 * variadas, números romanos, códigos alfanuméricos). Un parser heurístico
 * sobre texto tan variado no puede garantizar 100% de precisión — por eso
 * cada campo estructurado se deja en `null` cuando no hay confianza
 * suficiente, y el string original siempre se preserva en `raw` para no
 * perder información editorial en ningún caso.
 *
 * Uso:
 *   node scripts/normalize-generacion.mjs           # aplica y sobreescribe los JSON
 *   node scripts/normalize-generacion.mjs --dry-run  # solo imprime el reporte
 */

import fs from 'node:fs'
import path from 'node:path'

const CONTENT_DIR = path.join(process.cwd(), 'src/content/vehiculos')
const DRY_RUN = process.argv.includes('--dry-run')

const ORDINAL_WORDS = [
  [/\bprimer(?:a|o)?\b/i, 1],
  [/\búnica?\b/i, 1],
  [/\bunica?\b/i, 1],
  [/\bsegunda\b/i, 2],
  [/\btercera\b/i, 3],
  [/\bcuarta\b/i, 4],
  [/\bquinta\b/i, 5],
  [/\bsexta\b/i, 6],
  [/\bs[ée]ptima\b/i, 7],
  [/\boctava\b/i, 8],
  [/\bnovena\b/i, 9],
  [/\bd[ée]cima\b/i, 10],
  [/\bund[ée]cima\b/i, 11],
  [/\bduod[ée]cima\b/i, 12],
  [/\bdecimocuarta\b/i, 14],
]

function stripAccents(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// "1ra", "1era", "1ª", "2da", "3ra", "6ta", "7ma" (abreviaturas con dígito).
// Usa un lookahead en vez de \b de cierre: "º"/"ª" no son \w para el motor
// de regex de JS, así que un \b justo después de esos símbolos nunca
// matchea (ninguno de los dos lados de esa posición cuenta como "word") y
// la abreviatura queda invisible para el parser. El lookahead evita ese
// problema por completo.
const DIGIT_ORDINAL = /\b(\d{1,2})\s*(?:ra|ta|da|era|ma|va|na|º|ª)(?![a-zA-Z0-9])/i

// Un dígito suelto como generación entera: "1"
const LONE_DIGIT = /^\s*(\d{1,2})\s*$/

// Números romanos I-XX como palabra aislada (evita falsos positivos: "L" o
// "D" solos NO cuentan como romano acá, exigimos 2+ letras o "I"/"V"/"X" solas
// seguidas de espacio/paréntesis/fin de string, nunca dentro de otra palabra).
const ROMAN_MAP = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 }
const ROMAN_TOKEN = /(?:^|\s)(i{1,3}|iv|vi{0,3}|ix|xi{0,2})(?=\s|\(|$)/i

// "Mk1", "Mk I", "MK8" (motos/autos británicos)
const MK_PATTERN = /\bmk\s*([ivx]+|\d{1,2})\b/i

// Código de chasis/plataforma alfanumérico: letras + dígitos, ej. W214, J12,
// D23, X254, G82, FL5, R35, C8, U25, B9, XV80, E210. Excluye años (4 dígitos
// solos, sin letras) y palabras comunes.
const CHASSIS_CODE = /\b([A-Za-z]{1,3}\d{1,4}[A-Za-z]?)\b/g
const CHASSIS_STOPWORDS = new Set(['e5', 'euro5']) // ruido conocido (normativas de emisión, no chasis)

// Código puramente numérico de 2-3 dígitos usado como nombre de modelo en
// motos (ej. "992", "S650" ya cubierto arriba). Excluye años 19xx/20xx.
const NUMERIC_MODEL_CODE = /\b(\d{2,3})\b(?!\d)/

const YEAR_RANGE = /\((\d{4})\s*[-–]\s*(presente|\d{4})\)/i
const YEAR_OPEN_PLUS = /\((\d{4})\+\)/
const SINGLE_YEAR_PAREN = /\bfacelift\s+(\d{4})\b/i

const FACELIFT_RE = /facelift|restyling|reestyling/i

function extractYears(raw) {
  let m = raw.match(YEAR_RANGE)
  if (m) {
    const anoInicio = parseInt(m[1], 10)
    const rangoAbierto = /presente/i.test(m[2])
    const anoFin = rangoAbierto ? null : parseInt(m[2], 10)
    return { anoInicio, anoFin, rangoAbierto }
  }
  m = raw.match(YEAR_OPEN_PLUS)
  if (m) {
    return { anoInicio: parseInt(m[1], 10), anoFin: null, rangoAbierto: true }
  }
  return { anoInicio: null, anoFin: null, rangoAbierto: false }
}

function extractFaceliftYear(raw) {
  const m = raw.match(SINGLE_YEAR_PAREN)
  return m ? parseInt(m[1], 10) : null
}

function extractNumero(raw) {
  const digitOrdinal = raw.match(DIGIT_ORDINAL)
  if (digitOrdinal) return parseInt(digitOrdinal[1], 10)

  for (const [re, num] of ORDINAL_WORDS) {
    if (re.test(raw)) return num
  }

  const mk = raw.match(MK_PATTERN)
  if (mk) {
    const token = mk[1].toLowerCase()
    if (ROMAN_MAP[token]) return ROMAN_MAP[token]
    const asInt = parseInt(token, 10)
    if (!Number.isNaN(asInt)) return asInt
  }

  const lone = raw.match(LONE_DIGIT)
  if (lone) return parseInt(lone[1], 10)

  const roman = raw.match(ROMAN_TOKEN)
  if (roman && ROMAN_MAP[roman[1].toLowerCase()]) {
    return ROMAN_MAP[roman[1].toLowerCase()]
  }

  return null
}

function extractChassisCode(raw) {
  const matches = [...raw.matchAll(CHASSIS_CODE)]
    .map((m) => m[1])
    .filter((code) => !CHASSIS_STOPWORDS.has(code.toLowerCase()))
    // Evita capturar la propia abreviatura ordinal ("1ra", "6ta") como código
    .filter((code) => !DIGIT_ORDINAL.test(code))
  if (matches.length > 0) return matches[0]

  // Modelo numérico puro tipo moto (992, 300), evitando años.
  const numMatch = raw.match(NUMERIC_MODEL_CODE)
  if (numMatch) {
    const n = parseInt(numMatch[1], 10)
    const looksLikeYear = raw.includes(`19${numMatch[1]}`) || raw.includes(`20${numMatch[1]}`)
    if (!looksLikeYear && n >= 10) return numMatch[1]
  }
  return null
}

export function parseGeneracion(raw) {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  // Todas las heurísticas de texto corren sobre la versión sin acentos:
  // \b de JS no reconoce vocales acentuadas como caracteres de palabra, así
  // que "Única" o "óctava" (si existieran) romperían el matcheo de \b al
  // inicio de la palabra. Años y códigos de chasis son ASCII, así que no
  // se ven afectados por este paso.
  const norm = stripAccents(trimmed)

  const numero = extractNumero(norm)
  const codigoChasis = extractChassisCode(norm)
  const { anoInicio, anoFin, rangoAbierto } = extractYears(norm)
  const faceliftAno = extractFaceliftYear(norm)
  const facelift = FACELIFT_RE.test(norm)

  return {
    raw: trimmed,
    numero,
    codigoChasis,
    anoInicio,
    anoFin,
    rangoAbierto,
    facelift,
    faceliftAno,
  }
}

function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) {
    throw new Error(`Self-test falló [${label}]: esperado ${e}, obtuvo ${a}`)
  }
}

/** Igual convención que `verify-relations-integrity.mjs --self-test`:
 *  casos de regresión embebidos en el propio script, sin depender de que
 *  vitest indexe archivos fuera de `src/**` (no lo hace, ver
 *  vitest.config.mts). Cubre los dos bugs reales encontrados durante el
 *  desarrollo (límites de palabra rotos por "ª"/"º" y por vocales
 *  acentuadas) para que no vuelvan a colarse silenciosamente. */
function runSelfTest() {
  assertEqual(parseGeneracion(null), null, 'null')
  assertEqual(parseGeneracion(''), null, 'string vacío')

  assertEqual(parseGeneracion('1ra generación').numero, 1, '1ra')
  assertEqual(parseGeneracion('2da generación (AN140)').numero, 2, '2da')
  assertEqual(
    parseGeneracion('1ª generación (con restyling regional)').numero,
    1,
    '1ª (bug real: ª no es \\w para \\b)'
  )
  assertEqual(
    parseGeneracion('Única (2021-presente)').numero,
    1,
    'Única (bug real: acento inicial rompe \\b)'
  )

  const giulia = parseGeneracion('Segunda generación (Tipo 952), facelift 2023')
  assertEqual(giulia.numero, 2, 'Giulia numero')
  assertEqual(giulia.codigoChasis, '952', 'Giulia codigoChasis')
  assertEqual(giulia.facelift, true, 'Giulia facelift')
  assertEqual(giulia.faceliftAno, 2023, 'Giulia faceliftAno')

  assertEqual(parseGeneracion('VIII (facelift 2024)').numero, 8, 'VIII romano')
  assertEqual(parseGeneracion('W910 (Tercera generación)').codigoChasis, 'W910', 'W910 codigo')
  assertEqual(parseGeneracion('W910 (Tercera generación)').numero, 3, 'W910 numero')

  const presente = parseGeneracion('Segunda generación (2017-presente)')
  assertEqual(presente.anoInicio, 2017, 'rango anoInicio')
  assertEqual(presente.rangoAbierto, true, 'rango abierto')
  assertEqual(presente.anoFin, null, 'rango anoFin null cuando abierto')

  assertEqual(parseGeneracion('1ª generación (reestyling 2022)').facelift, true, 'reestyling detectado')
  assertEqual(parseGeneracion('Primera generación').facelift, false, 'sin facelift')

  // Texto genuinamente ambiguo: no debe inventar numero/codigo.
  const highland = parseGeneracion('Highland')
  assertEqual(highland.numero, null, 'Highland numero null')
  assertEqual(highland.codigoChasis, null, 'Highland codigo null')
  assertEqual(highland.raw, 'Highland', 'Highland raw preservado')

  console.log('OK — self-test de normalize-generacion pasó (11 casos, incluyendo las 2 regresiones reales encontradas en desarrollo).')
}

function main() {
  if (process.argv.includes('--self-test')) {
    runSelfTest()
    return
  }

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'))
  let populated = 0
  let withNumero = 0
  let withCodigo = 0
  let withAnos = 0
  let withFacelift = 0
  let unparsed = []

  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file)
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    const info = parseGeneracion(json.generacion)

    if (info) {
      populated++
      if (info.numero !== null) withNumero++
      if (info.codigoChasis !== null) withCodigo++
      if (info.anoInicio !== null) withAnos++
      if (info.facelift) withFacelift++
      if (info.numero === null && info.codigoChasis === null) {
        unparsed.push({ file, raw: info.raw })
      }
    }

    json.generacionInfo = info

    if (!DRY_RUN) {
      fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf-8')
    }
  }

  console.log(`Archivos procesados: ${files.length}`)
  console.log(`generacionInfo poblado: ${populated}`)
  console.log(`  con numero: ${withNumero}`)
  console.log(`  con codigoChasis: ${withCodigo}`)
  console.log(`  con rango de años: ${withAnos}`)
  console.log(`  con facelift detectado: ${withFacelift}`)
  console.log(`  sin numero NI codigoChasis (solo raw + posible facelift/años): ${unparsed.length}`)
  if (unparsed.length > 0) {
    console.log('\nCasos sin numero/codigo (revisar manualmente si hace falta mejorar heurística):')
    for (const u of unparsed) console.log(`  - [${u.file}] "${u.raw}"`)
  }
  if (DRY_RUN) {
    console.log('\n(--dry-run: no se escribió ningún archivo)')
  }
}

// Solo ejecuta la migración cuando el archivo corre como script (`node
// scripts/normalize-generacion.mjs`), no cuando el test lo importa para
// probar `parseGeneracion` de forma aislada — de lo contrario cada corrida
// de `vitest` reescribiría (u ofrecería reescribir) las 250 fichas.
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
