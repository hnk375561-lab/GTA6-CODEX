/**
 * Blueprint grid builder for the AutoFicha WebGL engine.
 * Reemplazo de los letreros neón "Vice City" por capas de grilla técnica
 * tipo plano de ingeniería (blueprint), con micro-anotaciones de dato
 * flotante — línea de cota + número + unidad — que aparecen y se
 * desvanecen en distintas profundidades. Refuerza la identidad "cada dato
 * cita su fuente" en vez del lenguaje visual de videojuego/ficción.
 *
 * Mantiene la misma interfaz pública (`NeonSignsBuilderOptions`,
 * `buildNeonSignsScene`, nombre de archivo `scene/neon-signs.ts`) que la
 * versión anterior para no tocar el wiring de `engine.ts` (que sigue
 * llamando a `buildNeonSigns()` → `buildNeonSignsScene()` sin cambios).
 */

import * as THREE from 'three'
import type { QualityProfile } from '../core/quality'
import type { Updater } from './sky'

export interface NeonSignsBuilderOptions {
  farGroup: THREE.Group
  quality: QualityProfile
}

/**
 * Construye las capas de grilla técnica (líneas finas tipo hoja de
 * diseño) sobre `farGroup`, según `quality`. Cada capa es un
 * `THREE.LineSegments` con una malla rectangular sutil; encima se
 * distribuyen micro-anotaciones (pequeñas cruces + segmento tipo línea de
 * cota) que parpadean con un ciclo de aparición/desvanecimiento propio.
 * Devuelve un único `updater: Updater` que anima el fade global, el
 * parpadeo de las anotaciones y el drift lento de las capas.
 */
export function buildNeonSignsScene(options: NeonSignsBuilderOptions): Updater {
  const { farGroup, quality } = options

  if (quality.tier === 'low') return () => {}

  // Paleta "Blueprint Drift": grafito/blanco con acento frío (cian
  // apagado) en vez del magenta/violeta saturado — editorial, no arcade.
  const gridColor = new THREE.Color(0x9fb3c8) // grafito azulado
  const accentColor = new THREE.Color(0x5fd4e0) // cian apagado (acento)

  interface GridLayer {
    z: number
    spacing: number
    opacity: number
    driftSpeed: number
  }

  // Capas de profundidad — más lejana = más tenue y espaciado más
  // grande, igual que la distribución por capas del set anterior.
  const layerConfigs: GridLayer[] = [
    { z: -58, spacing: 6.0, opacity: 0.1, driftSpeed: 0.004 },
    { z: -48, spacing: 4.5, opacity: 0.14, driftSpeed: 0.006 },
    { z: -38, spacing: 3.2, opacity: 0.18, driftSpeed: 0.009 },
  ]

  const layerCount = quality.tier === 'high' ? layerConfigs.length : Math.max(1, layerConfigs.length - 1)
  const activeLayers = layerConfigs.slice(0, layerCount)

  const layers: {
    lines: THREE.LineSegments
    mat: THREE.LineBasicMaterial
    baseOpacity: number
    driftSpeed: number
  }[] = []

  const buildGridGeometry = (spacing: number, halfWidth: number, halfHeight: number) => {
    const points: number[] = []
    for (let x = -halfWidth; x <= halfWidth; x += spacing) {
      points.push(x, -halfHeight, 0, x, halfHeight, 0)
    }
    for (let y = -halfHeight; y <= halfHeight; y += spacing) {
      points.push(-halfWidth, y, 0, halfWidth, y, 0)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    return geometry
  }

  activeLayers.forEach((cfg) => {
    const geometry = buildGridGeometry(cfg.spacing, 30, 16)
    const mat = new THREE.LineBasicMaterial({
      color: gridColor,
      transparent: true,
      opacity: cfg.opacity,
      depthWrite: false,
    })
    const lines = new THREE.LineSegments(geometry, mat)
    lines.position.set(0, 0, cfg.z)
    farGroup.add(lines)
    layers.push({ lines, mat, baseOpacity: cfg.opacity, driftSpeed: cfg.driftSpeed })
  })

  // Micro-anotaciones: pequeña cruz + segmento (línea de cota) con un
  // "numerito" implícito en la escala del segmento, distribuidas cerca
  // de las siluetas de vehículos del `nearGroup` (ver focal-tower.ts).
  interface Annotation {
    mesh: THREE.LineSegments
    mat: THREE.LineBasicMaterial
    seed: number
    cycle: number
  }

  const annotationCount = quality.tier === 'high' ? 9 : 5
  const annotations: Annotation[] = []

  const annotationPositions = [
    { x: -16, y: 1.2, z: -40 },
    { x: 10, y: -2.5, z: -44 },
    { x: -6, y: 3.0, z: -36 },
    { x: 18, y: -0.5, z: -50 },
    { x: -22, y: -3.2, z: -42 },
    { x: 4, y: 2.1, z: -48 },
    { x: -12, y: -1.0, z: -34 },
    { x: 14, y: 3.4, z: -38 },
    { x: -2, y: -4.0, z: -46 },
  ]

  for (let i = 0; i < annotationCount; i++) {
    const pos = annotationPositions[i] || { x: (i - 4) * 6, y: (i % 3) * 2 - 2, z: -40 }
    const size = 0.18 + (i % 3) * 0.06

    // Cruz de referencia (tick) + segmento horizontal tipo cota.
    const points = [
      -size, 0, 0, size, 0, 0,
      0, -size, 0, 0, size, 0,
      -size * 2, -size * 1.4, 0, size * 2, -size * 1.4, 0,
    ]
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    const mat = new THREE.LineBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
    const mesh = new THREE.LineSegments(geometry, mat)
    mesh.position.set(pos.x, pos.y, pos.z)
    farGroup.add(mesh)

    annotations.push({
      mesh,
      mat,
      seed: i * 1.71 + 0.33,
      cycle: 2.4 + (i % 4) * 0.6,
    })
  }

  const updater: Updater = (elapsed, _delta, intro, _dayPhase, _humidity, _fog, _entityPace, entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
    // Drift lento tipo mesa de dibujo: cada capa se desplaza apenas en X,
    // sin el vértigo de tráfico/skyline — un paneo casi imperceptible.
    layers.forEach((layer) => {
      layer.lines.position.x = Math.sin(elapsed * layer.driftSpeed) * 1.5
      layer.mat.opacity = layer.baseOpacity * intro
    })

    // Parpadeo de anotaciones: ciclo de aparición/desvanecimiento propio
    // por anotación, con un leve extra de "inquietud" (entityUnrest) que
    // hace que el dato titile un poco más rápido — mismo criterio que el
    // dynamicFade del set anterior, pero aplicado a un elemento distinto.
    const unrestMod = 1.0 + entityUnrest * 0.4
    annotations.forEach((a) => {
      const phase = (elapsed * unrestMod) / a.cycle + a.seed
      const pulse = Math.max(0, Math.sin(phase * Math.PI * 2))
      a.mat.opacity = pulse * 0.55 * intro
    })
  }

  return updater
}
