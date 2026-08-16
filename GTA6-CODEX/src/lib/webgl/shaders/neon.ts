/**
 * Neon shaders for the GTA6 Codex WebGL engine.
 * Light shafts and neon signs with organic flickering.
 */

export const SHAFT_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const SHAFT_FRAGMENT_SHADER = /* glsl */ `
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

export const NEON_SIGN_FRAGMENT_SHADER = /* glsl */ `
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
