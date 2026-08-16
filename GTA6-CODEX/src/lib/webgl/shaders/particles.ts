/**
 * Particle shaders for the GTA6 Codex WebGL engine.
 * Dust, fireflies, mist, haze, and billboard shaders.
 */

export const DUST_VERTEX_SHADER = /* glsl */ `
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

export const DUST_FRAGMENT_SHADER = /* glsl */ `
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

export const FIREFLY_VERTEX_SHADER = /* glsl */ `
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

export const FIREFLY_FRAGMENT_SHADER = /* glsl */ `
  varying float vGlow;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.0, d) * vGlow;
    vec3 col = mix(vec3(0.95, 0.55, 0.15), vec3(1.0, 0.85, 0.45), vGlow);
    gl_FragColor = vec4(col, alpha * 0.85);
  }
`

export const MIST_VERTEX_SHADER = /* glsl */ `
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

export const MIST_FRAGMENT_SHADER = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    gl_FragColor = vec4(0.75, 0.85, 0.95, smoothstep(0.5, 0.0, d) * vAlpha);
  }
`

export const HAZE_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

export const HAZE_FRAGMENT_SHADER = /* glsl */ `
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
