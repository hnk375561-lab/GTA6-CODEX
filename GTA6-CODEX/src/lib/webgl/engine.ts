import * as THREE from 'three'
import { webglSceneBus } from './scene-bus'

/**
 * Rediseño completo del motor de fondo — "Horizonte mínimo".
 * ---------------------------------------------------------------------------
 * El motor anterior (ciudad nocturna: torre focal, carretera, tráfico,
 * aves, semáforos, polvo, ~25 módulos en `./scene/*`) quedó reemplazado
 * por decisión explícita del usuario ("el motor gráfico no me convence en
 * lo absoluto... empecemos su rediseño"), tras elegir esta composición
 * entre 4 propuestas: una sola línea de horizonte, muy sutil, sobre un
 * degradado vertical casi negro. Sin geometría de ciudad, sin parallax
 * fuerte, sin postprocessing (`EffectComposer`/bloom/bokeh/FXAA) — no
 * hace falta: toda la escena es UN plano de pantalla completa con un
 * shader propio, así que el "glow" de la línea ya está resuelto dentro
 * del fragment shader (`glowCore`/`glowSoft` más abajo) en vez de vía un
 * pase de bloom aparte. Los ~25 archivos de `./scene/*`, `./core/*`,
 * `./shaders/*` y `./config/*` del motor anterior se borraron: nada fuera
 * de `engine.ts` los importaba (verificado antes de borrar).
 *
 * Contrato público preservado a propósito (mismo constructor, mismos 4
 * métodos: `start()`, `setReducedMotion()`, `dispose()`) para que
 * `WebGLBackground.tsx` no necesite ningún cambio, y sigue publicando en
 * `webglSceneBus.publishAmbient()` la misma forma exacta de `SceneAmbient`
 * (5 campos) que ya consumen `SceneAmbientBridge`, `Card.tsx`,
 * `MagicCard.tsx` y `PageTransitionBridge` — esos archivos tampoco se
 * tocaron. La respiración lenta de la línea de horizonte (`breathe` más
 * abajo) alimenta `warmth`/`intensity`, así que el resto de la UI (chips,
 * bordes de card) respira al mismo ritmo que el fondo en vez de tener su
 * propio pulso inventado.
 */

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uPointerY;
  uniform float uIntro;
  uniform float uReducedMotion;

  float grain(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = vUv;

    // Respiración lenta (~52s de período) — apagada del todo con
    // reduced-motion, no solo atenuada, para que la escena quede
    // realmente estática y no "casi quieta".
    float breathe = uReducedMotion > 0.5 ? 0.5 : sin(uTime * 0.12) * 0.5 + 0.5;
    float pointerShift = uReducedMotion > 0.5 ? 0.0 : uPointerY * 0.018;
    float horizonY = 0.46 + pointerShift + (breathe - 0.5) * 0.012;

    float dist = uv.y - horizonY;
    float glowCore = exp(-pow(dist * 140.0, 2.0));
    float glowSoft = exp(-abs(dist) * 9.0);
    float brightness = 0.5 + breathe * 0.22;

    vec3 colorTop = vec3(0.018);
    vec3 colorBottom = vec3(0.01);
    vec3 base = mix(colorBottom, colorTop, smoothstep(0.0, 1.0, uv.y));
    base += vec3(0.012) * glowSoft;

    vec3 lineColor = vec3(0.82, 0.82, 0.83) * (glowCore * brightness * 1.25 + glowSoft * brightness * 0.16);

    vec3 color = base + lineColor;

    // Grano sutil: evita banding en el degradado y le da una textura casi
    // imperceptible de foto/film en vez de un plano CSS perfecto.
    float g = grain(uv * uResolution.xy * 0.75 + uTime * 0.6);
    color += (g - 0.5) * 0.01;

    color *= uIntro;
    gl_FragColor = vec4(color, 1.0);
  }
