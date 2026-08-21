/**
 * Quality profile configuration for the GTA6 Zona WebGL engine.
 * Handles device detection and quality settings adaptation.
 */

export interface QualityProfile {
  tier: 'high' | 'medium' | 'low'
  maxDpr: number
  dustCount: number
  fireflyCount: number
  mistCount: number
  trafficCount: number
  enableBokeh: boolean
  bloomScale: number
  hazeLayers: number
}

/**
 * Detects the appropriate quality profile based on device capabilities
 * and user preferences (reduced motion).
 */
export function detectQualityProfile(reducedMotion: boolean): QualityProfile {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1920
  const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  const lowEnd = w < 480 || (coarse && w < 768)
  const mobile = coarse && w < 1024

  if (reducedMotion || lowEnd) {
    return {
      tier: 'low',
      maxDpr: 1,
      dustCount: 120,
      fireflyCount: 0,
      mistCount: 40,
      trafficCount: 6,
      enableBokeh: false,
      bloomScale: 0.55,
      hazeLayers: 1,
    }
  }
  if (mobile) {
    return {
      tier: 'medium',
      maxDpr: 1.35,
      dustCount: 260,
      fireflyCount: 35,
      mistCount: 90,
      trafficCount: 9,
      enableBokeh: false,
      bloomScale: 0.75,
      hazeLayers: 2,
    }
  }
  return {
    tier: 'high',
    // DPR 2 en un monitor grande equivale a renderizar ~4x los píxeles de
    // DPR 1 (y eso, multiplicado por 6 passes de postprocessing, es el
    // mayor costo individual del motor). 1.5 sigue viéndose nítido y baja
    // ese costo a la mitad sin downgrade audible en la mayoría de pantallas.
    maxDpr: 1.5,
    dustCount: 340,
    fireflyCount: 55,
    mistCount: 120,
    trafficCount: 10,
    // El detector de tier solo mira ancho de viewport y tipo de puntero,
    // no la GPU real: un desktop con gráficos integrados (muy común) caía
    // en 'high' igual que una máquina con GPU dedicada y arrastraba
    // profundidad de campo (el pass más caro del pipeline) desde el
    // primer frame. Se apaga por default acá; `applyPerfDowngrade` en
    // engine.ts ya no tiene que reaccionar tarde para sacarlo.
    enableBokeh: false,
    bloomScale: 0.85,
    hazeLayers: 2,
  }
}
