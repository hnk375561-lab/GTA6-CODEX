import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { webglSceneBus, type SceneFocus, type EntityAtmosphere } from './scene-bus'

/**
 * GTA6CodexWebGLEngine — v5 "Vice City, no una demo abstracta de Three.js"
 * ---------------------------------------------------------------------------
 * Reescritura de dirección artística: la escena deja de ser un objeto de
 * vidrio genérico flotando entre partículas y pasa a ser, sin ambigüedad,
 * una calle nocturna de Vice City vista desde el capó de un auto detenido:
 *
 *  - Piso: ya no es una grilla decorativa, es una CARRETERA con línea
 *    central discontinua (magenta) y líneas de carril continuas (cian) que
 *    corren hacia la cámara — asfalto, no demo de shader.
 *  - Tráfico: franjas de luz (faros blancos que se acercan, luces de freno
 *    rojas que se alejan) recorren la carretera en loop — la calle vive.
 *  - Skyline lejano: edificios con ventanas iluminadas (ámbar/cian/magenta
 *    en additive blending) alternados con palmeras en silueta — Miami, no
 *    geometría abstracta.
 *  - Horizonte: un sol/luna bajo con bandas horizontales cortadas (el
 *    ícono synthwave del atardecer de Miami) detrás del skyline.
 *  - Pieza focal: donde antes había un icosaedro de vidrio genérico ahora
 *    hay una TORRE ART DECO — tres cuerpos hexagonales de vidrio en
 *    retranqueo (setback), con anillos de neón (cian/magenta) marcando
 *    cada nivel y una baliza en la aguja, como los hoteles de Ocean Drive.
 *    El vidrio conserva el desplazamiento de vértices por ruido del motor
 *    anterior (vía onBeforeCompile) — superficie "viva", PBR/transmisión
 *    real.
 *  - Paleta: magenta/rosa neón como luz cálida, cian como luz fría —
 *    reemplaza el naranja/verde original — con niebla violeta nocturna.
 *  - Cámara, integración con scroll/cursor/scene-bus y post-proceso
 *    (DoF, bloom, aberración cromática + grano, FXAA) se mantienen
 *    intactos: la coreografía y la reactividad ya funcionaban, lo que
 *    faltaba era identidad visual.
 *
 * Puntos de extensión:
 *  - `buildXxx()` construyen piezas de escena independientes.
 *  - `updaters` centraliza el loop de animación.
 *  - `SHOTS` es la lista de encuadres; agregar uno más los suma a la ronda.
 */

type Updater = (elapsed: number, delta: number, intro: number) => void

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    vignetteStrength: { value: 0.55 },
    grainStrength: { value: 0.03 },
    chromaStrength: { value: 0.0016 },
    chromaKick: { value: 0.0 },
    fadeIn: { value: 0 },
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
    uniform float fadeIn;
    varying vec2 vUv;

    float noise(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 centered = vUv - 0.5;
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

      // Apertura de escena: iris real desde el centro (máscara circular que
      // se expande), no un fundido plano a negro. "fadeIn" es el progreso
      // 0→1 de esa apertura; el borde del iris tiene un halo de neón rosa
      // breve (una línea de luz corriendo hacia afuera) para que se sienta
      // como un cartel encendiéndose, no un simple crossfade.
      float distFromCenter = length(centered);
      float irisRadius = fadeIn * 0.85;
      float iris = smoothstep(irisRadius, irisRadius - 0.14, distFromCenter);
      float irisEdge = 1.0 - smoothstep(0.0, 0.05, abs(distFromCenter - irisRadius));
      vec3 irisGlow = vec3(1.0, 0.35, 0.75) * irisEdge * (1.0 - fadeIn) * 0.9;
      color.rgb = color.rgb * iris + irisGlow * iris;

      gl_FragColor = color;
    }
  `,
}

/** Bruma nocturna: ruido orgánico + calor real de las luces de la escena + repulsión de cursor. */
const DUST_VERTEX_SHADER = /* glsl */ `
  attribute vec3 seed;
  attribute float aSize;
  uniform float time;
  uniform vec2 mouseNDC;
  uniform float mouseStrength;
  uniform vec3 warmLightPos;
  uniform vec3 coolLightPos;
  uniform float introFade;
  varying float vFade;
  varying float vGlow;
  varying float vWarmth;

  void main() {
    float phase = seed.x;
    float speed = seed.y;
    float radius = seed.z;

    vec3 p = position;
    p.x += sin(time * speed + phase) * radius;
    p.y += cos(time * speed * 0.83 + phase * 1.3) * radius * 0.7;
    p.z += sin(time * speed * 0.6 + phase * 1.9) * radius * 0.5;

    vec4 worldPos = modelMatrix * vec4(p, 1.0);
    float dWarm = distance(worldPos.xyz, warmLightPos);
    float dCool = distance(worldPos.xyz, coolLightPos);
    vWarmth = clamp((dCool - dWarm) / 22.0 + 0.5, 0.0, 1.0);

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    float dist = -mvPosition.z;
    vFade = smoothstep(50.0, 8.0, dist) * introFade;

    vec4 clip = projectionMatrix * mvPosition;
    vec2 ndc = clip.xy / max(clip.w, 0.0001);
    vec2 toMouse = ndc - mouseNDC;
    float mouseDist = length(toMouse);
    float push = smoothstep(0.3, 0.0, mouseDist) * mouseStrength;
    vec2 pushDir = toMouse / max(mouseDist, 0.0001);
    ndc += pushDir * push * 0.05;
    clip.xy = ndc * clip.w;
    vGlow = push;

    gl_PointSize = aSize * (200.0 / dist) * (1.0 + vGlow * 1.4);
    gl_Position = clip;
  }
