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
 * Ronda 2 (misma auditoría, extendida a los otros dos placeholders que ya
 * cita el informe original sobre el archivo de muestra `toyota-corolla-2024.json`
 * y que la primera pasada de este script no había cubierto todavía):
 *   - `specifications` (bloque completo: motorizacion/transmision/dimensiones/
 *     capacidades/bateria): NO está declarado en el schema Zod (mismo caso
 *     que globalPricing/performanceData — dato muerto, invisible en UI).
 *     Confirmado sobre las 250 fichas que es una plantilla genérica aplicada
 *     de forma uniforme, con datos peores y a veces rotos frente a los
 *     campos planos ya en uso (`dimensiones`, `transmision`, `consumo`,
 *     `asientos`, `performance`, `especificacionesMotor/Transmision/...`):
 *       · `dimensiones.largo` es un número suelto sin unidad (ej. `4`, se
 *         entiende "4 metros" pero no lo dice), mientras `ancho`/`alto`
 *         están en null en 244/250 fichas — el bloque nunca llegó a
 *         completarse.
 *       · `bateria` aparece en 149/250 fichas de vehículos a combustión
 *         (ni eléctricos ni híbridos) guardando ahí el consumo de
 *         combustible — la estructura genérica no diferencia motorización,
 *         tal como ya señalaba el informe original (sección 9).
 *     Como el bloque entero es huérfano y ya duplicado (con menor fidelidad)
 *     por los campos planos reales, se elimina por completo en vez de
 *     limpiarlo campo por campo.
 *   - `audit` (bloque completo: sources/auditNotes/dataQuality): tampoco
 *     está en el schema (no confundir con `evidence`, que sí se usa en
 *     `EvidenceBlock.tsx` y no se toca). 149/250 fichas tienen
 *     `sources[0].url === "https://www.manufacturer.com"` marcado además
 *     como `verificado: true` — una fuente que no es real, dada por
 *     verificada. `auditNotes: "Datos en revisión"` y `dataQuality: 0.8`
 *     aparecen como constantes idénticas en ese mismo grupo de fichas,
 *     consistente con relleno de plantilla y no con auditoría real. Se
 *     elimina el bloque completo antes de que llegue a exponerse en algún
 *     punto futuro del sitio.
 *
 * Ronda 3 (quick win #13 de audit2.md, sección 16: "Consolidar el copy
 * de `competition.competidores` para que se alimente de `relations` en
 * vez de mantenerse vacío por separado"):
 *   - `competition` (bloque completo: competidores/posicionMercado/
 *     ventajas): a diferencia de specifications/audit, SÍ está en el
 *     schema Zod, pero no se renderiza en ningún lugar de la UI
 *     (confirmado: cero referencias a `competition`/`competidores`
 *     fuera de `schemas.ts`/`entity.ts`). Auditado el dato en sí,
 *     resulta el mismo patrón de relleno genérico que P0-2 ya retiró en
 *     otros dos bloques: `posicionMercado` tiene solo 9 valores únicos
 *     en 250 fichas (ej. "Premium" repetido) y `ventajas` solo 6 tuplas
 *     únicas en 155 fichas pobladas — plantilla, no contenido editorial
 *     por vehículo. `competidores` en sí está vacío en 241/250 fichas, y
 *     donde tiene valores no hay garantía de que coincida con las
 *     relaciones reales (`relations[]` con `relation: "competidor"`,
 *     pobladas en 244/250 y sí consumidas por `RelationsPanel`, con
 *     imagen/link y botón "Comparar"). El bloque completo se retira: la
 *     necesidad real (mostrar competidores) ya la resuelve `relations[]`,
 *     y exponer el resto (`posicionMercado`/`ventajas`) violaría el
 *     mismo estándar de evidencia que motivó P0-2.
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

/** `specifications` no está en el schema Zod (ver cabecera) y su forma es
 *  siempre la misma plantilla huérfana — no hace falta detectar un patrón
 *  específico de placeholder, alcanza con que el bloque exista. */
function hasDeadSpecificationsBlock(json) {
  return Boolean(json.specifications)
}

/** Mismo caso que `specifications`: `audit` no está en el schema (no es
 *  `evidence`, que sí se usa) y es plantilla huérfana en cuanto existe. */
function hasDeadAuditBlock(json) {
  return Boolean(json.audit)
}

/** `competition` sí está en el schema (a diferencia de specifications/
 *  audit) pero no se renderiza en ningún lugar de la UI, y auditado el
 *  dato en sí es relleno genérico (ver cabecera, Ronda 3) — se trata
 *  igual que los bloques muertos: alcanza con que exista. */
function hasDeadCompetitionBlock(json) {
  return Boolean(json.competition)
}

/** Aplica la limpieza sobre un objeto JSON ya parseado (mutación in-place)
 *  y devuelve qué se tocó, para el reporte. Extraída como función pura
 *  para poder testearla en el self-test sin tocar el filesystem. */
function cleanPlaceholders(json) {
  const result = {
    removedGlobalPricing: false,
    nulledTopSpeed: false,
    removedSpecifications: false,
    removedAudit: false,
    removedCompetition: false,
  }

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

  if (hasDeadSpecificationsBlock(json)) {
    delete json.specifications
    result.removedSpecifications = true
  }

  if (hasDeadAuditBlock(json)) {
    delete json.audit
    result.removedAudit = true
  }

  if (hasDeadCompetitionBlock(json)) {
    delete json.competition
    result.removedCompetition = true
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

  const deadBlocks = {
    specifications: { dimensiones: { largo: 4, ancho: null, alto: null }, bateria: { consumo: '6.9 l/100km' } },
    audit: {
      sources: [{ url: 'https://www.manufacturer.com', type: 'oficial', verificado: true }],
      auditNotes: 'Datos en revisión',
      dataQuality: 0.8,
    },
    // `evidence` es un campo real (sí está en el schema, sí se usa en
    // EvidenceBlock.tsx) — el self-test confirma que el script no lo toca.
    evidence: { level: 'oficial-nombrado', source: 'Ficha técnica oficial' },
  }
  const r3 = cleanPlaceholders(deadBlocks)
  if (!r3.removedSpecifications || 'specifications' in deadBlocks) {
    throw new Error('Self-test falló: `specifications` debería eliminarse por completo')
  }
  if (!r3.removedAudit || 'audit' in deadBlocks) {
    throw new Error('Self-test falló: `audit` debería eliminarse por completo')
  }
  if (!deadBlocks.evidence || deadBlocks.evidence.level !== 'oficial-nombrado') {
    throw new Error('Self-test falló: no debería tocar `evidence`, que sí es un campo real y en uso')
  }

  const withoutDeadBlocks = { title: 'Sin specifications ni audit' }
  const r4 = cleanPlaceholders(withoutDeadBlocks)
  if (r4.removedSpecifications || r4.removedAudit) {
    throw new Error('Self-test falló: no debería reportar remoción si el bloque nunca existió')
  }

  const withCompetitionFiller = {
    competition: {
      competidores: [],
      posicionMercado: 'Premium',
      ventajas: ['Tecnología avanzada', 'Eficiencia energética'],
    },
    relations: [{ targetType: 'vehiculos', targetSlug: 'otro-auto', relation: 'competidor' }],
  }
  const r5 = cleanPlaceholders(withCompetitionFiller)
  if (!r5.removedCompetition || 'competition' in withCompetitionFiller) {
    throw new Error('Self-test falló: `competition` debería eliminarse por completo')
  }
  if (!withCompetitionFiller.relations || withCompetitionFiller.relations.length !== 1) {
    throw new Error('Self-test falló: no debería tocar `relations`, que es el dato real ya consumido por RelationsPanel')
  }

  const withoutCompetition = { title: 'Sin competition' }
  const r6 = cleanPlaceholders(withoutCompetition)
  if (r6.removedCompetition) {
    throw new Error('Self-test falló: no debería reportar remoción de `competition` si nunca existió')
  }

  console.log('OK — self-test de audit-placeholder-data pasó (8 casos).')
}

function main() {
  if (process.argv.includes('--self-test')) {
    runSelfTest()
    return
  }

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'))
  const affectedGlobalPricing = []
  const affectedTopSpeed = []
  const affectedSpecifications = []
  const affectedAudit = []
  const affectedCompetition = []

  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file)
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

    const hasPricePlaceholder = json.globalPricing && isPlaceholderPrice(json.globalPricing)
    const hasSpeedPlaceholder = json.performanceData && isPlaceholderTopSpeed(json.performanceData)
    const hasSpecifications = hasDeadSpecificationsBlock(json)
    const hasAudit = hasDeadAuditBlock(json)
    const hasCompetition = hasDeadCompetitionBlock(json)

    if (hasPricePlaceholder) affectedGlobalPricing.push(file)
    if (hasSpeedPlaceholder) affectedTopSpeed.push(file)
    if (hasSpecifications) affectedSpecifications.push(file)
    if (hasAudit) affectedAudit.push(file)
    if (hasCompetition) affectedCompetition.push(file)

    if (APPLY && (hasPricePlaceholder || hasSpeedPlaceholder || hasSpecifications || hasAudit || hasCompetition)) {
      cleanPlaceholders(json)
      fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf-8')
    }
  }

  const report = {
    totalFiles: files.length,
    globalPricingPlaceholders: affectedGlobalPricing.length,
    topSpeedPlaceholders: affectedTopSpeed.length,
    deadSpecificationsBlocks: affectedSpecifications.length,
    deadAuditBlocks: affectedAudit.length,
    deadCompetitionBlocks: affectedCompetition.length,
    applied: APPLY,
    affectedGlobalPricing,
    affectedTopSpeed,
    affectedSpecifications,
    affectedAudit,
    affectedCompetition,
  }

  const anyFound =
    report.globalPricingPlaceholders > 0 ||
    report.topSpeedPlaceholders > 0 ||
    report.deadSpecificationsBlocks > 0 ||
    report.deadAuditBlocks > 0 ||
    report.deadCompetitionBlocks > 0

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
    console.log(
      `specifications (bloque muerto, duplicado y roto): ${report.deadSpecificationsBlocks} archivo(s)${APPLY ? ' (eliminados)' : ''}`
    )
    console.log(
      `audit (bloque muerto, fuente placeholder + dataQuality fijo): ${report.deadAuditBlocks} archivo(s)${APPLY ? ' (eliminados)' : ''}`
    )
    console.log(
      `competition (relleno genérico, no consumido en UI, ya cubierto por relations[]): ${report.deadCompetitionBlocks} archivo(s)${APPLY ? ' (eliminados)' : ''}`
    )
    if (!APPLY && anyFound) {
      console.log('\nCorré con --apply para limpiar estos valores (ninguno de los cinco campos llega hoy a la UI).')
    }
  }

  if (!APPLY && anyFound) {
    process.exitCode = 1
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export {
  cleanPlaceholders,
  isPlaceholderPrice,
  isPlaceholderTopSpeed,
  hasDeadSpecificationsBlock,
  hasDeadAuditBlock,
  hasDeadCompetitionBlock,
}
