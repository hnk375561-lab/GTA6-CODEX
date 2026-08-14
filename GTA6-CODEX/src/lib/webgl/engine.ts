import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

/**
 * GTA6CodexWebGLEngine — v2 "cinematográfico"
 * ---------------------------------------------------------------------------
 * Capa gráfica WebGL de fondo. Reescrita para dejar de sentirse como un
 * "fondo de partículas" y pasar a una escena con luz, materia y composición:
 *
 *  - Partículas animadas 100% en GPU (vertex shader, sin loops de CPU).
 *  - Cuerpos flotantes con material físico (PBR) + environment map generado
 *    en runtime (reflejos reales, sin assets externos) + rim-light shader.
 *  - Haces de luz volumétrica falsos (sprites aditivos) para profundidad.
 *  - Post-procesado: bloom cinematográfico + viñeta + grano fílmico sutil,
 *    con tonemap ACES.
 *  - Cámara coreografiada: deriva lenta autónoma + parallax de cursor +
 *    dolly de scroll, en vez de un simple "mirar al centro".
 *
 * Puntos de extensión para el futuro (nuevas escenas/shaders/distorsión):
 *  - `buildXxx()` son constructores de escena independientes.
 *  - `updaters` centraliza el loop de animación; una nueva escena solo debe
 *    empujar su propia función aquí.
 *  - `composer` ya expone el pipeline de post-procesado: un nuevo ShaderPass
 *    (distorsión, glitch, etc.) se inserta con `composer.addPass()`.
 */

type Updater = (elapsed: number, delta: number) => void

