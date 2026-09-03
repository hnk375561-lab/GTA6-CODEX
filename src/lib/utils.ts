import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** True when the device supports precise hover (mouse/trackpad). */
export function hasFinePointer(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: fine)').matches
}

/** True when the user prefers reduced motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Nombre de display de un vehículo sin duplicar el fabricante cuando el
 * título de la ficha ya lo incluye. Bug real detectado en el hero (sept.
 * 2026): `${manufacturer} ${title}` con title="Porsche 911 Carrera" y
 * manufacturer="Porsche" rendía "Porsche Porsche 911 Carrera" — visible
 * tanto en el headline de la tarjeta de anuncio propio como en los
 * `aria-label` del carrusel. Esta función es la única fuente de verdad
 * para ese armado: compara sin distinguir mayúsculas: si el título ya
 * arranca con el nombre del fabricante, lo devuelve tal cual; si no, lo
 * antepone (comportamiento anterior, para fabricantes que no aparecen en
 * el título, ej. title="911 Carrera" + manufacturer="Porsche").
 */
export function formatVehicleDisplayName(manufacturer: string | undefined | null, title: string): string {
  if (!manufacturer) return title
  const normalizedTitle = title.trim().toLowerCase()
  const normalizedManufacturer = manufacturer.trim().toLowerCase()
  if (normalizedTitle.startsWith(normalizedManufacturer)) return title
  return `${manufacturer} ${title}`
}

/**
 * Formatea una fecha ISO como tiempo relativo en español ("hace 2 horas",
 * "hace 3 días", "hoy"), usando `Intl.RelativeTimeFormat` (nativo, sin
 * dependencia nueva). Cae a fecha absoluta corta cuando la diferencia
 * supera ~30 días, donde "hace X" deja de ser una señal útil de frescura.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const diffMs = now.getTime() - then.getTime()
  const diffMinutes = Math.round(diffMs / 60_000)
  const diffHours = Math.round(diffMs / 3_600_000)
  const diffDays = Math.round(diffMs / 86_400_000)

  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

  if (diffMinutes < 1) return 'hace instantes'
  if (diffMinutes < 60) return rtf.format(-diffMinutes, 'minute')
  if (diffHours < 24) return rtf.format(-diffHours, 'hour')
  if (diffDays < 30) return rtf.format(-diffDays, 'day')

  return then.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
}
