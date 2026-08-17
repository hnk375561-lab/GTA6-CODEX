/**
 * Focal tower builder for the GTA6 Codex WebGL engine.
 * Torre Art Deco de vidrio con anillos neón y baliza — el foco visual del
 * plano cercano (`nearGroup`).
 *
 * Fase 8.13 — geometría (`CylinderGeometry`/`TorusGeometry`/`ConeGeometry`),
 * material (`MeshPhysicalMaterial` con `onBeforeCompile` para el jitter de
 * vértices por `uTime`), luces (`PointLight` de la baliza), colores,
 * posiciones, escalas y cálculos de jitter idénticos a la versión inline
 * anterior de `buildFocalTower()` en `engine.ts`; solo se movieron acá
 * (`buildFocalTowerScene`). Igual que en las Fases 8.1–8.12, el `updater`
 * que devuelve esta función usa la firma común de 11 parámetros de
 * `scene/*.ts` (ver `Updater` en `./sky`), incompatible con `SceneUpdater`
 * de este motor — el wrapper en `engine.ts` (`buildFocalTower()`) se
 * encarga de envolverlo en un closure de 3 parámetros que lee
 * `this.entityPace`/`this.entityUnrest`/`this.entityPresence` en cada
 * frame, igual que el resto de builders migrados.
 *
 * Auditoría previa a esta migración: existía una implementación
 * desconectada equivalente en `scene/tower.ts` (`buildFocalTower`, sin
 * usar en `engine.ts`). Se comparó línea por línea contra el inline real:
 * misma geometría (`CylinderGeometry(tier.radius, tier.radius * 1.08,
 * tier.height, 6)` por tier, `TorusGeometry(tier.radius * 1.12, 0.035, 8,
 * 24)` por anillo, `ConeGeometry(0.32, 2.6, 6)` para la aguja), mismo
 * material de vidrio (`MeshPhysicalMaterial` con los mismos
 * `roughness`/`metalness`/`transmission`/`thickness`/`ior`/`clearcoat`/
 * `clearcoatRoughness`/`envMapIntensity`/`attenuationDistance`) y mismo
 * `onBeforeCompile` (mismo reemplazo de `#include <common>` y
 * `#include <begin_vertex>`, misma fórmula de `n`), mismos `tiers`
 * (radios/alturas/tints), mismos colores de anillo alternados
 * (`0x22d3ee`/`0xff2d78`), misma baliza (`PointLight(0xff2d78, 8, 16, 2)`)
 * y mismo `updater` (mismo `paceInfluence`, mismo jitter de anillos por
 * `entityUnrest`, mismo jitter de intensidad de la baliza) — resultó
 * equivalente en todo lo sustantivo. La única diferencia real era
 * defensiva: `scene/tower.ts` envolvía `entityPace`/`entityUnrest`/
 * `entityPresence` con fallbacks `(entityPace || 1)`/`(entityUnrest || 0)`/
 * `(entityPresence || 0)` que la versión inline en producción no tiene
 * (lee `this.entityPace`/`this.entityUnrest`/`this.entityPresence`
 * directamente, sin fallback, porque esos campos de la clase siempre
 * están inicializados). Siguiendo el mismo criterio que en las Fases
 * 8.6/8.11/8.12 (no reutilizar código paralelo aunque sea equivalente),
 * no se importó desde `scene/tower.ts`: se transcribió mecánicamente a
 * este archivo nuevo, `scene/focal-tower.ts`, sin los fallbacks
 * defensivos (para conservar el comportamiento exacto del inline real),
 * manteniendo el patrón de módulo autocontenido por builder usado en las
 * Fases 8.1–8.12. `scene/tower.ts` fue eliminado en la Fase 8.19 (código
 * muerto, ya migrado y sin conectar).
 */

import * as THREE from 'three'
import type { Updater } from './sky'

export interface FocalTowerBuilderOptions {
  nearGroup: THREE.Group
}

/**
 * Construye la torre focal Art Deco (vidrio + anillos neón + baliza)
 * sobre `nearGroup`. Genera el `THREE.Group` con los tiers de vidrio
 * (`MeshPhysicalMaterial`), los anillos y la baliza (`PointLight`).
 * Devuelve un único `updater: Updater` que anima rotación, jitter de
 * anillos y parpadeo de la baliza según pace/unrest/presence.
 */
