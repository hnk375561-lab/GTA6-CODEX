import * as THREE from 'three'

/**
 * GTA6CodexWebGLEngine
 * ---------------------------------------------------------------------------
 * Capa gráfica WebGL de fondo para todo el sitio: campo de partículas +
 * cuerpos flotantes con iluminación, con parallax de cursor y respuesta al
 * scroll. Pensada como base extensible:
 *
 *  - `buildParticleField()` y `buildFloatingBodies()` son "constructores de
 *    escena" independientes: se pueden reemplazar o añadir nuevos (shaders,
 *    distorsión, post-procesado) sin tocar el ciclo de vida del motor.
 *  - `update()` centraliza toda la animación por frame; nuevas escenas solo
 *    necesitan registrar su propia función de update en `this.updaters`.
 *  - El renderer, la cámara y el reloj son compartidos, listos para montar
 *    un `EffectComposer` (post-procesado/shaders) el día que se necesite.
 */

type Updater = (elapsed: number, delta: number) => void

export class GTA6CodexWebGLEngine {
  private canvas: HTMLCanvasElement
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private clock: THREE.Clock
  private group: THREE.Group

  private pointer = { x: 0, y: 0 }
  private pointerTarget = { x: 0, y: 0 }
  private scrollProgress = 0
  private scrollTarget = 0

  private updaters: Updater[] = []
  private rafId: number | null = null
  private disposed = false
  private reducedMotion: boolean
  private paused = false

