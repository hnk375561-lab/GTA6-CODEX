/**
 * Gestión de tema (dark mode — reingeniería, sept 2026).
 *
 * Modelo de tres estados: `'system'` (según `prefers-color-scheme`),
 * `'light'` y `'dark'` (preferencia explícita del usuario, que MAND sobre
 * el sistema). La preferencia persiste en localStorage bajo
 * `sinfrenos:theme`.
 *
 * El script anti-FOUC de `layout.tsx` (inline como primer hijo de <body>,
 * corre antes del primer paint) duplica esta lógica en vanilla JS porque
 * aún no hay bundle de React disponible a esa altura — NO importar
 * funciones de acá en ese script (se rompería el "no flash"; mantener
 * ambas copias sincronizadas).
 */
export type ThemePreference = 'system' | 'light' | 'dark'

export const THEME_STORAGE_KEY = 'sinfrenos:theme'

/** Tema efectivo del sistema operativo (o `light` sin window). */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Preferencia persistida; default `system` si no existe o es inválida. */
export function getStoredPreference(): ThemePreference {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (raw === 'system' || raw === 'light' || raw === 'dark') return raw
  } catch {
    // localStorage puede no estar disponible (modo privado estricto).
  }
  return 'system'
}

export function setStoredPreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Ídem arriba: fallar silencioso, el tema en memoria sigue funcionando.
  }
}

/** Tema efectivo resolviendo la preferencia contra el sistema. */
export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  return preference === 'system' ? getSystemTheme() : preference
}

/** Aplica la clase `.dark` sobre <html> según la preferencia efectiva. */
export function applyTheme(preference: ThemePreference): void {
  document.documentElement.classList.toggle('dark', resolveTheme(preference) === 'dark')
}

/** Ciclo system → light → dark → system (para el toggle del header). */
export function cyclePreference(preference: ThemePreference): ThemePreference {
  const order: ThemePreference[] = ['system', 'light', 'dark']
  return order[(order.indexOf(preference) + 1) % order.length]
}