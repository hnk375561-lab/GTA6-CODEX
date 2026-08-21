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
import { lerpCyclic01, smootherstep } from './utils/math'
import { SHOTS, ROAD_FLOW_WRAP } from './config/scene'
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
// Fase nueva: vida urbana — vehículos con cuerpo (carril propio, más
// cerca que traffic-streaks.ts), botes lentos en la bahía y semáforos
// cerca de la carretera. Los tres siguen el mismo patrón de módulo
// autocontenido por builder (Updater de 11 parámetros, wrapper de 3
// parámetros acá abajo) que el resto de scene/*.ts.
import { buildStreetTraffic as buildStreetTrafficScene } from './scene/street-traffic'
import { buildDistantMovement as buildDistantMovementScene } from './scene/distant-movement'
import { buildStreetSignals as buildStreetSignalsScene } from './scene/street-signals'
// Fase 10.4A: eventos dinámicos del mundo — capa de cielo. Mismo patrón
// autocontenido de módulo por builder (Updater de 11 parámetros, wrapper
// de 3 parámetros acá abajo) que el resto de scene/*.ts.
import { buildAirEvents as buildAirEventsScene } from './scene/air-events'
import { buildBirds as buildBirdsScene } from './scene/birds'
// Fase 8.7: buildDust() migrado mecánicamente a ./scene/dust.ts (ver nota
// de arquitectura al pie del archivo). DUST_VERTEX_SHADER/
// DUST_FRAGMENT_SHADER ya no se importan acá directamente: ahora los
// consume ./scene/dust.ts. Existía una implementación de `buildDust`
// desconectada dentro de `scene/particles.ts` — se auditó contra el
// inline real y, a diferencia de `scene/traffic.ts` en la Fase 8.6, SÍ
// resultó equivalente (mismo COUNT, geometría, atributos, uniforms,
// material y updater); aun así no se reutilizó directamente para
// mantener el mismo patrón de módulo autocontenido usado en las Fases
// 8.1–8.6 (cada builder en su propio archivo, sin depender de
// `scene/particles.ts`, que sigue sin conectar).
import { buildDust as buildDustScene } from './scene/dust'
import { buildRoadScene } from './scene/road'
import { buildHorizonSunScene } from './scene/horizon-sun'
import { buildLightShaftScene } from './scene/light-shaft'
// Fase 8.11: buildFarSkyline() migrado mecánicamente a
// ./scene/far-skyline.ts (ver nota de arquitectura al pie del
// archivo). Existía una implementación desconectada equivalente en
// `scene/skyline.ts` (misma geometría/materiales/valores, pero nunca
// importada por nadie) — se auditó línea por línea contra el inline
// real y resultó equivalente; aun así se creó `scene/far-skyline.ts`
// como archivo nuevo, propio de esta fase, en vez de conectar
// `scene/skyline.ts`, para no introducir cambios fuera del alcance de
// la Fase 8.11 y mantener el mismo patrón de módulo autocontenido
// usado en las Fases 8.1/8.2/8.7/8.8/8.9/8.10.
import { buildFarSkyline as buildFarSkylineScene } from './scene/far-skyline'
// Fase 8.12: buildNeonSigns() migrado mecánicamente a
// ./scene/neon-signs.ts (ver nota de arquitectura al pie del archivo).
// SHAFT_VERTEX_SHADER/NEON_SIGN_FRAGMENT_SHADER ya no se importan acá
// directamente: ahora los consume ./scene/neon-signs.ts. Existía una
// implementación desconectada equivalente en `scene/neon.ts` — se
// auditó línea por línea contra el inline real y resultó equivalente;
// aun así no se reutilizó directamente (no se importó desde
// `scene/neon.ts`), para mantener el mismo patrón de módulo
// autocontenido usado en las Fases 8.1–8.11.
import { buildNeonSignsScene } from './scene/neon-signs'
// Fase 8.13: buildFocalTower() migrado mecánicamente a
// ./scene/focal-tower.ts (ver nota de arquitectura al pie del archivo).
// Existía una implementación desconectada equivalente en `scene/tower.ts`
// — se auditó línea por línea contra el inline real y resultó
// equivalente en todo lo sustantivo (geometría/material/shader/luces/
// updater), salvo fallbacks defensivos `|| 1`/`|| 0` ausentes en la
// versión que corre en producción; no se reutilizó, para mantener el
// mismo patrón de módulo autocontenido usado en las Fases 8.1–8.12.
import { buildFocalTowerScene } from './scene/focal-tower'
// Fase 8.14: buildImageBillboards() migrado mecánicamente a
// ./scene/image-billboards.ts (ver nota de arquitectura al pie del
// archivo). BILLBOARD_VERTEX_SHADER/BILLBOARD_FRAGMENT_SHADER ya no se
// importan acá directamente: ahora los consume
// ./scene/image-billboards.ts. Existía una implementación desconectada
// en `scene/billboard.ts` — se auditó línea por línea contra el inline
// real y NO resultó equivalente (faltaba el amortiguado por
// `reducedMotion` en la velocidad angular, y usaba `scrollVelocity` en
// vez de `scrollProgress` para el parallax de profundidad); no se
// reutilizó, se transcribió mecánicamente el inline real a
// `scene/image-billboards.ts`.
import { buildImageBillboardsScene } from './scene/image-billboards'
// Fase 8.15: setupLights() migrado mecánicamente a ./scene/lights.ts
// (ver nota de arquitectura al pie del archivo). No existía ningún
// `scene/lights.ts`/`scene/light.ts` paralelo previo a esta fase (el
// único archivo con "light" en el nombre desconectado era
// `scene/lightShaft.ts`, que no tiene relación con `setupLights()`); el
// módulo nuevo se transcribió mecánicamente desde el inline real.
import { buildLightsScene } from './scene/lights'

