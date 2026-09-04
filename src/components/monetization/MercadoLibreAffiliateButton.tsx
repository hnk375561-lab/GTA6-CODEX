'use client'

import Link from 'next/link'
import { trackAffiliateClick } from '@/lib/analytics-events'

interface MercadoLibreAffiliateButtonProps {
  /**
   * Vehicle name for search query
   * Example: "Toyota Corolla", "Honda Civic"
   */
  vehicleName: string
  /**
   * Button text (default: "Ver en Mercado Libre")
   */
  buttonText?: string
  /**
   * Button size variant
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Button variant (solid or outline)
   */
  variant?: 'solid' | 'outline'
  /**
   * CSS classes for custom styling
   */
  className?: string
  /**
   * Tracking label for analytics
   */
  trackingLabel?: string
}

/**
 * Mercado Libre Affiliate Button Component
 *
 * A diferencia del botón de OLX (que solo referencia tráfico, OLX no
 * tiene programa de afiliados público), este SÍ genera comisión real:
 * Mercado Libre Argentina tiene un Programa de Afiliados y Creadores
 * activo (hasta 15% por venta, pago vía Mercado Pago, inscripción
 * gratuita — requiere ser monotributista, 18+, no empleado/vendedor
 * habitual de ML).
 *
 * Tag de afiliado confirmado por el usuario (registro en el Programa de
 * Afiliados y Creadores de Mercado Libre Argentina, ago 2026). No es un
 * secreto — ya queda expuesto en cualquier link que se comparta — por
 * eso se hardcodea acá en vez de pedir otra env var en Vercel.
 * NEXT_PUBLIC_MELI_AFFILIATE_TAG sigue existiendo como override opcional
 * por si el usuario quiere rotarlo sin tocar código.
 *
 * Usage:
 * <MercadoLibreAffiliateButton vehicleName="Toyota Corolla" />
 */
const MELI_AFFILIATE_TAG_DEFAULT = 'solissantiago20220712193414'
const MELI_AFFILIATE_TOOL_DEFAULT = '17664360'

export function MercadoLibreAffiliateButton({
  vehicleName,
  buttonText = 'Ver en Mercado Libre',
  size = 'md',
  variant = 'solid',
  className = '',
  trackingLabel,
}: MercadoLibreAffiliateButtonProps) {
  const affiliateTag = process.env.NEXT_PUBLIC_MELI_AFFILIATE_TAG || MELI_AFFILIATE_TAG_DEFAULT

  const generateUrl = () => {
    const encodedQuery = encodeURIComponent(vehicleName)
    const baseUrl = `https://listado.mercadolibre.com.ar/${encodedQuery}`
    const params = new URLSearchParams({
      utm_source: 'sinfrenos',
      utm_medium: 'affiliate',
      utm_campaign: 'vehicle-search',
    })
    // matt_word / matt_tool son los parámetros reales que ML usa para
    // atribuir la venta al afiliado (confirmados con un link de afiliado
    // real generado desde la app de ML).
    params.set('matt_word', affiliateTag)
    params.set('matt_tool', MELI_AFFILIATE_TOOL_DEFAULT)
    return `${baseUrl}?${params.toString()}`
  }

  const url = generateUrl()

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
        return 'border-2 border-yellow-500 text-yellow-600 hover:bg-yellow-50'
      default:
        return 'bg-yellow-400 text-neutral-900 hover:bg-yellow-500'
    }
  }

  const handleClick = () => {
    trackAffiliateClick({
      platform: 'mercadolibre',
      vehicleName,
      label: trackingLabel || vehicleName,
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
      <svg
        className="w-4 h-4 ml-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </Link>
  )
}
