import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js'
import { webglSceneBus, type SceneFocus, type EntityAtmosphere } from './scene-bus'

// Extracted modules
import { detectQualityProfile, type QualityProfile } from './core/quality'
import {
  createRenderer,
  resizeRendererAndPasses,
  isDocumentHidden,
  handleContextLost as lifecycleHandleContextLost,
  handleContextRestored as lifecycleHandleContextRestored,
  disposeSceneResources,
} from './core/lifecycle'
import { computeShotFrame as computeCameraShotFrame } from './core/camera-shots'
import { createEnvironment } from './core/environment'
import { createPostProcessingPipeline } from './core/postprocessing'
import { computePointerTarget, computeScrollTarget } from './core/input'
import { computeSceneBusStateUpdate } from './core/scene-bus-adapter'
import { lerpDayColor, lerpCyclic01, smootherstep } from './utils/math'
import { SHOTS, ROAD_DASH_PERIOD, ROAD_FLOW_WRAP, IMAGE_BILLBOARDS } from './config/scene'
// Fase 8.1: buildSkyDome() migrado mecánicamente a ./scene/sky.ts (ver nota
// de arquitectura al pie del archivo). SKY_VERTEX_SHADER/SKY_FRAGMENT_SHADER
// ya no se importan acá directamente: ahora los consume ./scene/sky.ts.
import { buildSkyDome as buildSkyDomeScene } from './scene/sky'
// Fase 8.2: buildWaterHorizon() migrado mecánicamente a ./scene/water.ts (ver
// nota de arquitectura al pie del archivo). WATER_VERTEX_SHADER/
// WATER_FRAGMENT_SHADER ya no se importan acá directamente: ahora los
// consume ./scene/water.ts.
import { buildWaterHorizon as buildWaterHorizonScene } from './scene/water'
// Fase 8.3: buildHumidityMist() migrado mecánicamente a ./scene/humidity-mist.ts
// (ver nota de arquitectura al pie del archivo). MIST_VERTEX_SHADER/
// MIST_FRAGMENT_SHADER ya no se importan acá directamente: ahora los
// consume ./scene/humidity-mist.ts.
import { buildHumidityMist as buildHumidityMistScene } from './scene/humidity-mist'
// Fase 8.4: buildFireflies() migrado mecánicamente a ./scene/fireflies.ts
// (ver nota de arquitectura al pie del archivo). FIREFLY_VERTEX_SHADER/
// FIREFLY_FRAGMENT_SHADER ya no se importan acá directamente: ahora los
// consume ./scene/fireflies.ts.
import { buildFireflies as buildFirefliesScene } from './scene/fireflies'
// Fase 8.5: buildAtmosphericHaze() migrado mecánicamente a
// ./scene/atmospheric-haze.ts (ver nota de arquitectura al pie del
// archivo). HAZE_VERTEX_SHADER/HAZE_FRAGMENT_SHADER ya no se importan acá
// directamente: ahora los consume ./scene/atmospheric-haze.ts.
import { buildAtmosphericHaze as buildAtmosphericHazeScene } from './scene/atmospheric-haze'
// Fase 8.6: buildTrafficStreaks() migrado mecánicamente a
// ./scene/traffic-streaks.ts (ver nota de arquitectura al pie del
// archivo). Existía un `scene/traffic.ts` previo y desconectado, pero
// auditado y descartado por no ser equivalente al inline real (usaba
// fallbacks `|| 1`/`|| 0` sobre `entityPace`/`scrollVelocity` ausentes en
// la versión que corre en producción) — no se reutilizó.
import { buildTrafficStreaks as buildTrafficStreaksScene } from './scene/traffic-streaks'
import { SHAFT_VERTEX_SHADER, SHAFT_FRAGMENT_SHADER, NEON_SIGN_FRAGMENT_SHADER } from './shaders/neon'
import { ROAD_VERTEX_SHADER, ROAD_FRAGMENT_SHADER } from './shaders/road'
import { SUN_VERTEX_SHADER, SUN_FRAGMENT_SHADER } from './shaders/sun'
import { BILLBOARD_VERTEX_SHADER, BILLBOARD_FRAGMENT_SHADER } from './shaders/billboard'
import {
  DUST_VERTEX_SHADER,
  DUST_FRAGMENT_SHADER,
} from './shaders/particles'

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
 * v6 — la escena responde al CONTENIDO real, no solo a scroll/cursor
 * ---------------------------------------------------------------------------
 * No se crea un motor por categoría ni se duplica lógica: se extiende el
 * mismo patrón que ya traía `CATEGORY_WARMTH`/`STATUS_UNREST` con dos tablas
 * más, `CATEGORY_PACE` y `CATEGORY_FRAME`, y dos escalares suavizados más
 * (`entityPace`, `entityFrame`) que se leen en los mismos `updaters` que ya
 * existían:
 *
 *  - `CATEGORY_FRAME` (composición): cuán cerca/lejos e íntima/panorámica es
 *    la toma. Personajes → encuadre cerrado y bajo (retrato). Ubicaciones →
 *    encuadre elevado y abierto (plano establecedor, más niebla despejada
 *    para leer el skyline). Organizaciones → toma elevada y solemne.
 *    Alimenta FOV, altura de cámara/mira y densidad de niebla — una sola
 *    variable, varios efectos coherentes entre sí, no ramas por categoría.
 *  - `CATEGORY_PACE` (comportamiento): a qué velocidad "vive" la escena.
 *    Vehículos → tráfico y flujo de la carretera notablemente más rápidos,
 *    cámara más despejada (menos profundidad de campo). Ubicaciones →
 *    todo se asienta, contemplativo. Alimenta el flujo de la carretera, la
 *    velocidad del tráfico y la rotación de la torre.
 *  - `STATUS_UNREST` (ya existía) ahora además desestabiliza el parpadeo de
 *    la baliza y los anillos de neón de la torre: "rumor" tiembla, "nuestro"
 *    respira suave, "confirmado" es estable — la editorial se ve, no solo
 *    se lee.
 *
 * Igual que antes, nada de esto se dispara con `Math.random()` en cada
 * frame: son funciones deterministas del tiempo transcurrido y de escalares
 * ya suavizados, así que la escena es reproducible y nunca "tiembla" sin
 * motivo — cada cambio visual es trazable a un dato real de la entidad.
 *
 * v7 — la escena incorpora materia visual real de GTA VI
 * ---------------------------------------------------------------------------
 * Donde antes orbitaban 4 sólidos abstractos (octaedro/toro genéricos,
 * `buildSatellites`) ahora orbitan 4 letreros con las imágenes oficiales
 * que ya vive el proyecto (`buildImageBillboards`, ver `IMAGE_BILLBOARDS`):
 * la portada de GTA VI, la postal de Port Gellhorn, y los retratos de Real
 * Dimez y Boobie Ike — los mismos archivos `.webp` que sirve el hero DOM y
 * las fichas de personaje, no una copia aparte para WebGL.
 *
 * Estos letreros no son un `<img>` flotando en 3D: cada uno es un
 * `ShaderMaterial` que calcula su propio marco redondeado por SDF, un
 * brillo de borde en el neón de la escena, scanlines de pantalla real, y
 * una distorsión tipo VHS (aberración cromática + jitter) que sube y baja
 * con `uDistortion` — una señal derivada de la velocidad real de scroll y
 * la intención de cursor (mismo cálculo espíritu que `chromaKick`, pero
 * vivido en la geometría del letrero, no solo en el post-proceso global).
 * Cada letrero hace *billboarding* real (encara la cámara en todo
 * momento, vía `quaternion.copy(camera.quaternion)`): son contenido
 * legible, no un sólido que puede quedar cabeza abajo.
 *
 * El parallax es multicapa por diseño: cada letrero tiene su propio factor
 * `parallax` en `IMAGE_BILLBOARDS`, así que el dolly de scroll acerca la
 * portada de GTA VI (la pieza más icónica) más que al resto — profundidad
 * real de escena, no una sola capa moviéndose a una velocidad fija.
 *
 * v8 — mini motor ambiental procedural AAA (Leonida / Miami / Rockstar)
 * ---------------------------------------------------------------------------
 * Evolución máxima sin tocar la API ni los bridges externos:
 *
 *  - Ciclo día→atardecer→noche→madrugada (`dayPhase`) impulsado por tiempo,
 *    scroll y `sceneMood` — niebla, cielo, luces y grading coheren.
 *  - Perfil de calidad adaptativo (desktop / mobile / reduced-motion).
 *  - Cúpula celeste procedural con estrellas, gradiente y bruma atmosférica.
 *  - Capas de haze volumétrico multicapa con parallax y scroll.
 *  - Carretera húmeda con asfalto specular, charcos y heat-shimmer.
 *  - Bahía/reflejo de agua en el horizonte (Leonida costera).
 *  - Partículas: bruma mejorada, luciérnagas, gotas de humedad/nocturnas.
 *  - Vida urbana: letreros neón distantes, ventanas parpadeantes, haz extra.
 *  - Color grading cinematográfico teal-orange + humedad + bloom adaptativo.
 *  - Cámara: 4º encuadre, handheld sutil por `entityUnrest`, respiración.
 *
 * Puntos de extensión:
 *  - `buildXxx()` construyen piezas de escena independientes.
 *  - `updaters` centraliza el loop de animación.
 *  - `SHOTS` es la lista de encuadres; agregar uno más los suma a la ronda.
 *
 * v8.1 — endurecimiento (robustez / mantenimiento), sin tocar la API pública
 * ---------------------------------------------------------------------------
 * Misma arquitectura y mismo comportamiento visual observable; se cierran
 * riesgos que hoy no se notan pero podían romperse a futuro:
 *
 *  - `dayPhase` ahora se interpola por el camino más corto en el círculo
 *    [0,1) (`lerpCyclic01`): antes, un lerp lineal normal hacía que el
 *    ciclo día/noche "rebobinara" visualmente cada vez que el target
 *    cruzaba el punto de wraparound (p. ej. 0.98 → 0.02).
 *  - `roadFlow` ahora se envuelve en un múltiplo exacto del período de la
 *    carretera (`ROAD_DASH_PERIOD`) en vez de crecer sin límite: pasado a
 *    un `float` de shader (precisión simple), un acumulador sin cota
 *    termina degradando el patrón de la carretera en sesiones largas.
 *  - `computeShotFrame` ya no puede dividir por cero si en el futuro
 *    `SHOTS` queda vacío o con duración total 0.
 *  - `BokehPass` (profundidad de campo) ya no se instancia cuando el
 *    perfil de calidad no lo usa (`enableBokeh: false`): antes se
 *    reservaban sus render targets igual, justo en los dispositivos de
 *    gama baja que menos memoria de GPU pueden ceder.
 *  - El render target intermedio del entorno PMREM se libera por completo
 *    (antes solo se descartaba su textura) y la geometría/material
 *    temporales de ese paso también se liberan.
 *  - `dispose()` es idempotente (`if (this.disposed) return`) y `start()`
 *    no puede quedar corriendo dos loops de animación en paralelo si se
 *    invoca más de una vez — ambos casos son reales bajo Strict Mode /
 *    remounts de React.
 *  - Todos los passes del composer se liberan de forma genérica
 *    (`pass.dispose()`), así un pass nuevo que se agregue a `SHOTS`-style
 *    al pipeline no queda fugando memoria por olvido.
 *  - FOV, densidad de niebla y fuerza de bloom quedan acotados a rangos
 *    seguros: hoy nunca se salen de rango, pero quedan protegidos si en
 *    el futuro se agregan categorías/estados con valores más extremos en
 *    `CATEGORY_FRAME` / `CATEGORY_PACE` / `STATUS_UNREST`.
 *  - Carga de texturas de los billboards con `onError`, para que una
 *    imagen faltante o movida se note en consola en vez de quedar como un
 *    letrero invisible sin explicación.
 *  - Se retira `towerShaderRefs`: quedaba poblado pero nunca se leía (el
 *    `onBeforeCompile` ya actualiza el uniform por referencia cerrada), y
 *    como código muerto invitaba a futuras confusiones.
 */

