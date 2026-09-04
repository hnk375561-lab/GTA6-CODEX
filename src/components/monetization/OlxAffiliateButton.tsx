'use client'

import Link from 'next/link'
import { trackAffiliateClick, trackAbConversion } from '@/lib/analytics-events'
import { useAbTest } from '@/lib/hooks/useAbTest'

const BUTTON_TEXT_TEST_ID = 'olx-button-text'
const BUTTON_TEXT_VARIANTS = ['Ver en OLX', 'Buscar en OLX', 'Ver publicaciones'] as const

interface OlxAffiliateButtonProps {
  /**
   * Vehicle name for search query
   * Example: "Toyota Corolla", "Honda Civic"
   */
  vehicleName: string
  /**
   * Optional: Pre-built OLX affiliate URL
   * If not provided, will be generated from vehicleName
   */
  affiliateUrl?: string
  /**
   * Button text. Si se omite, se sortea entre variantes de un A/B test
   * (ver BUTTON_TEXT_VARIANTS en este archivo) — pasar un valor acá
   * desactiva el test para esa instancia del botón.
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
 * OLX Affiliate Button Component
 *
 * Renders a button that links to OLX affiliate link.
 * Tracks clicks in Google Analytics.
 *
 * Usage:
 * <OlxAffiliateButton vehicleName="Toyota Corolla" />
 */
export function OlxAffiliateButton({
  vehicleName,
  affiliateUrl,
  buttonText,
  size = 'md',
  variant = 'solid',
  className = '',
  trackingLabel,
}: OlxAffiliateButtonProps) {
  // A/B test de copy (Fase 4.2 del plan de monetización): si el caller no
  // fuerza un texto explícito, se sortea entre 3 variantes y se reporta a
  // GA4. Ver src/lib/hooks/useAbTest.ts — persistido por visitante.
  const abVariant = useAbTest(BUTTON_TEXT_TEST_ID, BUTTON_TEXT_VARIANTS)
  const resolvedButtonText = buttonText ?? abVariant
  // Your OLX affiliate ID should be in env vars
  // For now, we'll use a generic OLX search URL with UTM params
  const generateOlxUrl = () => {
    if (affiliateUrl) return affiliateUrl

    const encodedQuery = encodeURIComponent(vehicleName)
    // Using OLX.com.ar search URL with UTM params for tracking
    const baseUrl = `https://olx.com.ar/items/q-${encodedQuery}`
    const utmParams = new URLSearchParams({
      utm_source: 'sinfrenos',
      utm_medium: 'affiliate',
      utm_campaign: 'vehicle-search',
    })

    return `${baseUrl}?${utmParams.toString()}`
  }

  const url = generateOlxUrl()

  // Size variants
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

  // Variant styles
  const getVariantClasses = () => {
    switch (variant) {
      case 'outline':
        return 'border-2 border-orange-500 text-orange-500 hover:bg-orange-50'
      default:
        return 'bg-orange-500 text-white hover:bg-orange-600'
    }
  }

  const handleClick = () => {
    trackAffiliateClick({
      platform: 'olx',
      vehicleName,
      label: trackingLabel || vehicleName,
    })
    // Solo reporta conversión de A/B si el texto vino del test (no si el
    // caller forzó buttonText a mano) — no tiene sentido medir una
    // variante que no se está corriendo.
    if (!buttonText) {
      trackAbConversion({ testId: BUTTON_TEXT_TEST_ID, variant: abVariant })
    }
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
      {resolvedButtonText}
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
