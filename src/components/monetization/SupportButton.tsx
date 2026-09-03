import { trackAffiliateClick } from '@/lib/analytics-events'

/**
 * Botón de apoyo/donaciones vía Cafecito.app (canal nuevo de
 * monetización, ver docs/monetizacion-plan.md → "Donaciones").
 *
 * Cafecito es la plataforma de "propinas" más usada por creadores de
 * contenido en Argentina (funciona sobre Mercado Pago, alta local sin
 * costo). No existe una API pública para generar el link desde acá: el
 * usuario tiene que crear su propio perfil en https://cafecito.app
 * (login con Google, 2 minutos) y pegar el nombre de usuario resultante
 * en `NEXT_PUBLIC_CAFECITO_USERNAME`.
 *
 * Mismo criterio de "fail-closed silencioso" que `AdUnit.tsx`: sin la
 * env var configurada, el componente no renderiza nada — no tiene
 * sentido mostrar un botón de apoyo que no lleva a ningún lado.
 *
 * Usage: <SupportButton />
 */
export function SupportButton({ className = '' }: { className?: string }) {
  const username = process.env.NEXT_PUBLIC_CAFECITO_USERNAME
  if (!username) return null

  const url = `https://cafecito.app/${username}`

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() =>
        trackAffiliateClick({ platform: 'cafecito', vehicleName: 'general', label: 'footer-support' })
      }
      className={`inline-flex items-center gap-2 rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:border-auto-accent hover:text-auto-accent-strong ${className}`}
    >
      ☕ Invitame un cafecito
    </a>
  )
}