/**
 * Callback de animación por-frame para piezas de escena registradas en
 * `this.updaters` (ver `start()`). Deliberadamente distinto — y sin
 * relación estructural — del tipo `Updater` de 11 parámetros que exporta
 * `scene/*.ts` (ver nota de arquitectura al pie del archivo).
 * `core/lifecycle.ts` YA NO forma parte de esa extracción sin conectar:
 * desde la Fase 3 fue reescrito desde cero como orquestación verificada
 * del ciclo de vida del renderer y está conectado a este motor
 * (`createRenderer`, `resizeRendererAndPasses`, `disposeSceneResources`,
 * etc. — ver imports arriba). Desde la Fase 8.1, `scene/sky.ts` también
 * está conectado (ver `buildSkyDome()` más abajo), y desde la Fase 8.2,
 * `scene/water.ts` también (ver `buildWaterHorizon()` más abajo): en
 * ambos casos su `updater` de 11 parámetros se envuelve ahí mismo en un
 * closure `SceneUpdater` de 3 parámetros antes de entrar a
 * `this.updaters`, así que este tipo sigue siendo el único que viaja
 * por `start()`/el loop de animación. El resto de `scene/*.ts` sigue
 * siendo código muerto sin conectar. Nombrado `SceneUpdater` a
 * propósito para que este tipo nunca se confunda ni se mezcle por
 * accidente con el `Updater` de `scene/*.ts`.
 */
type SceneUpdater = (elapsed: number, delta: number, intro: number) => void

// ---------------------------------------------------------------------------
// Shaders — extraídos a ./shaders/*.ts (ver imports arriba)
// ---------------------------------------------------------------------------

export class GTA6CodexWebGLEngine {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private clock: THREE.Clock
  private composer: EffectComposer
  private bloomPass: UnrealBloomPass
  /** Solo se instancia cuando `quality.enableBokeh` es true (ver `constructor`).
   *  En perfiles de calidad media/baja, nunca se reserva memoria de GPU para
   *  un efecto que nunca se usa. */
  private bokehPass: BokehPass | null = null
  private gradePass: ShaderPass
  private fxaaPass: FXAAPass

  private farGroup: THREE.Group
  private midGroup: THREE.Group
  private nearGroup: THREE.Group
  private skyGroup: THREE.Group

  private readonly quality: QualityProfile
  private dayPhase = 0.42
  private dayPhaseTarget = 0.42
  private humidity = 0.45
  /** Render target completo del paso PMREM del entorno — se libera entero
   *  en `dispose()` (antes solo se descartaba `.texture`, dejando el
   *  render target en sí sin liberar). */
  private envRenderTarget: THREE.WebGLRenderTarget | null = null

  private skyUniforms!: {
    time: { value: number }
    dayPhase: { value: number }
    introFade: { value: number }
    humidity: { value: number }
    fogColor: { value: THREE.Color }
  }

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
  /** Texturas de los billboards con imágenes reales de GTA VI — liberadas en `dispose()`. */
  private imageTextures: THREE.Texture[] = []

  private keyLight!: THREE.PointLight
  private fillLight!: THREE.PointLight
  private fog!: THREE.FogExp2
  private readonly baseFogDensity = 0.027

  private updaters: SceneUpdater[] = []
  private rafId: number | null = null
  /**
   * Máquina de estados explícita del ciclo de vida, en vez de un booleano
   * `disposed` + la presencia/ausencia de `rafId` como señal implícita de
   * "está corriendo". Con dos flags sueltos hay combinaciones que el tipo
   * no prohíbe pero que no deberían existir (`disposed && rafId !== null`);
   * con un enum de 3 estados esa combinación es irrepresentable.
   *  - 'idle'      → construido, `start()` todavía no se llamó.
   *  - 'running'   → loop de render activo (`paused` puede seguir
   *                  pausando frames sin salir de este estado).
   *  - 'disposed'  → recursos liberados, el motor es inutilizable.
   */
  private lifecycle: 'idle' | 'running' | 'disposed' = 'idle'
  private reducedMotion: boolean
  private paused = false
  /** Referencia al loop para poder retomarlo tras `webglcontextrestored`
   *  sin duplicar su lógica (ver `handleContextLost`/`handleContextRestored`). */
  private loopFn: (() => void) | null = null
  /** true entre `webglcontextlost` y `webglcontextrestored`: el loop deja
   *  de reprogramarse mientras el contexto GPU no es válido, en vez de
   *  seguir llamando a `composer.render()` contra un contexto perdido
   *  (eso no crashea, pero satura la consola de errores WebGL sin ningún
   *  beneficio hasta que el usuario recarga la página a mano). */
  private contextLost = false
  /** Todos los listeners del motor se registran con esta señal y se dan
   *  de baja con una sola llamada (`abortController.abort()`) en
   *  `dispose()` — un listener nuevo que se agregue a futuro no puede
   *  quedar fugado por un `removeEventListener` olvidado. */
  private readonly abortController = new AbortController()

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
  /** Ritmo de la escena derivado de `CATEGORY_PACE` (1 = base). */
  private entityPace = 1
  private entityPaceTarget = 1
  /** Encuadre derivado de `CATEGORY_FRAME` (0 = base). */
  private entityFrame = 0
  private entityFrameTarget = 0
  /** Acumulador del flujo de la carretera — avanza según `entityPace`, no
   *  según `elapsed`, y se mantiene acotado por `ROAD_FLOW_WRAP`. */
  private roadFlow = 0
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
    this.quality = detectQualityProfile(opts.reducedMotion)
    this.totalShotDuration = SHOTS.reduce((sum, s) => sum + s.duration, 0)