export function buildFocalTowerScene(options: FocalTowerBuilderOptions): Updater {
  const { nearGroup } = options

  const group = new THREE.Group()
  const shaderRef = { uTime: { value: 0 } }

  const makeGlassMaterial = (tint: number) => {
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xf5eaff,
      roughness: 0.05,
      metalness: 0,
      transmission: 1,
      thickness: 2.2,
      ior: 1.4,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.6,
      attenuationColor: new THREE.Color(tint),
      attenuationDistance: 3,
    })
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = shaderRef.uTime
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uTime;`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           float n = sin(position.x * 1.4 + uTime * 0.4) * cos(position.y * 0.6 + uTime * 0.3) * sin(position.z * 1.4 + uTime * 0.35);
           transformed += normal * n * 0.045;`
        )
    }
    return material
  }

  const tiers = [
    { radius: 2.5, height: 7, tint: 0xff2d78 },
    { radius: 1.7, height: 3.4, tint: 0x22d3ee },
    { radius: 1.0, height: 2.4, tint: 0xff2d78 },
  ]

  let y = -13
  const trimRingMaterials: THREE.MeshBasicMaterial[] = []
  tiers.forEach((tier, i) => {
    const geometry = new THREE.CylinderGeometry(tier.radius, tier.radius * 1.08, tier.height, 6)
    const material = makeGlassMaterial(tier.tint)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.y = y + tier.height / 2
    group.add(mesh)
    y += tier.height

    const ringColor = i % 2 === 0 ? 0x22d3ee : 0xff2d78
    const ringMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const ring = new THREE.Mesh(new THREE.TorusGeometry(tier.radius * 1.12, 0.035, 8, 24), ringMat)
    ring.rotation.x = Math.PI / 2
    ring.position.y = y
    group.add(ring)
    // Se cachea el material del anillo (no el `Mesh`) porque el updater
    // solo necesita `ring.material` en cada frame — evita re-acceder a
    // esa propiedad y volver a castear a `MeshBasicMaterial` por anillo,
    // por frame.
    trimRingMaterials.push(ringMat)
  })

  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 2.6, 6),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0xff2d78,
      emissiveIntensity: 0.4,
    })
  )
  spire.position.y = y + 1.3
  group.add(spire)

  const beacon = new THREE.PointLight(0xff2d78, 8, 16, 2)
  beacon.position.y = y + 2.6
  group.add(beacon)

  group.position.set(-3.2, 0.4, -1.5)
  nearGroup.add(group)

  // Referencia cacheada al uniform de tiempo (evita re-atravesar
  // `shaderRef.uTime` en cada frame).
  const uTimeUniform = shaderRef.uTime

  const updater: Updater = (
    elapsed,
    delta,
    intro,
    _dayPhase,
    _humidity,
    _fog,
    entityPace,
    entityUnrest,
    _scrollVelocity,
    _pointerIntent,
    entityPresence
  ) => {
    uTimeUniform.value = elapsed
    // Rotación moderada por "pace": la torre nunca se detiene del todo
    // (sigue viva en una ficha de ubicación), pero acompaña con más
    // energía una ficha de vehículo. Se amortigua a la mitad para que no
    // se sienta como un mecanismo, solo como un matiz de ritmo.
    const paceInfluence = 1 + (entityPace - 1) * 0.5
    group.rotation.y += delta * (0.045 + entityPresence * 0.02) * paceInfluence * intro

    // "unrest" (derivado del estado editorial: confirmado/rumor/nuestro)
    // desestabiliza el parpadeo — rumor tiembla con armónicos extra,
    // confirmado queda con un pulso limpio. Determinista, no aleatorio.
    trimRingMaterials.forEach((mat, i) => {
      const jitter = entityUnrest * Math.sin(elapsed * (5.2 + i * 1.3)) * 0.25
      mat.opacity = 0.6 + 0.4 * Math.sin(elapsed * 0.8 + i * 1.7) + jitter
    })
    const beaconJitter = entityUnrest * Math.sin(elapsed * 7.1) * 4
    beacon.intensity = 6 + Math.max(0, Math.sin(elapsed * 1.6)) * 10 + beaconJitter
  }

  return updater
}
