import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

/**
 * GTA6CodexWebGLEngine — v3 "cinematográfico+"
 * ---------------------------------------------------------------------------
 * Segunda pasada radical sobre la capa gráfica de fondo. Todo lo de v2 se
 * mantiene y se profundiza:
 *
 *  - Partículas GPU con repulsión real al cursor (warp en espacio de
 *    pantalla, calculado 100% en el vertex shader) + brillo/tamaño reactivo.
 *  - Cuerpos flotantes con DOS familias de material: PBR metálico (igual que
 *    v2) y vidrio con transmisión/IOR real (refracción física, no un truco
 *    de transparencia) — más variedad de materia en escena.
 *  - Piso de grilla neón infinito (shader propio, sin geometría pesada) que
 *    ancla la composición y aporta profundidad de "horizonte", independiente
 *    de la rotación del resto de la escena.
 *  - Post-procesado ampliado: profundidad de campo real (BokehPass, con foco
 *    que respira con el scroll), bloom, viñeta + grano + aberración
 *    cromática combinados en un solo pase, y FXAA final para que todo el
 *    apilado de pases no deje bordes sucios.
 *  - Cámara coreografiada con deriva Lissajous (no un simple seno), roll
 *    sutil, dolly-zoom (FOV) atado al scroll, además del parallax de cursor.
 *
 * Puntos de extensión:
 *  - `buildXxx()` son constructores de escena independientes.
 *  - `updaters` centraliza el loop de animación.
 *  - `composer` expone el pipeline de post-procesado para sumar pases.
 */

type Updater = (elapsed: number, delta: number) => void

const VIGNETTE_GRAIN_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    vignetteStrength: { value: 0.55 },
    grainStrength: { value: 0.035 },
    chromaStrength: { value: 0.0018 },
    chromaKick: { value: 0.0 },
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
    uniform float chromaStrength;
    uniform float chromaKick;
    varying vec2 vUv;

    float noise(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 centered = vUv - 0.5;
      float radial = length(centered);

      float aberration = chromaStrength + chromaKick;
      vec2 dir = centered * aberration;
      float r = texture2D(tDiffuse, vUv + dir).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - dir).b;
      vec4 color = vec4(r, g, b, 1.0);

      float vignette = 1.0 - dot(centered, centered) * vignetteStrength;
      color.rgb *= vignette;

      float gr = (noise(vUv * vec2(1920.0, 1080.0) + time) - 0.5) * grainStrength;
      color.rgb += gr;

      gl_FragColor = color;
    }
  `,
}

/** Vertex shader: mueve cada partícula en GPU con ruido orgánico + repulsión de cursor en espacio de pantalla. */
const PARTICLE_VERTEX_SHADER = /* glsl */ `
  attribute vec3 seed;
  attribute float aSize;
  uniform float time;
  uniform float scrollProgress;
  uniform vec2 mouseNDC;
  uniform float mouseStrength;
  varying vec3 vColor;
  varying float vFade;
  varying float vGlow;

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

    vec4 clip = projectionMatrix * mvPosition;
    vec2 ndc = clip.xy / max(clip.w, 0.0001);
    vec2 toMouse = ndc - mouseNDC;
    float mouseDist = length(toMouse);
    float push = smoothstep(0.32, 0.0, mouseDist) * mouseStrength;
    vec2 pushDir = toMouse / max(mouseDist, 0.0001);
    ndc += pushDir * push * 0.06;
    clip.xy = ndc * clip.w;
    vGlow = push;

    gl_PointSize = aSize * (220.0 / dist) * (1.0 + scrollProgress * 0.4) * (1.0 + vGlow * 1.6);
    gl_Position = clip;
  }
`

const PARTICLE_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying float vFade;
  varying float vGlow;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float alpha = smoothstep(0.5, 0.0, d) * vFade;
    vec3 hot = mix(vColor, vec3(1.0), vGlow * 0.6);
    gl_FragColor = vec4(hot, alpha * (0.85 + vGlow * 0.5));
  }
`

