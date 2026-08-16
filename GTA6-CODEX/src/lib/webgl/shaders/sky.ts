/**
 * Sky dome shaders for the GTA6 Codex WebGL engine.
 * Procedural sky with 6 keyframe horarios, scattering, clouds, and stars.
 */

export const SKY_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

export const SKY_FRAGMENT_SHADER = /* glsl */ `
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
