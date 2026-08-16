/**
 * Post-processing shaders for the GTA6 Codex WebGL engine.
 * Contains the main color grading shader with cinematic teal-orange look.
 */

import type { IUniform } from 'three'

export const GRADE_SHADER = {
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
  } as Record<string, IUniform<any>>,
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
