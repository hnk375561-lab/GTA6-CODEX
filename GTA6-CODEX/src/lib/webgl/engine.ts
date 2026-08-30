import { webglSceneBus } from './scene-bus'

/**
 * Motor de fondo — "Horizonte vivo" (Canvas 2D, sin three.js/WebGL).
 * ---------------------------------------------------------------------------
 * Reemplaza por completo al motor anterior (three.js + shader GLSL,
 * "horizonte mínimo") por decisión explícita del usuario: el fondo se sentía
 * pesado/lageado en la práctica (three.js completo ~600kb + un <canvas>
 * fixed a pantalla completa compitiendo por frame con Lenis y los ~11
 * elementos con backdrop-filter del resto del sitio). Se descartaron 3
 * alternativas (CSS scroll-timeline puro, WebGL scroll-reactivo, SVG morph
 * por sección) en favor de esta: Canvas 2D, sin dependencias, cuya
 * intensidad reacciona a la VELOCIDAD real de scroll en vez de a un reloj
 * propio — "vivo" en el sentido literal de responder al gesto del usuario,
 * no de animarse solo de fondo.
 *
 * Contrato público preservado a propósito (mismo constructor, mismos 4
 * métodos: `start()`, `setReducedMotion()`, `dispose()`) para que
 * `WebGLBackground.tsx` no necesite ningún cambio, y sigue publicando en
 * `webglSceneBus.publishAmbient()` la misma forma exacta de `SceneAmbient`
 * (5 campos) que ya consumen `SceneAmbientBridge`, `Card.tsx`
 * y `PageTransitionBridge`.
 *
 * De dónde sale la velocidad de scroll: NO se agrega un listener de scroll
 * propio. `scroll-telemetry.tsx` ya publica `webglSceneBus.setScrollProgress
 * (progress, velocity)` a partir del scroll nativo real (sitio estático,
 * sin motor de scroll con inercia) — este motor solo se suscribe a
 * `webglSceneBus` (`subscribe`, ya existía para el foco de sección) y lee
 * `getSnapshot().scroll.velocity` en su propio loop de dibujo. Con
 * reduced-motion, `ScrollTelemetryProvider` ni se monta (ver
 * scroll-telemetry.tsx), así que `scroll.velocity` queda siempre en 0 — el
 * motor ya lo maneja como "sin streaks", coherente sin necesitar un caso
 * especial.
 */

const MAX_DPR = 1.5
const IDLE_VELOCITY_EPSILON = 0.02

interface Streak {
  y: number
  length: number
  speed: number
  opacity: number
}

export class AutoFichaWebGLEngine {
  private ctx: CanvasRenderingContext2D
  private width = 0
  private height = 0
  private dpr = 1

  private reducedMotion: boolean
  private returningVisitor: boolean

  private startTime = 0
  private introStart = 0
  private readonly introDurationMs: number

  private rafId: number | null = null
  private paused = false
  private lifecycle: 'idle' | 'running' | 'disposed' = 'idle'
  private ambientFrameCounter = 0
  private arrivalKick = 0
  private lastFocusSectionId: string | null = null

  // Velocidad de scroll suavizada (evita que un solo tick ruidoso de Lenis
  // dispare/corte streaks de golpe) y su pico reciente, con decaimiento
  // propio para que el efecto se apague solo al dejar de scrollear en vez
  // de cortar en seco.
  private smoothedVelocity = 0
  private streaks: Streak[] = []

  private readonly abortController = new AbortController()
  private unsubscribeSceneBus: (() => void) | null = null

  constructor(canvas: HTMLCanvasElement, opts: { reducedMotion: boolean; returningVisitor?: boolean }) {
    this.reducedMotion = opts.reducedMotion
    this.returningVisitor = opts.returningVisitor ?? false
    this.introDurationMs = this.returningVisitor ? 450 : 1300

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) throw new Error('[AutoFichaWebGLEngine] Canvas 2D no disponible')
    this.ctx = ctx

    this.resize(canvas)

    const { signal } = this.abortController
    window.addEventListener('resize', () => this.resize(canvas), { signal })
    document.addEventListener('visibilitychange', this.handleVisibility, { signal })