`

const DUST_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 warmColor;
  uniform vec3 coolColor;
  varying float vFade;
  varying float vGlow;
  varying float vWarmth;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float alpha = smoothstep(0.5, 0.0, d) * vFade;
    vec3 base = mix(coolColor, warmColor, vWarmth);
    vec3 hot = mix(base, vec3(1.0), vGlow * 0.55);
    gl_FragColor = vec4(hot, alpha * (0.8 + vGlow * 0.5));
  }
`

/** Carretera: línea central discontinua + carriles laterales — asfalto real, no grilla decorativa. */
const ROAD_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const ROAD_FRAGMENT_SHADER = /* glsl */ `
  uniform float time;
  uniform vec3 colorA;
  uniform vec3 colorB;
  uniform float introFade;
  varying vec3 vWorldPos;

  void main() {
    float dist = length(vWorldPos.xz);
    float radialFade = smoothstep(90.0, 10.0, dist);
    if (radialFade <= 0.001) discard;

    float x = vWorldPos.x;
    float z = vWorldPos.z;

    // Líneas de carril laterales, continuas, en cian.
    float laneHalfWidth = 7.5;
    float edgeDist = min(abs(x - laneHalfWidth), abs(x + laneHalfWidth));
    float edgeLine = 1.0 - smoothstep(0.0, 0.16, edgeDist);

    // Línea central discontinua en magenta, dashes que corren hacia la cámara.
    float dashLength = 4.0;
    float dashGap = 2.6;
    float period = dashLength + dashGap;
    float alongDash = mod(z - time * 5.0, period);
    float centerMask = 1.0 - smoothstep(0.0, 0.14, abs(x));
    float dash = step(alongDash, dashLength) * centerMask;

    float pulse = 0.5 + 0.5 * sin(time * 0.18 + dist * 0.05);
    vec3 edgeTint = mix(colorA, colorB, pulse * 0.2);

    vec3 color = edgeTint * edgeLine + colorB * dash;
    float alpha = (edgeLine * 0.55 + dash * 0.95) * radialFade * introFade;
    gl_FragColor = vec4(color, alpha);
  }
`

/** Haz de neón único: falloff angular real desde un origen, no un sprite decorativo. */
const SHAFT_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const SHAFT_FRAGMENT_SHADER = /* glsl */ `
  uniform float time;
  uniform vec3 shaftColor;
  uniform float introFade;
  varying vec2 vUv;

  void main() {
    float alongFalloff = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
    float widthFalloff = 1.0 - smoothstep(0.0, 0.5, abs(vUv.x - 0.5));
    float flicker = 0.9 + 0.1 * sin(time * 0.6);
    float alpha = alongFalloff * pow(widthFalloff, 1.6) * 0.22 * flicker * introFade;
    gl_FragColor = vec4(shaftColor, alpha);
  }
`

/** Sol/luna bajo de horizonte, con bandas cortadas — el ícono synthwave del atardecer de Miami. */
const SUN_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const SUN_FRAGMENT_SHADER = /* glsl */ `
  uniform float time;
  uniform float introFade;
  uniform vec3 coreColor;
  uniform vec3 rimColor;
  varying vec2 vUv;

  void main() {
    vec2 c = vUv - 0.5;
    float d = length(c) * 2.0;
    float disc = 1.0 - smoothstep(0.78, 0.84, d);
    if (disc <= 0.001) discard;

    vec3 col = mix(coreColor, rimColor, smoothstep(-0.4, 0.9, c.y + 0.5));
    float scanFreq = 22.0;
    float scan = step(0.5, fract((vUv.y + time * 0.008) * scanFreq));
    float band = smoothstep(0.05, -0.2, c.y);
    col *= mix(1.0, scan, band * 0.85);

    float alpha = disc * 0.8 * introFade;
    gl_FragColor = vec4(col, alpha);
  }
`

// ---------------------------------------------------------------------------
// Coreografía de cámara: encuadres deliberados, no ruido infinito.
// ---------------------------------------------------------------------------

interface CameraShot {
  pos: THREE.Vector3
  look: THREE.Vector3
  fovBias: number
  duration: number
}

const SHOTS: CameraShot[] = [
  { pos: new THREE.Vector3(0, 0.4, 25), look: new THREE.Vector3(-3.2, 0.8, -1), fovBias: 0, duration: 16 },
  { pos: new THREE.Vector3(7, -1.6, 22), look: new THREE.Vector3(-3.2, 1.2, -2.5), fovBias: 3, duration: 15 },
  { pos: new THREE.Vector3(-6.5, 2.2, 23), look: new THREE.Vector3(-1.5, -0.4, -3), fovBias: -2, duration: 17 },
]

function smootherstep(t: number): number {
  const c = Math.min(Math.max(t, 0), 1)
  return c * c * c * (c * (c * 6 - 15) + 10)
}

