import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { webglSceneBus, type SceneFocus, type EntityAtmosphere } from './scene-bus'

// Extracted modules
import { detectQualityProfile, type QualityProfile } from './core/quality'
import { lerpDayColor, lerpCyclic01, smootherstep } from './utils/math'
import { SHOTS, FALLBACK_SHOT, ROAD_DASH_PERIOD, ROAD_FLOW_WRAP, IMAGE_BILLBOARDS, SECTION_MOOD, CATEGORY_WARMTH, STATUS_UNREST, CATEGORY_PACE, CATEGORY_FRAME } from './constants'
import { GRADE_SHADER } from './shaders/postprocess'

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
    dayPhase: { value: 0.5 },
    humidity: { value: 0.45 },
    bloomMix: { value: 0.12 },
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
    uniform float dayPhase;
    uniform float humidity;
    uniform float bloomMix;
    varying vec2 vUv;

    float hash(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    vec3 tealOrangeGrade(vec3 c, float warmth) {
      vec3 shadowTint = mix(vec3(0.05, 0.12, 0.18), vec3(0.12, 0.04, 0.08), warmth);
      vec3 highlightTint = mix(vec3(0.08, 0.22, 0.28), vec3(0.28, 0.10, 0.16), warmth);
      float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(c * shadowTint * 2.2, c * highlightTint * 1.15, smoothstep(0.08, 0.72, luma));
      c = pow(c, vec3(0.94 + warmth * 0.04));
      return c;
    }

    void main() {
      vec2 centered = vUv - 0.5;
      float aberration = chromaStrength + chromaKick;
      vec2 dir = centered * aberration;
      float r = texture2D(tDiffuse, vUv + dir).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - dir).b;
      vec4 color = vec4(r, g, b, 1.0);

      float warmth = 0.5 + 0.5 * sin(dayPhase * 6.28318);
      color.rgb = tealOrangeGrade(color.rgb, warmth);
      color.rgb = mix(color.rgb, color.rgb * vec3(0.88, 0.94, 1.06), humidity * 0.35);

      float hazeBand = smoothstep(0.15, 0.55, vUv.y) * (0.08 + humidity * 0.14);
      vec3 hazeCol = mix(vec3(0.18, 0.06, 0.22), vec3(0.06, 0.14, 0.24), dayPhase);
      color.rgb = mix(color.rgb, hazeCol, hazeBand);

      color.rgb += color.rgb * bloomMix;

      float vignette = 1.0 - dot(centered, centered) * vignetteStrength;
      color.rgb *= vignette;

      float gr = (hash(vUv * vec2(1920.0, 1080.0) + time) - 0.5) * grainStrength;
      color.rgb += gr;
      color.b += gr * humidity * 0.4;

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

/**
 * Billboards de material real: los planos que muestran las imágenes
 * oficiales de GTA VI dentro de la propia escena 3D (no un overlay CSS).
 * Cada uno es un letrero/pantalla suspendido cerca de la torre focal, con:
 *  - Marco redondeado calculado por SDF (no una textura de marco aparte).
 *  - Brillo de borde en el color de neón del letrero (fill + rim en un
 *    solo pase, sin geometría extra para el aro).
 *  - Distorsión tipo VHS (offset cromático + scanlines) que solo aparece
 *    cuando `uDistortion` sube — y `uDistortion` viene de la velocidad
 *    real de scroll y de la intención de cursor (ver loop principal), no
 *    de ruido continuo: el letrero "vibra" cuando el usuario interactúa,
 *    se asienta cuando no.
 *  - Ligera onda de vértice (el letrero "respira" como una pantalla con
 *    señal débil), también atada a `uDistortion`.
 */
const BILLBOARD_VERTEX_SHADER = /* glsl */ `
  uniform float time;
  uniform float uDistortion;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 pos = position;
    pos.z += sin(pos.y * 3.0 + time * 1.6) * (0.015 + uDistortion * 0.05);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const BILLBOARD_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D map;
  uniform float time;
  uniform float introFade;
  uniform vec3 uColor;
  uniform float uDistortion;
  varying vec2 vUv;

  // SDF de rectángulo redondeado: define el marco del letrero sin textura aparte.
  float roundedBoxSDF(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 centered = vUv - 0.5;

    // Aberración cromática + jitter horizontal: solo perceptible cuando
    // uDistortion sube (scroll/cursor real), nunca en reposo.
    float scan = sin(vUv.y * 340.0 + time * 4.0) * uDistortion * 0.006;
    vec2 uvR = vec2(vUv.x + scan + uDistortion * 0.008, vUv.y);
    vec2 uvB = vec2(vUv.x + scan - uDistortion * 0.008, vUv.y);

    float r = texture2D(map, uvR).r;
    float g = texture2D(map, vUv).g;
    float b = texture2D(map, uvB).b;
    vec3 color = vec3(r, g, b);

    float sdf = roundedBoxSDF(centered, vec2(0.46), 0.05);
    float fill = 1.0 - smoothstep(-0.006, 0.006, sdf);
    float edgeGlow = 1.0 - smoothstep(0.0, 0.05, abs(sdf + 0.012));
    color += uColor * edgeGlow * (1.3 + uDistortion * 0.6);

    // Scanlines sutiles: acabado de pantalla real, no una demo de shader.
    float lines = 0.95 + 0.05 * sin(vUv.y * 260.0 - time * 2.2);
    color *= lines;

    float alpha = clamp(fill + edgeGlow, 0.0, 1.0) * introFade;
    gl_FragColor = vec4(color, alpha);
  }
`

/** Cúpula celeste procedural: gradiente dinámico + campo estelar + bruma alta. */
const SKY_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const SKY_FRAGMENT_SHADER = /* glsl */ `
  uniform float time;
  uniform float dayPhase;
  uniform float introFade;
  uniform float humidity;
  uniform vec3 fogColor;
  varying vec3 vWorldPos;

  // --- ruido barato para las cirros/bruma alta (auto-contenido, sin fbm en loop) ---
  float hashSky(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noiseSky(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hashSky(i), hashSky(i + vec2(1.0, 0.0)), f.x),
      mix(hashSky(i + vec2(0.0, 1.0)), hashSky(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float starField(vec3 dir) {
    vec2 uv = dir.xz / (abs(dir.y) + 0.08);
    float n = fract(sin(dot(floor(uv * 180.0), vec2(12.9898, 78.233))) * 43758.5453);
    float twinkle = 0.55 + 0.45 * sin(time * 2.4 + n * 40.0);
    float star = step(0.992, n) * twinkle;
    return star * smoothstep(0.05, 0.35, dir.y);
  }

  /**
   * Interpola cíclicamente entre 6 keyframes horarios (noche → amanecer →
   * mediodía → golden hour → atardecer → hora azul → noche...) sin usar
   * arrays dinámicos, para máxima compatibilidad entre drivers WebGL1/2.
   */
  vec3 sixKeyMix(float p, vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec3 c4, vec3 c5) {
    float scaled = p * 6.0;
    float seg = floor(scaled);
    float f = scaled - seg;
    f = f * f * (3.0 - 2.0 * f);
    if (seg < 0.5) return mix(c0, c1, f);
    if (seg < 1.5) return mix(c1, c2, f);
    if (seg < 2.5) return mix(c2, c3, f);
    if (seg < 3.5) return mix(c3, c4, f);
    if (seg < 4.5) return mix(c4, c5, f);
    return mix(c5, c0, f);
  }

  void main() {
    vec3 dir = normalize(vWorldPos);
    float h = dir.y * 0.5 + 0.5;
    float p = dayPhase;

    // ---- paleta tropical Leonida: 6 momentos del día ----
    // Noche (indigo profundo, resplandor magenta lejano de la ciudad)
    vec3 topNight = vec3(0.028, 0.045, 0.145);
    vec3 midNight = vec3(0.085, 0.075, 0.235);
    vec3 horNight = vec3(0.26, 0.075, 0.20);
    // Amanecer (violeta frío arriba, coral rompiendo en el horizonte)
    vec3 topDawn = vec3(0.11, 0.16, 0.34);
    vec3 midDawn = vec3(0.42, 0.30, 0.48);
    vec3 horDawn = vec3(0.95, 0.52, 0.40);
    // Mediodía (azul tropical saturado, calima cálida y pálida en el horizonte)
    vec3 topDay = vec3(0.16, 0.48, 0.82);
    vec3 midDay = vec3(0.42, 0.68, 0.88);
    vec3 horDay = vec3(0.86, 0.82, 0.72);
    // Golden hour (ámbar largo, sol bajo)
    vec3 topGolden = vec3(0.20, 0.24, 0.50);
    vec3 midGolden = vec3(0.92, 0.52, 0.26);
    vec3 horGolden = vec3(1.05, 0.60, 0.20);
    // Atardecer (synthwave magenta/naranja, la firma Vice City)
    vec3 topDusk = vec3(0.13, 0.08, 0.29);
    vec3 midDusk = vec3(0.90, 0.28, 0.46);
    vec3 horDusk = vec3(0.95, 0.30, 0.28);
    // Hora azul (rescoldo magenta apagándose, transición a la noche)
    vec3 topBlue = vec3(0.045, 0.05, 0.135);
    vec3 midBlue = vec3(0.15, 0.11, 0.29);
    vec3 horBlue = vec3(0.34, 0.13, 0.27);

    vec3 top = sixKeyMix(p, topNight, topDawn, topDay, topGolden, topDusk, topBlue);
    vec3 mid = sixKeyMix(p, midNight, midDawn, midDay, midGolden, midDusk, midBlue);
    vec3 hor = sixKeyMix(p, horNight, horDawn, horDay, horGolden, horDusk, horBlue);

    // ---- gradiente vertical base (cenit → banda media → horizonte) ----
    vec3 col = mix(hor, mid, smoothstep(0.0, 0.42, h));
    col = mix(col, top, smoothstep(0.42, 1.0, h));

    // ---- integración con la niebla real de la escena: el cielo "se funde" ----
    // con el mismo color que ya devora la carretera/skyline en la distancia,
    // así no hay costura entre la niebla y el domo celeste.
    float fogBand = pow(clamp(1.0 - abs(h - 0.5) * 3.2, 0.0, 1.0), 2.0);
    col = mix(col, fogColor, fogBand * 0.38);

    // ---- scattering atmosférico simulado: la franja del horizonte se ----
    // calienta/ilumina más cuanto más cálida es la paleta de esa hora
    // (emergente, sin ramas por fase — noche/mediodía casi no la activan,
    // amanecer/golden/atardecer sí).
    float warmBias = clamp(hor.r - hor.b, 0.0, 1.4);
    float horizonBand = pow(clamp(1.0 - abs(h - 0.5) * 2.2, 0.0, 1.0), 3.0);
    col += hor * warmBias * horizonBand * 0.55 * introFade;

    // ---- resplandor direccional hacia el lado del sol/luna (coherente ----
    // con la posición de buildHorizonSun) para romper la simetría azimutal
    // y dar sensación de una fuente de luz real, no un degradado plano.
    float dayLift = 0.5 + 0.5 * cos(p * 6.28318);
    vec3 sunDirApprox = normalize(vec3(-0.05, mix(-0.2, 0.6, dayLift) - 0.15, -1.0));
    float sunAlign = clamp(dot(dir, sunDirApprox), 0.0, 1.0);
    float sunGlow = pow(sunAlign, 6.0);
    col += hor * warmBias * sunGlow * 0.5 * introFade;

    // ---- nubes/cirros procedurales: dos octavas de ruido barato, dan ----
    // volumen real en vez de un degradado matemáticamente perfecto.
    float cloudMask = smoothstep(0.38, 0.62, h) * (1.0 - smoothstep(0.80, 0.98, h));
    vec2 cuv = dir.xz / (dir.y * 0.6 + 0.55) * 0.45 + vec2(time * 0.008, time * 0.002);
    float cn = noiseSky(cuv) * 0.65 + noiseSky(cuv * 2.4 + 19.0) * 0.35;
    float clouds = smoothstep(0.5, 0.82, cn) * cloudMask;

    // ---- estrellas: la "noche" real del ciclo está en dayPhase≈0 (no en ----
    // 0.5 como antes), y la humedad tropical las difumina un poco.
    float distToNight = min(p, 1.0 - p);
    float nightAmount = 1.0 - smoothstep(0.0, 0.30, distToNight);
    float cloudVisibility = clamp((1.0 - nightAmount) * (0.35 + humidity * 0.5), 0.0, 0.85);
    vec3 cloudTint = mix(mid, hor, 0.4) * (1.0 + warmBias * 0.3);
    col = mix(col, cloudTint, clouds * cloudVisibility * introFade);

    float star = starField(dir);
    float starVisibility = nightAmount * (1.0 - humidity * 0.5);
    col += vec3(star) * starVisibility * introFade;

    gl_FragColor = vec4(col, 1.0);
  }
`

/** Capas de haze volumétrico con ruido FBM y parallax. */
const HAZE_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

const HAZE_FRAGMENT_SHADER = /* glsl */ `
  uniform float time;
  uniform float introFade;
  uniform vec3 hazeColor;
  uniform float layerSeed;
  varying vec2 vUv;
  varying float vDepth;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv * vec2(2.4, 1.0) + vec2(time * 0.012 + layerSeed, time * 0.006);
    float n = fbm(uv);
    float alpha = smoothstep(0.35, 0.75, n) * 0.22 * introFade;
    alpha *= smoothstep(5.0, 45.0, vDepth);
    gl_FragColor = vec4(hazeColor, alpha);
  }
`

/** Bahía Leonida: agua reflectante con ondas y luces urbanas distantes. */
const WATER_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const WATER_FRAGMENT_SHADER = /* glsl */ `
  uniform float time;
  uniform float introFade;
  uniform float dayPhase;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    float dist = length(vWorldPos.xz);
    float fade = smoothstep(95.0, 18.0, dist);
    if (fade <= 0.001) discard;

    float wave = sin(vWorldPos.x * 0.35 + time * 0.7) * cos(vWorldPos.z * 0.22 + time * 0.5);
    float ripple = sin(vWorldPos.z * 0.8 - time * 1.1 + vWorldPos.x * 0.15) * 0.5 + 0.5;

    vec3 deep = mix(vec3(0.02, 0.06, 0.14), vec3(0.04, 0.02, 0.10), dayPhase);
    vec3 spec = mix(vec3(0.15, 0.45, 0.55), vec3(0.55, 0.18, 0.35), abs(sin(dayPhase * 3.14159)));
    vec3 col = deep + spec * (0.08 + ripple * 0.06 + wave * 0.04);

    float cityGlow = smoothstep(0.3, 0.0, abs(vWorldPos.x * 0.02)) * 0.12;
    col += vec3(1.0, 0.35, 0.55) * cityGlow;

    gl_FragColor = vec4(col, fade * 0.55 * introFade);
  }
`

/** Carretera húmeda extendida: asfalto, charcos specular y heat-shimmer. */
const ROAD_FRAGMENT_SHADER = /* glsl */ `
  uniform float time;
  uniform float flow;
  uniform vec3 colorA;
  uniform vec3 colorB;
  uniform float introFade;
  uniform float humidity;
  uniform float heatShimmer;
  varying vec3 vWorldPos;

  void main() {
    float dist = length(vWorldPos.xz);
    float radialFade = smoothstep(90.0, 10.0, dist);
    if (radialFade <= 0.001) discard;

    float x = vWorldPos.x + sin(vWorldPos.z * 0.4 + time * 2.0) * heatShimmer * 0.08;
    float z = vWorldPos.z;

    float laneHalfWidth = 7.5;
    float edgeDist = min(abs(x - laneHalfWidth), abs(x + laneHalfWidth));
    float edgeLine = 1.0 - smoothstep(0.0, 0.16, edgeDist);

    float dashLength = 4.0;
    float dashGap = 2.6;
    float period = dashLength + dashGap;
    float alongDash = mod(z - flow, period);
    float centerMask = 1.0 - smoothstep(0.0, 0.14, abs(x));
    float dash = step(alongDash, dashLength) * centerMask;

    float pulse = 0.5 + 0.5 * sin(time * 0.18 + dist * 0.05);
    vec3 edgeTint = mix(colorA, colorB, pulse * 0.2);

    float wet = 0.35 + humidity * 0.45;
    float puddle = smoothstep(0.82, 0.95, sin(x * 0.7 + z * 0.3) * cos(z * 0.15));
    vec3 asphalt = vec3(0.015, 0.012, 0.022) * wet;
    vec3 specHit = mix(colorA, colorB, 0.5) * puddle * 0.35;

    vec3 color = asphalt * 0.6 + edgeTint * edgeLine + colorB * dash + specHit;
    float alpha = (edgeLine * 0.55 + dash * 0.95 + puddle * 0.25 + wet * 0.08) * radialFade * introFade;
    gl_FragColor = vec4(color, alpha);
  }
`

/** Luciérnagas tropicales: puntos cálidos con pulso orgánico. */
const FIREFLY_VERTEX_SHADER = /* glsl */ `
  attribute float aPhase;
  attribute float aSpeed;
  uniform float time;
  uniform float introFade;
  varying float vGlow;
  void main() {
    vec3 p = position;
    p.x += sin(time * aSpeed + aPhase) * 1.8;
    p.y += cos(time * aSpeed * 0.7 + aPhase * 1.4) * 1.2;
    p.z += sin(time * aSpeed * 0.5 + aPhase * 2.1) * 0.9;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float dist = -mv.z;
    vGlow = (0.4 + 0.6 * pow(sin(time * 3.5 + aPhase * 6.0) * 0.5 + 0.5, 3.0)) * introFade;
    gl_PointSize = (3.5 + vGlow * 5.0) * (120.0 / dist);
    gl_Position = projectionMatrix * mv;
  }
`

const FIREFLY_FRAGMENT_SHADER = /* glsl */ `
  varying float vGlow;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.0, d) * vGlow;
    vec3 col = mix(vec3(0.95, 0.55, 0.15), vec3(1.0, 0.85, 0.45), vGlow);
    gl_FragColor = vec4(col, alpha * 0.85);
  }
`

/** Gotas de humedad/nocturnas cayendo lentamente — sensación de aire húmedo. */
const MIST_VERTEX_SHADER = /* glsl */ `
  attribute float aSeed;
  uniform float time;
  uniform float introFade;
  varying float vAlpha;
  void main() {
    float fall = mod(aSeed + time * (0.08 + aSeed * 0.04), 1.0);
    vec3 p = position;
    p.y = mix(18.0, -16.0, fall);
    p.x += sin(time * 0.3 + aSeed * 12.0) * 0.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vAlpha = smoothstep(0.0, 0.15, fall) * smoothstep(1.0, 0.85, fall) * introFade * 0.35;
    gl_PointSize = 2.2 * (90.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`

const MIST_FRAGMENT_SHADER = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    gl_FragColor = vec4(0.75, 0.85, 0.95, smoothstep(0.5, 0.0, d) * vAlpha);
  }