  constructor(canvas: HTMLCanvasElement, opts: { reducedMotion: boolean }) {
    this.canvas = canvas
    this.reducedMotion = opts.reducedMotion

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.FogExp2(0x0f0f0f, 0.035)

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    this.camera.position.set(0, 0, 26)

    this.clock = new THREE.Clock()
    this.group = new THREE.Group()
    this.scene.add(this.group)

    this.setupLights()
    this.buildParticleField()
    this.buildFloatingBodies()
    this.handleResize()

    window.addEventListener('resize', this.handleResize)
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true })
    window.addEventListener('scroll', this.handleScroll, { passive: true })
    document.addEventListener('visibilitychange', this.handleVisibility)
  }

  // ---------------------------------------------------------------------
  // Construcción de escena
  // ---------------------------------------------------------------------

  private setupLights() {
    const ambient = new THREE.AmbientLight(0x404040, 1.2)
    this.scene.add(ambient)

    // Luz clave — tono naranja GTA, se mueve suavemente en el update loop
    const keyLight = new THREE.PointLight(0xff6600, 45, 60, 2)
    keyLight.position.set(10, 6, 14)
    keyLight.name = 'keyLight'
    this.scene.add(keyLight)

    // Luz de relleno — tono verde GTA
    const fillLight = new THREE.PointLight(0x22c55e, 30, 60, 2)
    fillLight.position.set(-12, -4, 8)
    fillLight.name = 'fillLight'
    this.scene.add(fillLight)

    this.updaters.push((elapsed) => {
      keyLight.position.x = 10 + Math.sin(elapsed * 0.15) * 6
      keyLight.position.y = 6 + Math.cos(elapsed * 0.12) * 4
      fillLight.position.x = -12 + Math.cos(elapsed * 0.1) * 5
      fillLight.position.y = -4 + Math.sin(elapsed * 0.18) * 3
    })
  }

  /** Nube de partículas de fondo: profundidad + movimiento orgánico sutil. */
  private buildParticleField() {
    const COUNT = 700
    const positions = new Float32Array(COUNT * 3)
    const seeds = new Float32Array(COUNT * 3) // fase, velocidad, radio de deriva
    const colors = new Float32Array(COUNT * 3)

    const colorA = new THREE.Color(0x22c55e)
    const colorB = new THREE.Color(0xff6600)

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * 60
      positions[i3 + 1] = (Math.random() - 0.5) * 40
      positions[i3 + 2] = (Math.random() - 0.5) * 50 - 10

      seeds[i3] = Math.random() * Math.PI * 2
      seeds[i3 + 1] = 0.15 + Math.random() * 0.3
      seeds[i3 + 2] = 0.5 + Math.random() * 2.2

      const mixed = colorA.clone().lerp(colorB, Math.random() * 0.35)
      colors[i3] = mixed.r
      colors[i3 + 1] = mixed.g
      colors[i3 + 2] = mixed.b
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 0.16,
      map: this.createGlowTexture(),
      transparent: true,
      opacity: 0.55,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })

    const points = new THREE.Points(geometry, material)
    this.group.add(points)

    const basePositions = positions.slice()
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute

    this.updaters.push((elapsed) => {
      if (this.reducedMotion) return
      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3
        const phase = seeds[i3]
        const speed = seeds[i3 + 1]
        const radius = seeds[i3 + 2]
        posAttr.array[i3] = basePositions[i3] + Math.sin(elapsed * speed + phase) * radius
        posAttr.array[i3 + 1] =
          basePositions[i3 + 1] + Math.cos(elapsed * speed * 0.8 + phase) * radius * 0.8
      }
      posAttr.needsUpdate = true
      points.rotation.y = elapsed * 0.01 + this.scrollProgress * 0.6
    })
  }

  /** Cuerpos flotantes de bajo poligonaje con iluminación real (profundidad + luz). */
  private buildFloatingBodies() {
    const geometries = [
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.OctahedronGeometry(1, 0),
      new THREE.TetrahedronGeometry(1, 0),
    ]

    const bodies: { mesh: THREE.Mesh; seed: number; radius: number; speed: number }[] = []
    const BODY_COUNT = 12

    for (let i = 0; i < BODY_COUNT; i++) {
      const geometry = geometries[i % geometries.length]
      const material = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x22c55e : 0xff6600,
        roughness: 0.35,
        metalness: 0.6,
        emissive: i % 2 === 0 ? 0x0b3d1f : 0x3d1600,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.85,
      })
      const mesh = new THREE.Mesh(geometry, material)
      const scale = 0.4 + Math.random() * 0.9
      mesh.scale.setScalar(scale)
      mesh.position.set(
        (Math.random() - 0.5) * 26,
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 18 - 6
      )
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
      this.group.add(mesh)
      bodies.push({
        mesh,
        seed: Math.random() * Math.PI * 2,
        radius: 0.6 + Math.random() * 1.4,
        speed: 0.08 + Math.random() * 0.12,
      })
    }

    const basePositions = bodies.map((b) => b.mesh.position.clone())

    this.updaters.push((elapsed, delta) => {
      const speedFactor = this.reducedMotion ? 0.15 : 1
      bodies.forEach((b, i) => {
        b.mesh.rotation.x += delta * 0.08 * speedFactor
        b.mesh.rotation.y += delta * 0.12 * speedFactor
        if (!this.reducedMotion) {
          const base = basePositions[i]
          b.mesh.position.y = base.y + Math.sin(elapsed * b.speed + b.seed) * b.radius
          b.mesh.position.x =
            base.x + Math.cos(elapsed * b.speed * 0.7 + b.seed) * b.radius * 0.6
        }
      })
    })
  }

  /** Textura de resplandor circular generada en canvas (sin assets externos). */
  private createGlowTexture(): THREE.Texture {
    const size = 64
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    const ctx = c.getContext('2d')!
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    )
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.5)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
    const texture = new THREE.CanvasTexture(c)
    texture.needsUpdate = true
    return texture
  }

  // ---------------------------------------------------------------------
  // Interacción: cursor + scroll
  // ---------------------------------------------------------------------

  private handlePointerMove = (e: PointerEvent) => {
    this.pointerTarget.x = (e.clientX / window.innerWidth) * 2 - 1
    this.pointerTarget.y = (e.clientY / window.innerHeight) * 2 - 1
  }

  private handleScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    this.scrollTarget = max > 0 ? window.scrollY / max : 0
  }

  private handleVisibility = () => {
    this.paused = document.hidden
  }

  private handleResize = () => {
    const width = window.innerWidth
    const height = window.innerHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  // ---------------------------------------------------------------------
  // Ciclo de vida
  // ---------------------------------------------------------------------

  start() {
    const loop = () => {
      if (this.disposed) return
      this.rafId = requestAnimationFrame(loop)
      if (this.paused) return

      const delta = Math.min(this.clock.getDelta(), 0.05)
      const elapsed = this.clock.getElapsedTime()

      // Suavizado (lerp) de cursor y scroll para movimiento fluido
      this.pointer.x += (this.pointerTarget.x - this.pointer.x) * 0.04
      this.pointer.y += (this.pointerTarget.y - this.pointer.y) * 0.04
      this.scrollProgress += (this.scrollTarget - this.scrollProgress) * 0.06

      // Parallax de cámara según cursor
      this.camera.position.x += (this.pointer.x * 3 - this.camera.position.x) * 0.05
      this.camera.position.y += (-this.pointer.y * 2 - this.camera.position.y) * 0.05
      this.camera.lookAt(0, 0, 0)

      // Respuesta al scroll: rotación sutil + profundidad
      this.group.rotation.y = this.scrollProgress * 0.5
      this.group.position.z = this.scrollProgress * 4

      for (const update of this.updaters) update(elapsed, delta)

      this.renderer.render(this.scene, this.camera)
    }
    this.rafId = requestAnimationFrame(loop)
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value
  }

  dispose() {
    this.disposed = true
    if (this.rafId) cancelAnimationFrame(this.rafId)
    window.removeEventListener('resize', this.handleResize)
    window.removeEventListener('pointermove', this.handlePointerMove)
    window.removeEventListener('scroll', this.handleScroll)
    document.removeEventListener('visibilitychange', this.handleVisibility)

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry.dispose()
        const material = obj.material
        if (Array.isArray(material)) material.forEach((m) => m.dispose())
        else material.dispose()
      }
    })
    this.renderer.dispose()
  }
}