    this.renderer = createRenderer(canvas, this.quality)

    this.scene = new THREE.Scene()
    this.fog = new THREE.FogExp2(0x1c0f28, this.baseFogDensity)
    this.scene.fog = this.fog

    this.camera = new THREE.PerspectiveCamera(this.baseFov, 1, 0.1, 100)
    this.camera.position.copy(SHOTS[0].pos).add(new THREE.Vector3(0, 4, 14))

    this.clock = new THREE.Clock()

    this.farGroup = new THREE.Group()
    this.midGroup = new THREE.Group()
    this.nearGroup = new THREE.Group()
    this.skyGroup = new THREE.Group()
    this.scene.add(this.skyGroup, this.farGroup, this.midGroup, this.nearGroup)

    this.setupEnvironment()
    this.buildSkyDome()
    this.setupLights()
    this.buildWaterHorizon()
    this.buildRoad()
    this.buildFarSkyline()
    this.buildNeonSigns()
    this.buildHorizonSun()
    this.buildLightShaft()
    this.buildAtmosphericHaze()
    this.buildTrafficStreaks()
    this.buildDust()
    this.buildFireflies()
    this.buildHumidityMist()
    this.buildImageBillboards()
    this.buildFocalTower()

    const { composer, bloomPass, bokehPass, gradePass, fxaaPass } = createPostProcessingPipeline({
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
      width: window.innerWidth,
      height: window.innerHeight,
      quality: this.quality,
    })
    this.composer = composer
    this.bloomPass = bloomPass
    this.bokehPass = bokehPass
    this.gradePass = gradePass
    this.fxaaPass = fxaaPass

    this.handleResize()