/**
 * Integración con la UI real (ver `scene-bus.ts`)
 * ---------------------------------------------------------------------------
 * Cada `sceneId` reportado por `SceneSection` mapea a un "mood" de 0 a 1:
 * qué tan lejos está el usuario del hero, semánticamente (no en píxeles de
 * scroll). Se usa para desviar muy sutilmente temperatura de luz y FOV — la
 * escena "sabe" en qué parte real de la interfaz está el usuario, en vez de
 * limitarse a un porcentaje de scroll de toda la página.
 *
 * Las fichas de entidad (`EntityAtmosphereBridge`) suman una segunda capa:
 * cada entidad puede comunicar su propia atmósfera (categoría, estado
 * editorial, featured) sin agregar geometría ni shaders nuevos — son
 * desvíos adicionales sobre los mismos uniforms/luces que ya existen.
 */
const SECTION_MOOD: Record<string, number> = {
  hero: 0,
  stats: 0.15,
  featured: 0.35,
  categories: 0.55,
  about: 0.8,
  // Ficha de entidad: el header es el "hero" propio de esa página; el
  // cuerpo (contenido + sidebar) es donde se profundiza en el expediente.
  'entity-header': 0,
  'entity-content': 0.5,
}

/**
 * Sesgo de categoría de entidad. Reutiliza el mismo lenguaje bicolor que ya
 * usan `keyLight`/`fillLight` (magenta/cian) en vez de introducir colores
 * nuevos — `EntityHeaderBackground` ya distingue categorías en CSS/SVG con
 * el mismo criterio (personaje = presencia cálida, vehículo = precisión
 * técnica fría, ubicación = mapa neutro-frío, organización = autoridad
 * cálida). Categorías no listadas quedan neutras a propósito.
 */
const CATEGORY_WARMTH: Record<string, number> = {
  personajes: 0.6,
  organizaciones: 0.4,
  negocios: 0.15,
  vehiculos: -0.5,
  ubicaciones: -0.3,
}

/** confirmado = estable; rumor = leve inquietud visual; nuestro = tibio, editorial. */
const STATUS_UNREST: Record<string, number> = {
  confirmado: 0,
  rumor: 0.6,
  nuestro: 0.22,
}

export class GTA6CodexWebGLEngine {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private clock: THREE.Clock
  private composer: EffectComposer
  private bloomPass: UnrealBloomPass
  private bokehPass: BokehPass
  private gradePass: ShaderPass
  private fxaaPass: FXAAPass

  private farGroup: THREE.Group
  private midGroup: THREE.Group
  private nearGroup: THREE.Group

  private pointer = { x: 0, y: 0 }
  private pointerTarget = { x: 0, y: 0 }
  private pointerVelocity = 0
  private scrollProgress = 0
  private scrollTarget = 0
  private scrollVelocity = 0

  private readonly baseFov = 40
  private readonly totalShotDuration: number
  private startTime = 0

  private dustUniforms!: {
    time: { value: number }
    mouseNDC: { value: THREE.Vector2 }
    mouseStrength: { value: number }
    warmLightPos: { value: THREE.Vector3 }
    coolLightPos: { value: THREE.Vector3 }
    introFade: { value: number }
  }
  private roadUniforms!: { time: { value: number }; introFade: { value: number } }
  private shaftUniforms!: { time: { value: number }; introFade: { value: number } }
  private towerShaderRefs: { uTime: { value: number } }[] = []

  private keyLight!: THREE.PointLight
  private fillLight!: THREE.PointLight

  private updaters: Updater[] = []
  private rafId: number | null = null
  private disposed = false
  private reducedMotion: boolean
  private paused = false

  // --- Integración con la UI real (scene-bus) ---------------------------
  private sceneFocus: SceneFocus = { sectionId: null, progress: 0 }
  private sceneMood = 0
  private sceneMoodTarget = 0
  private pointerIntentTarget = 0
  private pointerIntent = 0
  private entityAtmosphere: EntityAtmosphere | null = null
  private entityWarmth = 0
  private entityWarmthTarget = 0
  private entityUnrest = 0
  private entityUnrestTarget = 0
  private entityPresence = 0
  private entityPresenceTarget = 0
  private unsubscribeSceneBus: (() => void) | null = null

  // --- Motor → DOM: ver `SceneAmbient` en scene-bus.ts -------------------
  /** Pulso de "llegada" a una sección nueva: sube a 1 y decae solo. Es el
   *  equivalente DOM del chromaKick — un momento real, no un loop. */
  private arrivalKick = 0
  private introClimaxFired = false
  private ambientFrameCounter = 0
  private readonly tmpProjectVec = new THREE.Vector3()

