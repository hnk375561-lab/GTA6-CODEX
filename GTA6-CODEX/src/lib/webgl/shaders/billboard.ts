/**
 * Billboard shaders for the AutoFicha WebGL engine.
 * Image billboards with rounded frames, neon glow, and VHS distortion.
 */

export const BILLBOARD_VERTEX_SHADER = /* glsl */ `
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

export const BILLBOARD_FRAGMENT_SHADER = /* glsl */ `
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
