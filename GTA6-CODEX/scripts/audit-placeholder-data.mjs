#!/usr/bin/env node
/**
 * scripts/audit-placeholder-data.mjs
 * ============================================================
 * Auditoría P3 de la lista de oportunidades ("AutoFicha: aprovechamiento
 * de datos", sección 11): "Auditoría de placeholders (globalPricing,
 * performanceData) en todo el dataset (hoy solo verificado en 1 archivo
 * de muestra)". Este script extiende esa verificación de muestra a las
 * 250 fichas.
 *
 * Contexto importante: ni `globalPricing` ni `performanceData` están
 * declarados en el schema Zod (`src/types/schemas.ts`) — Zod descarta
 * claves no declaradas por default (no usa `.passthrough()`), así que
 * hoy estos campos ya son datos muertos: existen en disco pero ningún
 * componente de producción los recibe siquiera después de validar. El
 * placeholder detectado acá NO es visible en ningún punto del sitio hoy.
 *
 * Por qué limpiar igual: el propio roadmap (Fase D) depende de que estos
 * placeholders estén saneados ANTES de exponer una sección nueva que use
 * este dato — si no, se expondrían precios en $0 o velocidades máximas
 * en 0 km/h apenas se active la UI. Limpiar ahora, con el campo todavía
 * dead, es la única forma de hacerlo sin riesgo de regresión visible.
 *
 * Placeholders detectados (confirmado contra las 250 fichas, no solo la
 * muestra de 1 archivo del informe original):
 *   - globalPricing.USD.precio === 0 (con disponible: true, lo cual es
 *     contradictorio en sí mismo — un precio "disponible" no puede ser
 *     cero). Estructura de una sola moneda por ficha: si el precio es
 *     placeholder, el objeto entero no aporta nada rescatable → se anula
 *     por completo.
 *   - performanceData.velocidad.maxima === 0. El resto de las claves de
 *     performanceData (aceleración, autonomía, consumo, emisiones) NO
 *     presenta el mismo patrón de placeholder en cero en todo el dataset
 *     (confirmado: como mucho 1/250 poblado y nunca en 0 fuera de
 *     velocidad.maxima) — por eso la limpieza es quirúrgica sobre esa
 *     única clave, sin tocar el resto del bloque.
 *
 * USO:
 *   node scripts/audit-placeholder-data.mjs             # solo reporta
 *   node scripts/audit-placeholder-data.mjs --json       # salida machine-readable
 *   node scripts/audit-placeholder-data.mjs --apply       # limpia y sobreescribe
 *   node scripts/audit-placeholder-data.mjs --self-test   # regresión embebida
 *
 * Exit code: 1 si se detectan placeholders en modo reporte (para poder
 * engancharse a CI si en el futuro se decide activar la sección y se
 * quiere bloquear el build ante un nuevo placeholder sin limpiar).
 * ============================================================
 */

import fs from 'node:fs'
import path from 'node:path'

const CONTENT_DIR = path.join(process.cwd(), 'src/content/vehiculos')
const APPLY = process.argv.includes('--apply')
const AS_JSON = process.argv.includes('--json')

function isPlaceholderPrice(globalPricing) {
  const precio = globalPricing?.USD?.precio
  return precio === 0 || precio === '0'
}

function isPlaceholderTopSpeed(performanceData) {
  const maxima = performanceData?.velocidad?.maxima
  return maxima === 0 || maxima === '0'
}

/** Aplica la limpieza sobre un objeto JSON ya parseado (mutación in-place)
 *  y devuelve qué se tocó, para el reporte. Extraída como función pura
 *  para poder testearla en el self-test sin tocar el filesystem. */
function cleanPlaceholders(json) {
  const result = { removedGlobalPricing: false, nulledTopSpeed: false }

  if (json.globalPricing && isPlaceholderPrice(json.globalPricing)) {
    json.globalPricing = null
    result.removedGlobalPricing = true
  }

  if (json.performanceData && isPlaceholderTopSpeed(json.performanceData)) {
    delete json.performanceData.velocidad.maxima
    // Si `maxima` era la única clave de `velocidad`, no dejamos un objeto
    // vacío colgando.
    if (Object.keys(json.performanceData.velocidad).length === 0) {
      delete json.performanceData.velocidad
    }
    result.nulledTopSpeed = true
  }

  return result
}

