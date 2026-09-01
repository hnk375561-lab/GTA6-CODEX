'use client'

import { useEffect } from 'react'

export type ScenePhase = 'awakening' | 'presentation' | 'immersion' | 'invitation'

interface PhaseThreshold {
  start: number
  end: number
  phase: ScenePhase
  description: string
}

const PHASE_THRESHOLDS: PhaseThreshold[] = [
  {
    start: 0,
    end: 0.15,
    phase: 'awakening',
    description: 'Hero se asienta, revelación inicial',
  },
  {
    start: 0.15,
    end: 0.4,
    phase: 'presentation',
    description: 'Mundo se revela, catálogo emerge',
  },
  {
    start: 0.4,
    end: 0.7,
    phase: 'immersion',
    description: 'Inmersión profunda, parallax pesado',
  },
  {
    start: 0.7,
    end: 1.0,
    phase: 'invitation',
    description: 'Invitación final, calma, CTA',
  },
]

export function getPhaseAtProgress(progress: number): ScenePhase {
  const threshold = PHASE_THRESHOLDS.find(
    (t) => progress >= t.start && progress < t.end
  )
  return threshold?.phase || 'invitation'
}

export function ChoreoTelemetryBridge() {
  useEffect(() => {
    let animationFrame: number

    const updatePhase = () => {
      const windowHeight = window.innerHeight
      const totalHeight = document.documentElement.scrollHeight - windowHeight
      const scrollProgress = totalHeight > 0 ? window.scrollY / totalHeight : 0

      const phase = getPhaseAtProgress(scrollProgress)
      const root = document.documentElement

      root.style.setProperty('--scene-phase', phase)
      root.style.setProperty('--scene-phase-progress', String(scrollProgress.toFixed(2)))

      const currentThreshold = PHASE_THRESHOLDS.find(
        (t) => phase === t.phase
      )
      if (currentThreshold) {
        const phaseLocalProgress =
          (scrollProgress - currentThreshold.start) /
          (currentThreshold.end - currentThreshold.start)
        root.style.setProperty(
          '--scene-phase-local-progress',
          String(Math.max(0, Math.min(1, phaseLocalProgress)).toFixed(3))
        )
      }
    }

    const handleScroll = () => {
      cancelAnimationFrame(animationFrame)
      animationFrame = requestAnimationFrame(updatePhase)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    updatePhase()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(animationFrame)
    }
  }, [])

  return null
}
