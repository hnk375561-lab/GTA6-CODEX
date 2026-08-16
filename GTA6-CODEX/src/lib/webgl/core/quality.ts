/**
 * Quality profile configuration for the GTA6 Codex WebGL engine.
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
    maxDpr: 2,
    dustCount: 520,
    fireflyCount: 80,
    mistCount: 180,
    trafficCount: 14,
    enableBokeh: true,
    bloomScale: 1,
    hazeLayers: 3,
  }
}