/**
 * GTA6ZonaWebGLEngine — v5 "Vice City, no una demo abstracta de Three.js"
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

export class GTA6ZonaWebGLEngine {
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

  // --- Degradación adaptativa de rendimiento -----------------------------
  /**
   * `detectQualityProfile` clasifica el tier SOLO por ancho de viewport y
   * tipo de puntero — no por capacidad real de la GPU. Un desktop con
   * gráficos integrados (muy común) cae en tier 'high' igual que una
   * máquina con GPU dedicada, y arrastra bokeh (profundidad de campo) +
   * bloom + antialiasing + DPR 2 aunque no pueda sostenerlo a 60fps.
   * Estos campos miden el tiempo real de frame y, si está sostenidamente
   * por debajo de un umbral aceptable, degradan el motor en vivo — una
   * sola vez, sin volver a subir, para no generar parpadeo de calidad.
   */
  private lastFrameTimestamp = 0
  private readonly frameTimeSamples: number[] = []
  private perfDowngraded = false
  /** Umbral: promedio sostenido por debajo de ~30fps (33.3ms/frame). */
  private static readonly SLOW_FRAME_MS = 33.3
  /** Cuántas muestras (~frames) evaluar antes de decidir degradar. Antes
   *  eran 90 (hasta ~6s de mal rendimiento sostenido antes de corregir,
   *  con el umbral viejo de 24fps); 45 reacciona en ~1.5-2s sin volverse
   *  tan sensible como para degradar por un par de frames sueltos. */
  private static readonly PERF_SAMPLE_WINDOW = 45

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
    this.buildStreetTraffic()
    this.buildDistantMovement()
    this.buildStreetSignals()
    this.buildDust()
    this.buildFireflies()
    this.buildHumidityMist()
    this.buildImageBillboards()
    this.buildFocalTower()
    this.buildAirEvents()
    this.buildBirds()

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
        `GTA6ZonaWebGLEngine: construcción incompleta, falta inicializar: ${missing.join(', ')}. ` +
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

  /**
   * Letreros neón premium GTA VI — Vice City moderna con atmósfera
   * cinematográfica.
   *
   * Fase 8.12 — signConfigs, colores, posiciones, geometría, materiales,
   * shaders, lógica de `distanceFade` y condición de `quality.tier`
   * idénticos a la versión inline anterior; solo se movieron a
   * `./scene/neon-signs.ts` (`buildNeonSignsScene`). Igual que en Fases
   * 8.1/8.2/8.4/8.7/8.8/8.9/8.10/8.11, el `updater` que devuelve esa
   * función usa la firma común de 11 parámetros de `scene/*.ts` (ver
   * nota de arquitectura al pie del archivo), incompatible con
   * `SceneUpdater` de este motor — se lo envuelve acá en un closure de 3
   * parámetros que lee `this.dayPhase`/`this.entityUnrest` en cada frame
   * exactamente igual que antes, y se lo registra en `this.updaters` sin
   * tocar `start()`/el loop de animación. Igual que en la Fase 8.4
   * (`buildFireflies`), la comprobación `quality.tier === 'low'` se
   * movió dentro del builder: en vez de que este método corte antes de
   * llamar a `this.updaters.push(...)` (como hacía la versión inline),
   * el builder devuelve un `updater` no-op cuando la calidad es baja, y
   * ese no-op es el que termina envuelto y registrado — mismo resultado
   * visual.
   */
  private buildNeonSigns() {
    const updater = buildNeonSignsScene({
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

  /**
   * Luz ambiental + luz clave (magenta neón) + luz de relleno (cian
   * neón), acopladas al ciclo día/noche y a la niebla de la escena.
   *
   * Fase 8.15 — colores, intensidades, posiciones, fórmulas de
   * oscilación y el cálculo de `fogColor` idénticos a la versión inline
   * anterior; solo se movieron a `./scene/lights.ts`
   * (`buildLightsScene`). A diferencia de la mayoría de builders
   * migrados, este wrapper conserva la asignación de
   * `this.keyLight`/`this.fillLight` (otros métodos dependen de esas
   * referencias: `buildDust()`, el loop de `start()`, y el invariante de
   * `assertFullyInitialized()`). El `updater` que devuelve
   * `buildLightsScene()` no usa la firma común de 11 parámetros de
   * `scene/*.ts` — define su propio `LightsUpdater`, porque la versión
   * inline leía `this.dayPhase`/`this.entityUnrest`/`this.sceneMood`/
   * `this.entityWarmth`/`this.scrollProgress` directo de `this` dentro
   * de un closure de un solo parámetro (`elapsed`), sin pasar por esa
   * firma común (mismo criterio que `scene/road.ts` en la Fase 8.8 y
   * `scene/image-billboards.ts` en la Fase 8.14). `this.fog` se pasa
   * como opción del builder (se crea una única vez en el constructor,
   * antes de esta llamada, y nunca se reasigna) para que el `updater`
   * pueda escribir `fog.color` cada frame exactamente igual que antes.
   */
  private setupLights() {
    const { keyLight, fillLight, updater } = buildLightsScene({
      scene: this.scene,
      fog: this.fog,
    })
    this.keyLight = keyLight
    this.fillLight = fillLight

    this.updaters.push((elapsed) =>
      updater(elapsed, this.dayPhase, this.entityUnrest, this.sceneMood, this.entityWarmth, this.scrollProgress)
    )
  }

  // ---------------------------------------------------------------------
  // Escena — plano lejano
  // ---------------------------------------------------------------------

  /**
   * Carretera nocturna: horizonte, no decoración — atmósfera y fuga de
   * perspectiva.
   *
   * Fase 8.8 — geometría, material, uniforms y valores idénticos a la
   * versión inline anterior; solo se movieron a `./scene/road.ts`
   * (`buildRoadScene`). Igual que en Fases 8.1/8.2, el `updater` que
   * devuelve esa función es incompatible con `SceneUpdater` de este
   * motor — se lo envuelve acá en un closure de 3 parámetros que lee
   * `this.dayPhase`/`this.humidity`/`this.fog.color`/`this.reducedMotion`/
   * `this.roadFlow` en cada frame exactamente igual que antes, y se lo
   * registra en `this.updaters` sin tocar `start()`/el loop de
   * animación. `this.roadFlow` en particular sigue siendo acumulado
   * exclusivamente por el loop de `start()` (ver `ROAD_FLOW_WRAP`); acá
   * solo se lee su valor ya actualizado del frame, nunca se lo escribe.
   */
  private buildRoad() {
    const { uniforms, updater } = buildRoadScene({ farGroup: this.farGroup })
    this.roadUniforms = uniforms

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
        this.entityPresence,
        this.reducedMotion,
        this.roadFlow
      )
    )
  }

  /**
   * Skyline de Miami: edificios con ventanas encendidas alternados con
   * palmeras en silueta.
   *
   * Fase 8.11 — geometría, material, colores, escalas, posiciones,
   * rotaciones y valores numéricos idénticos a la versión inline
   * anterior; solo se movieron a `./scene/far-skyline.ts`
   * (`buildFarSkylineScene`). Igual que en Fases 8.1/8.2/8.7/8.8/8.9/
   * 8.10, el `updater` principal y cada `windowUpdater` (uno por
   * ventana, para el parpadeo) que devuelve esa función usan la firma
   * común de 11 parámetros de `scene/*.ts` (ver nota de arquitectura
   * al pie del archivo), incompatible con `SceneUpdater` de este
   * motor — se los envuelve acá en closures de 3 parámetros que leen
   * `this.quality`/`this.dayPhase` en cada frame exactamente igual que
   * antes, y se registran en `this.updaters` sin tocar `start()`/el
   * loop de animación.
   */
  private buildFarSkyline() {
    const { updater, windowUpdaters } = buildFarSkylineScene({
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

    windowUpdaters.forEach((windowUpdater) => {
      this.updaters.push((elapsed, delta, intro) =>
        windowUpdater(
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
    })
  }

  /**
   * Sol/luna bajo de horizonte con bandas cortadas — el atardecer de
   * Miami detrás del skyline.
   *
   * Fase 8.9 — geometría, material, uniforms y valores idénticos a la
   * versión inline anterior; solo se movieron a `./scene/horizon-sun.ts`
   * (`buildHorizonSunScene`). Igual que en Fases 8.1/8.2/8.8, el
   * `updater` que devuelve esa función es incompatible con
   * `SceneUpdater` de este motor — se lo envuelve acá en un closure de 3
   * parámetros que lee `this.dayPhase` en cada frame exactamente igual
   * que antes, y se lo registra en `this.updaters` sin tocar
   * `start()`/el loop de animación. El sol no tiene uniforms propios
   * expuestos en `this` (no existía un campo `this.sunUniforms` en la
   * versión inline), así que acá tampoco se agrega uno.
   */
  private buildHorizonSun() {
    const updater = buildHorizonSunScene({ farGroup: this.farGroup })

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
   * Haces de neón que suben desde la torre focal (magenta + cian, el
   * segundo condicionado a `quality.tier !== 'low'`).
   *
   * Fase 8.10 — geometría, material, uniforms y valores idénticos a la
   * versión inline anterior; solo se movieron a
   * `./scene/light-shaft.ts` (`buildLightShaftScene`). Igual que en
   * Fases 8.1/8.8, el `updater` que devuelve esa función es
   * incompatible con `SceneUpdater` de este motor — se lo envuelve acá
   * en un closure de 3 parámetros, exactamente igual que antes, y se lo
   * registra en `this.updaters` sin tocar `start()`/el loop de
   * animación. `this.shaftUniforms` se sigue asignando acá desde el
   * `uniforms` devuelto por el builder, tal como exige
   * `assertFullyInitialized()`.
   */
  private buildLightShaft() {
    const { uniforms, updater } = buildLightShaftScene({ farGroup: this.farGroup, quality: this.quality })
    this.shaftUniforms = uniforms

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

  /**
   * Vehículos con cuerpo (silueta bajo-poly + faros/frenos aditivos) en
   * un carril propio, más cerca de cámara que `buildTrafficStreaks()`
   * (que sigue igual, sin tocar). Ver `./scene/street-traffic.ts`
   * (`buildStreetTrafficScene`) para el detalle completo. Mismo patrón
   * de wiring que el resto de builders migrados: el `updater` de 11
   * parámetros se envuelve acá en un closure de 3 parámetros que lee el
   * estado del motor en cada frame, y se registra en `this.updaters`
   * sin tocar `start()`/el loop de animación.
   */
  private buildStreetTraffic() {
    const updater = buildStreetTrafficScene({
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
   * Siluetas de bote cruzando lentamente el horizonte de la bahía, sobre
   * el mismo plano que `buildWaterHorizon()`. Ver
   * `./scene/distant-movement.ts` (`buildDistantMovementScene`) para el
   * detalle completo. Gateado a `quality.tier !== 'low'` dentro del
   * builder (no-op sin construir nada en low-end, mismo criterio que
   * `buildNeonSigns()`/Fase 8.4 `buildFireflies()`), así que este
   * wrapper se registra igual en todos los tiers sin ramificar acá.
   */
  private buildDistantMovement() {
    const updater = buildDistantMovementScene({
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
   * Postes con semáforo (3 discos apilados, ciclo cian/magenta
   * determinista por `elapsed`) cerca del borde de la carretera. Ver
   * `./scene/street-signals.ts` (`buildStreetSignalsScene`) para el
   * detalle completo. Mismo gating por tier que `buildDistantMovement()`
   * de arriba (no-op en low-end, resuelto dentro del builder).
   */
  private buildStreetSignals() {
    const updater = buildStreetSignalsScene({
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

  /**
   * Partículas de polvo/bruma en el plano medio.
   *
   * Fase 8.7 — `COUNT` (`quality.dustCount`), `BufferGeometry`/atributos
   * (`position`, `seed`, `aSize`), `ShaderMaterial` (mismos shaders,
   * `transparent`/`depthWrite`/`blending`), uniforms (`time`, `mouseNDC`,
   * `mouseStrength`, `warmLightPos`, `coolLightPos`, `introFade`,
   * `warmColor`, `coolColor`) y updater idénticos a la versión inline
   * anterior; solo se movieron a `./scene/dust.ts` (`buildDustScene`).
   * Existía una implementación de `buildDust` desconectada en
   * `scene/particles.ts` — a diferencia de `scene/traffic.ts` (Fase 8.6),
   * esa sí resultó equivalente al auditarla línea por línea contra este
   * método, pero no se reutilizó directamente: se transcribió mecánicamente
   * igual, manteniendo el patrón de un archivo autocontenido por builder ya
   * usado en las Fases 8.1–8.6, sin crear una dependencia hacia
   * `scene/particles.ts` (que sigue sin conectar). A diferencia de los
   * builders de las Fases 8.1–8.6, este SÍ expone estado propio en
   * `this.dustUniforms` — igual que `this.skyUniforms` en la Fase 8.1 —
   * porque el loop de `start()` sigue leyendo/escribiendo
   * `this.dustUniforms.time`/`mouseNDC`/`mouseStrength`/`introFade` cada
   * frame (uniforms globales del loop, sin tocar). El `updater` de 11
   * parámetros que devuelve `buildDustScene()` se envuelve acá en un
   * closure de 3 parámetros igual que los builders anteriores, y solo
   * cubre lo que cubría el `updater` original (`points.rotation.y` y
   * copiar `keyLight`/`fillLight` en `warmLightPos`/`coolLightPos`); el
   * resto de `this.dustUniforms` lo sigue actualizando el loop de
   * `start()`, sin cambios. `this.updaters`/`start()` no se tocaron.
   */
  private buildDust() {
    const { uniforms, updater } = buildDustScene({
      midGroup: this.midGroup,
      quality: this.quality,
      reducedMotion: this.reducedMotion,
      keyLight: this.keyLight,
      fillLight: this.fillLight,
    })
    this.dustUniforms = uniforms

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
   * Letreros con las imágenes reales de GTA VI orbitando la torre — ver
   * `IMAGE_BILLBOARDS`.
   *
   * Fase 8.14 — `IMAGE_BILLBOARDS`, geometrías, texturas, materiales,
   * shaders, posiciones orbitales, velocidad, parallax, `reducedMotion`,
   * `scrollProgress`, `pointerIntent`, `entityUnrest` y el quaternion de
   * cámara idénticos a la versión inline anterior; solo se movieron a
   * `./scene/image-billboards.ts` (`buildImageBillboardsScene`). A
   * diferencia de la mayoría de builders migrados (Fases 8.1–8.13), este
   * no usa la firma común de 11 parámetros de `scene/*.ts` — define su
   * propio `ImageBillboardsUpdater` porque la versión inline dependía de
   * `this.scrollProgress`/`this.reducedMotion`/`this.camera`, ausentes
   * de esa firma común (ver comentario en el archivo extraído, mismo
   * criterio que `scene/road.ts` en la Fase 8.8). El wrapper de acá lee
   * esos tres valores de `this` en cada frame, igual que el resto de
   * builders migrados leen `this.dayPhase`/`this.entityUnrest`/etc.
   * `this.imageTextures` (usado por `dispose()`) tampoco se tocó: el
   * builder devuelve las texturas creadas y este wrapper las agrega acá,
   * igual que antes. Existía una implementación desconectada en
   * `scene/billboard.ts` — se auditó línea por línea contra el inline
   * real y NO resultó equivalente (sin amortiguado por `reducedMotion`,
   * y `scrollVelocity` en vez de `scrollProgress` para el parallax); no
   * se reutilizó.
   */
  private buildImageBillboards() {
    const { textures, updater } = buildImageBillboardsScene({
      midGroup: this.midGroup,
      renderer: this.renderer,
      camera: this.camera,
    })
    this.imageTextures.push(...textures)

    this.updaters.push((elapsed, delta, intro) =>
      updater(
        elapsed,
        delta,
        intro,
        this.camera,
        this.scrollProgress,
        this.scrollVelocity,
        this.pointerIntent,
        this.entityUnrest,
        this.reducedMotion
      )
    )
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
  /**
   * Torre Art Deco de vidrio con anillos neón y baliza.
   *
   * Fase 8.13 — geometría, material, shader injection, luces, colores,
   * posiciones, escalas y cálculos de jitter idénticos a la versión
   * inline anterior; solo se movieron a `./scene/focal-tower.ts`
   * (`buildFocalTowerScene`). Igual que en las Fases 8.1–8.12, el
   * `updater` que devuelve esa función usa la firma común de 11
   * parámetros de `scene/*.ts` (ver nota de arquitectura al pie del
   * archivo), incompatible con `SceneUpdater` de este motor — se lo
   * envuelve acá en un closure de 3 parámetros que lee
   * `this.entityPace`/`this.entityUnrest`/`this.entityPresence` en cada
   * frame exactamente igual que antes, y se lo registra en
   * `this.updaters` sin tocar `start()`/el loop de animación. Existía una
   * implementación desconectada equivalente en `scene/tower.ts` — se
   * auditó línea por línea contra el inline real y resultó equivalente
   * en todo lo sustantivo (única diferencia: fallbacks defensivos
   * `|| 1`/`|| 0` ausentes acá); no se reutilizó, siguiendo el mismo
   * criterio de las Fases 8.6/8.11/8.12. Mismos valores numéricos y
   * mismo comportamiento que la versión inline.
   */
  private buildFocalTower() {
    const updater = buildFocalTowerScene({
      nearGroup: this.nearGroup,
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
  // Escena — plano lejano: eventos dinámicos de mundo (cielo)
  // ---------------------------------------------------------------------

  /**
   * Fase 10.4A — avión lejano cruzando el cielo (silueta cuerpo + alas,
   * sin luces/aditivo en esta primera versión). Ver
   * `./scene/air-events.ts` (`buildAirEventsScene`) para el detalle
   * completo. Mismo patrón de wiring que el resto de builders migrados:
   * el `updater` de 11 parámetros se envuelve en un closure de 3
   * parámetros que lee el estado del motor en cada frame, y se registra
   * en `this.updaters` sin tocar `start()`/el loop de animación.
   */
  private buildAirEvents() {
    const updater = buildAirEventsScene({
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
   * Fase 10.4A — bandadas de aves lejanas (geometría/material
   * compartidos). Ver `./scene/birds.ts` (`buildBirdsScene`) para el
   * detalle completo. Mismo gating por tier que `buildAirEvents()` de
   * arriba (no-op en low-end, resuelto dentro del builder).
   */
  private buildBirds() {
    const updater = buildBirdsScene({
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

  /**
   * Se llama una vez por frame desde `loop()` con el tiempo real transcurrido
   * (medido con `performance.now()`, no con `this.clock`, que se pausa/ajusta
   * y no refleja el costo real de renderizado). Acumula una ventana móvil de
   * muestras y, si el promedio indica que el hardware no sostiene un frame
   * rate aceptable, degrada la calidad una sola vez (no oscila).
   */
  private trackFrameTimeAndMaybeDowngrade(now: number) {
    if (this.perfDowngraded || this.reducedMotion) return
    if (this.lastFrameTimestamp === 0) {
      this.lastFrameTimestamp = now
      return
    }
    const frameMs = now - this.lastFrameTimestamp
    this.lastFrameTimestamp = now
    // Frames anómalos (tab en segundo plano recién recuperado, primer
    // frame tras un resize, etc.) no deben contaminar el promedio.
    if (frameMs <= 0 || frameMs > 250) return

    this.frameTimeSamples.push(frameMs)
    if (this.frameTimeSamples.length < GTA6ZonaWebGLEngine.PERF_SAMPLE_WINDOW) return

    const avg =
      this.frameTimeSamples.reduce((sum, v) => sum + v, 0) / this.frameTimeSamples.length
    this.frameTimeSamples.length = 0

    if (avg > GTA6ZonaWebGLEngine.SLOW_FRAME_MS) {
      this.applyPerfDowngrade()
    }
  }

  /**
   * Un solo escalón de degradación, aplicado en vivo y de forma permanente
   * para la sesión: apaga el paso más caro (bokeh/profundidad de campo),
   * recorta el bloom y baja el pixel ratio a 1. No reconstruye geometría
   * (dust/fireflies/mist quedan con el conteo original) para no arriesgar
   * un salto visual brusco — el objetivo es recuperar fluidez, no vaciar
   * la escena.
   */
  private applyPerfDowngrade() {
    this.perfDowngraded = true

    if (this.bokehPass) {
      this.composer.removePass(this.bokehPass)
      this.bokehPass.dispose()
      this.bokehPass = null
    }

    // `quality` es `readonly` (no se puede reasignar el objeto), pero sus
    // propiedades sí son mutables — el resto del loop y `handleResize` ya
    // leen estos valores en cada frame/resize, así que mutarlos in-place
    // basta para que el resto del motor reaccione sin cambios adicionales.
    this.quality.enableBokeh = false
    this.quality.bloomScale = Math.min(this.quality.bloomScale, 0.4)
    this.quality.maxDpr = 1

    this.handleResize()
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

      this.trackFrameTimeAndMaybeDowngrade(performance.now())
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
 * NOTA DE ARQUITECTURA (auditoría v8.2, actualizada en Fase 8.7) — deuda
 * técnica real, parcialmente atendida de forma incremental
 * ---------------------------------------------------------------------------
 * El repo tiene una extracción paralela, mayormente NO conectada, de los
 * builders de escena hacia `./scene/*.ts` (equivalentes a cada `buildXxx()`
 * de más arriba, con un `Updater` de 11 parámetros distinto al
 * `SceneUpdater` de este archivo). Salvo las excepciones de `scene/sky.ts`
 * (Fase 8.1), `scene/water.ts` (Fase 8.2), `scene/humidity-mist.ts`
 * (Fase 8.3), `scene/fireflies.ts` (Fase 8.4), `scene/atmospheric-haze.ts`
 * (Fase 8.5), `scene/traffic-streaks.ts` (Fase 8.6) y `scene/dust.ts`
 * (Fase 8.7, ver las siete abajo), esos `buildXxx()` inline siguen siendo
 * los que realmente corren en
 * producción; el resto de `scene/*.ts` es código muerto — incluyendo,
 * notablemente, `buildHumidityMist` y `buildFireflies` dentro de
 * `scene/particles.ts` (no equivalentes en detalle a la versión real:
 * ver Fases 8.3/8.4), `buildTrafficStreaks` dentro de `scene/traffic.ts`
 * (no equivalente, ver Fase 8.6), y `buildDust` dentro de
 * `scene/particles.ts` (SÍ equivalente al inline real, ver Fase 8.7, pero
 * tampoco reutilizado directamente — se transcribió mecánicamente a un
 * módulo propio para mantener el patrón de un archivo autocontenido por
 * builder): son implementaciones previas, ya existentes y sin conectar,
 * auditadas en sus respectivas fases (no se tocaron, regla de "no
 * modificar otros builders"); `scene/humidity-mist.ts`,
 * `scene/fireflies.ts`, `scene/traffic-streaks.ts` y `scene/dust.ts` son
 * los módulos nuevos y realmente conectados. Verificar que ambas implementaciones produzcan
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
 *  - Fase 8.7: `scene/dust.ts` (`buildDust`) — partículas de polvo/bruma
 *    en el plano medio. Mismo `COUNT` (`quality.dustCount`), misma
 *    `BufferGeometry`/atributos (`position`, `seed` — con el mismo
 *    condicional de `reducedMotion` sobre `seed[i3+1]`/`seed[i3+2]` que la
 *    versión inline —, `aSize`), mismo `ShaderMaterial` (mismos shaders,
 *    `transparent`/`depthWrite`/`blending`), mismos uniforms (`time`,
 *    `mouseNDC`, `mouseStrength`, `warmLightPos`, `coolLightPos`,
 *    `introFade`, `warmColor: 0xff6fa8`, `coolColor: 0x22d3ee`) y mismo
 *    `updater` (`points.rotation.y = elapsed * 0.008` + copiar
 *    `keyLight`/`fillLight` en `warmLightPos`/`coolLightPos`) que la
 *    versión inline anterior. A diferencia de las Fases 8.1–8.6, este
 *    builder SÍ expone estado propio en `this.dustUniforms` — mismo caso
 *    que `this.skyUniforms` en la Fase 8.1 —, porque el loop de `start()`
 *    sigue leyendo/escribiendo `this.dustUniforms.time`/`mouseNDC`/
 *    `mouseStrength`/`introFade` cada frame; ese fragmento del loop
 *    (uniforms globales) no se tocó. Existía una implementación de
 *    `buildDust` desconectada en `scene/particles.ts` — a diferencia de
 *    `scene/traffic.ts` (Fase 8.6), al auditarla línea por línea SÍ
 *    resultó equivalente al inline real (mismo `COUNT`, geometría,
 *    atributos, uniforms, material y updater, solo con la firma de 11
 *    parámetros en vez del `push` directo de 1 parámetro que usaba el
 *    inline). Aun siendo equivalente, no se reutilizó directamente
 *    importándola desde `scene/particles.ts`: se transcribió
 *    mecánicamente a `scene/dust.ts`, manteniendo el mismo patrón de
 *    módulo autocontenido por builder usado en las Fases 8.1–8.6, sin
 *    crear una dependencia hacia `scene/particles.ts` (que sigue sin
 *    conectar, con `buildFireflies`/`buildHumidityMist` como código
 *    muerto no equivalente, ver Fases 8.3/8.4). El `updater` de 11
 *    parámetros que devuelve `buildDust()` (el de `scene/dust.ts`) se
 *    adapta con el mismo patrón de closure que en las Fases 8.1–8.6, en
 *    `buildDust()` (más arriba en este archivo, ahora el wrapper delgado
 *    de la clase); `this.updaters`/`start()` no se tocaron.
 *
 * El cuerpo del loop de animación dentro de `start()` (cámara dinámica,
 * uniforms por frame, matemática visual del ciclo día/noche) sigue sin
 * tocarse — es, a propósito, la parte de mayor riesgo y la última en
 * migrar, solo cuando exista una forma de verificar equivalencia visual
 * sin depender de inspección manual línea por línea.
 */
