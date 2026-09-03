'use client'

import Link from 'next/link'
import { trackAffiliateClick } from '@/lib/analytics-events'

interface InsuranceAffiliateButtonProps {
  /**
   * Vehicle name, used only for tracking (el destino es un comparador
   * general de seguros, no una búsqueda por modelo).
   */
  vehicleName?: string
  buttonText?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'solid' | 'outline'
  className?: string
  trackingLabel?: string
}

/**
 * Insurance Affiliate/Referral Button
 *
 * Destino por defecto: comparaencasa.com, el broker digital de seguros
 * más establecido de Argentina (fundado 2009, +40 aseguradoras
 * integradas, cubre autos y motos). Hoy el link sale con UTM propios de
 * tracking (sin comisión todavía) — es intencional: sirve para (a) medir
 * cuánta demanda real hay antes de invertir tiempo en cerrar un acuerdo
 * comercial, y (b) tener ya el material armado para mostrarle a
 * comparaencasa.com (u otro broker/corredor local) cuando se los
 * contacte pidiendo un acuerdo de referidos.
 *
 * En cuanto exista un acuerdo real (con o sin programa de afiliados
 * formal), NEXT_PUBLIC_SEGURO_AFFILIATE_URL permite apuntar a la URL de
 * afiliado real sin tocar código — mismo mecanismo que
 * NEXT_PUBLIC_MELI_AFFILIATE_TAG.
 *
 * Usage:
 * <InsuranceAffiliateButton vehicleName="Toyota Corolla" />
 */
const INSURANCE_FALLBACK_URL = 'https://www.comparaencasa.com/seguros-de-auto/'

export function InsuranceAffiliateButton({
  vehicleName,
  buttonText = 'Cotizar seguro',
  size = 'md',
  variant = 'solid',
  className = '',
  trackingLabel,
}: InsuranceAffiliateButtonProps) {
  const generateUrl = () => {
    const baseUrl = process.env.NEXT_PUBLIC_SEGURO_AFFILIATE_URL || INSURANCE_FALLBACK_URL
    const url = new URL(baseUrl)
    url.searchParams.set('utm_source', 'sinfrenos')
    url.searchParams.set('utm_medium', 'affiliate')
    url.searchParams.set('utm_campaign', 'seguro-auto')
    if (vehicleName) {
      url.searchParams.set('utm_content', vehicleName)
    }
    return url.toString()
  }

  const url = generateUrl()

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm'
      case 'lg':
        return 'px-6 py-3 text-lg'
      default:
        return 'px-4 py-2 text-base'
    }
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'outline':
        return 'border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50'
      default:
        return 'bg-emerald-600 text-white hover:bg-emerald-700'
    }
  }

  const handleClick = () => {
    trackAffiliateClick({
      platform: 'seguro',
      vehicleName: vehicleName || 'general',
      label: trackingLabel || vehicleName || 'seguro-auto',
    })
  }

  return (
    <Link href={url} target="_blank" rel="noopener noreferrer">
      <button
        onClick={handleClick}
        className={`
          inline-flex items-center justify-center
          font-medium rounded-lg transition-colors duration-200
          ${getSizeClasses()}
          ${getVariantClasses()}
          ${className}
        `}
      >
        {buttonText}
        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.745 3.745 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
          />
        </svg>
      </button>
    </Link>
  )
}
