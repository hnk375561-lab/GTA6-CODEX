#!/usr/bin/env node
/**
 * scripts/fix-powertrain-integrity.mjs
 * ============================================================
 * Auditoría de integridad de datos post "carga masiva" del pivote
 * GTA6 Zona -> AutoFicha (agosto 2026).
 *
 * Problema real detectado: la carga masiva inicial completó muchos
 * campos de motor/transmisión/tanque con valores "de relleno" tipo
 * ICE (motor a combustión) sin distinguir el tipo real de powertrain
 * del vehículo. Resultado: vehículos 100% eléctricos (Tesla, BYD,
 * Hyundai Ioniq 5, etc.) mostraban `tipoMotor: "Gasolina/Diésel"`,
 * `capacidadTanque: "60-80 litros"`, especificaciones de inyección/
 * árbol de levas, caja "8/9 velocidades con convertidor de par", etc.
 * También había una cadena corrupta (`power: "halted 340 hp"`) y
 * transmisiones de moto/scooter sin diferenciar manual vs automática.
 *
 * Este script NO inventa specs reales nuevas (no hay research de
 * fuente primaria en esta ronda) — solo corrige incoherencias de tipo
 * de vehículo: reemplaza/anula campos que son estructuralmente
 * incorrectos para el powertrain real, dejando todo lo demás intacto,
 * y deja una nota en `evidence.limitations` explicando qué se tocó y
 * qué sigue pendiente de verificar con fuente primaria.
 *
 * USO:
 *   node scripts/fix-powertrain-integrity.mjs           # aplica cambios
 *   node scripts/fix-powertrain-integrity.mjs --dry-run # solo reporta
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content', 'vehiculos')
const DRY_RUN = process.argv.includes('--dry-run')

const FIX_NOTE_EV =
  'Auditoría de integridad de datos (ago 2026): se limpiaron/corrigieron campos de motor de combustión (tipoMotor, capacidadTanque, especificacionesMotor, parte de especificacionesTransmision) que habían quedado con valores de relleno tipo ICE de la carga masiva inicial y no aplican a este vehículo eléctrico. Pendiente completar con datos reales de batería, autonomía y tiempos de carga verificados con fuente primaria.'

const FIX_NOTE_HYBRID =
  'Auditoría de integridad de datos (ago 2026): tipoMotor corregido de "Gasolina/Diésel" (valor de relleno) a "Gasolina + sistema híbrido", ya que este vehículo no tiene variante diésel. Arquitectura específica del híbrido (serie/paralelo, mild/full/enchufable) pendiente de verificar con fuente primaria.'

const FIX_NOTE_MOTO =
  'Auditoría de integridad de datos (ago 2026): campo transmision corregido del valor de relleno "Manual o Automática" (heredado de plantilla genérica) al tipo real por defecto de esta categoría; variante puntual pendiente de confirmar con ficha oficial.'

function loadJson(file) {
  const raw = fs.readFileSync(file, 'utf8')
  return { data: JSON.parse(raw), raw }
}

function addLimitation(entity, note) {
  entity.evidence = entity.evidence || {}
  entity.evidence.limitations = entity.evidence.limitations || []
  if (!entity.evidence.limitations.includes(note)) {
    entity.evidence.limitations.push(note)
  }
}

function isElectric(entity) {
  const tags = entity.tags || []
  if (!tags.includes('electrico')) return false
  if (tags.includes('hibrido') || tags.includes('hibrido-enchufable')) return false
  return true
}

function isHybrid(entity) {
  const tags = entity.tags || []
  return tags.includes('hibrido') || tags.includes('hibrido-enchufable')
}

function isScooter(entity) {
  const tags = entity.tags || []
  const cls = (entity.class || '').toLowerCase()
  return tags.includes('scooter') || cls.includes('scooter')
}

function isMoto(entity) {
  const tags = entity.tags || []
  return tags.includes('moto') || isScooter(entity)
}

function fixPowerString(power) {
  if (typeof power !== 'string') return power
  // corrige artefactos tipo "halted 340 hp" -> "340 hp"
  const m = power.match(/^[A-Za-z]+\s+(?=[\d(])/)
  if (m) return power.slice(m[0].length)
  return power
}

function fixEntity(entity) {
  const changes = []

  // 1) Cadenas corruptas en `power` (aplica a cualquier vehículo)
  if (typeof entity.power === 'string') {
    const fixed = fixPowerString(entity.power)
    if (fixed !== entity.power) {
      changes.push(`power: "${entity.power}" -> "${fixed}"`)
      entity.power = fixed
    }
  }

  // 2) Vehículos 100% eléctricos con campos ICE de relleno
  if (isElectric(entity)) {
    if (entity.tipoMotor && entity.tipoMotor !== 'Eléctrico') {
      changes.push(`tipoMotor: "${entity.tipoMotor}" -> "Eléctrico"`)
      entity.tipoMotor = 'Eléctrico'
    }
    if (entity.capacidadTanque) {
      changes.push(`capacidadTanque: "${entity.capacidadTanque}" -> null`)
      entity.capacidadTanque = null
    }
    if (entity.consumoEtiqueta) {
      changes.push(`consumoEtiqueta: "${entity.consumoEtiqueta}" -> null (etiqueta de combustible no aplica a EV)`)
      entity.consumoEtiqueta = null
    }
    if (entity.especificacionesMotor) {
      changes.push('especificacionesMotor: objeto ICE (inyección/árbol de levas/etc.) -> null')
      entity.especificacionesMotor = null
    }
    if (entity.especificacionesTransmision) {
      const t = entity.especificacionesTransmision
      if (t.tipo_automatico) {
        changes.push(`especificacionesTransmision.tipo_automatico: "${t.tipo_automatico}" -> "No aplica (sin convertidor de par)"`)
        t.tipo_automatico = 'No aplica (sin convertidor de par)'
      }
      if (t.velocidades) {
        changes.push(`especificacionesTransmision.velocidades: "${t.velocidades}" -> "1 relación (reductora fija)"`)
        t.velocidades = '1 relación (reductora fija)'
      }
      if (t.control_cambios) {
        changes.push(`especificacionesTransmision.control_cambios: "${t.control_cambios}" -> "Directo (relación única)"`)
        t.control_cambios = 'Directo (relación única)'
      }
    }
    if (entity.transmision && entity.transmision !== 'Automática de relación única (motor eléctrico)') {
      changes.push(`transmision: "${entity.transmision}" -> "Automática de relación única (motor eléctrico)"`)
      entity.transmision = 'Automática de relación única (motor eléctrico)'
    }
    if (entity.mantenimientoPrograma?.aceite && entity.mantenimientoPrograma.aceite !== 'No aplica (motor eléctrico)') {
      changes.push(`mantenimientoPrograma.aceite: "${entity.mantenimientoPrograma.aceite}" -> "No aplica (motor eléctrico)"`)
      entity.mantenimientoPrograma.aceite = 'No aplica (motor eléctrico)'
    }
    if (entity.capacidadesAdicionales?.capacidad_aceite) {
      changes.push(`capacidadesAdicionales.capacidad_aceite: "${entity.capacidadesAdicionales.capacidad_aceite}" -> null`)
      entity.capacidadesAdicionales.capacidad_aceite = null
    }
    if (changes.length) addLimitation(entity, FIX_NOTE_EV)
  }

  // 3) Híbridos con tipoMotor "Gasolina/Diésel" (relleno, ninguno tiene diésel real)
  if (isHybrid(entity) && entity.tipoMotor === 'Gasolina/Diésel') {
    const plugin = (entity.tags || []).includes('hibrido-enchufable')
    const next = plugin ? 'Gasolina + sistema híbrido enchufable' : 'Gasolina + sistema híbrido'
    changes.push(`tipoMotor: "${entity.tipoMotor}" -> "${next}"`)
    entity.tipoMotor = next
    addLimitation(entity, FIX_NOTE_HYBRID)
  }

  // 4) Motos/scooters con transmisión de relleno "Manual o Automática"
  if (isMoto(entity) && entity.transmision === 'Manual o Automática') {
    const next = isScooter(entity) ? 'Automática (CVT)' : 'Manual secuencial'
    changes.push(`transmision: "Manual o Automática" -> "${next}"`)
    entity.transmision = next
    addLimitation(entity, FIX_NOTE_MOTO)
  }

  entity.updatedAt = new Date().toISOString()
  return changes
}

function main() {
  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()

  let touched = 0
  let totalChanges = 0
  const report = []

  for (const file of files) {
    const full = path.join(CONTENT_DIR, file)
    const { data } = loadJson(full)
    const changes = fixEntity(data)
    if (changes.length) {
      touched++
      totalChanges += changes.length
      report.push({ file, changes })
      if (!DRY_RUN) {
        fs.writeFileSync(full, JSON.stringify(data, null, 4) + '\n', 'utf8')
      }
    }
  }

  console.log(`Archivos analizados: ${files.length}`)
  console.log(`Archivos modificados: ${touched}`)
  console.log(`Cambios totales: ${totalChanges}`)
  console.log(DRY_RUN ? '\n(--dry-run: no se escribió nada a disco)\n' : '\n')

  for (const r of report) {
    console.log(`\n# ${r.file}`)
    for (const c of r.changes) console.log(`  - ${c}`)
  }
}

main()
