/**
 * Sun shaders for the GTA6 Zona WebGL engine.
 * Horizon sun/moon with bands and synthwave aesthetics.
 */

export const SUN_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const SUN_FRAGMENT_SHADER = /* glsl */ `
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
