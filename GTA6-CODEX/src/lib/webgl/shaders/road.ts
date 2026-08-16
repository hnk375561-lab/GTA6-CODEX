/**
 * Road shaders for the GTA6 Codex WebGL engine.
 * Wet road with asphalt, specular puddles, and heat shimmer.
 */

export const ROAD_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const ROAD_FRAGMENT_SHADER = /* glsl */ `
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
