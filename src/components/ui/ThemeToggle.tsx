'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  applyTheme,
  cyclePreference,
  getStoredPreference,
  getSystemTheme,
  resolveTheme,
  setStoredPreference,
  type ThemePreference,
} from '@/lib/theme'

/**
 * Toggle de tema (dark mode — reingeniería, sept 2026).
 *
 * Cicla `system → light → dark → system`. Muestra luna en tema claro
 * (la acción accesible es "activar oscuro") y sol en oscuro. Escucha
 * `prefers-color-scheme` para reaccionar a cambios del sistema cuando la
 * preferencia es `system` (requisito de la tarea). La persistencia y el
 * anti-FOUC viven en `lib/theme.ts` + el script inline de `layout.tsx`;
 * este componente solo sincroniza el estado una vez hidratado.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [preference, setPreference] = useState<ThemePreference>('system')
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const sync = () => {
      const stored = getStoredPreference()
      setPreference(stored)
      setIsDark(resolveTheme(stored) === 'dark')
    }
    sync()

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = () => sync()
    media.addEventListener('change', onSystemChange)
    return () => media.removeEventListener('change', onSystemChange)
  }, [])

  const handleClick = () => {
    const next = cyclePreference(preference)
    setStoredPreference(next)
    applyTheme(next)
    setPreference(next)
    setIsDark(resolveTheme(next) === 'dark')
  }

  const nextLabel = useMemo(() => {
    switch (cyclePreference(preference)) {
      case 'light':
        return 'Cambiar a tema claro'
      case 'dark':
        return 'Cambiar a tema oscuro'
      default:
        return 'Usar tema del sistema'
    }
  }, [preference])

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={nextLabel}
      title={nextLabel}
      className={className}
    >
      {isDark ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  )
}