`

/** Letrero neón premium con parpadeo orgánico, variación por tipo y respuesta a día/noche. */
const NEON_SIGN_FRAGMENT_SHADER = /* glsl */ `
  uniform float time;
  uniform vec3 signColor;
  uniform float introFade;
  uniform float flickerSeed;
  uniform float signType; // 0=hotel, 1=club, 2=restaurante, 3=casino, 4=negocio
  uniform float dayPhase;
  uniform float distanceFade;
  varying vec2 vUv;

  void main() {
    vec2 centered = vUv - 0.5;
    
    // Forma base con variación por tipo de negocio
    float edgeBase = smoothstep(0.48, 0.42, abs(centered.x));
    float vertical = smoothstep(0.22, 0.18, abs(centered.y));
    
    // Hoteles: marco más elaborado con esquinas redondeadas
    float hotelFrame = edgeBase * vertical;
    float hotelCorner = smoothstep(0.35, 0.25, length(centered - vec2(0.35, 0.35))) +
                         smoothstep(0.35, 0.25, length(centered - vec2(-0.35, 0.35))) +
                         smoothstep(0.35, 0.25, length(centered - vec2(0.35, -0.35))) +
                         smoothstep(0.35, 0.25, length(centered - vec2(-0.35, -0.35)));
    
    // Clubes: líneas dinámicas horizontales
    float clubLines = edgeBase * vertical + smoothstep(0.45, 0.40, abs(centered.y - 0.15)) + smoothstep(0.45, 0.40, abs(centered.y + 0.15));
    
    // Restaurantes: borde suave con interior tenue
    float restGlow = edgeBase * vertical * 0.8 + smoothstep(0.30, 0.15, length(centered)) * 0.3;
    
    // Casinos: patrón de diamante
    float casinoPattern = abs(centered.x * centered.y) * 4.0;
    float casinoEdge = edgeBase * vertical + smoothstep(0.6, 0.4, casinoPattern) * 0.4;
    
    // Negocios: simple pero elegante
    float businessSimple = edgeBase * vertical;
    
    // Mezcla por tipo
    float edge = mix(hotelFrame + hotelCorner * 0.5, 
                   mix(clubLines, 
                      mix(restGlow, 
                         mix(casinoEdge, businessSimple, step(3.5, signType)),
                         step(2.5, signType)),
                      step(1.5, signType)),
                   step(0.5, signType));
    
    // Parpadeo orgánico diferente por tipo
    float baseFlicker = 0.85 + 0.15 * sin(time * (3.0 + signType * 0.5) + flickerSeed);
    
    // Hoteles: parpadeo lento y estable
    float hotelFlicker = baseFlicker * (0.92 + 0.08 * sin(time * 0.3 + flickerSeed * 2.0));
    
    // Clubes: parpadeo rápido y dinámico
    float clubFlicker = baseFlicker * (0.75 + 0.25 * sin(time * 8.0 + flickerSeed) * sin(time * 12.0 + flickerSeed * 1.5));
    
    // Restaurantes: parpadeo suave
    float restFlicker = baseFlicker * (0.88 + 0.12 * sin(time * 1.5 + flickerSeed * 0.5));
    
    // Casinos: parpadeo errático
    float casinoFlicker = baseFlicker * (0.7 + 0.3 * fract(sin(time * 15.0 + flickerSeed * 3.0) * 43758.5453));
    
    // Negocios: parpadeo minimalista
    float businessFlicker = baseFlicker * 0.95;
    
    float flicker = mix(hotelFlicker,
                       mix(clubFlicker,
                          mix(restFlicker,
                             mix(casinoFlicker, businessFlicker, step(3.5, signType)),
                             step(2.5, signType)),
                          step(1.5, signType)),
                       step(0.5, signType));
    
    // Integración con ciclo día/noche: más brillante en noche, más tenue en día
    float nightAmount = 1.0 - smoothstep(0.0, 0.3, min(dayPhase, 1.0 - dayPhase));
    float dayPhaseDim = 0.4 + 0.6 * nightAmount;
    
    // Falloff por distancia para profundidad real
    float alpha = edge * flicker * dayPhaseDim * distanceFade * introFade;
    
    // Añadir brillo extra en bordes para efecto neón realista
    vec3 glowColor = signColor * (1.0 + 0.3 * sin(time * 2.0 + flickerSeed));
    
    gl_FragColor = vec4(glowColor, alpha);
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
  { pos: new THREE.Vector3(2.5, 3.8, 20), look: new THREE.Vector3(-4.5, 0.2, -4), fovBias: 1.5, duration: 14 },
]