    // AbortController: dar de baja los 6 listeners de abajo es una sola
    // llamada (`this.abortController.abort()` en `dispose()`) en vez de 6
    // pares add/remove que hay que mantener sincronizados a mano cada vez
    // que se agrega un listener nuevo.
    const { signal } = this.abortController
    window.addEventListener('resize', this.handleResize, { signal })
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true, signal })
    window.addEventListener('scroll', this.handleScroll, { passive: true, signal })
    document.addEventListener('visibilitychange', this.handleVisibility, { signal })
    // Pérdida/recuperación de contexto GPU: el navegador puede matar el
    // contexto WebGL en cualquier momento (cambio de pestaña prolongado,
    // throttling del driver, low-memory kill en mobile) y recuperarlo
    // después. Sin manejarlo explícitamente, el loop sigue llamando a
    // `composer.render()` contra un contexto muerto indefinidamente.
    canvas.addEventListener('webglcontextlost', this.handleContextLost, { signal })
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored, { signal })

    // La UI real (secciones instrumentadas, hover de cards) empuja estado acá
    // en vez de que el motor tenga que adivinarlo a partir de scroll crudo.
    this.unsubscribeSceneBus = webglSceneBus.subscribe(() => {
      const snapshot = webglSceneBus.getSnapshot()
      const update = computeSceneBusStateUpdate(snapshot, this.sceneFocus, this.sceneMoodTarget, this.reducedMotion)
      Object.assign(this, update)
    })

    this.assertFullyInitialized()
  }

  /**
   * Guarda de invariante de construcción. Los campos declarados con `!`
   * arriba (`skyUniforms`, `dustUniforms`, `roadUniforms`, `shaftUniforms`,
   * `keyLight`, `fillLight`, `fog`) se asignan de forma síncrona dentro de
   * los `buildXxx()`/`setupXxx()` que se llaman más arriba, en orden fijo.
   * Nada en el compilador impone ese orden: un refactor futuro que
   * reordene, condicione o elimine una de esas llamadas dejaría el motor a
   * medio construir sin ningún error hasta el primer frame de render
   * (acceso a `undefined` propagándose como `NaN` en uniforms, o un
   * crash silencioso). Esta guarda convierte esa clase de bug en un error
   * inmediato y explícito en el constructor, con el campo exacto que
   * falta, en vez de un fallo diferido e imposible de rastrear.
   */
  private assertFullyInitialized(): void {
    const required: Array<[string, unknown]> = [
      ['skyUniforms', this.skyUniforms],
      ['dustUniforms', this.dustUniforms],
      ['roadUniforms', this.roadUniforms],
      ['shaftUniforms', this.shaftUniforms],
      ['keyLight', this.keyLight],
      ['fillLight', this.fillLight],
      ['fog', this.fog],
    ]
    const missing = required.filter(([, value]) => value == null).map(([name]) => name)
    if (missing.length > 0) {
      throw new Error(
        `GTA6CodexWebGLEngine: construcción incompleta, falta inicializar: ${missing.join(', ')}. ` +
          'Revisar el orden de las llamadas a buildXxx()/setupXxx() en el constructor.'
      )
    }
  }

  // ---------------------------------------------------------------------
  // Entorno / iluminación
  // ---------------------------------------------------------------------

  private setupEnvironment() {
    this.envRenderTarget = createEnvironment(this.renderer, this.scene)
  }

  /**
   * Cúpula celeste procedural — v2 "Leonida cinematográfica".
   * Gradiente multicapa con 6 keyframes horarios (noche/amanecer/mediodía/
   * golden hour/atardecer/hora azul), scattering de horizonte simulado,
   * nubes procedurales, resplandor direccional hacia el sol y fusión con
   * el color real de `this.fog` para que no haya costura entre la niebla
   * de la escena y el cielo. Ver `SKY_FRAGMENT_SHADER` para el detalle.
   *
   * `this.fog` ya existe en este punto del constructor (se crea antes de
   * llamar a `buildSkyDome()`), así que es seguro leer su color acá.
   */
  /**
   * Fase 8.1 — geometría, material, uniforms y valores idénticos a la
   * versión inline anterior; solo se movieron a `./scene/sky.ts`
   * (`buildSkyDomeScene`). El `updater` que devuelve esa función usa la
   * firma común de 11 parámetros de `scene/*.ts` (ver nota de
   * arquitectura al pie del archivo), incompatible con `SceneUpdater` de
   * este motor — por eso se lo envuelve acá en un closure de 3
   * parámetros que lee `this.dayPhase` / `this.humidity` / `this.fog.color`
   * en cada frame exactamente igual que antes, y se lo registra en
   * `this.updaters` sin tocar `start()`/el loop de animación.
   */
  private buildSkyDome() {
    const { uniforms, updater } = buildSkyDomeScene({
      humidity: this.humidity,
      fog: this.fog,
      skyGroup: this.skyGroup,
      quality: this.quality,
    })
    this.skyUniforms = uniforms

    this.updaters.push((elapsed, delta, intro) =>
      updater(
        elapsed,
        delta,
        intro,
        this.dayPhase,
        this.humidity,
        this.fog.color,
        this.entityPace,
        this.entityUnrest,
        this.scrollVelocity,
        this.pointerIntent,
        this.entityPresence
      )
    )
  }

  /**
   * Bahía Leonida en el horizonte — reflejos y ondas sutiles.
   *
   * Fase 8.2 — geometría, material, uniforms y valores idénticos a la
   * versión inline anterior; solo se movieron a `./scene/water.ts`
   * (`buildWaterHorizonScene`). Igual que en la Fase 8.1, el `updater`
   * que devuelve esa función usa la firma común de 11 parámetros de
   * `scene/*.ts` (ver nota de arquitectura al pie del archivo),
   * incompatible con `SceneUpdater` de este motor — se lo envuelve acá
   * en un closure de 3 parámetros que lee `this.dayPhase` en cada frame
   * exactamente igual que antes, y se lo registra en `this.updaters`
   * sin tocar `start()`/el loop de animación. A diferencia del cielo,
   * el agua no tiene uniforms propios expuestos en `this` (no existía
   * un campo `this.waterUniforms` en la versión inline), así que acá
   * tampoco se agrega uno.
   */
  private buildWaterHorizon() {
    const updater = buildWaterHorizonScene({ farGroup: this.farGroup })

    this.updaters.push((elapsed, delta, intro) =>
      updater(
        elapsed,
        delta,
        intro,
        this.dayPhase,
        this.humidity,
        this.fog.color,
        this.entityPace,
        this.entityUnrest,
        this.scrollVelocity,
        this.pointerIntent,
        this.entityPresence
      )
    )
  }

  /** Letreros neón premium GTA VI — Vice City moderna con atmósfera cinematográfica. */
  private buildNeonSigns() {
    if (this.quality.tier === 'low') return

    // Paleta expandida GTA VI: rosa neón, magenta, cyan, violeta, azul eléctrico, naranja cálido
    const neonColors = [
      new THREE.Color(0xff2d78), // Rosa neón
      new THREE.Color(0xff1744), // Magenta intenso
      new THREE.Color(0x22d3ee), // Cyan
      new THREE.Color(0x9c27b0), // Violeta
      new THREE.Color(0x2979ff), // Azul eléctrico
      new THREE.Color(0xff9100), // Naranja cálido
      new THREE.Color(0xe91e63), // Rosa profundo
      new THREE.Color(0x00bcd4), // Cyan claro
    ]

    // Configuración de tipos de negocio con su estética específica
    interface SignConfig {
      type: number // 0=hotel, 1=club, 2=restaurante, 3=casino, 4=negocio
      colorIndex: number
      width: number
      height: number
      baseIntensity: number
    }

    // Distribución orgánica por capas de profundidad
    const signConfigs: SignConfig[] = [
      // CAPA LEJANA (-50 a -60): hoteles grandes, poca visibilidad, atmósfera
      { type: 0, colorIndex: 0, width: 4.2, height: 1.8, baseIntensity: 0.6 }, // Hotel rosa
      { type: 0, colorIndex: 3, width: 3.8, height: 1.6, baseIntensity: 0.55 }, // Hotel violeta
      { type: 3, colorIndex: 4, width: 3.5, height: 1.4, baseIntensity: 0.5 }, // Casino azul
      
      // CAPA MEDIA (-40 a -50): clubes y restaurantes, visibilidad media
      { type: 1, colorIndex: 1, width: 3.2, height: 1.2, baseIntensity: 0.75 }, // Club magenta
      { type: 2, colorIndex: 2, width: 2.8, height: 1.0, baseIntensity: 0.7 }, // Restaurante cyan
      { type: 1, colorIndex: 5, width: 3.0, height: 1.1, baseIntensity: 0.72 }, // Club naranja
      { type: 2, colorIndex: 6, width: 2.6, height: 0.95, baseIntensity: 0.68 }, // Restaurante rosa
      
      // CAPA CERCANA (-30 a -40): negocios y locales, mayor detalle
      { type: 4, colorIndex: 7, width: 2.4, height: 0.85, baseIntensity: 0.85 }, // Negocio cyan claro
      { type: 4, colorIndex: 0, width: 2.2, height: 0.8, baseIntensity: 0.82 }, // Negocio rosa
      { type: 1, colorIndex: 3, width: 2.8, height: 1.0, baseIntensity: 0.88 }, // Club violeta cercano
    ]

    // Ajustar cantidad según calidad
    const signCount = this.quality.tier === 'high' ? signConfigs.length : Math.floor(signConfigs.length * 0.6)
    const activeConfigs = signConfigs.slice(0, signCount)

    const signs: { 
      mat: THREE.ShaderMaterial; 
      seed: number; 
      signType: number;
      baseIntensity: number;
      distanceFade: number;
    }[] = []

    // Posiciones pre-diseñadas para composición cinematográfica
    const positions = [
      { x: -18, y: 2, z: -55 }, // Hotel lejano izquierda
      { x: 12, y: 3, z: -58 },  // Hotel lejano derecha
      { x: -8, y: 1, z: -52 },  // Casino centro-lejano
      { x: -22, y: -1, z: -45 }, // Club medio-izquierda
      { x: 15, y: 0, z: -47 },  // Restaurante medio-derecha
      { x: 0, y: -2, z: -44 },   // Club centro-medio
      { x: 18, y: -3, z: -42 },  // Restaurante medio-derecha bajo
      { x: -12, y: -4, z: -38 }, // Negocio cercano izquierda
      { x: 8, y: -5, z: -36 },   // Negocio cercano derecha
      { x: -3, y: -3, z: -35 },  // Club cercano centro
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
      if (config.type === 0) { // Hoteles: más grandes y prominentes
        geometry = new THREE.PlaneGeometry(config.width, config.height, 2, 1)
      } else if (config.type === 1) { // Clubes: más dinámicos
        geometry = new THREE.PlaneGeometry(config.width, config.height, 3, 1)
      } else { // Restaurantes, casinos, negocios: estándar
        geometry = new THREE.PlaneGeometry(config.width, config.height, 1, 1)
      }

      const mesh = new THREE.Mesh(geometry, mat)
      mesh.position.set(pos.x, pos.y, pos.z)
      
      // Rotación sutil para variedad visual (billboarding parcial)
      mesh.rotation.y = (Math.random() - 0.5) * 0.15
      
      this.farGroup.add(mesh)
      signs.push({ 
        mat, 
        seed, 
        signType: config.type,
        baseIntensity: config.baseIntensity,
        distanceFade
      })
    })

    this.updaters.push((elapsed, _delta, intro) => {
      signs.forEach((s) => {
        s.mat.uniforms.time.value = elapsed
        s.mat.uniforms.introFade.value = intro
        s.mat.uniforms.dayPhase.value = this.dayPhase
        
        // Variación dinámica de intensidad por "estado" del neón
        const unrestMod = 1.0 + this.entityUnrest * 0.15
        const dynamicFade = s.distanceFade * unrestMod
        s.mat.uniforms.distanceFade.value = dynamicFade
      })
    })
  }

  /**
   * Capas de haze volumétrico con parallax por profundidad.
   *
   * Fase 8.5 — geometría, material, uniforms y valores idénticos a la
   * versión inline anterior; solo se movieron a
   * `./scene/atmospheric-haze.ts` (`buildAtmosphericHazeScene`). Igual
   * que en las Fases 8.1/8.2/8.3/8.4, el `updater` que devuelve esa
   * función usa la firma común de 11 parámetros de `scene/*.ts` (ver
   * nota de arquitectura al pie del archivo), incompatible con
   * `SceneUpdater` de este motor — se lo envuelve acá en un closure de 3
   * parámetros igual que los builders anteriores, y se lo registra en
   * `this.updaters` sin tocar `start()`/el loop de animación. Único
   * ajuste estructural: la versión inline hacía `this.updaters.push(...)`
   * una vez por capa (dentro del `for`) más una vez extra al final para
   * el ajuste de `position.y` por `scrollProgress`; el builder extraído
   * consolida las actualizaciones por capa (`time`/`introFade`/
   * `position.x`) en un único `Updater` que itera las capas con
   * `forEach` — mismo patrón ya usado en `buildNeonSigns()` de este
   * archivo — y este método sigue haciendo el `push` del ajuste de
   * `position.y` por separado, porque depende de `this.scrollProgress`,
   * estado propio del motor que no forma parte de la firma de
   * `Updater`. El orden de ejecución por frame (actualizaciones por capa
   * antes que el ajuste de Y) y los valores numéricos son idénticos a
   * los de la versión inline.
   */
  private buildAtmosphericHaze() {
    const { layers, updater } = buildAtmosphericHazeScene({
      midGroup: this.midGroup,
      quality: this.quality,
    })

    this.updaters.push((elapsed, delta, intro) =>
      updater(
        elapsed,
        delta,
        intro,
        this.dayPhase,
        this.humidity,
        this.fog.color,
        this.entityPace,
        this.entityUnrest,
        this.scrollVelocity,
        this.pointerIntent,
        this.entityPresence
      )
    )

    this.updaters.push((_elapsed, _delta, intro) => {
      layers.forEach((l, i) => {
        l.position.y = -2 + i * 2.5 + this.scrollProgress * (0.8 + i * 0.3) * intro
      })
    })
  }

  /**
   * Luciérnagas tropicales cerca del skyline.
   *
   * Fase 8.4 — geometría, atributos, material, uniforms y valores
   * idénticos a la versión inline anterior; solo se movieron a
   * `./scene/fireflies.ts` (`buildFirefliesScene`). Igual que en las
   * Fases 8.1/8.2/8.3, el `updater` que devuelve esa función usa la
   * firma común de 11 parámetros de `scene/*.ts` (ver nota de
   * arquitectura al pie del archivo), incompatible con `SceneUpdater`
   * de este motor — se lo envuelve acá en un closure de 3 parámetros
   * igual que los builders anteriores, y se lo registra en
   * `this.updaters` sin tocar `start()`/el loop de animación. La
   * comprobación `quality.fireflyCount <= 0` se movió dentro del
   * builder: en vez de que este método corte antes de llamar a
   * `this.updaters.push(...)` (como hacía la versión inline), el
   * builder devuelve un `updater` no-op cuando no hay luciérnagas que
   * dibujar, y ese no-op es el que termina envuelto y registrado —
   * mismo resultado visual (nada se dibuja, nada se calcula por
   * frame), único ajuste estructural permitido por esta fase.
   */
  private buildFireflies() {
    const updater = buildFirefliesScene({
      farGroup: this.farGroup,
      quality: this.quality,
    })

    this.updaters.push((elapsed, delta, intro) =>
      updater(
        elapsed,
        delta,
        intro,
        this.dayPhase,
        this.humidity,
        this.fog.color,
        this.entityPace,
        this.entityUnrest,
        this.scrollVelocity,
        this.pointerIntent,
        this.entityPresence
      )
    )
  }

  /**
   * Gotas de humedad/nocturnas — aire denso de Florida.
   *
   * Fase 8.3 — geometría, material, uniforms y valores idénticos a la
   * versión inline anterior; solo se movieron a `./scene/humidity-mist.ts`
   * (`buildHumidityMistScene`). Igual que en las Fases 8.1/8.2, el
   * `updater` que devuelve esa función usa la firma común de 11
   * parámetros de `scene/*.ts` (ver nota de arquitectura al pie del
   * archivo), incompatible con `SceneUpdater` de este motor — se lo
   * envuelve acá en un closure de 3 parámetros que replica exactamente
   * el mismo cálculo que antes (`elapsed * (reducedMotion ? 0.2 : 1)`),
   * y se lo registra en `this.updaters` sin tocar `start()`/el loop de
   * animación. A diferencia del cielo, esta niebla no tiene uniforms
   * propios expuestos en `this` (no existía un campo
   * `this.mistUniforms` en la versión inline), así que acá tampoco se
   * agrega uno. `reducedMotion` no cambia por frame, así que se pasa
   * una sola vez como opción del builder en vez de viajar por el
   * `updater`.
   */
  private buildHumidityMist() {
    const updater = buildHumidityMistScene({
      midGroup: this.midGroup,
      quality: this.quality,
      reducedMotion: this.reducedMotion,
    })

    this.updaters.push((elapsed, delta, intro) =>
      updater(
        elapsed,
        delta,
        intro,
        this.dayPhase,
        this.humidity,
        this.fog.color,
        this.entityPace,
        this.entityUnrest,
        this.scrollVelocity,
        this.pointerIntent,
        this.entityPresence
      )
    )
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
      const cycle = Math.sin(elapsed * 0.025)
      const dayWarmth = 0.5 + 0.5 * Math.cos(this.dayPhase * Math.PI * 2)
      this.keyLight.color.setHSL(
        0.92 + cycle * (0.015 + this.entityUnrest * 0.01) + this.sceneMood * 0.02 + this.entityWarmth * 0.03 - dayWarmth * 0.04,
        0.85,
        0.52 + dayWarmth * 0.08
      )
      this.fillLight.color.setHSL(0.52 + dayWarmth * 0.06, 0.75, 0.48)
      this.keyLight.intensity = 48 + cycle * 10 + this.scrollProgress * 14 + dayWarmth * 8
      this.fillLight.intensity = 28 + Math.cos(elapsed * 0.021) * 6 + (1 - dayWarmth) * 6
      this.keyLight.position.x = 9 + Math.sin(elapsed * 0.09) * 3
      this.keyLight.position.y = 5 + Math.cos(elapsed * 0.07) * 2

      const fogColor = lerpDayColor(this.dayPhase, 0x3a1830, 0x1c0f28, 0x142038)
      this.fog.color.setHex(fogColor)
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
        flow: { value: 0 },
        colorA: { value: new THREE.Color(0x22d3ee) },
        colorB: { value: new THREE.Color(0xff2d78) },
        humidity: { value: 0.45 },
        heatShimmer: { value: 0.0 },
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
      material.uniforms.flow.value = this.roadFlow
      material.uniforms.humidity.value = this.humidity
      material.uniforms.heatShimmer.value = this.reducedMotion ? 0 : 0.35 + this.entityPace * 0.15
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

          const wi = w
          this.updaters.push((elapsed) => {
            if (this.quality.tier === 'low') return
            const flicker = 0.45 + 0.55 * Math.sin(elapsed * (0.8 + wi * 0.3) + i * 1.7)
            winMat.opacity = (0.35 + flicker * 0.5) * (0.7 + this.dayPhase * 0.3)
          })
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
      const dayLift = 0.5 + 0.5 * Math.cos(this.dayPhase * Math.PI * 2)
      sun.position.y = 4.5 + dayLift * 2.5
      material.uniforms.coreColor.value.setHex(lerpDayColor(this.dayPhase, 0xff5b7c, 0xff3d78, 0xff9060))
      material.uniforms.rimColor.value.setHex(lerpDayColor(this.dayPhase, 0xffb04d, 0xff6088, 0x88b0ff))
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

    if (this.quality.tier !== 'low') {
      const shaft2 = new THREE.Mesh(
        geometry.clone(),
        new THREE.ShaderMaterial({
          uniforms: { ...this.shaftUniforms, shaftColor: { value: new THREE.Color(0x22d3ee) } },
          vertexShader: SHAFT_VERTEX_SHADER,
          fragmentShader: SHAFT_FRAGMENT_SHADER,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        })
      )
      shaft2.position.set(5.5, 6, -8)
      shaft2.rotation.z = -0.08
      shaft2.rotation.x = -0.04
      shaft2.scale.set(0.7, 0.85, 1)
      this.farGroup.add(shaft2)
    }

    this.updaters.push((elapsed, _delta, intro) => {
      material.uniforms.time.value = elapsed
      material.uniforms.introFade.value = intro
    })
  }

  /**
   * Tráfico: faros blancos que se acercan y luces de freno rojas que se
   * alejan, en loop sobre la carretera.
   *
   * Fase 8.6 — cantidad de streaks (`quality.trafficCount`),
   * `BufferGeometry`/geometría (`PlaneGeometry(0.32, 3.2)`), posiciones
   * iniciales, material (`MeshBasicMaterial`, mismos `transparent`/
   * `opacity`/`blending`/`depthWrite`), velocidades (`14 + Math.random() * 10`)
   * y updater idénticos a la versión inline anterior; solo se movieron a
   * `./scene/traffic-streaks.ts` (`buildTrafficStreaksScene`). Existía un
   * `scene/traffic.ts` previo y desconectado (código muerto, sin importar
   * en este archivo) que se auditó antes de escribir: no era equivalente
   * al inline real — envolvía `entityPace`/`scrollVelocity` con
   * fallbacks `|| 1`/`|| 0` que la versión en producción no tiene — así
   * que no se reutilizó; `scene/traffic-streaks.ts` es un módulo nuevo,
   * transcripto mecánicamente desde este método. Igual que en las Fases
   * 8.1–8.5, el `updater` que devuelve la función usa la firma común de
   * 11 parámetros de `scene/*.ts` (ver nota de arquitectura al pie del
   * archivo), incompatible con `SceneUpdater` de este motor — se lo
   * envuelve acá en un closure de 3 parámetros igual que los builders
   * anteriores, y se lo registra en `this.updaters` sin tocar
   * `start()`/el loop de animación. `roadFlow`, `elapsed`, `intro` y
   * `reducedMotion` siguen siendo estado propio de `engine.ts`: este
   * builder en particular no los usaba en la versión inline (no
   * referencia `roadFlow` ni `reducedMotion`), así que tampoco los usa
   * acá — no se agregó nada que la versión original no tuviera.
   */
  private buildTrafficStreaks() {
    const updater = buildTrafficStreaksScene({
      farGroup: this.farGroup,
      quality: this.quality,
    })

    this.updaters.push((elapsed, delta, intro) =>
      updater(
        elapsed,
        delta,
        intro,
        this.dayPhase,
        this.humidity,
        this.fog.color,
        this.entityPace,
        this.entityUnrest,
        this.scrollVelocity,
        this.pointerIntent,
        this.entityPresence
      )
    )
  }

  // ---------------------------------------------------------------------
  // Escena — plano medio: bruma
  // ---------------------------------------------------------------------

  private buildDust() {
    const COUNT = this.quality.dustCount
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
      this.dustUniforms.coolLightPos.value.copy(this.fillLight.position)
    })
  }

  /** Letreros con las imágenes reales de GTA VI orbitando la torre — ver `IMAGE_BILLBOARDS`. */
  private buildImageBillboards() {
    const loader = new THREE.TextureLoader()
    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy()
    const towerOffset = new THREE.Vector3(-3.2, 0.8, -1.5)

    const billboards: {
      mesh: THREE.Mesh
      material: THREE.ShaderMaterial
      texture: THREE.Texture
      angle: number
      def: (typeof IMAGE_BILLBOARDS)[number]
    }[] = []

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
      this.midGroup.add(mesh)
      this.imageTextures.push(texture)

      billboards.push({ mesh, material, texture, angle: (i / IMAGE_BILLBOARDS.length) * Math.PI * 2, def })
    })

    this.updaters.push((elapsed, delta, intro) => {
      // "uDistortion" es la traducción directa de interacción real (scroll
      // + cursor + inquietud editorial) a la señal de la pantalla — el
      // mismo lenguaje que ya usa `chromaKick` en el grade pass, pero
      // vivido dentro de la geometría de cada letrero.
      const interactionDistortion = Math.min(
        this.scrollVelocity * 9 + this.pointerIntent * 0.35 + this.entityUnrest * 0.25,
        1
      )

      billboards.forEach((b, i) => {
        b.angle += delta * b.def.speed * (this.reducedMotion ? 0.15 : 1)
        const x = towerOffset.x + Math.cos(b.angle + b.def.phase) * b.def.radius
        const zOrbit = towerOffset.z + Math.sin(b.angle + b.def.phase) * b.def.radius * 0.6 - 4
        // Parallax multicapa real: el dolly de scroll acerca cada letrero
        // según su propio factor — la portada de GTA VI (parallax=1) es la
        // que más "sale al encuentro" del usuario al scrollear.
        const z = zOrbit + this.scrollProgress * 4.5 * b.def.parallax
        const y = towerOffset.y + b.def.baseY + Math.sin(elapsed * 0.15 + b.def.phase) * 0.35
        b.mesh.position.set(x, y, z)
        // Billboard real: el letrero siempre encara la cámara, como
        // corresponde a una imagen legible — no tumbla como un sólido
        // abstracto, es contenido.
        b.mesh.quaternion.copy(this.camera.quaternion)

        const stagger = intro * 1.25 - i * 0.09
        b.material.uniforms.introFade.value = Math.max(0, Math.min(stagger, 1))
        b.material.uniforms.time.value = elapsed
        b.material.uniforms.uDistortion.value = interactionDistortion
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
      // Rotación moderada por "pace": la torre nunca se detiene del todo
      // (sigue viva en una ficha de ubicación), pero acompaña con más
      // energía una ficha de vehículo. Se amortigua a la mitad para que no
      // se sienta como un mecanismo, solo como un matiz de ritmo.
      const paceInfluence = 1 + (this.entityPace - 1) * 0.5
      group.rotation.y += delta * (0.045 + this.entityPresence * 0.02) * paceInfluence * intro

      // "unrest" (derivado del estado editorial: confirmado/rumor/nuestro)
      // desestabiliza el parpadeo — rumor tiembla con armónicos extra,
      // confirmado queda con un pulso limpio. Determinista, no aleatorio.
      trimRings.forEach((ring, i) => {
        const mat = ring.material as THREE.MeshBasicMaterial
        const jitter = this.entityUnrest * Math.sin(elapsed * (5.2 + i * 1.3)) * 0.25
        mat.opacity = 0.6 + 0.4 * Math.sin(elapsed * 0.8 + i * 1.7) + jitter
      })
      const beaconJitter = this.entityUnrest * Math.sin(elapsed * 7.1) * 4
      beacon.intensity = 6 + Math.max(0, Math.sin(elapsed * 1.6)) * 10 + beaconJitter
    })
  }

  // ---------------------------------------------------------------------
  // Interacción: cursor + scroll
  // ---------------------------------------------------------------------

  private handlePointerMove = (e: PointerEvent) => {
    this.pointerTarget = computePointerTarget(e)
  }

  private handleScroll = () => {
    this.scrollTarget = computeScrollTarget()
  }

  private handleVisibility = () => {
    this.paused = isDocumentHidden()
  }

  /**
   * `preventDefault()` es lo que le indica al navegador que este motor
   * *puede* recuperar el contexto (sin eso, Three.js no tiene oportunidad
   * de intentarlo y el canvas queda negro para siempre). Cancelamos el
   * frame en vuelo para no seguir llamando a `composer.render()` contra
   * un contexto muerto mientras esperamos `webglcontextrestored`.
   */
  private handleContextLost = (event: Event) => {
    const { contextLost, rafId } = lifecycleHandleContextLost(event, this.rafId)
    this.contextLost = contextLost
    this.rafId = rafId
  }

  /**
   * Three.js re-crea automáticamente los recursos de GPU derivados del
   * contexto restaurado; del lado del motor solo hace falta retomar el
   * mismo loop (`this.loopFn`) que ya traía capturados `introStartPos`/
   * `introDuration` por closure — no hay que reconstruir el motor entero
   * ni perder la coreografía de cámara en curso.
   */
  private handleContextRestored = () => {
    const { contextLost, rafId } = lifecycleHandleContextRestored({
      lifecycle: this.lifecycle,
      rafId: this.rafId,
      loopFn: this.loopFn,
    })
    this.contextLost = contextLost
    this.rafId = rafId
  }

  private handleResize = () => {
    resizeRendererAndPasses({
      camera: this.camera,
      renderer: this.renderer,
      composer: this.composer,
      bloomPass: this.bloomPass,
      bokehPass: this.bokehPass,
      fxaaPass: this.fxaaPass,
      quality: this.quality,
    })
  }

  /** Encuadre coreografiado: funde continuamente entre los `SHOTS`, en vez de ruido sin fin. */
  private computeShotFrame(elapsed: number): { pos: THREE.Vector3; look: THREE.Vector3; fovBias: number } {
    return computeCameraShotFrame(elapsed, this.totalShotDuration)
  }

  // ---------------------------------------------------------------------
  // Ciclo de vida
  // ---------------------------------------------------------------------

  start() {
    // Idempotente y sin estados ambiguos: solo arranca desde 'idle'. Un
    // segundo `start()` (remounts en React Strict Mode) o uno posterior a
    // `dispose()` son no-ops seguros por construcción, no por convención.
    if (this.lifecycle !== 'idle') return
    this.lifecycle = 'running'

    this.startTime = this.clock.getElapsedTime()
    // Entrada deliberada: arranca desde un encuadre alto y distante (como
    // una toma aérea) y desciende hacia el primer plano — una "llegada",
    // no un simple crossfade. reducedMotion la colapsa casi a un corte.
    const introDuration = this.reducedMotion ? 0.4 : 3.1
    const introStartPos = SHOTS[0].pos.clone().add(new THREE.Vector3(-2.5, 8.5, 21))

    const loop = () => {
      if (this.lifecycle !== 'running') return
      if (!this.contextLost) this.rafId = requestAnimationFrame(loop)
      if (this.paused || this.contextLost) return

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
      this.entityPace += (this.entityPaceTarget - this.entityPace) * 0.02
      this.entityFrame += (this.entityFrameTarget - this.entityFrame) * 0.018

      // Ciclo día→atardecer→noche: tiempo lento + scroll + mood de sección.
      const cyclicalTime = (elapsed * 0.004) % 1
      this.dayPhaseTarget = (cyclicalTime * 0.55 + this.sceneMood * 0.35 + this.scrollProgress * 0.1) % 1
      // Interpolación circular: el ciclo día/noche nunca "rebobina" al
      // cruzar el punto de wraparound (ver `lerpCyclic01`).
      this.dayPhase = lerpCyclic01(this.dayPhase, this.dayPhaseTarget, this.reducedMotion ? 0.004 : 0.012)
      this.humidity = 0.38 + this.sceneMood * 0.22 + Math.sin(elapsed * 0.015) * 0.06

      // Acotado a un múltiplo exacto del período de la carretera: crece sin
      // saltos visuales pero nunca degrada la precisión del uniform float
      // del shader en sesiones largas (ver `ROAD_FLOW_WRAP`).
      this.roadFlow = (this.roadFlow + delta * 5 * this.entityPace) % ROAD_FLOW_WRAP

      // Coreografía de cámara + parallax de cursor + dolly de scroll + apertura de escena.
      const frame = this.computeShotFrame(elapsed)
      const dolly = frame.pos.clone().add(new THREE.Vector3(0, 0, -this.scrollProgress * 6))
      const targetPos = introStartPos.clone().lerp(dolly, intro)
      this.camera.position.lerp(targetPos, this.reducedMotion ? 1 : 0.06)
      this.camera.position.x += this.pointer.x * 1.4
      this.camera.position.y += -this.pointer.y * 0.9

      // Encuadre por contenido: "entityFrame" eleva y abre la toma (positivo,
      // p. ej. ubicaciones) o la cierra e intima (negativo, p. ej.
      // personajes). Es composición real, no un filtro encima.
      this.camera.position.y += this.entityFrame * 0.45
      const lookTarget = frame.look
        .clone()
        .lerp(new THREE.Vector3(0, 0, 0), 1 - intro)
        .add(new THREE.Vector3(0, -this.entityFrame * 0.22, 0))
      this.camera.lookAt(lookTarget)

      const handheld =
        this.reducedMotion ? 0 : this.entityUnrest * Math.sin(elapsed * 11.3) * 0.018
      const breath = this.reducedMotion ? 0 : Math.sin(elapsed * 0.45) * 0.012
      this.camera.rotation.z =
        (this.reducedMotion ? 0 : this.pointer.x * -0.012) + handheld
      this.camera.position.y += breath

      // FOV acotado a un rango seguro: hoy la combinación de términos nunca
      // se sale de este rango, pero queda protegido si en el futuro se
      // agregan categorías/estados con valores más extremos.
      const targetFov = THREE.MathUtils.clamp(
        this.baseFov + frame.fovBias + this.scrollProgress * 5 + this.sceneMood * 4 + this.entityFrame * 3.2,
        20,
        65
      )
      this.camera.fov += (targetFov - this.camera.fov) * 0.04
      this.camera.updateProjectionMatrix()

      // Misma variable de encuadre gobierna cuánta niebla hay: una ficha de
      // ubicación despeja el aire para leer el skyline (plano establecedor);
      // una ficha de personaje lo cierra un poco (retrato, más íntimo).
      this.fog.density = THREE.MathUtils.clamp(
        this.baseFogDensity - this.entityFrame * 0.006 + this.humidity * 0.008 - Math.abs(this.dayPhase - 0.5) * 0.006,
        0.012,
        0.08
      )

      if (this.bokehPass) {
        this.bokehPass.materialBokeh.uniforms.focus.value = 22 - this.scrollProgress * 7
      }

      this.skyGroup.position.x = -this.pointer.x * 0.15
      this.skyGroup.position.y = this.pointer.y * 0.1
      this.skyGroup.rotation.y = elapsed * 0.002

      // Parallax real por profundidad de plano.
      this.farGroup.position.x = -this.pointer.x * 0.4 - this.scrollProgress * 0.6
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
      this.gradePass.uniforms.dayPhase.value = this.dayPhase
      this.gradePass.uniforms.humidity.value = this.humidity
      this.gradePass.uniforms.grainStrength.value = 0.03 + this.entityUnrest * 0.025 + this.humidity * 0.012
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
      this.bloomPass.strength = THREE.MathUtils.clamp(
        (0.8 * intro + (this.reducedMotion ? 0 : this.pointerIntent * 0.3) + this.entityPresence * 0.15 + this.arrivalKick * 0.35) *
          this.quality.bloomScale,
        0,
        2.5
      )
      this.gradePass.uniforms.bloomMix.value = this.bloomPass.strength * 0.08

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
    this.loopFn = loop
    this.rafId = requestAnimationFrame(loop)
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value
    this.dustUniforms.mouseStrength.value = value ? 0 : 1
  }

  dispose() {
    // Idempotente: `dispose()` puede llegar a invocarse más de una vez
    // (React Strict Mode en desarrollo monta/desmonta dos veces), y una
    // segunda pasada no debe repetir trabajo ni arriesgar llamadas sobre
    // recursos ya liberados.
    if (this.lifecycle === 'disposed') return
    this.lifecycle = 'disposed'

    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
    this.rafId = null
    this.loopFn = null
    // Un solo `abort()` da de baja los 6 listeners (resize, pointermove,
    // scroll, visibilitychange, webglcontextlost, webglcontextrestored)
    // registrados en el constructor con esta misma señal.
    this.abortController.abort()
    this.unsubscribeSceneBus?.()
    this.unsubscribeSceneBus = null

    // Libera cada pass del composer de forma genérica: cualquier pass que
    // se agregue en el futuro queda cubierto sin tener que recordar
    // llamarlo a mano (antes solo `bokehPass` se liberaba explícitamente).
    disposeSceneResources({
      scene: this.scene,
      envRenderTarget: this.envRenderTarget,
      imageTextures: this.imageTextures,
      composer: this.composer,
      renderer: this.renderer,
    })
    this.envRenderTarget = null
    this.imageTextures = []
  }
}

/**
 * NOTA DE ARQUITECTURA (auditoría v8.2, actualizada en Fase 8.6) — deuda
 * técnica real, parcialmente atendida de forma incremental
 * ---------------------------------------------------------------------------
 * El repo tiene una extracción paralela, mayormente NO conectada, de los
 * builders de escena hacia `./scene/*.ts` (equivalentes a cada `buildXxx()`
 * de más arriba, con un `Updater` de 11 parámetros distinto al
 * `SceneUpdater` de este archivo). Salvo las excepciones de `scene/sky.ts`
 * (Fase 8.1), `scene/water.ts` (Fase 8.2), `scene/humidity-mist.ts`
 * (Fase 8.3), `scene/fireflies.ts` (Fase 8.4), `scene/atmospheric-haze.ts`
 * (Fase 8.5) y `scene/traffic-streaks.ts` (Fase 8.6, ver las seis abajo),
 * esos `buildXxx()` inline siguen siendo los que realmente corren en
 * producción; el resto de `scene/*.ts` es código muerto — incluyendo,
 * notablemente, `buildHumidityMist` y `buildFireflies` dentro de
 * `scene/particles.ts`, y `buildTrafficStreaks` dentro de
 * `scene/traffic.ts`: son implementaciones previas, ya existentes y sin
 * conectar, auditadas y descartadas en sus respectivas fases (no se
 * tocaron ni se reutilizaron, regla de "no modificar otros builders");
 * `scene/humidity-mist.ts`, `scene/fireflies.ts` y `scene/traffic-streaks.ts`
 * son los módulos nuevos y realmente conectados. Verificar que ambas implementaciones produzcan
 * exactamente el mismo resultado visual, línea por línea, excede lo que
 * se puede confirmar sin correr el motor en un navegador — conectar esa
 * extracción a ciegas arriesgaría una regresión visual silenciosa.
 * Migrarlos — o borrarlos si se descartan — sigue siendo la mejora
 * estructural más grande disponible, pero debe hacerse builder por
 * builder, con verificación visual manual en el navegador después de
 * cada uno.
 *
 * Lo que SÍ está migrado y conectado, por fases sucesivas de extracción
 * mecánica y verificada (sin tocar cámara/uniforms/loop de animación):
 *  - Fase 3: `core/lifecycle.ts` — creación del renderer, resize,
 *    detección de visibilidad, pérdida/recuperación de contexto GPU y
 *    liberación de recursos GPU en `dispose()`.
 *  - Fase 4: `core/camera-shots.ts` (`computeShotFrame`, función pura
 *    sobre `SHOTS`/`FALLBACK_SHOT`) y `core/environment.ts`
 *    (`createEnvironment`, generación PMREM del environment map).
 *  - Fase 5: `core/postprocessing.ts` (`createPostProcessingPipeline`,
 *    creación de `EffectComposer` + `RenderPass`/`BokehPass` condicional/
 *    `UnrealBloomPass`/`ShaderPass` de grade/`FXAAPass`/`OutputPass`, en
 *    el mismo orden y con los mismos valores que antes vivían inline en
 *    el constructor). El resize de estos passes y sus uniforms por frame
 *    NO se movieron — siguen en `resizeRendererAndPasses` (Fase 3) y en
 *    el loop de `start()` respectivamente.
 *  - Fase 8.1: `scene/sky.ts` (`buildSkyDome`) — cúpula celeste
 *    procedural. Misma geometría (`SphereGeometry(85, 48, 32)`), mismo
 *    `ShaderMaterial` (mismos shaders, `side`/`depthWrite`/`fog`), mismos
 *    uniforms y mismos valores iniciales que la versión inline anterior.
 *    El `updater` de 11 parámetros que devuelve se envuelve en
 *    `buildSkyDome()` (más arriba en este archivo) en un closure
 *    `SceneUpdater` de 3 parámetros — este es el único punto de contacto
 *    entre ambas convenciones; `this.updaters`/`start()` no se tocaron.
 *  - Fase 8.2: `scene/water.ts` (`buildWaterHorizon`) — bahía Leonida en
 *    el horizonte. Misma geometría (`PlaneGeometry(240, 120, 1, 1)`,
 *    rotación/posición idénticas), mismo `ShaderMaterial` (mismos
 *    shaders, `transparent`/`depthWrite`/`blending`/`side`), mismos
 *    uniforms (`time`, `introFade`, `dayPhase`) y mismos valores
 *    iniciales que la versión inline anterior. A diferencia del cielo,
 *    no expone un campo `this.waterUniforms` — tampoco lo tenía la
 *    versión inline. El `updater` de 11 parámetros se adapta con el
 *    mismo patrón de closure que en la Fase 8.1, en `buildWaterHorizon()`
 *    (más arriba en este archivo); `this.updaters`/`start()` no se
 *    tocaron.
 *  - Fase 8.3: `scene/humidity-mist.ts` (`buildHumidityMist`) — gotas de
 *    humedad/nocturnas del aire denso de Florida. Mismo `COUNT` de
 *    partículas (`quality.mistCount`), mismos rangos de posición inicial
 *    (`60`/`30`/`40 - 10`) y semillas (`aSeed`), mismo `ShaderMaterial`
 *    (mismos shaders, `transparent`/`depthWrite`/`blending`) y mismos
 *    uniforms (`time`, `introFade`) que la versión inline anterior,
 *    incluyendo el mismo factor de `reducedMotion` sobre `time`
 *    (`elapsed * (reducedMotion ? 0.2 : 1)`). No expone uniforms propios
 *    en `this` — tampoco los tenía la versión inline. El `updater` de 11
 *    parámetros se adapta con el mismo patrón de closure que en las
 *    Fases 8.1/8.2, en `buildHumidityMist()` (más arriba en este
 *    archivo); `this.updaters`/`start()` no se tocaron. Nota: existe una
 *    implementación previa y NO relacionada de `buildHumidityMist` en
 *    `scene/particles.ts` (código muerto, sin conectar, no tocado por
 *    esta fase) — el módulo realmente conectado es
 *    `scene/humidity-mist.ts`.
 *  - Fase 8.4: `scene/fireflies.ts` (`buildFireflies`) — luciérnagas
 *    tropicales cerca del skyline. Mismo `COUNT` de partículas
 *    (`quality.fireflyCount`), mismos rangos de posición inicial
 *    (`50`/`-6 + 14`/`-20 - 25`) y mismos atributos `aPhase`/`aSpeed`
 *    con los mismos rangos (`Math.random() * Math.PI * 2` y
 *    `0.15 + Math.random() * 0.35`), mismo `ShaderMaterial` (mismos
 *    shaders, `transparent`/`depthWrite`/`blending`) y mismos uniforms
 *    (`time`, `introFade`) que la versión inline anterior. No expone
 *    uniforms propios en `this` — tampoco los tenía la versión inline.
 *    El `updater` de 11 parámetros se adapta con el mismo patrón de
 *    closure que en las Fases 8.1/8.2/8.3, en `buildFireflies()` (más
 *    arriba en este archivo); `this.updaters`/`start()` no se tocaron.
 *    Único ajuste estructural: la versión inline cortaba con
 *    `if (fireflyCount <= 0) return` antes de llamar a
 *    `this.updaters.push(...)`; el builder extraído mueve ese corte
 *    adentro y devuelve un `updater` no-op en ese caso (mismo patrón ya
 *    presente en la implementación descartada de `scene/particles.ts`),
 *    así que el corte se sigue haciendo, solo que un nivel más adentro
 *    — sin cambio de comportamiento visual observable (nada se dibuja,
 *    nada se calcula por frame en ambos casos). Nota: existe una
 *    implementación previa y NO relacionada de `buildFireflies` en
 *    `scene/particles.ts` (código muerto, sin conectar, no tocado por
 *    esta fase, auditada y verificada equivalente antes de descartarla)
 *    — el módulo realmente conectado es `scene/fireflies.ts`.
 *  - Fase 8.5: `scene/atmospheric-haze.ts` (`buildAtmosphericHaze`) —
 *    capas de haze volumétrico con parallax por profundidad. Mismo
 *    número de capas (`quality.hazeLayers`), misma geometría por capa
 *    (`PlaneGeometry(90 + i * 20, 35, 1, 1)`), misma posición inicial
 *    (`0, -2 + i * 2.5, -18 - i * 12`), mismo `ShaderMaterial` (mismos
 *    shaders, `transparent`/`depthWrite`/`blending`/`side`) y mismos
 *    uniforms (`time`, `introFade`, `hazeColor` alternando
 *    `0x6a2878`/`0x284868`, `layerSeed: i * 1.73`) que la versión inline
 *    anterior. No existía ni `atmospheric-haze.ts` previo ni código
 *    muerto relacionado en `scene/particles.ts` — se auditó antes de
 *    escribir y se confirmó que el módulo se crea desde cero, sin
 *    reutilizar nada. El `updater` de 11 parámetros se adapta con el
 *    mismo patrón de closure que en las Fases 8.1/8.2/8.3/8.4, en
 *    `buildAtmosphericHaze()` (más arriba en este archivo);
 *    `this.updaters`/`start()` no se tocaron. Único ajuste estructural:
 *    la versión inline hacía un `this.updaters.push(...)` por capa
 *    (dentro del `for`) para `time`/`introFade`/`position.x`, más un
 *    `push` final para `position.y` dependiente de
 *    `this.scrollProgress`; el builder extraído consolida las
 *    actualizaciones por capa en un único `Updater` (mismo patrón de
 *    `forEach` ya usado en `buildNeonSigns()`), y el `position.y` por
 *    `scrollProgress` — estado propio del motor, ausente de la firma de
 *    `Updater` — se mantiene como un `push` separado en `engine.ts`, tal
 *    como antes. Mismo orden de ejecución por frame y mismos valores
 *    numéricos que la versión inline.
 *  - Fase 8.6: `scene/traffic-streaks.ts` (`buildTrafficStreaks`) —
 *    faros blancos que se acercan y luces de freno rojas que se alejan,
 *    en loop sobre la carretera. Mismo `COUNT` de streaks
 *    (`quality.trafficCount`), misma geometría (`PlaneGeometry(0.32, 3.2)`
 *    compartida entre todos los streaks), mismas posiciones iniciales
 *    (`laneX` según `oncoming`, `y = -12.55`, `z = -60 + Math.random() * 90`,
 *    `rotation.x = -Math.PI / 2`), mismo `MeshBasicMaterial` (mismo
 *    `color` alternando `0xfff2d6`/`0xff2d4d`, `transparent`/`opacity`/
 *    `blending`/`depthWrite`) y mismas velocidades
 *    (`14 + Math.random() * 10`) que la versión inline anterior. Este
 *    builder no usa `ShaderMaterial`/uniforms ni `ROAD_FLOW_WRAP`/
 *    `ROAD_DASH_PERIOD` — esas constantes las consume el road builder y
 *    el acumulador `this.roadFlow`, ninguno de los dos tocado por esta
 *    fase. Existía un `scene/traffic.ts` previo, desconectado, con una
 *    implementación de `buildTrafficStreaks` — se auditó contra el
 *    inline real y NO era equivalente: envolvía `entityPace` y
 *    `scrollVelocity` con fallbacks `(entityPace || 1)`/
 *    `(scrollVelocity || 0)` que la versión en producción no tiene (esta
 *    multiplica directamente por `this.entityPace`/`this.scrollVelocity`
 *    sin fallback), por lo que ese archivo no se tocó ni se reutilizó;
 *    `scene/traffic-streaks.ts` es un módulo nuevo, transcripto
 *    mecánicamente desde el inline real. El `updater` de 11 parámetros
 *    se adapta con el mismo patrón de closure que en las Fases
 *    8.1–8.5, en `buildTrafficStreaks()` (más arriba en este archivo);
 *    `this.updaters`/`start()` no se tocaron. `roadFlow`, `elapsed`,
 *    `intro` y `reducedMotion` siguen siendo estado propio de
 *    `engine.ts`; este builder en particular no referenciaba `roadFlow`
 *    ni `reducedMotion` en la versión inline, así que tampoco lo hace
 *    acá. Mismos valores numéricos y mismo comportamiento que la
 *    versión inline.
 *
 * El cuerpo del loop de animación dentro de `start()` (cámara dinámica,
 * uniforms por frame, matemática visual del ciclo día/noche) sigue sin
 * tocarse — es, a propósito, la parte de mayor riesgo y la última en
 * migrar, solo cuando exista una forma de verificar equivalencia visual
 * sin depender de inspección manual línea por línea.
 */
