'use client'

import { useState } from 'react'
import { trackNewsletterSignup } from '@/lib/analytics-events'

/**
 * Newsletter signup — captura de emails (Monetización, canal nuevo).
 *
 * `trackNewsletterSignup` ya existía en `analytics-events.ts` desde antes
 * ("future monetization") pero nunca se llamaba desde ningún componente:
 * no había ningún formulario en el sitio. Este componente lo resuelve.
 *
 * Por qué mailto y no un ESP (Mailchimp/Brevo/ConvertKit) todavía:
 * mismo criterio que el lead capture de `FinancingCalculator.tsx` — cero
 * infraestructura nueva (sin API route, sin cuenta de terceros, sin
 * guardar PII en un JSON del repo). El submit arma un mailto: con el
 * email de la persona en el asunto/cuerpo, apuntado a la casilla que ya
 * se usa como contacto del sitio (`uruspotcdu@gmail.com`, la misma de
 * `mediaKitData.contacto` y del footer). El "CRM" es la bandeja de
 * entrada, igual que con los leads de financiación — aceptable al
 * volumen actual.
 *
 * Cuando el volumen de sign-ups justifique un ESP real (para poder
 * mandar campañas, no solo acumular emails sueltos en una bandeja), este
 * componente es el único lugar a tocar: cambiar `handleSubmit` para que
 * postee a la API del ESP en vez de abrir `mailto:`, sin tocar el resto
 * del sitio.
 */
export function NewsletterSignupForm({
  className = '',
  heading = '¿Querés enterarte de nuevas fichas y guías?',
  trackingSource = 'footer',
}: {
  className?: string
  heading?: string
  trackingSource?: string
}) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidEmail) return

    trackNewsletterSignup()

    const subject = encodeURIComponent('Quiero sumarme al newsletter de Sin Frenos')
    const body = encodeURIComponent(
      `Hola, quiero recibir novedades de fichas técnicas y guías.\n\nMi email: ${email.trim()}\n(origen: ${trackingSource})`
    )
    window.location.href = `mailto:uruspotcdu@gmail.com?subject=${subject}&body=${body}`
    setSent(true)
  }

  if (sent) {
    return (
      <p className={`text-xs text-neutral-400 ${className}`}>
        ¡Gracias! Si no se abrió tu cliente de mail, escribinos directo a{' '}
        <a href="mailto:uruspotcdu@gmail.com" className="link-underline text-auto-accent-strong">
          uruspotcdu@gmail.com
        </a>
        .
      </p>
    )
  }

  return (
    <div className={className}>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-neutral-400">{heading}</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          aria-label="Tu email"
          className="w-full rounded-lg border border-edge bg-surface-card px-3 py-2 text-sm text-neutral-900 focus:border-auto-accent focus:outline-none sm:w-64"
        />
        <button
          type="submit"
          disabled={!isValidEmail}
          className="inline-flex items-center justify-center rounded-lg bg-auto-accent px-4 py-2 text-sm font-semibold text-auto-darker transition-transform duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent focus-visible:ring-offset-1"
        >
          Sumarme
        </button>
      </form>
      <p className="mt-1.5 text-[11px] text-neutral-400">Sin spam. Solo fichas y guías nuevas, cuando haya.</p>
    </div>
  )
}