function smootherstep(t: number): number {
  const c = Math.min(Math.max(t, 0), 1)
  return c * c * c * (c * (c * 6 - 15) + 10)
}

/** Fallback estable si `SHOTS` quedara vacío en el futuro (ver `computeShotFrame`). */
const FALLBACK_SHOT: CameraShot = {
  pos: new THREE.Vector3(0, 0.4, 25),
  look: new THREE.Vector3(0, 0, 0),
  fovBias: 0,
  duration: 1,
}

/** Período (segundos de mundo) del patrón de la línea central de la carretera.
 *  Debe coincidir con `dashLength + dashGap` en `ROAD_FRAGMENT_SHADER`. Se
 *  usa para envolver `roadFlow` en un múltiplo exacto de este período, así
 *  el patrón nunca "salta" al envolver el acumulador (ver `ROAD_FLOW_WRAP`). */
const ROAD_DASH_PERIOD = 6.6
/** Techo de `roadFlow`: un múltiplo grande y exacto del período de la
 *  carretera. Sin este límite, `roadFlow` crece indefinidamente mientras la
 *  pestaña sigue abierta y, al viajar a un `uniform float` (precisión
 *  simple) del shader, termina degradando visualmente el patrón de la
 *  carretera en sesiones largas. */
const ROAD_FLOW_WRAP = ROAD_DASH_PERIOD * 100000

