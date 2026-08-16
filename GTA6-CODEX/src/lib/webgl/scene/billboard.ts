/**
 * Image billboard builder for the GTA6 Codex WebGL engine.
 * Creates GTA VI image billboards with VHS distortion and neon glow.
 */

import * as THREE from 'three'
import { BILLBOARD_VERTEX_SHADER, BILLBOARD_FRAGMENT_SHADER } from '../shaders/billboard'
import { IMAGE_BILLBOARDS } from '../config/scene'
import type { Updater } from './sky'

export interface BillboardBuilderOptions {
  midGroup: THREE.Group
  renderer: THREE.WebGLRenderer
  camera: THREE.PerspectiveCamera
}

export function buildImageBillboards(options: BillboardBuilderOptions): { textures: THREE.Texture[]; updater: Updater } {
  const { midGroup, renderer, camera } = options

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

  const updater: Updater = (elapsed, delta, intro, _dayPhase, _humidity, _fog, _entityPace, entityUnrest, scrollVelocity, pointerIntent, _entityPresence) => {
    const interactionDistortion = Math.min(
      (scrollVelocity || 0) * 9 + (pointerIntent || 0) * 0.35 + (entityUnrest || 0) * 0.25,
      1
    )

    billboards.forEach((b, i) => {
      b.angle += delta * b.def.speed
      const x = towerOffset.x + Math.cos(b.angle + b.def.phase) * b.def.radius
      const zOrbit = towerOffset.z + Math.sin(b.angle + b.def.phase) * b.def.radius * 0.6 - 4
      const z = zOrbit + (scrollVelocity || 0) * 4.5 * b.def.parallax
      const y = towerOffset.y + b.def.baseY + Math.sin(elapsed * 0.15 + b.def.phase) * 0.35
      b.mesh.position.set(x, y, z)
      b.mesh.quaternion.copy(camera.quaternion)

      const stagger = intro * 1.25 - i * 0.09
      b.material.uniforms.introFade.value = Math.max(0, Math.min(stagger, 1))
      b.material.uniforms.time.value = elapsed
      b.material.uniforms.uDistortion.value = interactionDistortion
    })
  }

  return { textures, updater }
}
