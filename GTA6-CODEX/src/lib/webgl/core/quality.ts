/**
 * Quality profile configuration for the AutoFicha WebGL engine.
 * Handles device detection and quality settings adaptation.
 *
 * "Synth Noir Intensificado" — pase 2: `trafficCount` bajado en los tres
 * tiers (7/6/6 → 3/3/2) a pedido: los streaks de tráfico vehicular eran
 * el elemento que más leía como "juego de manejar" en el fondo, más que
 * cualquier color. Se deja en un valor bajo pero no en cero — un poco de
 * movimiento en la carretera sigue dando vida a la escena sin ser el
 * foco.
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
      trafficCount: 2,
      enableBokeh: false,
      bloomScale: 0.55,
      hazeLayers: 1,
    }
  }
  if (mobile) {
    return {
      tier: 'medium',
      maxDpr: 1.15,
      dustCount: 160,
      fireflyCount: 20,
      mistCount: 55,
      trafficCount: 3,
      enableBokeh: false,
      bloomScale: 0.65,
      hazeLayers: 1,
    }
  }
  return {
    tier: 'high',
    // DPR 2 en un monitor grande equivale a renderizar ~4x los píxeles de
    // DPR 1 (y eso, multiplicado por 6 passes de postprocessing, es el
    // mayor costo individual del motor). 1.5 sigue viéndose nítido y baja
    // ese costo a la mitad sin downgrade audible en la mayoría de pantallas.
    maxDpr: 1.25,
    dustCount: 200,
    fireflyCount: 30,
    mistCount: 70,
    trafficCount: 3,
    // El detector de tier solo mira ancho de viewport y tipo de puntero,
    // no la GPU real: un desktop con gráficos integrados (muy común) caía
    // en 'high' igual que una máquina con GPU dedicada y arrastraba
    // profundidad de campo (el pass más caro del pipeline) desde el
    // primer frame. Se apaga por default acá; `applyPerfDowngrade` en
    // engine.ts ya no tiene que reaccionar tarde para sacarlo.
    enableBokeh: false,
    bloomScale: 0.7,
    hazeLayers: 2,
  }
}
