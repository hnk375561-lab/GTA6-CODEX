'use client'

import Link from 'next/link'
import { trackAffiliateClick } from '@/lib/analytics-events'

interface FintechAffiliateButtonProps {
  vehicleName?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'solid' | 'outline'
  className?: string
  trackingLabel?: string
}

/**
 * Afiliado / referido de fintech (cuenta digital, tarjeta prepaga o billetera
 * virtual) — canal nuevo. Contexto completo en `docs/monetizacion-plan.md`
 * sección 2.17.
 *
 * Por qué esto es un canal aparte de `InsuranceAffiliateButton.tsx` /
 * `FinancingAffiliateButton.tsx` (que ya cubren "seguro" y "crédito para
 * comprar"): esto no es sobre el vehículo en sí, sino sobre CÓMO se mueve la
 * plata en la operación — pagar/cobrar una seña entre particulares sin
 * manejar efectivo, tener un resguardo del pago para quien vende, o pagar en
 * cuotas sin tarjeta de crédito tradicional. La mayoría de las fintechs
 * argentinas (Ualá, Prex, Cuenta DNI, MercadoPago, Belo, etc.) tienen
 * programas de referidos o de afiliados reales — a diferencia de OLX (ver el
 * comentario en `page.tsx` sobre por qué se sacó `OlxAffiliateButton`), acá
 * SÍ existe el incentivo comercial, solo falta elegir un partner y cerrarlo.
 *
 * A diferencia de seguro/financiación (que arrancan con un fallback real de
 * comparaencasa.com aunque sin comisión confirmada), este componente es
 * 100% fail-closed: no hay una fintech "neutral" para hardcodear sin que
 * eso implique una asociación real que todavía no existe. Sin
 * `NEXT_PUBLIC_FINTECH_AFFILIATE_URL` + `NEXT_PUBLIC_FINTECH_AFFILIATE_NAME`
 * configuradas, el componente no renderiza nada — mismo criterio que
 * `NEXT_PUBLIC_CAFECITO_USERNAME` en `SupportButton.tsx`.
 *
 * Activar: crear cuenta en el programa de referidos de la fintech elegida,
 * pegar el link de referido en `NEXT_PUBLIC_FINTECH_AFFILIATE_URL` y el
 * nombre a mostrar (ej. "Ualá", "Prex", "Cuenta DNI") en
 * `NEXT_PUBLIC_FINTECH_AFFILIATE_NAME`.
 */
const FINTECH_URL = process.env.NEXT_PUBLIC_FINTECH_AFFILIATE_URL
const FINTECH_NAME = process.env.NEXT_PUBLIC_FINTECH_AFFILIATE_NAME

export function FintechAffiliateButton({
  vehicleName,
  size = 'md',
  variant = 'outline',
  className = '',
  trackingLabel,
}: FintechAffiliateButtonProps) {
  if (!FINTECH_URL || !FINTECH_NAME) return null

  const generateUrl = () => {
    try {
      const url = new URL(FINTECH_URL)
      url.searchParams.set('utm_source', 'sinfrenos')
      url.searchParams.set('utm_medium', 'affiliate')
      url.searchParams.set('utm_campaign', 'fintech-pago-vehiculo')
      return url.toString()
    } catch {
      // Si el link de referido no es una URL absoluta válida, no rompemos
      // el render de toda la ficha por esto — mismo criterio defensivo que
      // formatMoney en FinancingCalculator.tsx.
      return FINTECH_URL
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2 text-sm'
      case 'lg':
        return 'px-6 py-3 text-lg'
      default:
        return 'px-4 py-2 text-base'
    }
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'outline':
        return 'border-2 border-sky-600 text-sky-700 hover:bg-sky-50'
      default:
        return 'bg-sky-600 text-white hover:bg-sky-700'
    }
  }

  const handleClick = () => {
    trackAffiliateClick({
      platform: 'fintech',
      vehicleName: vehicleName || 'general',
      label: trackingLabel || vehicleName || 'fintech-pago',
    })
  }

  return (
    <Link
      href={generateUrl()}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={handleClick}
      className={`
        inline-flex items-center justify-center
        font-medium rounded-lg transition duration-200 active:scale-[0.97]
        ${getSizeClasses()}
        ${getVariantClasses()}
        ${className}
      `}
    >
      Pagá seguro con {FINTECH_NAME}
      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-9-14.25h16.5a1.5 1.5 0 011.5 1.5v10.5a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5z"
        />
      </svg>
    </Link>
  )
}