const VIGNETTE_GRAIN_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    vignetteStrength: { value: 0.55 },
    grainStrength: { value: 0.035 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float vignetteStrength;
    uniform float grainStrength;
    varying vec2 vUv;

    float noise(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      vec2 centered = vUv - 0.5;
      float vignette = 1.0 - dot(centered, centered) * vignetteStrength;
      color.rgb *= vignette;

      float g = (noise(vUv * vec2(1920.0, 1080.0) + time) - 0.5) * grainStrength;
      color.rgb += g;

      gl_FragColor = color;
    }
  `,
}

/** Vertex shader: mueve cada partícula en GPU con ruido orgánico por semilla. */
const PARTICLE_VERTEX_SHADER = /* glsl */ `
  attribute vec3 seed;
  attribute float aSize;
  uniform float time;
  uniform float scrollProgress;
  varying vec3 vColor;
  varying float vFade;

  void main() {
    vColor = color;

    float phase = seed.x;
    float speed = seed.y;
    float radius = seed.z;

    vec3 p = position;
    p.x += sin(time * speed + phase) * radius;
    p.y += cos(time * speed * 0.8 + phase) * radius * 0.8;
    p.z += sin(time * speed * 0.5 + phase * 1.7) * radius * 0.5;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    float dist = -mvPosition.z;
    vFade = smoothstep(48.0, 6.0, dist);

    gl_PointSize = aSize * (220.0 / dist) * (1.0 + scrollProgress * 0.4);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const PARTICLE_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying float vFade;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float alpha = smoothstep(0.5, 0.0, d) * vFade;
    gl_FragColor = vec4(vColor, alpha * 0.85);
  }
`

export class GTA6CodexWebGLEngine {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private clock: THREE.Clock
  private group: THREE.Group
  private composer: EffectComposer
  private bloomPass: UnrealBloomPass
  private grainPass: ShaderPass

  private pointer = { x: 0, y: 0 }
  private pointerTarget = { x: 0, y: 0 }
  private scrollProgress = 0
  private scrollTarget = 0

  private particleUniforms: { time: { value: number }; scrollProgress: { value: number } }

  private updaters: Updater[] = []
  private rafId: number | null = null
  private disposed = false
  private reducedMotion: boolean
  private paused = false

  constructor(canvas: HTMLCanvasElement, opts: { reducedMotion: boolean }) {
    this.reducedMotion = opts.reducedMotion

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.15
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.FogExp2(0x0f0f0f, 0.032)

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    this.camera.position.set(0, 0, 26)

    this.clock = new THREE.Clock()
    this.group = new THREE.Group()
    this.scene.add(this.group)

    this.particleUniforms = { time: { value: 0 }, scrollProgress: { value: 0 } }

    this.setupEnvironment()
    this.setupLights()
    this.buildParticleField()
    this.buildFloatingBodies()
    this.buildLightShafts()

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))

    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.55, 0.15)
    this.composer.addPass(this.bloomPass)

    this.grainPass = new ShaderPass(VIGNETTE_GRAIN_SHADER)
    this.composer.addPass(this.grainPass)

    this.composer.addPass(new OutputPass())

    this.handleResize()

    window.addEventListener('resize', this.handleResize)
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true })
    window.addEventListener('scroll', this.handleScroll, { passive: true })
    document.addEventListener('visibilitychange', this.handleVisibility)
  }

  // ---------------------------------------------------------------------
  // Entorno / iluminación
  // ---------------------------------------------------------------------

  private setupEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    pmrem.compileEquirectangularShader()

    const envScene = new THREE.Scene()
    const gradientGeo = new THREE.SphereGeometry(30, 32, 32)
    const gradientMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        colorTop: { value: new THREE.Color(0x1a2f22) },
        colorMid: { value: new THREE.Color(0x120d08) },
        colorBottom: { value: new THREE.Color(0x050505) },
      },
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        uniform vec3 colorTop;
        uniform vec3 colorMid;
        uniform vec3 colorBottom;
        void main() {
          float h = normalize(vPos).y * 0.5 + 0.5;
          vec3 c = mix(colorBottom, colorMid, smoothstep(0.0, 0.5, h));
          c = mix(c, colorTop, smoothstep(0.5, 1.0, h));
          gl_FragColor = vec4(c, 1.0);
        }
      `,
    })
    envScene.add(new THREE.Mesh(gradientGeo, gradientMat))

    const renderTarget = pmrem.fromScene(envScene, 0.04)
    this.scene.environment = renderTarget.texture
    pmrem.dispose()
  }

  private setupLights() {
    const ambient = new THREE.AmbientLight(0x404040, 0.7)
    this.scene.add(ambient)

    const keyLight = new THREE.PointLight(0xff7a1a, 60, 70, 2)
    keyLight.position.set(10, 6, 14)
    this.scene.add(keyLight)

    const fillLight = new THREE.PointLight(0x22c55e, 40, 70, 2)
    fillLight.position.set(-12, -4, 8)
    this.scene.add(fillLight)

    const rimLight = new THREE.PointLight(0x66ffe0, 25, 60, 2)
    rimLight.position.set(0, -10, -10)
    this.scene.add(rimLight)

    this.updaters.push((elapsed) => {
      keyLight.position.x = 10 + Math.sin(elapsed * 0.15) * 6
      keyLight.position.y = 6 + Math.cos(elapsed * 0.12) * 4
      fillLight.position.x = -12 + Math.cos(elapsed * 0.1) * 5
      fillLight.position.y = -4 + Math.sin(elapsed * 0.18) * 3
      rimLight.intensity = 20 + Math.sin(elapsed * 0.4) * 8
    })
  }

  // ---------------------------------------------------------------------
  // Escena
  // ---------------------------------------------------------------------

  private buildParticleField() {
    const COUNT = 900
    const positions = new Float32Array(COUNT * 3)
    const seeds = new Float32Array(COUNT * 3)
    const colors = new Float32Array(COUNT * 3)
    const sizes = new Float32Array(COUNT)

    const colorA = new THREE.Color(0x22c55e)
    const colorB = new THREE.Color(0xff8a3a)

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * 60
      positions[i3 + 1] = (Math.random() - 0.5) * 40
      positions[i3 + 2] = (Math.random() - 0.5) * 50 - 10

      seeds[i3] = Math.random() * Math.PI * 2
      seeds[i3 + 1] = this.reducedMotion ? 0.02 : 0.15 + Math.random() * 0.3
      seeds[i3 + 2] = this.reducedMotion ? 0.05 : 0.5 + Math.random() * 2.2

      const mixed = colorA.clone().lerp(colorB, Math.random() * 0.4)
      colors[i3] = mixed.r
      colors[i3 + 1] = mixed.g
      colors[i3 + 2] = mixed.b

      sizes[i] = 6 + Math.random() * 10
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))

    const material = new THREE.ShaderMaterial({
      uniforms: this.particleUniforms,
      vertexShader: PARTICLE_VERTEX_SHADER,
      fragmentShader: PARTICLE_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    })

    const points = new THREE.Points(geometry, material)
    this.group.add(points)

    this.updaters.push((elapsed) => {
      points.rotation.y = elapsed * 0.01 + this.scrollProgress * 0.6
    })
  }

  private buildFloatingBodies() {
    const geometries = [
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.OctahedronGeometry(1, 2),
      new THREE.TorusGeometry(0.7, 0.24, 24, 64),
    ]

    const bodies: {
      mesh: THREE.Mesh
      rim: THREE.Mesh
      seed: number
      radius: number
      speed: number
    }[] = []
    const BODY_COUNT = 11

    for (let i = 0; i < BODY_COUNT; i++) {
      const geometry = geometries[i % geometries.length]
      const isGreen = i % 2 === 0
      const material = new THREE.MeshPhysicalMaterial({
        color: isGreen ? 0x22c55e : 0xff6600,
        roughness: 0.22,
        metalness: 0.85,
        clearcoat: 0.6,
        clearcoatRoughness: 0.25,
        envMapIntensity: 1.4,
        emissive: isGreen ? 0x0b3d1f : 0x3d1600,
        emissiveIntensity: 0.35,
      })
      const mesh = new THREE.Mesh(geometry, material)
      const scale = 0.5 + Math.random() * 1.0
      mesh.scale.setScalar(scale)
      mesh.position.set(
        (Math.random() - 0.5) * 26,
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 18 - 6
      )
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)

      const rimMaterial = new THREE.ShaderMaterial({
        uniforms: { glowColor: { value: new THREE.Color(isGreen ? 0x4ade80 : 0xffb066) } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vViewDir;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewDir = normalize(-mvPosition.xyz);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          varying vec3 vViewDir;
          uniform vec3 glowColor;
          void main() {
            float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.5);
            gl_FragColor = vec4(glowColor, fresnel * 0.9);
          }
        `,
      })
      const rim = new THREE.Mesh(geometry, rimMaterial)
      rim.scale.setScalar(scale * 1.18)
      rim.position.copy(mesh.position)
      rim.rotation.copy(mesh.rotation)

      this.group.add(mesh)
      this.group.add(rim)
      bodies.push({
        mesh,
        rim,
        seed: Math.random() * Math.PI * 2,
        radius: 0.6 + Math.random() * 1.4,
        speed: 0.08 + Math.random() * 0.12,
      })
    }

    const basePositions = bodies.map((b) => b.mesh.position.clone())

    this.updaters.push((elapsed, delta) => {
      const speedFactor = this.reducedMotion ? 0.12 : 1
      bodies.forEach((b, i) => {
        b.mesh.rotation.x += delta * 0.08 * speedFactor
        b.mesh.rotation.y += delta * 0.12 * speedFactor
        if (!this.reducedMotion) {
          const base = basePositions[i]
          b.mesh.position.y = base.y + Math.sin(elapsed * b.speed + b.seed) * b.radius
          b.mesh.position.x = base.x + Math.cos(elapsed * b.speed * 0.7 + b.seed) * b.radius * 0.6
        }
        b.rim.position.copy(b.mesh.position)
        b.rim.rotation.copy(b.mesh.rotation)
      })
    })
  }

  private buildLightShafts() {
    const texture = this.createShaftTexture()
    const shafts: THREE.Sprite[] = []
    const COUNT = 5

    for (let i = 0; i < COUNT; i++) {
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        color: i % 2 === 0 ? 0x22c55e : 0xff8a3a,
      })
      const sprite = new THREE.Sprite(material)
      sprite.scale.set(10, 34, 1)
      sprite.position.set(
        (Math.random() - 0.5) * 34,
        (Math.random() - 0.5) * 10,
        -20 - Math.random() * 10
      )
      this.group.add(sprite)
      shafts.push(sprite)
    }

    this.updaters.push((elapsed) => {
      shafts.forEach((s, i) => {
        s.rotation.z = Math.sin(elapsed * 0.05 + i) * 0.15
        s.material.opacity = this.reducedMotion ? 0.1 : 0.1 + Math.sin(elapsed * 0.3 + i) * 0.06
      })
    })
  }

  private createShaftTexture(): THREE.Texture {
    const w = 64
    const h = 256
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, 'rgba(255,255,255,0)')
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.9)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
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
    this.composer.setSize(width, height)
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    this.bloomPass.resolution.set(width * pixelRatio, height * pixelRatio)
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

      this.pointer.x += (this.pointerTarget.x - this.pointer.x) * 0.04
      this.pointer.y += (this.pointerTarget.y - this.pointer.y) * 0.04
      this.scrollProgress += (this.scrollTarget - this.scrollProgress) * 0.06

      const autoDriftX = Math.sin(elapsed * 0.05) * 1.5
      const autoDriftY = Math.cos(elapsed * 0.04) * 0.8
      this.camera.position.x += (this.pointer.x * 3 + autoDriftX - this.camera.position.x) * 0.05
      this.camera.position.y += (-this.pointer.y * 2 + autoDriftY - this.camera.position.y) * 0.05
      this.camera.position.z = 26 - this.scrollProgress * 6
      this.camera.lookAt(0, 0, 0)

      this.group.rotation.y = this.scrollProgress * 0.5
      this.group.position.z = this.scrollProgress * 4

      this.particleUniforms.time.value = elapsed
      this.particleUniforms.scrollProgress.value = this.scrollProgress
      this.grainPass.uniforms.time.value = elapsed * 0.6

      for (const update of this.updaters) update(elapsed, delta)

      this.composer.render()
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
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Sprite) {
        obj.geometry?.dispose?.()
        const material = obj.material as THREE.Material | THREE.Material[]
        if (Array.isArray(material)) material.forEach((m) => m.dispose())
        else material?.dispose?.()
      }
    })
    this.scene.environment?.dispose?.()
    this.composer.dispose()
    this.renderer.dispose()
  }
}
