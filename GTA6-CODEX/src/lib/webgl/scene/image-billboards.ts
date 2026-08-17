/**
 * Image billboard builder for the GTA6 Codex WebGL engine.
 * Letreros con las imágenes reales de GTA VI orbitando la torre focal —
 * ver `IMAGE_BILLBOARDS` en `../config/scene`.
 *
 * Fase 8.14 — `IMAGE_BILLBOARDS`, geometrías (`PlaneGeometry(def.width,
 * def.height, 12, 8)`), texturas (`TextureLoader`, `colorSpace`,
 * `anisotropy`, `wrapS`/`wrapT`), materiales (`ShaderMaterial` con
 * `BILLBOARD_VERTEX_SHADER`/`BILLBOARD_FRAGMENT_SHADER`), posiciones
 * orbitales, velocidad, parallax, `reducedMotion`, `scrollProgress`,
 * `pointerIntent`, `entityUnrest` y el quaternion de cámara idénticos a
 * la versión inline anterior de `buildImageBillboards()` en `engine.ts`;
 * solo se movieron acá (`buildImageBillboardsScene`).
 *
 * A diferencia de `scene/sky.ts`/`scene/water.ts`/etc., esta versión
 * inline no leía sus valores dinámicos (`reducedMotion`,
 * `scrollProgress`, la cámara) a través de la firma común de 11
 * parámetros de `scene/*.ts` (`Updater`, definido en `./sky`): leía
 * `this.reducedMotion`, `this.scrollProgress` y `this.camera` directo
 * del motor, ninguno de los cuales forma parte de esa firma común (que
 * trae `scrollVelocity`/`pointerIntent`/`entityUnrest`, pero no
 * `scrollProgress`/`reducedMotion`/`camera`). Igual que `scene/road.ts`
 * en la Fase 8.8, este builder define su propio tipo de `Updater`
 * (`ImageBillboardsUpdater`) en vez de reutilizar `Updater` de `./sky`
 * tal cual — reutilizarlo sin esos valores hubiera forzado a este
 * builder a perder el parallax real por `scrollProgress` (distinto de
 * `scrollVelocity`) o el amortiguado por `reducedMotion`, cambiando el
 * comportamiento frente a la versión inline. `camera` se pasa como
 * parámetro explícito del updater (no capturado por closure en el
 * builder) por el mismo motivo que `fogColor` viaja en la firma común
 * pese a ser una referencia estable: documenta explícitamente la
 * dependencia y sigue el patrón ya establecido de pasar el estado
 * dinámico del motor en cada frame desde el wrapper de `engine.ts`, en
 * vez de cerrar sobre `this` dentro del builder.
 *
 * Auditoría previa a esta migración: existía una implementación
 * desconectada en `scene/billboard.ts` (`buildImageBillboards`, sin usar
 * en `engine.ts`). Se comparó línea por línea contra el inline real y
 * NO resultó equivalente — dos diferencias de comportamiento reales,
 * no solo estructurales:
 *
 *   1. Amortiguado por `reducedMotion`: el inline hace
 *      `b.angle += delta * b.def.speed * (this.reducedMotion ? 0.15 : 1)`;
 *      `scene/billboard.ts` hacía `b.angle += delta * b.def.speed`, sin
 *      ningún factor de `reducedMotion` — la preferencia de movimiento
 *      reducido del usuario quedaba completamente ignorada por los
 *      billboards en esa versión paralela.
 *   2. Parallax de scroll: el inline usa
 *      `z = zOrbit + this.scrollProgress * 4.5 * b.def.parallax` (la
 *      posición acumulada de scroll, 0..1); `scene/billboard.ts` usaba
 *      `z = zOrbit + (scrollVelocity || 0) * 4.5 * b.def.parallax` — una
 *      magnitud completamente distinta (velocidad instantánea de
 *      scroll, no posición), lo que producía un parallax que se
 *      revertía a cero en cuanto el usuario dejaba de scrollear, en vez
 *      de mantener la profundidad acumulada como en producción.
 *
 * Por esas dos diferencias reales de comportamiento (no solo
 * fallbacks defensivos como en Fases 8.6/8.11/8.12/8.13), siguiendo la
 * instrucción de esta fase, **no se reutilizó** `scene/billboard.ts`: se
 * transcribió mecánicamente el inline real a este archivo nuevo,
 * `scene/image-billboards.ts`. `scene/billboard.ts` permanece intacto y
 * sigue sin conectar.
 */