/**
 * Materia visual real de la escena: las 4 piezas oficiales de GTA VI que
 * ya viven en `public/images/` (mismos archivos que usa el hero DOM y las
 * fichas de personaje — una sola fuente de verdad, no assets duplicados
 * para WebGL). Reemplazan los adornos abstractos que había antes
 * orbitando la torre (octaedro/toro genéricos): ahora lo que orbita son
 * letreros con las imágenes reales, del mismo modo que Ocean Drive está
 * lleno de carteles y pantallas, no de sólidos platónicos.
 *
 * `width`/`height` respetan el aspect ratio real del archivo fuente (no
 * se estira ninguna imagen). `color` es el tinte de neón del marco de
 * cada letrero, tomado de la misma paleta magenta/cian que ya usa el
 * resto de la escena. `parallax` es cuánto responde cada uno al dolly de
 * scroll — la pieza más grande e icónica (portada de GTA VI) es la que
 * más se acerca, como si fuera lo primero que “revela” el scroll.
 */
const IMAGE_BILLBOARDS = [
  {
    key: 'gta6-boxart',
    path: '/images/heroes/hero-gta6-boxart-sunset.webp',
    width: 3.4,
    height: 1.91,
    color: 0xff2d78,
    radius: 5.2,
    baseY: 1.6,
    speed: 0.05,
    phase: 0,
    parallax: 1,
  },
  {
    key: 'port-gellhorn',
    path: '/images/heroes/hero-port-gellhorn-postcard.webp',
    width: 2.6,
    height: 1.1,
    color: 0x22d3ee,
    radius: 6.6,
    baseY: -0.8,
    speed: 0.038,
    phase: 1.9,
    parallax: 0.6,
  },
  {
    key: 'real-dimez',
    path: '/images/entities/personajes/real-dimez.webp',
    width: 2.05,
    height: 1.1,
    color: 0xff2d78,
    radius: 4.5,
    baseY: -1.9,
    speed: 0.062,
    phase: 3.3,
    parallax: 0.85,
  },
  {
    key: 'boobie-ike',
    path: '/images/entities/personajes/boobie-ike.webp',
    width: 1.95,
    height: 1.1,
    color: 0x22d3ee,
    radius: 4.9,
    baseY: 2.7,
    speed: 0.056,
    phase: 4.6,
    parallax: 0.7,
  },
] as const

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