`

export class AutoFichaWebGLEngine {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.OrthographicCamera
  private material: THREE.ShaderMaterial
  private clock: THREE.Clock

  private pointerY = 0
  private pointerYTarget = 0
  private reducedMotion: boolean
  private returningVisitor: boolean

  private introStart = 0
  private readonly introDurationMs: number

  private rafId: number | null = null
  private paused = false
  private contextLost = false
  private lifecycle: 'idle' | 'running' | 'disposed' = 'idle'
  private ambientFrameCounter = 0
  private arrivalKick = 0
  private lastFocusSectionId: string | null = null

  private readonly abortController = new AbortController()
  private unsubscribeSceneBus: (() => void) | null = null

  constructor(canvas: HTMLCanvasElement, opts: { reducedMotion: boolean; returningVisitor?: boolean }) {
    this.reducedMotion = opts.reducedMotion
    this.returningVisitor = opts.returningVisitor ?? false
    // Visita recurrente: fundido corto (ya vio la coreografía de apertura
    // antes en esta sesión de navegador). Primera visita: un poco más
    // largo para que el fundido en sí se note como una pequeña apertura.
    this.introDurationMs = this.returningVisitor ? 450 : 1300

    this.clock = new THREE.Clock()
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      // No hay geometría 3D real ni luces que calcular — un plano de
      // pantalla completa con un shader propio no necesita la GPU
      // discreta. 'low-power' es más coherente con el pedido de un fondo
      // "chill": menos consumo, menos ruido de ventilador, sin ningún
      // costo visual (la escena es idéntica en cualquier GPU).
      powerPreference: 'low-power',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    this.renderer.setSize(window.innerWidth, window.innerHeight, false)

    this.scene = new THREE.Scene()
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uTime: { value: 0 },
        uPointerY: { value: 0 },
        uIntro: { value: 0 },
        uReducedMotion: { value: this.reducedMotion ? 1 : 0 },
      },
      depthTest: false,
      depthWrite: false,
    })
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material)
    this.scene.add(quad)

    const { signal } = this.abortController
    window.addEventListener('resize', this.handleResize, { signal })
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true, signal })
    document.addEventListener('visibilitychange', this.handleVisibility, { signal })
    canvas.addEventListener('webglcontextlost', this.handleContextLost, { signal })
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored, { signal })

    this.unsubscribeSceneBus = webglSceneBus.subscribe(() => {
      // Pulso de llegada: sube a 1 cuando cambia la sección enfocada
      // (`SceneFocus.sectionId`, publicado por `SceneSection` en cada
      // sección instrumentada) y decae solo — mismo lenguaje que usaba
      // el motor anterior, para que Card.tsx/MagicCard.tsx (que ya leen
      // `kick` de `SceneAmbientBridge`) sigan teniendo ese pulso al
      // navegar entre secciones, aunque la escena de fondo en sí sea
      // estática.
      const snapshot = webglSceneBus.getSnapshot()
      if (snapshot.focus.sectionId !== this.lastFocusSectionId) {
        this.lastFocusSectionId = snapshot.focus.sectionId
        this.arrivalKick = 1
      }
    })
  }

  private handleResize = () => {
    this.renderer.setSize(window.innerWidth, window.innerHeight, false)
    this.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight)
  }

  private handlePointerMove = (e: PointerEvent) => {
    this.pointerYTarget = (e.clientY / window.innerHeight) * 2 - 1
  }

  private handleVisibility = () => {
    this.paused = document.hidden
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault()
    this.contextLost = true
  }

  private handleContextRestored = () => {
    this.contextLost = false
  }

  start() {
    if (this.lifecycle === 'disposed') return
    this.lifecycle = 'running'
    this.introStart = performance.now()

    const loop = () => {
      if (this.lifecycle === 'disposed') return
      this.rafId = requestAnimationFrame(loop)
      if (this.paused || this.contextLost) return

      const elapsed = this.clock.getElapsedTime()
      this.pointerY += (this.pointerYTarget - this.pointerY) * 0.05
      this.arrivalKick *= 0.94

      const intro = this.reducedMotion
        ? 1
        : Math.min((performance.now() - this.introStart) / this.introDurationMs, 1)

      this.material.uniforms.uTime.value = elapsed
      this.material.uniforms.uPointerY.value = this.pointerY
      this.material.uniforms.uIntro.value = intro

      this.renderer.render(this.scene, this.camera)

      this.ambientFrameCounter++
      if (this.ambientFrameCounter % 3 === 0) {
        const breathe = this.reducedMotion ? 0.5 : Math.sin(elapsed * 0.12) * 0.5 + 0.5
        webglSceneBus.publishAmbient({
          lightAngleDeg: 90,
          warmth: breathe,
          intensity: Math.min(0.4 + breathe * 0.4 + this.arrivalKick * 0.2, 1),
          kick: this.arrivalKick,
          intro,
        })
      }
    }
    this.rafId = requestAnimationFrame(loop)
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value
    this.material.uniforms.uReducedMotion.value = value ? 1 : 0
  }

  dispose() {
    if (this.lifecycle === 'disposed') return
    this.lifecycle = 'disposed'
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
    this.abortController.abort()
    this.unsubscribeSceneBus?.()
    this.material.dispose()
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.geometry.dispose()
    })
    this.renderer.dispose()
  }
}
