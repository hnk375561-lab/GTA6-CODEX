#!/usr/bin/env node
/**
 * scripts/populate-vehicle-relations.mjs
 * ============================================================
 * Fase C del roadmap de la auditoría "AutoFicha: aprovechamiento de
 * datos": el sistema de relaciones (src/lib/relations.ts, bidireccional,
 * con detección de ciclos, agrupamiento por tipo, RelationsPanel.tsx) ya
 * está construido y probado, pero 0/250 vehículos tienen `relations[]`
 * poblado — la sección "Relacionado" de la ficha nunca aparece hoy.
 *
 * Este script puebla `relations[]` en cada ficha de vehículo con dos
 * heurísticas basadas 100% en datos que ya existen y están bien poblados
 * (250/250) en el contenido real, sin inventar ningún vínculo editorial:
 *
 *   - "mismo_fabricante" (hermanos): mismo `manufacturer`, hasta 3,
 *     priorizando los que además comparten `class` exacta.
 *   - "competidor": mismo `class` (match exacto de string — la
 *     normalización de `class`/`category`/`tipo` es la Fase E, fuera de
 *     alcance acá), distinto `manufacturer`, hasta 4.
 *
 * Es idempotente: recalcula `relations[]` desde cero en cada corrida (no
 * acumula duplicados si se corre más de una vez) y solo toca el campo
 * `relations`, preservando el resto de cada JSON tal cual.
 *
 * USO:
 *   node scripts/populate-vehicle-relations.mjs           # dry-run (reporta)
 *   node scripts/populate-vehicle-relations.mjs --apply    # escribe a disco
 * ============================================================
 */
import fs from 'node:fs'
import path from 'node:path'

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content', 'vehiculos')
const MAX_SIBLINGS = 3
const MAX_COMPETITORS = 4

function loadVehicles() {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'))
  return files.map((file) => {
    const filePath = path.join(CONTENT_DIR, file)
    const raw = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '')
    return { file, filePath, data: JSON.parse(raw) }
  })
}

function buildRelationsFor(vehicle, all) {
  const others = all.filter((v) => v.data.slug !== vehicle.data.slug)
  const manufacturer = (vehicle.data.manufacturer || '').trim()
  const klass = (vehicle.data.class || '').trim()

  const siblings = others
    .filter((v) => (v.data.manufacturer || '').trim() === manufacturer)
    // Prioriza hermanos que además comparten clase exacta.
    .sort((a, b) => {
      const aMatch = (a.data.class || '').trim() === klass ? 0 : 1
      const bMatch = (b.data.class || '').trim() === klass ? 0 : 1
      return aMatch - bMatch
    })
    .slice(0, MAX_SIBLINGS)

  const competitors = others
    .filter((v) => (v.data.class || '').trim() === klass && (v.data.manufacturer || '').trim() !== manufacturer)
    .slice(0, MAX_COMPETITORS)

  const relations = []
  for (const s of siblings) {
    relations.push({ targetType: 'vehiculos', targetSlug: s.data.slug, relation: 'mismo_fabricante' })
  }
  for (const c of competitors) {
    relations.push({ targetType: 'vehiculos', targetSlug: c.data.slug, relation: 'competidor' })
  }
  return relations
}

/** Inserta la clave `relations` en la posición esperada por
 *  BaseEntitySchema (justo después de `tags`, o de `status` si no hay
 *  `tags`), para que el JSON quede legible y en el mismo orden que usa
 *  el contrato — en vez de simplemente aparecer al final del archivo. */
function withRelationsInserted(data, relations) {
  const { relations: _old, ...rest } = data
  const entries = Object.entries(rest)
  const anchorKey = 'tags' in rest ? 'tags' : 'status'
  const anchorIndex = entries.findIndex(([k]) => k === anchorKey)
  const insertAt = anchorIndex === -1 ? entries.length : anchorIndex + 1

  const result = {}
  entries.forEach(([k, v], i) => {
    if (i === insertAt) result.relations = relations
    result[k] = v
  })
  if (insertAt >= entries.length) result.relations = relations
  return result
}

function main() {
  const apply = process.argv.includes('--apply')
  const vehicles = loadVehicles()

  let touched = 0
  let totalRelations = 0
  let withZero = 0

  for (const vehicle of vehicles) {
    const relations = buildRelationsFor(vehicle, vehicles)
    if (relations.length === 0) {
      withZero += 1
      continue
    }
    touched += 1
    totalRelations += relations.length

    if (apply) {
      const updated = withRelationsInserted(vehicle.data, relations)
      fs.writeFileSync(vehicle.filePath, JSON.stringify(updated, null, 2) + '\n', 'utf-8')
    }
  }

  console.log(`${apply ? 'ESCRITO' : 'DRY-RUN'}: ${touched}/${vehicles.length} vehículos con relations[] poblado`)
  console.log(`Total de relaciones generadas: ${totalRelations} (promedio ${(totalRelations / touched).toFixed(1)} por vehículo)`)
  if (withZero > 0) {
    console.log(`${withZero} vehículo(s) sin ningún sibling/competidor detectado (manufacturer y/o class únicos en el dataset)`)
  }
}

main()