function runSelfTest() {
  const withPlaceholders = {
    globalPricing: { USD: { precio: 0, moneda: 'USD', disponible: true } },
    performanceData: { velocidad: { maxima: 0 }, consumo: { promedio: '6.0 l/100km' } },
  }
  const r1 = cleanPlaceholders(withPlaceholders)
  if (!r1.removedGlobalPricing) throw new Error('Self-test falló: globalPricing placeholder no se anuló')
  if (withPlaceholders.globalPricing !== null) throw new Error('Self-test falló: globalPricing debería ser null')
  if (!r1.nulledTopSpeed) throw new Error('Self-test falló: velocidad.maxima placeholder no se anuló')
  if ('velocidad' in withPlaceholders.performanceData) {
    throw new Error('Self-test falló: `velocidad` debería eliminarse por completo (maxima era su única clave)')
  }
  if (withPlaceholders.performanceData.consumo.promedio !== '6.0 l/100km') {
    throw new Error('Self-test falló: no debería tocar performanceData.consumo, que tiene dato real')
  }

  const withRealData = {
    globalPricing: { USD: { precio: 45000, moneda: 'USD', disponible: true } },
    performanceData: { velocidad: { maxima: 218 } },
  }
  const r2 = cleanPlaceholders(withRealData)
  if (r2.removedGlobalPricing || r2.nulledTopSpeed) {
    throw new Error('Self-test falló: no debería tocar datos reales (no-cero)')
  }
  if (withRealData.globalPricing.USD.precio !== 45000 || withRealData.performanceData.velocidad.maxima !== 218) {
    throw new Error('Self-test falló: mutó datos reales')
  }

  const onlyMaxima = {
    performanceData: { velocidad: { maxima: 0 } },
  }
  cleanPlaceholders(onlyMaxima)
  if ('velocidad' in onlyMaxima.performanceData) {
    throw new Error('Self-test falló: debería eliminar `velocidad` si `maxima` era su única clave')
  }

  console.log('OK — self-test de audit-placeholder-data pasó (4 casos).')
}

function main() {
  if (process.argv.includes('--self-test')) {
    runSelfTest()
    return
  }

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'))
  const affectedGlobalPricing = []
  const affectedTopSpeed = []

  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file)
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

    const hasPricePlaceholder = json.globalPricing && isPlaceholderPrice(json.globalPricing)
    const hasSpeedPlaceholder = json.performanceData && isPlaceholderTopSpeed(json.performanceData)

    if (hasPricePlaceholder) affectedGlobalPricing.push(file)
    if (hasSpeedPlaceholder) affectedTopSpeed.push(file)

    if (APPLY && (hasPricePlaceholder || hasSpeedPlaceholder)) {
      cleanPlaceholders(json)
      fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf-8')
    }
  }

  const report = {
    totalFiles: files.length,
    globalPricingPlaceholders: affectedGlobalPricing.length,
    topSpeedPlaceholders: affectedTopSpeed.length,
    applied: APPLY,
    affectedGlobalPricing,
    affectedTopSpeed,
  }

  if (AS_JSON) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(`Archivos analizados: ${report.totalFiles}`)
    console.log(
      `globalPricing.USD.precio === 0: ${report.globalPricingPlaceholders} archivo(s)${APPLY ? ' (anulados)' : ''}`
    )
    console.log(
      `performanceData.velocidad.maxima === 0: ${report.topSpeedPlaceholders} archivo(s)${APPLY ? ' (anulados)' : ''}`
    )
    if (!APPLY && (report.globalPricingPlaceholders > 0 || report.topSpeedPlaceholders > 0)) {
      console.log('\nCorré con --apply para limpiar estos valores (ninguno de los dos campos llega hoy a la UI).')
    }
  }

  if (!APPLY && (report.globalPricingPlaceholders > 0 || report.topSpeedPlaceholders > 0)) {
    process.exitCode = 1
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { cleanPlaceholders, isPlaceholderPrice, isPlaceholderTopSpeed }
