'use client'

import { useEffect, useState } from 'react'
import type { ScenePhase } from '@/components/webgl/ChoreoTelemetryBridge'

interface PhaseData {
  phase: ScenePhase
  globalProgress: number
  localProgress: number
}

export function useScenePhase(): PhaseData {
  const [phaseData, setPhaseData] = useState<PhaseData>({
    phase: 'awakening',
    globalProgress: 0,
    localProgress: 0,
  })

  useEffect(() => {
    const updatePhase = () => {
      const root = document.documentElement
      const phase = (getComputedStyle(root).getPropertyValue('--scene-phase') || 'awakening').trim() as ScenePhase
      const globalProgress = parseFloat(
        getComputedStyle(root).getPropertyValue('--scene-phase-progress') || '0'
      )
      const localProgress = parseFloat(
        getComputedStyle(root).getPropertyValue('--scene-phase-local-progress') || '0'
      )

      setPhaseData({
        phase,
        globalProgress,
        localProgress,
      })
    }

    updatePhase()
    window.addEventListener('scroll', updatePhase, { passive: true })

    return () => {
      window.removeEventListener('scroll', updatePhase)
    }
  }, [])

  return phaseData
}
