/**
 * Water shaders for the GTA6 Codex WebGL engine.
 * Leonida bay with reflective water, waves, and distant city lights.
 */

export const WATER_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const WATER_FRAGMENT_SHADER = /* glsl */ `
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