  constructor(canvas: HTMLCanvasElement, opts: { reducedMotion: boolean }) {
    this.reducedMotion = opts.reducedMotion
    this.totalShotDuration = SHOTS.reduce((sum, s) => sum + s.duration, 0)

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.FogExp2(0x1c0f28, 0.027)

    this.camera = new THREE.PerspectiveCamera(this.baseFov, 1, 0.1, 100)
    this.camera.position.copy(SHOTS[0].pos).add(new THREE.Vector3(0, 4, 14))

    this.clock = new THREE.Clock()

    this.farGroup = new THREE.Group()
    this.midGroup = new THREE.Group()
    this.nearGroup = new THREE.Group()
    this.scene.add(this.farGroup, this.midGroup, this.nearGroup)

    this.setupEnvironment()
    this.setupLights()
    this.buildRoad()
    this.buildFarSkyline()
    this.buildHorizonSun()
    this.buildLightShaft()
    this.buildTrafficStreaks()
    this.buildDust()
    this.buildSatellites()
    this.buildFocalTower()

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))

    this.bokehPass = new BokehPass(this.scene, this.camera, {
      focus: 22,
      aperture: 0.0016,
      maxblur: 0.007,
    })
    this.composer.addPass(this.bokehPass)

    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.55, 0.16)
    this.composer.addPass(this.bloomPass)

    this.gradePass = new ShaderPass(GRADE_SHADER)
    this.composer.addPass(this.gradePass)

    this.fxaaPass = new FXAAPass()
    this.composer.addPass(this.fxaaPass)

    this.composer.addPass(new OutputPass())

    this.handleResize()

    window.addEventListener('resize', this.handleResize)
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true })
    window.addEventListener('scroll', this.handleScroll, { passive: true })
    document.addEventListener('visibilitychange', this.handleVisibility)

    // La UI real (secciones instrumentadas, hover de cards) empuja estado acá
    // en vez de que el motor tenga que adivinarlo a partir de scroll crudo.
    this.unsubscribeSceneBus = webglSceneBus.subscribe(() => {
      const snapshot = webglSceneBus.getSnapshot()
      const enteringNewSection =
        snapshot.focus.sectionId !== null && snapshot.focus.sectionId !== this.sceneFocus.sectionId
      this.sceneFocus = snapshot.focus
      this.pointerIntentTarget = snapshot.pointerIntent
      if (snapshot.focus.sectionId && snapshot.focus.progress > 0.35) {
        this.sceneMoodTarget = SECTION_MOOD[snapshot.focus.sectionId] ?? this.sceneMoodTarget
      }
      if (enteringNewSection && !this.reducedMotion) {
        // Llegar a una sección nueva es un momento real: un pulso breve de
        // luz/bloom que decae solo en el loop, no un flash on/off.
        this.arrivalKick = 1
      }

      this.entityAtmosphere = snapshot.entityAtmosphere
      this.entityWarmthTarget = snapshot.entityAtmosphere
        ? CATEGORY_WARMTH[snapshot.entityAtmosphere.category] ?? 0
        : 0
      this.entityUnrestTarget = snapshot.entityAtmosphere
        ? STATUS_UNREST[snapshot.entityAtmosphere.status] ?? 0
        : 0
      this.entityPresenceTarget = snapshot.entityAtmosphere?.featured ? 1 : 0
    })
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
        // Cielo nocturno de Vice City: zenit añil, banda de horizonte en
        // magenta (contaminación lumínica de la ciudad) y suelo oscuro
        // tibio — esto se ve reflejado/refractado en el vidrio de la torre.
        colorTop: { value: new THREE.Color(0x1c1140) },
        colorMid: { value: new THREE.Color(0xff3d78) },
        colorBottom: { value: new THREE.Color(0x0a0612) },
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
    const ambient = new THREE.AmbientLight(0x3a2350, 0.5)
    this.scene.add(ambient)

    // Luz cálida = neón magenta (marquesina/rótulo), luz fría = neón cian.
    this.keyLight = new THREE.PointLight(0xff2d78, 55, 70, 2)
    this.keyLight.position.set(9, 5, 12)
    this.scene.add(this.keyLight)

    this.fillLight = new THREE.PointLight(0x22d3ee, 32, 70, 2)
    this.fillLight.position.set(-11, -3, 6)
    this.scene.add(this.fillLight)

    this.updaters.push((elapsed) => {
      // Deriva de temperatura de color lenta e independiente del scroll:
      // sensación de que pasa el tiempo, no un "loop" mecánico. Hue ~0.92
      // mantiene el magenta/rosa neón como base en vez del naranja original.
      const cycle = Math.sin(elapsed * 0.025)
      this.keyLight.color.setHSL(
        0.92 + cycle * (0.015 + this.entityUnrest * 0.01) + this.sceneMood * 0.02 + this.entityWarmth * 0.03,
        0.85,
        0.56
      )
      this.keyLight.intensity = 48 + cycle * 10 + this.scrollProgress * 14
      this.fillLight.intensity = 28 + Math.cos(elapsed * 0.021) * 6
      this.keyLight.position.x = 9 + Math.sin(elapsed * 0.09) * 3
      this.keyLight.position.y = 5 + Math.cos(elapsed * 0.07) * 2
    })
  }

  // ---------------------------------------------------------------------
  // Escena — plano lejano
  // ---------------------------------------------------------------------

  /** Carretera nocturna: horizonte, no decoración — atmósfera y fuga de perspectiva. */
  private buildRoad() {
    const geometry = new THREE.PlaneGeometry(220, 220, 1, 1)
    this.roadUniforms = { time: { value: 0 }, introFade: { value: 0 } }
    const material = new THREE.ShaderMaterial({
      uniforms: {
        ...this.roadUniforms,
        colorA: { value: new THREE.Color(0x22d3ee) },
        colorB: { value: new THREE.Color(0xff2d78) },
      },
      vertexShader: ROAD_VERTEX_SHADER,
      fragmentShader: ROAD_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    const floor = new THREE.Mesh(geometry, material)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -13
    this.farGroup.add(floor)

    this.updaters.push((elapsed, _delta, intro) => {
      material.uniforms.time.value = elapsed
      material.uniforms.introFade.value = intro
    })
  }

  /** Skyline de Miami: edificios con ventanas encendidas alternados con palmeras en silueta. */
  private buildFarSkyline() {
    const silhouetteMat = new THREE.MeshBasicMaterial({ color: 0x0a0612, fog: true, transparent: true, opacity: 0.92 })
    const windowColors = [0xffd166, 0x22d3ee, 0xff3d81]
    const shapes: THREE.Object3D[] = []

    for (let i = 0; i < 9; i++) {
      const isPalm = i % 3 === 2
      const xPos = (Math.random() - 0.5) * 78
      const zPos = -32 - Math.random() * 20

      if (isPalm) {
        const palm = new THREE.Group()
        const trunkHeight = 5 + Math.random() * 3
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.28, trunkHeight, 6), silhouetteMat)
        trunk.position.y = -13 + trunkHeight / 2
        trunk.rotation.z = (Math.random() - 0.5) * 0.18
        palm.add(trunk)

        const frondCount = 6
        for (let f = 0; f < frondCount; f++) {
          const angle = (f / frondCount) * Math.PI * 2
          const frond = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 0.32), silhouetteMat)
          frond.position.set(Math.cos(angle) * 1.1, -13 + trunkHeight + 0.15, Math.sin(angle) * 0.44)
          frond.rotation.y = angle
          frond.rotation.z = 0.5
          palm.add(frond)
        }
        palm.position.set(xPos, 0, zPos + 8)
        this.farGroup.add(palm)
        shapes.push(palm)
      } else {
        const width = 0.9 + Math.random() * 1.3
        const height = 6 + Math.random() * 12
        const depth = 0.9 + Math.random() * 1.3
        const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), silhouetteMat)
        building.position.set(xPos, -13 + height / 2, zPos)
        this.farGroup.add(building)
        shapes.push(building)

        const windowCount = 2 + Math.floor(Math.random() * 3)
        for (let w = 0; w < windowCount; w++) {
          const winColor = windowColors[Math.floor(Math.random() * windowColors.length)]
          const winMat = new THREE.MeshBasicMaterial({
            color: winColor,
            transparent: true,
            opacity: 0.55 + Math.random() * 0.35,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
          const win = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.7, height * 0.12), winMat)
          win.position.set(
            xPos + (Math.random() - 0.5) * width * 0.3,
            -13 + Math.random() * height * 0.8 + height * 0.1,
            zPos + depth / 2 + 0.02
          )
          this.farGroup.add(win)
          shapes.push(win)
        }
      }
    }

    this.updaters.push((elapsed) => {
      shapes.forEach((s, i) => {
        s.position.y += Math.sin(elapsed * 0.02 + i) * 0.0012
      })
    })
  }

  /** Sol/luna bajo de horizonte con bandas cortadas — el atardecer de Miami detrás del skyline. */
  private buildHorizonSun() {
    const uniforms = { time: { value: 0 }, introFade: { value: 0 } }
    const material = new THREE.ShaderMaterial({
      uniforms: {
        ...uniforms,
        coreColor: { value: new THREE.Color(0xff5b7c) },
        rimColor: { value: new THREE.Color(0xffb04d) },
      },
      vertexShader: SUN_VERTEX_SHADER,
      fragmentShader: SUN_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    const sun = new THREE.Mesh(new THREE.PlaneGeometry(46, 46, 1, 1), material)
    sun.position.set(-2, 4.5, -55)
    this.farGroup.add(sun)

    this.updaters.push((elapsed, _delta, intro) => {
      material.uniforms.time.value = elapsed
      material.uniforms.introFade.value = intro
    })
  }

  private buildLightShaft() {
    this.shaftUniforms = { time: { value: 0 }, introFade: { value: 0 } }
    const geometry = new THREE.PlaneGeometry(14, 46, 1, 1)
    const material = new THREE.ShaderMaterial({
      uniforms: { ...this.shaftUniforms, shaftColor: { value: new THREE.Color(0xff5fa8) } },
      vertexShader: SHAFT_VERTEX_SHADER,
      fragmentShader: SHAFT_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    // Reubicado como el haz de neón que sube desde la torre focal, en vez de
    // una fuente de luz genérica en el costado de la escena.
    const shaft = new THREE.Mesh(geometry, material)
    shaft.position.set(-3.2, 8, -5)
    shaft.rotation.z = 0.05
    shaft.rotation.x = -0.06
    this.farGroup.add(shaft)

    this.updaters.push((elapsed, _delta, intro) => {
      material.uniforms.time.value = elapsed
      material.uniforms.introFade.value = intro
    })
  }

  /** Tráfico: faros blancos que se acercan y luces de freno rojas que se alejan, en loop sobre la carretera. */
  private buildTrafficStreaks() {
    const COUNT = 12
    const streaks: { mesh: THREE.Mesh; speed: number; dir: number }[] = []
    const streakGeometry = new THREE.PlaneGeometry(0.32, 3.2)

    for (let i = 0; i < COUNT; i++) {
      const oncoming = i % 2 === 0
      const color = oncoming ? 0xfff2d6 : 0xff2d4d
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const mesh = new THREE.Mesh(streakGeometry, material)
      const laneX = oncoming ? -4.6 - Math.random() * 1.6 : 4.6 + Math.random() * 1.6
      mesh.position.set(laneX, -12.55, -60 + Math.random() * 90)
      mesh.rotation.x = -Math.PI / 2
      this.farGroup.add(mesh)
      streaks.push({ mesh, speed: 14 + Math.random() * 10, dir: oncoming ? 1 : -1 })
    }

    this.updaters.push((_elapsed, delta, intro) => {
      streaks.forEach((s) => {
        s.mesh.position.z += s.dir * s.speed * delta * intro
        if (s.mesh.position.z > 30) s.mesh.position.z = -60
        if (s.mesh.position.z < -60) s.mesh.position.z = 30
        s.mesh.scale.y = 1 + Math.min(this.scrollVelocity * 40, 3)
      })
    })
  }

  // ---------------------------------------------------------------------
  // Escena — plano medio: bruma
  // ---------------------------------------------------------------------

  private buildDust() {
    const COUNT = 420
    const positions = new Float32Array(COUNT * 3)
    const seeds = new Float32Array(COUNT * 3)
    const sizes = new Float32Array(COUNT)

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * 55
      positions[i3 + 1] = (Math.random() - 0.5) * 36
      positions[i3 + 2] = (Math.random() - 0.5) * 46 - 8

      seeds[i3] = Math.random() * Math.PI * 2
      seeds[i3 + 1] = this.reducedMotion ? 0.02 : 0.12 + Math.random() * 0.25
      seeds[i3 + 2] = this.reducedMotion ? 0.05 : 0.4 + Math.random() * 1.8

      sizes[i] = 5 + Math.random() * 8
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))

    this.dustUniforms = {
      time: { value: 0 },
      mouseNDC: { value: new THREE.Vector2(2, 2) },
      mouseStrength: { value: this.reducedMotion ? 0 : 1 },
      warmLightPos: { value: this.keyLight.position.clone() },
      coolLightPos: { value: this.fillLight.position.clone() },
      introFade: { value: 0 },
    }

    const material = new THREE.ShaderMaterial({
      uniforms: {
        ...this.dustUniforms,
        warmColor: { value: new THREE.Color(0xff6fa8) },
        coolColor: { value: new THREE.Color(0x22d3ee) },
      },
      vertexShader: DUST_VERTEX_SHADER,
      fragmentShader: DUST_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const points = new THREE.Points(geometry, material)
    this.midGroup.add(points)

    this.updaters.push((elapsed) => {
      points.rotation.y = elapsed * 0.008
      this.dustUniforms.warmLightPos.value.copy(this.keyLight.position)
    })
  }

  /** Adornos de neón: pocos, orbitando con intención alrededor de la torre — no relleno al azar. */
  private buildSatellites() {
    const geometries = [new THREE.OctahedronGeometry(1, 2), new THREE.TorusGeometry(0.6, 0.2, 20, 56)]
    const bodies: { mesh: THREE.Mesh; rim: THREE.Mesh; angle: number; radius: number; speed: number; tilt: number }[] = []
    const COUNT = 4

    for (let i = 0; i < COUNT; i++) {
      const isCyan = i % 2 === 0
      const geometry = geometries[i % geometries.length]
      const material = new THREE.MeshPhysicalMaterial({
        color: isCyan ? 0x22d3ee : 0xff2d78,
        roughness: 0.24,
        metalness: 0.85,
        clearcoat: 0.6,
        clearcoatRoughness: 0.25,
        envMapIntensity: 1.3,
        emissive: isCyan ? 0x0b3a3d : 0x3d0b28,
        emissiveIntensity: 0.32,
      })
      const scale = 0.4 + Math.random() * 0.35
      const mesh = new THREE.Mesh(geometry, material)
      mesh.scale.setScalar(scale)

      const rimMaterial = new THREE.ShaderMaterial({
        uniforms: { glowColor: { value: new THREE.Color(isCyan ? 0x67e8f9 : 0xff8fc4) } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        vertexShader: `
          varying vec3 vNormal; varying vec3 vViewDir;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewDir = normalize(-mvPosition.xyz);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vNormal; varying vec3 vViewDir; uniform vec3 glowColor;
          void main() {
            float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.5);
            gl_FragColor = vec4(glowColor, fresnel * 0.85);
          }
        `,
      })
      const rim = new THREE.Mesh(geometry, rimMaterial)
      rim.scale.setScalar(scale * 1.2)

      this.midGroup.add(mesh, rim)
      bodies.push({
        mesh,
        rim,
        angle: (i / COUNT) * Math.PI * 2,
        radius: 4.5 + i * 1.3,
        speed: 0.035 + i * 0.006,
        tilt: (Math.random() - 0.5) * 0.5,
      })
    }

    const towerOffset = new THREE.Vector3(-3.2, 0.8, -1.5)

    this.updaters.push((_elapsed, delta, intro) => {
      const speedFactor = (this.reducedMotion ? 0.12 : 1) * intro
      bodies.forEach((b) => {
        b.angle += delta * b.speed * (this.reducedMotion ? 0.2 : 1)
        const x = towerOffset.x + Math.cos(b.angle) * b.radius
        const z = towerOffset.z + Math.sin(b.angle) * b.radius * 0.6 - 4
        const y = towerOffset.y + Math.sin(b.angle * 1.4) * b.tilt * b.radius * 0.3
        b.mesh.position.set(x, y, z)
        b.mesh.rotation.x += delta * 0.1 * speedFactor
        b.mesh.rotation.y += delta * 0.14 * speedFactor
        b.rim.position.copy(b.mesh.position)
        b.rim.rotation.copy(b.mesh.rotation)
      })
    })
  }

  // ---------------------------------------------------------------------
  // Escena — plano cercano: la pieza focal
  // ---------------------------------------------------------------------

  /**
   * La torre Art Deco: pieza focal única. Tres cuerpos hexagonales de
   * vidrio en retranqueo (setback), con anillos de neón por nivel y una
   * baliza en la aguja — la silueta de un hotel de Ocean Drive. El vidrio
   * conserva el desplazamiento de vértices por ruido en el propio shader
   * (inyectado vía onBeforeCompile sobre MeshPhysicalMaterial), así
   * mantiene PBR/transmisión real — superficie "viva".
   */
  private buildFocalTower() {
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
    this.towerShaderRefs.push(shaderRef)

    const tiers = [
      { radius: 2.5, height: 7, tint: 0xff2d78 },
      { radius: 1.7, height: 3.4, tint: 0x22d3ee },
      { radius: 1.0, height: 2.4, tint: 0xff2d78 },
    ]

    let y = -13
    const trimRings: THREE.Mesh[] = []
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
      trimRings.push(ring)
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
    this.nearGroup.add(group)

    this.updaters.push((elapsed, delta, intro) => {
      shaderRef.uTime.value = elapsed
      group.rotation.y += delta * (0.045 + this.entityPresence * 0.02) * intro
      trimRings.forEach((ring, i) => {
        const mat = ring.material as THREE.MeshBasicMaterial
        mat.opacity = 0.6 + 0.4 * Math.sin(elapsed * 0.8 + i * 1.7)
      })
      beacon.intensity = 6 + Math.max(0, Math.sin(elapsed * 1.6)) * 10
    })
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

  /** Encuadre coreografiado: funde continuamente entre los `SHOTS`, en vez de ruido sin fin. */
  private computeShotFrame(elapsed: number): { pos: THREE.Vector3; look: THREE.Vector3; fovBias: number } {
    const t = elapsed % this.totalShotDuration
    let acc = 0
    for (let i = 0; i < SHOTS.length; i++) {
      const shot = SHOTS[i]
      const next = SHOTS[(i + 1) % SHOTS.length]
      if (t < acc + shot.duration || i === SHOTS.length - 1) {
        const local = smootherstep((t - acc) / shot.duration)
        return {
          pos: shot.pos.clone().lerp(next.pos, local),
          look: shot.look.clone().lerp(next.look, local),
          fovBias: shot.fovBias + (next.fovBias - shot.fovBias) * local,
        }
      }
      acc += shot.duration
    }
    return { pos: SHOTS[0].pos.clone(), look: SHOTS[0].look.clone(), fovBias: 0 }
  }

  // ---------------------------------------------------------------------
  // Ciclo de vida
  // ---------------------------------------------------------------------

  start() {
    this.startTime = this.clock.getElapsedTime()
    // Entrada deliberada: arranca desde un encuadre alto y distante (como
    // una toma aérea) y desciende hacia el primer plano — una "llegada",
    // no un simple crossfade. reducedMotion la colapsa casi a un corte.
    const introDuration = this.reducedMotion ? 0.4 : 3.1
    const introStartPos = SHOTS[0].pos.clone().add(new THREE.Vector3(-2.5, 8.5, 21))

    const loop = () => {
      if (this.disposed) return
      this.rafId = requestAnimationFrame(loop)
      if (this.paused) return

      const delta = Math.min(this.clock.getDelta(), 0.05)
      const elapsed = this.clock.getElapsedTime()
      const sinceStart = elapsed - this.startTime
      const intro = smootherstep(sinceStart / introDuration)

      // El "settle": el instante exacto en que la cámara termina de llegar.
      // Es el momento WOW real de la entrada — un pulso de luz/bloom que
      // dispara una sola vez, sincronizado con el DOM vía --scene-kick.
      if (!this.introClimaxFired && intro >= 0.92 && !this.reducedMotion) {
        this.introClimaxFired = true
        this.arrivalKick = 1
      }

      const prevPointerX = this.pointer.x
      const prevPointerY = this.pointer.y
      this.pointer.x += (this.pointerTarget.x - this.pointer.x) * 0.07
      this.pointer.y += (this.pointerTarget.y - this.pointer.y) * 0.07
      this.pointerVelocity = Math.hypot(this.pointer.x - prevPointerX, this.pointer.y - prevPointerY)

      const prevScroll = this.scrollProgress
      this.scrollProgress += (this.scrollTarget - this.scrollProgress) * 0.06
      this.scrollVelocity = Math.abs(this.scrollProgress - prevScroll)

      // Deriva muy lenta hacia el "mood" de la sección real activa, y hacia
      // la intención de cursor real (hover sobre UI interactiva), ambas
      // publicadas por la UI vía scene-bus. Lerp lento a propósito: son
      // desvíos de atmósfera, no reacciones bruscas.
      this.sceneMood += (this.sceneMoodTarget - this.sceneMood) * 0.02
      this.pointerIntent += (this.pointerIntentTarget - this.pointerIntent) * 0.08
      this.entityWarmth += (this.entityWarmthTarget - this.entityWarmth) * 0.015
      this.entityUnrest += (this.entityUnrestTarget - this.entityUnrest) * 0.03
      this.entityPresence += (this.entityPresenceTarget - this.entityPresence) * 0.02

      // Coreografía de cámara + parallax de cursor + dolly de scroll + apertura de escena.
      const frame = this.computeShotFrame(elapsed)
      const dolly = frame.pos.clone().add(new THREE.Vector3(0, 0, -this.scrollProgress * 6))
      const targetPos = introStartPos.clone().lerp(dolly, intro)
      this.camera.position.lerp(targetPos, this.reducedMotion ? 1 : 0.06)
      this.camera.position.x += this.pointer.x * 1.4
      this.camera.position.y += -this.pointer.y * 0.9

      const lookTarget = frame.look.clone().lerp(new THREE.Vector3(0, 0, 0), 1 - intro)
      this.camera.lookAt(lookTarget)
      this.camera.rotation.z = this.reducedMotion ? 0 : this.pointer.x * -0.012

      const targetFov = this.baseFov + frame.fovBias + this.scrollProgress * 5 + this.sceneMood * 4
      this.camera.fov += (targetFov - this.camera.fov) * 0.04
      this.camera.updateProjectionMatrix()

      this.bokehPass.materialBokeh.uniforms.focus.value = 22 - this.scrollProgress * 7

      // Parallax real por profundidad de plano.
      this.farGroup.position.x = -this.pointer.x * 0.4
      this.farGroup.position.y = this.pointer.y * 0.25
      this.midGroup.position.x = this.pointer.x * 1.1
      this.midGroup.position.y = -this.pointer.y * 0.7
      this.midGroup.rotation.y = this.scrollProgress * 0.35
      this.nearGroup.position.x = this.pointer.x * 2.1
      this.nearGroup.position.y = -this.pointer.y * 1.3

      this.dustUniforms.time.value = elapsed
      this.dustUniforms.mouseNDC.value.set(this.pointer.x, -this.pointer.y)
      // Hover real sobre UI interactiva (no solo mover el mouse) intensifica
      // la respuesta de la bruma, encima de la base por intro.
      this.dustUniforms.mouseStrength.value = this.reducedMotion
        ? 0
        : Math.min(intro + this.pointerIntent * 0.6, 1.6)
      this.dustUniforms.introFade.value = intro

      this.gradePass.uniforms.time.value = elapsed * 0.6
      this.gradePass.uniforms.fadeIn.value = intro
      this.gradePass.uniforms.grainStrength.value = 0.03 + this.entityUnrest * 0.025
      const kick = this.reducedMotion
        ? 0
        : Math.min(
            this.pointerVelocity * 1.3 +
              this.scrollVelocity * 6 +
              this.pointerIntent * 0.003 +
              this.entityUnrest * 0.0015,
            0.009
          )
      this.arrivalKick *= 0.92
      this.gradePass.uniforms.chromaKick.value = Math.min(kick + this.arrivalKick * 0.006, 0.014)
      this.bloomPass.strength =
        0.8 * intro +
        (this.reducedMotion ? 0 : this.pointerIntent * 0.3) +
        this.entityPresence * 0.15 +
        this.arrivalKick * 0.35

      for (const update of this.updaters) update(elapsed, delta, intro)

      this.composer.render()

      // Motor → DOM: cada 3 frames alcanza de sobra para que las cards y el
      // hero sigan la luz de la escena sin forzar repaint en cada frame.
      this.ambientFrameCounter++
      if (this.ambientFrameCounter % 3 === 0) {
        this.tmpProjectVec.copy(this.keyLight.position).project(this.camera)
        const angleRad = Math.atan2(this.tmpProjectVec.x, this.tmpProjectVec.y)
        const lightAngleDeg = ((angleRad * 180) / Math.PI + 360) % 360
        webglSceneBus.publishAmbient({
          lightAngleDeg,
          warmth: Math.min(Math.max(0.5 + this.entityWarmth * 0.5 + this.sceneMood * 0.1, 0), 1),
          intensity: Math.min(Math.max(this.bloomPass.strength / 1.3, 0), 1),
          kick: this.arrivalKick,
          intro,
        })
      }
    }
    this.rafId = requestAnimationFrame(loop)
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value
    this.dustUniforms.mouseStrength.value = value ? 0 : 1
  }

  dispose() {
    this.disposed = true
    if (this.rafId) cancelAnimationFrame(this.rafId)
    window.removeEventListener('resize', this.handleResize)
    window.removeEventListener('pointermove', this.handlePointerMove)
    window.removeEventListener('scroll', this.handleScroll)
    document.removeEventListener('visibilitychange', this.handleVisibility)
    this.unsubscribeSceneBus?.()

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
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
