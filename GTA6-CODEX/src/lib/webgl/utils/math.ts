/**
 * Math utilities for the AutoFicha WebGL engine.
 * Pure functions with no side effects.
 */

/**
 * Interpolates in the unit circle [0,1) always taking the shortest path.
 * This prevents cyclic values (like dayPhase) from "rewinding" visually
 * when crossing the wraparound point (e.g., 0.98 → 0.02).
 */
export function lerpCyclic01(current: number, target: number, t: number): number {
  let delta = (target - current) % 1
  if (delta > 0.5) delta -= 1
  if (delta < -0.5) delta += 1
  const next = current + delta * t
  return ((next % 1) + 1) % 1
}

/**
 * Interpolates day color across three phases: dusk, night, dawn.
 * 0 = golden sunset, 0.5 = neon night, 1 = blue dawn.
 */
export function lerpDayColor(phase: number, dusk: number, night: number, dawn: number): number {
  const p = ((phase % 1) + 1) % 1
  if (p < 0.33) {
    const t = p / 0.33
    return dusk + (night - dusk) * t
  }
  if (p < 0.66) {
    const t = (p - 0.33) / 0.33
    return night + (dawn - night) * t
  }
  const t = (p - 0.66) / 0.34
  return dawn + (dusk - dawn) * t
}

/**
 * Smootherstep interpolation function (Ken Perlin's improved smoothstep).
 * Provides smoother transitions than regular smoothstep.
 */
export function smootherstep(t: number): number {
  const c = Math.min(Math.max(t, 0), 1)
  return c * c * c * (c * (c * 6 - 15) + 10)
}
