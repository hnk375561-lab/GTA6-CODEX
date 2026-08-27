/**
 * Neon signs builder for the AutoFicha WebGL engine.
 * Letreros neón premium GTA VI — Vice City moderna con atmósfera
 * cinematográfica, distribuidos en capas de profundidad (hoteles/casinos
 * lejanos, clubes/restaurantes medios, negocios cercanos).
 *
 * Fase 8.12 — signConfigs, colores, posiciones, geometría, materiales,
 * shaders, lógica de `distanceFade` y condición de `quality.tier`
 * idénticos a la versión inline anterior de `buildNeonSigns()` en
 * `engine.ts`; solo se movieron acá (`buildNeonSignsScene`). Existía una
 * implementación desconectada equivalente en `scene/neon.ts` (auditada
 * línea por línea contra el inline real en la Fase 8.11 y de nuevo acá:
 * mismos `signConfigs`, mismas `positions`, mismo cálculo de
 * `distanceFade`, mismos shaders y mismo updater) — aun siendo
 * equivalente, no se reutilizó (no se importó desde `scene/neon.ts`):
 * se transcribió mecánicamente a este archivo nuevo, `scene/neon-signs.ts`,
 * manteniendo el patrón de módulo autocontenido por builder usado en las
 * Fases 8.1–8.11, sin crear una dependencia hacia `scene/neon.ts` (que
 * fue eliminado en la Fase 8.19, código muerto ya migrado y sin
 * conectar). El `updater` que devuelve esta
 * función usa la firma común de 11 parámetros de `scene/*.ts` (ver
 * `Updater` en `./sky`), incompatible con `SceneUpdater` de `engine.ts` —
 * el wrapper en `engine.ts` (`buildNeonSigns()`) se encarga de envolverlo
 * en un closure de 3 parámetros que lee `this.dayPhase`/`this.entityUnrest`
 * en cada frame, igual que el resto de builders migrados.
 *
 * Único ajuste estructural (idéntico al usado en Fase 8.4 para
 * `buildFireflies`): la versión inline cortaba con
 * `if (this.quality.tier === 'low') return` antes de construir nada y sin
 * registrar ningún updater; acá, cuando `quality.tier === 'low'`, se
 * devuelve un `updater` no-op sin construir signos — mismo resultado
 * visual (nada se dibuja, nada se calcula por frame), la única diferencia
 * es que el wrapper de `engine.ts` sí registra ese no-op en
 * `this.updaters`.
 */

import * as THREE from 'three'
import { SHAFT_VERTEX_SHADER, NEON_SIGN_FRAGMENT_SHADER } from '../shaders/neon'
import type { QualityProfile } from '../core/quality'
import type { Updater } from './sky'

export interface NeonSignsBuilderOptions {
  farGroup: THREE.Group
  quality: QualityProfile
}

/**
 * Construye los letreros neón de negocios (hoteles/clubes/restaurantes/
 * casinos) distribuidos en capas de profundidad, sobre `farGroup`, según
 * `quality`. Genera un `THREE.Mesh` por letrero activo (ninguno si
 * `quality.tier === 'low'`). Devuelve un único `updater: Updater` que
 * anima tiempo, intro, día/noche y el fade dinámico por `entityUnrest`.
 */
