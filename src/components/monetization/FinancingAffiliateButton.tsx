'use client'

import Link from 'next/link'
import { trackAffiliateClick } from '@/lib/analytics-events'

interface FinancingAffiliateButtonProps {
  vehicleName?: string
  buttonText?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'solid' | 'outline'
  className?: string
  trackingLabel?: string
}

/**
 * Financing Affiliate/Referral Button (crédito prendario / préstamo para
 * compra de auto).
 *
 * Destino por defecto: comparaencasa.com también agrega comparación de
 * préstamos para compra de vehículo (mismo grupo que el de seguros, así
 * que un solo acuerdo comercial con ellos podría cubrir ambos botones).
 * Igual que InsuranceAffiliateButton: hoy es tráfico con UTM, no
 * comisión confirmada — sirve como demo de tracción para negociar un
 * acuerdo real (con comparaencasa.com o con un banco/fintech local que
 * pague por lead, que es más común que pago por venta en este rubro).
 *
 * NEXT_PUBLIC_FINANCIACION_AFFILIATE_URL permite apuntar a la URL real
 * de afiliado/referido en cuanto exista, sin tocar código.
 *
 * Usage:
 * <FinancingAffiliateButton vehicleName="Toyota Corolla" />
 */
const FINANCING_FALLBACK_URL =
  'https://www.comparaencasa.com/prestamos-personales/comparar-online/prestamos-para-compra-de-automovil/'

export function FinancingAffiliateButton({
  vehicleName,
  buttonText = 'Simular financiación',
  size = 'md',
  variant = 'solid',
  className = '',
  trackingLabel,
}: FinancingAffiliateButtonProps) {
  const generateUrl = () => {
    const baseUrl = process.env.NEXT_PUBLIC_FINANCIACION_AFFILIATE_URL || FINANCING_FALLBACK_URL
    const url = new URL(baseUrl)
    url.searchParams.set('utm_source', 'sinfrenos')
    url.searchParams.set('utm_medium', 'affiliate')
    url.searchParams.set('utm_campaign', 'financiacion-auto')
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
        return 'border-2 border-sky-600 text-sky-700 hover:bg-sky-50'
      default:
        return 'bg-sky-600 text-white hover:bg-sky-700'
    }
  }

  const handleClick = () => {
    trackAffiliateClick({
      platform: 'financiera',
      vehicleName: vehicleName || 'general',
      label: trackingLabel || vehicleName || 'financiacion-auto',
    })
  }

  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`
        inline-flex items-center justify-center
        font-medium rounded-lg transition duration-200 active:scale-[0.97]
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
          d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
        />
      </svg>
    </Link>
  )
}