    this.unsubscribeSceneBus = webglSceneBus.subscribe(() => {
      const snapshot = webglSceneBus.getSnapshot()
      if (snapshot.focus.sectionId !== this.lastFocusSectionId) {
        this.lastFocusSectionId = snapshot.focus.sectionId
        this.arrivalKick = 1
      }
    })
  }

  private resize(canvas: HTMLCanvasElement) {
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    this.width = window.innerWidth
    this.height = window.innerHeight
    canvas.width = Math.round(this.width * this.dpr)
    canvas.height = Math.round(this.height * this.dpr)
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  private handleVisibility = () => {
    this.paused = document.hidden
  }

  private spawnStreak() {
    this.streaks.push({
      y: Math.random() * this.height,
      length: 60 + Math.random() * 140,
      speed: 4 + Math.random() * 6,
      opacity: 0.08 + Math.random() * 0.1,
    })
    // Techo defensivo: nunca más de 40 streaks vivos a la vez, aunque el
    // usuario scrollee muy rápido y muy sostenido.
    if (this.streaks.length > 40) this.streaks.shift()
  }

  start() {
    if (this.lifecycle === 'disposed') return
    this.lifecycle = 'running'
    this.startTime = performance.now()
    this.introStart = this.startTime

    const loop = (now: number) => {
      if (this.lifecycle === 'disposed') return
      this.rafId = requestAnimationFrame(loop)
      if (this.paused) return

      const elapsedS = (now - this.startTime) / 1000
      const intro = this.reducedMotion ? 1 : Math.min((now - this.introStart) / this.introDurationMs, 1)

      const rawVelocity = this.reducedMotion ? 0 : Math.abs(webglSceneBus.getSnapshot().scroll.velocity)
      this.smoothedVelocity += (rawVelocity - this.smoothedVelocity) * 0.12
      this.arrivalKick *= 0.94

      // Respiración lenta de base (ambiente en reposo, sutil) + boost real
      // cuando hay velocidad de scroll — esto es lo que hace que el fondo
      // se sienta "vivo" al gesto del usuario y no solo a un reloj.
      const breathe = this.reducedMotion ? 0.5 : Math.sin(elapsedS * 0.12) * 0.5 + 0.5
      const scrollBoost = Math.min(this.smoothedVelocity * 0.045, 1)

      this.draw(breathe, scrollBoost, intro)

      if (!this.reducedMotion && this.smoothedVelocity > IDLE_VELOCITY_EPSILON && Math.random() < scrollBoost * 0.5) {
        this.spawnStreak()
      }

      this.ambientFrameCounter++
      if (this.ambientFrameCounter % 3 === 0) {
        webglSceneBus.publishAmbient({
          lightAngleDeg: 90,
          warmth: breathe,
          intensity: Math.min(0.4 + breathe * 0.3 + scrollBoost * 0.35 + this.arrivalKick * 0.2, 1),
          kick: this.arrivalKick,
          intro,
        })
      }
    }
    this.rafId = requestAnimationFrame(loop)
  }

  private draw(breathe: number, scrollBoost: number, intro: number) {
    const { ctx, width, height } = this
    ctx.clearRect(0, 0, width, height)

    // Degradado vertical casi negro, mismo lenguaje tonal que el motor
    // anterior — el rediseño cambia CÓMO reacciona la escena, no la
    // paleta "Night Test Track" ya elegida.
    const bg = ctx.createLinearGradient(0, 0, 0, height)
    bg.addColorStop(0, 'rgb(5, 5, 5)')
    bg.addColorStop(1, 'rgb(3, 3, 3)')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    // Línea de horizonte con glow (radial suave) — respira con `breathe` y
    // se intensifica un poco con `scrollBoost`, igual que hacía la escena
    // WebGL, pero calculado en 2D en vez de en un fragment shader.
    const horizonY = height * (0.46 + (breathe - 0.5) * 0.01)
    const glow = ctx.createLinearGradient(0, horizonY - 120, 0, horizonY + 120)
    const glowAlpha = (0.05 + breathe * 0.03 + scrollBoost * 0.04) * intro
    glow.addColorStop(0, 'rgba(210, 210, 213, 0)')
    glow.addColorStop(0.5, `rgba(210, 210, 213, ${glowAlpha})`)
    glow.addColorStop(1, 'rgba(210, 210, 213, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, horizonY - 120, width, 240)

    ctx.fillStyle = `rgba(209, 209, 211, ${(0.55 + breathe * 0.25) * intro})`
    ctx.fillRect(0, horizonY - 0.75, width, 1.5)

    // Streaks horizontales — la única pieza nueva del rediseño: aparecen y
    // se mueven solo cuando hay scroll real, y se desvanecen al dejar de
    // scrollear en vez de tener vida propia.
    this.streaks = this.streaks.filter((s) => s.opacity > 0.003)
    for (const s of this.streaks) {
      s.y += s.speed * (0.3 + scrollBoost)
      s.opacity *= 0.965
      if (s.y > height + s.length) s.y = -s.length
      ctx.fillStyle = `rgba(190, 190, 195, ${s.opacity * intro})`
      ctx.fillRect(0, s.y, width * 0.5 + s.length * 4, 1)
    }
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value
    if (value) this.streaks = []
  }

  dispose() {
    if (this.lifecycle === 'disposed') return
    this.lifecycle = 'disposed'
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
    this.abortController.abort()
    this.unsubscribeSceneBus?.()
    this.streaks = []
  }
}