export function buildNeonSignsScene(options: NeonSignsBuilderOptions): Updater {
  const { farGroup, quality } = options

  if (quality.tier === 'low') return () => {}

  // Paleta "Synth Noir Intensificado": violeta dominante + magenta/cyan
  // eléctrico como acentos. Se saca el naranja/ámbar cálido (no encaja
  // con la identidad noir) y se suma más violeta puro/magenta láser.
  const neonColors = [
    new THREE.Color(0xff0080), // Magenta láser
    new THREE.Color(0x8b00ff), // Violeta puro
    new THREE.Color(0x00e5ff), // Cyan eléctrico
    new THREE.Color(0xb026ff), // Púrpura vívido
    new THREE.Color(0xff2d95), // Rosa neón intenso
    new THREE.Color(0x6b1fb5), // Violeta profundo
    new THREE.Color(0xe000ff), // Fucsia
    new THREE.Color(0x00fff0), // Cyan claro/menta eléctrico
  ]

  // Configuración de tipos de negocio con su estética específica
  interface SignConfig {
    type: number // 0=hotel, 1=club, 2=restaurante, 3=casino, 4=negocio
    colorIndex: number
    width: number
    height: number
    baseIntensity: number
  }

  // Distribución orgánica por capas de profundidad — "Synth Noir
  // Intensificado": más letreros por capa y baseIntensity subida ~15-20%
  // en cada uno respecto a la versión anterior, para que el bloom (ver
  // core/postprocessing.ts) tenga más de dónde sacar glow.
  const signConfigs: SignConfig[] = [
    // CAPA LEJANA (-50 a -60): hoteles grandes, poca visibilidad, atmósfera
    { type: 0, colorIndex: 0, width: 4.2, height: 1.8, baseIntensity: 0.72 }, // Hotel magenta láser
    { type: 0, colorIndex: 3, width: 3.8, height: 1.6, baseIntensity: 0.66 }, // Hotel púrpura
    { type: 3, colorIndex: 4, width: 3.5, height: 1.4, baseIntensity: 0.6 }, // Casino rosa neón
    { type: 0, colorIndex: 5, width: 4.0, height: 1.7, baseIntensity: 0.62 }, // Hotel violeta profundo (nuevo)

    // CAPA MEDIA (-40 a -50): clubes y restaurantes, visibilidad media
    { type: 1, colorIndex: 1, width: 3.2, height: 1.2, baseIntensity: 0.88 }, // Club violeta puro
    { type: 2, colorIndex: 2, width: 2.8, height: 1.0, baseIntensity: 0.82 }, // Restaurante cyan eléctrico
    { type: 1, colorIndex: 5, width: 3.0, height: 1.1, baseIntensity: 0.85 }, // Club violeta profundo
    { type: 2, colorIndex: 6, width: 2.6, height: 0.95, baseIntensity: 0.8 }, // Restaurante fucsia
    { type: 3, colorIndex: 3, width: 3.1, height: 1.15, baseIntensity: 0.84 }, // Casino púrpura (nuevo)

    // CAPA CERCANA (-30 a -40): negocios y locales, mayor detalle
    { type: 4, colorIndex: 7, width: 2.4, height: 0.85, baseIntensity: 1.0 }, // Negocio cyan/menta
    { type: 4, colorIndex: 0, width: 2.2, height: 0.8, baseIntensity: 0.96 }, // Negocio magenta láser
    { type: 1, colorIndex: 3, width: 2.8, height: 1.0, baseIntensity: 1.02 }, // Club púrpura cercano
    { type: 4, colorIndex: 6, width: 2.0, height: 0.75, baseIntensity: 0.94 }, // Negocio fucsia (nuevo)
  ]

  // Ajustar cantidad según calidad
  const signCount = quality.tier === 'high' ? signConfigs.length : Math.floor(signConfigs.length * 0.6)
  const activeConfigs = signConfigs.slice(0, signCount)

  const signs: {
    mat: THREE.ShaderMaterial
    seed: number
    signType: number
    baseIntensity: number
    distanceFade: number
    // Referencias cacheadas a los objetos uniform (evita re-atravesar la
    // cadena `mat.uniforms.<nombre>` en cada frame dentro del updater —
    // mismo criterio aplicado en el resto de `scene/*.ts`).
    timeUniform: { value: number }
    introFadeUniform: { value: number }
    dayPhaseUniform: { value: number }
    distanceFadeUniform: { value: number }
  }[] = []

  // Posiciones pre-diseñadas para composición cinematográfica
  const positions = [
    { x: -18, y: 2, z: -55 }, // Hotel lejano izquierda
    { x: 12, y: 3, z: -58 }, // Hotel lejano derecha
    { x: -8, y: 1, z: -52 }, // Casino centro-lejano
    { x: -22, y: -1, z: -45 }, // Club medio-izquierda
    { x: 15, y: 0, z: -47 }, // Restaurante medio-derecha
    { x: 0, y: -2, z: -44 }, // Club centro-medio
    { x: 18, y: -3, z: -42 }, // Restaurante medio-derecha bajo
    { x: -12, y: -4, z: -38 }, // Negocio cercano izquierda
    { x: 8, y: -5, z: -36 }, // Negocio cercano derecha
    { x: -3, y: -3, z: -35 }, // Club cercano centro
  ]

  activeConfigs.forEach((config, i) => {
    const seed = i * 3.14159 + 0.618
    const pos = positions[i] || { x: (i - 5) * 8, y: -2 + (i % 3) * 2, z: -40 - (i % 2) * 5 }

    // Calcular fade por distancia
    const distance = Math.abs(pos.z)
    const distanceFade = Math.max(0.3, 1.0 - (distance - 35) / 30) * config.baseIntensity

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        signColor: { value: neonColors[config.colorIndex] },
        introFade: { value: 0 },
        flickerSeed: { value: seed },
        signType: { value: config.type },
        dayPhase: { value: 0.5 },
        distanceFade: { value: distanceFade },
      },
      vertexShader: SHAFT_VERTEX_SHADER,
      fragmentShader: NEON_SIGN_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })

    // Variación sutil en geometría según tipo
    let geometry: THREE.PlaneGeometry
    if (config.type === 0) {
      // Hoteles: más grandes y prominentes
      geometry = new THREE.PlaneGeometry(config.width, config.height, 2, 1)
    } else if (config.type === 1) {
      // Clubes: más dinámicos
      geometry = new THREE.PlaneGeometry(config.width, config.height, 3, 1)
    } else {
      // Restaurantes, casinos, negocios: estándar
      geometry = new THREE.PlaneGeometry(config.width, config.height, 1, 1)
    }

    const mesh = new THREE.Mesh(geometry, mat)
    mesh.position.set(pos.x, pos.y, pos.z)

    // Rotación sutil para variedad visual (billboarding parcial)
    mesh.rotation.y = (Math.random() - 0.5) * 0.15

    farGroup.add(mesh)
    signs.push({
      mat,
      seed,
      signType: config.type,
      baseIntensity: config.baseIntensity,
      distanceFade,
      timeUniform: mat.uniforms.time,
      introFadeUniform: mat.uniforms.introFade,
      dayPhaseUniform: mat.uniforms.dayPhase,
      distanceFadeUniform: mat.uniforms.distanceFade,
    })
  })

  const updater: Updater = (elapsed, _delta, intro, dayPhase, _humidity, _fog, _entityPace, entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
    // `unrestMod` no depende de cada letrero individual: se calcula una
    // sola vez por frame en vez de una vez por letrero dentro del
    // `forEach` de abajo.
    const unrestMod = 1.0 + entityUnrest * 0.15

    signs.forEach((s) => {
      s.timeUniform.value = elapsed
      s.introFadeUniform.value = intro
      s.dayPhaseUniform.value = dayPhase

      // Variación dinámica de intensidad por "estado" del neón
      const dynamicFade = s.distanceFade * unrestMod
      s.distanceFadeUniform.value = dynamicFade
    })
  }

  return updater
}