import * as THREE from 'three'
import { BILLBOARD_VERTEX_SHADER, BILLBOARD_FRAGMENT_SHADER } from '../shaders/billboard'
import { IMAGE_BILLBOARDS } from '../config/scene'

export type ImageBillboardsUpdater = (
  elapsed: number,
  delta: number,
  intro: number,
  camera: THREE.PerspectiveCamera,
  scrollProgress: number,
  scrollVelocity: number,
  pointerIntent: number,
  entityUnrest: number,
  reducedMotion: boolean
) => void

export interface ImageBillboardsBuilderOptions {
  midGroup: THREE.Group
  renderer: THREE.WebGLRenderer
  camera: THREE.PerspectiveCamera
}

export interface ImageBillboardsBuildResult {
  /**
   * Texturas cargadas, expuestas para que el llamador las agregue a
   * `this.imageTextures` — estado propio del motor usado por
   * `disposeSceneResources()` en `dispose()`, no del `Updater`.
   */
  textures: THREE.Texture[]
  updater: ImageBillboardsUpdater
}

export function buildImageBillboardsScene(options: ImageBillboardsBuilderOptions): ImageBillboardsBuildResult {
  const { midGroup, renderer } = options

  const loader = new THREE.TextureLoader()
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy()
  const towerOffset = new THREE.Vector3(-3.2, 0.8, -1.5)

  const billboards: {
    mesh: THREE.Mesh
    material: THREE.ShaderMaterial
    texture: THREE.Texture
    angle: number
    def: (typeof IMAGE_BILLBOARDS)[number]
  }[] = []

  const textures: THREE.Texture[] = []

  IMAGE_BILLBOARDS.forEach((def, i) => {
    const texture = loader.load(
      def.path,
      undefined,
      undefined,
      // Una imagen faltante o movida queda visible en consola en vez de
      // convertirse en un letrero invisible sin explicación.
      (err) => {
        console.warn(`[GTA6CodexWebGLEngine] No se pudo cargar el billboard "${def.key}" (${def.path}):`, err)
      }
    )
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = maxAnisotropy
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping

    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        time: { value: 0 },
        introFade: { value: 0 },
        uColor: { value: new THREE.Color(def.color) },
        uDistortion: { value: 0 },
      },
      vertexShader: BILLBOARD_VERTEX_SHADER,
      fragmentShader: BILLBOARD_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    const geometry = new THREE.PlaneGeometry(def.width, def.height, 12, 8)
    const mesh = new THREE.Mesh(geometry, material)
    midGroup.add(mesh)
    textures.push(texture)

    billboards.push({ mesh, material, texture, angle: (i / IMAGE_BILLBOARDS.length) * Math.PI * 2, def })
  })

  const updater: ImageBillboardsUpdater = (
    elapsed,
    delta,
    intro,
    camera,
    scrollProgress,
    scrollVelocity,
    pointerIntent,
    entityUnrest,
    reducedMotion
  ) => {
    // "uDistortion" es la traducción directa de interacción real (scroll
    // + cursor + inquietud editorial) a la señal de la pantalla — el
    // mismo lenguaje que ya usa "chromaKick" en el grade pass, pero
    // vivido dentro de la geometría de cada letrero.
    const interactionDistortion = Math.min(scrollVelocity * 9 + pointerIntent * 0.35 + entityUnrest * 0.25, 1)

    billboards.forEach((b, i) => {
      b.angle += delta * b.def.speed * (reducedMotion ? 0.15 : 1)
      const x = towerOffset.x + Math.cos(b.angle + b.def.phase) * b.def.radius
      const zOrbit = towerOffset.z + Math.sin(b.angle + b.def.phase) * b.def.radius * 0.6 - 4
      // Parallax multicapa real: el dolly de scroll acerca cada letrero
      // según su propio factor — la portada de GTA VI (parallax=1) es la
      // que más "sale al encuentro" del usuario al scrollear.
      const z = zOrbit + scrollProgress * 4.5 * b.def.parallax
      const y = towerOffset.y + b.def.baseY + Math.sin(elapsed * 0.15 + b.def.phase) * 0.35
      b.mesh.position.set(x, y, z)
      // Billboard real: el letrero siempre encara la cámara, como
      // corresponde a una imagen legible — no tumbla como un sólido
      // abstracto, es contenido.
      b.mesh.quaternion.copy(camera.quaternion)

      const stagger = intro * 1.25 - i * 0.09
      b.material.uniforms.introFade.value = Math.max(0, Math.min(stagger, 1))
      b.material.uniforms.time.value = elapsed
      b.material.uniforms.uDistortion.value = interactionDistortion
    })
  }

  return { textures, updater }
}