/** Piso de grilla neón: horizonte infinito falso, sin geometría pesada. */
const GRID_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const GRID_FRAGMENT_SHADER = /* glsl */ `
  uniform float time;
  uniform vec3 colorA;
  uniform vec3 colorB;
  uniform float scrollProgress;
  varying vec3 vWorldPos;

  float gridLine(vec2 coord, float cell) {
    vec2 g = abs(fract(coord / cell - 0.5) - 0.5) / fwidth(coord / cell);
    return 1.0 - min(min(g.x, g.y), 1.0);
  }

  void main() {
    float dist = length(vWorldPos.xz);
    float radialFade = smoothstep(95.0, 8.0, dist);
    if (radialFade <= 0.001) discard;

    float line = gridLine(vWorldPos.xz, 3.0);
    float pulse = 0.5 + 0.5 * sin(time * 0.25 + dist * 0.06);
    vec3 tint = mix(colorA, colorB, pulse * 0.5 + scrollProgress * 0.3);

    vec3 color = tint * line;
    float alpha = line * radialFade * 0.55;

    gl_FragColor = vec4(color, alpha);
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
  private bokehPass: BokehPass
  private grainPass: ShaderPass
  private fxaaPass: FXAAPass

  private pointer = { x: 0, y: 0 }
  private pointerTarget = { x: 0, y: 0 }
  private pointerVelocity = 0
  private scrollProgress = 0
  private scrollTarget = 0
  private scrollVelocity = 0

  private particleUniforms: {
    time: { value: number }
    scrollProgress: { value: number }
    mouseNDC: { value: THREE.Vector2 }
    mouseStrength: { value: number }
  }

  private readonly baseFov = 42

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

    this.camera = new THREE.PerspectiveCamera(this.baseFov, 1, 0.1, 100)
    this.camera.position.set(0, 0, 26)

    this.clock = new THREE.Clock()
    this.group = new THREE.Group()
    this.scene.add(this.group)

    this.particleUniforms = {
      time: { value: 0 },
      scrollProgress: { value: 0 },
      mouseNDC: { value: new THREE.Vector2(2, 2) },
      mouseStrength: { value: this.reducedMotion ? 0 : 1 },
    }

    this.setupEnvironment()
    this.setupLights()
    this.buildGridFloor()
    this.buildParticleField()
    this.buildFloatingBodies()
    this.buildLightShafts()

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))

    this.bokehPass = new BokehPass(this.scene, this.camera, {
      focus: 22,
      aperture: 0.0018,
      maxblur: 0.008,
    })
    this.composer.addPass(this.bokehPass)

    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.55, 0.15)
    this.composer.addPass(this.bloomPass)

    this.grainPass = new ShaderPass(VIGNETTE_GRAIN_SHADER)
    this.composer.addPass(this.grainPass)

    this.fxaaPass = new FXAAPass()
    this.composer.addPass(this.fxaaPass)

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

  private buildGridFloor() {
    const geometry = new THREE.PlaneGeometry(220, 220, 1, 1)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        colorA: { value: new THREE.Color(0x22c55e) },
        colorB: { value: new THREE.Color(0xff8a3a) },
        scrollProgress: { value: 0 },
      },
      vertexShader: GRID_VERTEX_SHADER,
      fragmentShader: GRID_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    const floor = new THREE.Mesh(geometry, material)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -13
    this.scene.add(floor)

    this.updaters.push((elapsed) => {
      material.uniforms.time.value = elapsed
      material.uniforms.scrollProgress.value = this.scrollProgress
    })
  }

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
      const isGlass = i % 3 === 2

      const material = isGlass
        ? new THREE.MeshPhysicalMaterial({
            color: isGreen ? 0xbdf5d1 : 0xffd9b3,
            roughness: 0.05,
            metalness: 0,
            transmission: 1,
            thickness: 1.6,
            ior: 1.45,
            clearcoat: 1,
            clearcoatRoughness: 0.08,
            envMapIntensity: 1.6,
            attenuationColor: isGreen ? new THREE.Color(0x22c55e) : new THREE.Color(0xff8a3a),
            attenuationDistance: 2.2,
          })
        : new THREE.MeshPhysicalMaterial({
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
    this.bokehPass.setSize(width, height)
    this.fxaaPass.setSize(width, height)
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

      const prevPointerX = this.pointer.x
      const prevPointerY = this.pointer.y
      this.pointer.x += (this.pointerTarget.x - this.pointer.x) * 0.08
      this.pointer.y += (this.pointerTarget.y - this.pointer.y) * 0.08
      this.pointerVelocity = Math.hypot(this.pointer.x - prevPointerX, this.pointer.y - prevPointerY)

      const prevScroll = this.scrollProgress
      this.scrollProgress += (this.scrollTarget - this.scrollProgress) * 0.06
      this.scrollVelocity = Math.abs(this.scrollProgress - prevScroll)

      // Cámara: deriva Lissajous autónoma + parallax de cursor + roll + dolly-zoom.
      const autoDriftX = Math.sin(elapsed * 0.05) * 1.5 + Math.sin(elapsed * 0.021) * 0.6
      const autoDriftY = Math.cos(elapsed * 0.04) * 0.8 + Math.cos(elapsed * 0.033) * 0.4
      this.camera.position.x += (this.pointer.x * 3 + autoDriftX - this.camera.position.x) * 0.05
      this.camera.position.y += (-this.pointer.y * 2 + autoDriftY - this.camera.position.y) * 0.05
      this.camera.position.z = 26 - this.scrollProgress * 6
      this.camera.lookAt(0, 0, 0)
      this.camera.rotation.z = this.reducedMotion
        ? 0
        : Math.sin(elapsed * 0.03) * 0.008 + this.pointer.x * -0.01

      const targetFov = this.baseFov + this.scrollProgress * 6
      if (Math.abs(this.camera.fov - targetFov) > 0.01) {
        this.camera.fov += (targetFov - this.camera.fov) * 0.05
        this.camera.updateProjectionMatrix()
      }

      // Profundidad de campo: el foco "respira" con el scroll.
      this.bokehPass.materialBokeh.uniforms.focus.value = 22 - this.scrollProgress * 8

      this.group.rotation.y = this.scrollProgress * 0.5
      this.group.position.z = this.scrollProgress * 4

      this.particleUniforms.time.value = elapsed
      this.particleUniforms.scrollProgress.value = this.scrollProgress
      this.particleUniforms.mouseNDC.value.set(this.pointer.x, -this.pointer.y)
      this.particleUniforms.mouseStrength.value = this.reducedMotion ? 0 : 1

      this.grainPass.uniforms.time.value = elapsed * 0.6
      const kick = this.reducedMotion
        ? 0
        : Math.min(this.pointerVelocity * 1.4 + this.scrollVelocity * 6, 0.01)
      this.grainPass.uniforms.chromaKick.value = kick

      for (const update of this.updaters) update(elapsed, delta)

      this.composer.render()
    }
    this.rafId = requestAnimationFrame(loop)
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value
    this.particleUniforms.mouseStrength.value = value ? 0 : 1
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
    this.bokehPass.dispose()
    this.composer.dispose()
    this.renderer.dispose()
  }
}