/**
 * Ritmo de la escena (1 = base). Vehículos: tráfico y flujo de carretera
 * notablemente más vivos — es la categoría sobre velocidad. Ubicaciones:
 * todo se asienta, plano contemplativo — es la categoría sobre lugar, no
 * movimiento. Personajes/organizaciones quedan cerca de la base con un
 * matiz propio; sin ficha montada (home) el valor por defecto es 1.
 */
const CATEGORY_PACE: Record<string, number> = {
  personajes: 0.75,
  organizaciones: 0.6,
  negocios: 1,
  vehiculos: 1.85,
  ubicaciones: 0.45,
}

/**
 * Encuadre (0 = base). Negativo = toma cerrada y baja, íntima (retrato).
 * Positivo = toma elevada y abierta, panorámica (plano establecedor), con
 * más niebla despejada para que se lea el skyline. Alimenta FOV, altura de
 * cámara/mira y densidad de niebla a la vez — una sola variable con varios
 * efectos coherentes, no una rama de código por categoría.
 */
const CATEGORY_FRAME: Record<string, number> = {
  personajes: -1.2,
  organizaciones: 0.55,
  negocios: 0.15,
  vehiculos: -0.35,
  ubicaciones: 1.6,
}

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

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: this.quality.tier === 'high',
      powerPreference: 'high-performance',
    })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality.maxDpr))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

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

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))

    if (this.quality.enableBokeh) {
      this.bokehPass = new BokehPass(this.scene, this.camera, {
        focus: 22,
        aperture: 0.0016,
        maxblur: 0.007,
      })
      this.composer.addPass(this.bokehPass)
    }

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      0.85 * this.quality.bloomScale,
      0.55,
      0.16
    )
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
      this.entityPaceTarget = snapshot.entityAtmosphere
        ? CATEGORY_PACE[snapshot.entityAtmosphere.category] ?? 1
        : 1
      this.entityFrameTarget = snapshot.entityAtmosphere
        ? CATEGORY_FRAME[snapshot.entityAtmosphere.category] ?? 0
        : 0
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
    this.envRenderTarget = renderTarget
    this.scene.environment = renderTarget.texture
    pmrem.dispose()

    // La geometría/material del paso de gradiente solo existían para
    // alimentar el PMREM; ya renderizados, no hace falta retenerlos.
    gradientGeo.dispose()
    gradientMat.dispose()
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
  private buildSkyDome() {
    this.skyUniforms = {
      time: { value: 0 },
      dayPhase: { value: 0.42 },
      introFade: { value: 0 },
      humidity: { value: this.humidity },
      fogColor: { value: this.fog.color.clone() },
    }
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: this.skyUniforms.time,
        dayPhase: this.skyUniforms.dayPhase,
        introFade: this.skyUniforms.introFade,
        humidity: this.skyUniforms.humidity,
        fogColor: this.skyUniforms.fogColor,
      },
      vertexShader: SKY_VERTEX_SHADER,
      fragmentShader: SKY_FRAGMENT_SHADER,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    })
    // Ligero aumento de subdivisión (32×24 → 48×32) respecto a la versión
    // anterior: una sola malla de fondo, coste trivial, pero evita cualquier
    // facetado perceptible en las curvas `pow()` ajustadas del resplandor
    // de horizonte, que son más exigentes que el degradado plano original.
    const dome = new THREE.Mesh(new THREE.SphereGeometry(85, 48, 32), material)
    dome.frustumCulled = false
    this.skyGroup.add(dome)

    this.updaters.push((elapsed, _delta, intro) => {
      this.skyUniforms.time.value = elapsed
      this.skyUniforms.dayPhase.value = this.dayPhase
      this.skyUniforms.introFade.value = intro
      this.skyUniforms.humidity.value = this.humidity
      this.skyUniforms.fogColor.value.copy(this.fog.color)
    })
  }

  /** Bahía Leonida en el horizonte — reflejos y ondas sutiles. */
  private buildWaterHorizon() {
    const uniforms = { time: { value: 0 }, introFade: { value: 0 }, dayPhase: { value: 0.42 } }
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: WATER_VERTEX_SHADER,
      fragmentShader: WATER_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    })
    const water = new THREE.Mesh(new THREE.PlaneGeometry(240, 120, 1, 1), material)
    water.rotation.x = -Math.PI / 2
    water.position.y = -12.8
    water.position.z = -48
    this.farGroup.add(water)

    this.updaters.push((elapsed, _delta, intro) => {
      material.uniforms.time.value = elapsed
      material.uniforms.introFade.value = intro
      material.uniforms.dayPhase.value = this.dayPhase
    })
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

  /** Capas de haze volumétrico con parallax por profundidad. */
  private buildAtmosphericHaze() {
    const layers: THREE.Mesh[] = []
    for (let i = 0; i < this.quality.hazeLayers; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          introFade: { value: 0 },
          hazeColor: { value: new THREE.Color(i % 2 === 0 ? 0x6a2878 : 0x284868) },
          layerSeed: { value: i * 1.73 },
        },
        vertexShader: HAZE_VERTEX_SHADER,
        fragmentShader: HAZE_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(90 + i * 20, 35, 1, 1), mat)
      mesh.position.set(0, -2 + i * 2.5, -18 - i * 12)
      this.midGroup.add(mesh)
      layers.push(mesh)

      this.updaters.push((elapsed, _delta, intro) => {
        mat.uniforms.time.value = elapsed
        mat.uniforms.introFade.value = intro
        mesh.position.x = Math.sin(elapsed * 0.03 + i) * (1.2 + i * 0.4)
      })
    }

    this.updaters.push((_elapsed, _delta, intro) => {
      layers.forEach((l, i) => {
        l.position.y = -2 + i * 2.5 + this.scrollProgress * (0.8 + i * 0.3) * intro
      })
    })
  }

  /** Luciérnagas tropicales cerca del skyline. */
  private buildFireflies() {
    if (this.quality.fireflyCount <= 0) return

    const COUNT = this.quality.fireflyCount
    const positions = new Float32Array(COUNT * 3)
    const phases = new Float32Array(COUNT)
    const speeds = new Float32Array(COUNT)

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50
      positions[i * 3 + 1] = -6 + Math.random() * 14
      positions[i * 3 + 2] = -20 - Math.random() * 25
      phases[i] = Math.random() * Math.PI * 2
      speeds[i] = 0.15 + Math.random() * 0.35
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1))

    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, introFade: { value: 0 } },
      vertexShader: FIREFLY_VERTEX_SHADER,
      fragmentShader: FIREFLY_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.farGroup.add(new THREE.Points(geo, mat))

    this.updaters.push((elapsed, _delta, intro) => {
      mat.uniforms.time.value = elapsed
      mat.uniforms.introFade.value = intro
    })
  }

  /** Gotas de humedad/nocturnas — aire denso de Florida. */
  private buildHumidityMist() {
    const COUNT = this.quality.mistCount
    const positions = new Float32Array(COUNT * 3)
    const seeds = new Float32Array(COUNT)

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60
      positions[i * 3 + 1] = (Math.random() - 0.5) * 30
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40 - 10
      seeds[i] = Math.random()
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))

    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, introFade: { value: 0 } },
      vertexShader: MIST_VERTEX_SHADER,
      fragmentShader: MIST_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.midGroup.add(new THREE.Points(geo, mat))

    this.updaters.push((elapsed, _delta, intro) => {
      mat.uniforms.time.value = elapsed * (this.reducedMotion ? 0.2 : 1)
      mat.uniforms.introFade.value = intro
    })
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

  /** Tráfico: faros blancos que se acercan y luces de freno rojas que se alejan, en loop sobre la carretera. */
  private buildTrafficStreaks() {
    const COUNT = this.quality.trafficCount
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
      // Velocidad real del tráfico ligada al "pace" de la categoría: en una
      // ficha de vehículo la carretera se siente notablemente más rápida;
      // en una ubicación, se asienta.
      streaks.forEach((s) => {
        s.mesh.position.z += s.dir * s.speed * this.entityPace * delta * intro
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
    const pixelRatio = Math.min(window.devicePixelRatio || 1, this.quality.maxDpr)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(pixelRatio)
    this.renderer.setSize(width, height, false)
    this.composer.setSize(width, height)
    this.bloomPass.resolution.set(width * pixelRatio, height * pixelRatio)
    if (this.bokehPass) {
      this.bokehPass.setSize(width, height)
    }
    this.fxaaPass.setSize(width, height)
  }

  /** Encuadre coreografiado: funde continuamente entre los `SHOTS`, en vez de ruido sin fin. */
  private computeShotFrame(elapsed: number): { pos: THREE.Vector3; look: THREE.Vector3; fovBias: number } {
    // Guarda contra `SHOTS` vacío o con duración total 0: sin esto, `%`
    // por 0 produce NaN y la cámara desaparece del encuadre.
    if (SHOTS.length === 0 || this.totalShotDuration <= 0) {
      return { pos: FALLBACK_SHOT.pos.clone(), look: FALLBACK_SHOT.look.clone(), fovBias: FALLBACK_SHOT.fovBias }
    }

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
    // Idempotente: evita un segundo loop de rAF corriendo en paralelo si
    // `start()` se invoca más de una vez (p. ej. remounts en React Strict
    // Mode), y no arranca nada si el motor ya fue liberado.
    if (this.disposed || this.rafId !== null) return

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
    if (this.disposed) return
    this.disposed = true

    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
    this.rafId = null
    window.removeEventListener('resize', this.handleResize)
    window.removeEventListener('pointermove', this.handlePointerMove)
    window.removeEventListener('scroll', this.handleScroll)
    document.removeEventListener('visibilitychange', this.handleVisibility)
    this.unsubscribeSceneBus?.()
    this.unsubscribeSceneBus = null

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry?.dispose?.()
        const material = obj.material as THREE.Material | THREE.Material[]
        if (Array.isArray(material)) material.forEach((m) => m.dispose())
        else material?.dispose?.()
      }
    })
    this.scene.environment = null
    this.envRenderTarget?.dispose()
    this.envRenderTarget = null
    this.imageTextures.forEach((t) => t.dispose())
    this.imageTextures = []

    // Libera cada pass del composer de forma genérica: cualquier pass que
    // se agregue en el futuro queda cubierto sin tener que recordar
    // llamarlo a mano (antes solo `bokehPass` se liberaba explícitamente).
    this.composer.passes.forEach((pass) => pass.dispose?.())
    this.composer.dispose()
    this.renderer.dispose()
  }
}
