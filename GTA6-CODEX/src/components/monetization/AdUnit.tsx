'use client'

import { useEffect } from 'react'

interface AdUnitProps {
  /**
   * Ad slot ID from Google AdSense
   * Format: 1234567890 (10 digits)
   */
  slotId: string
  /**
   * Ad format: responsive, square, horizontal, vertical
   */
  format?: 'responsive' | 'square' | 'horizontal' | 'vertical'
  /**
   * CSS classes for container styling
   */
  className?: string
  /**
   * Data attribute to track in Analytics
   */
  dataTrackingLabel?: string
}

/**
 * Google AdSense Unit Component
 *
 * Renders a Google AdSense ad unit with automatic formatting.
 * Requires NEXT_PUBLIC_ADSENSE_CLIENT_ID env var.
 *
 * Usage:
 * <AdUnit slotId="1234567890" format="responsive" />
 */
export function AdUnit({
  slotId,
  format = 'responsive',
  className = '',
  dataTrackingLabel = 'ad-unit',
}: AdUnitProps) {
  const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID

  useEffect(() => {
    // Only load if AdSense is configured
    if (!ADSENSE_CLIENT_ID) {
      console.warn(
        '[AdUnit] NEXT_PUBLIC_ADSENSE_CLIENT_ID not configured. Ad unit will not load.'
      )
      return
    }

    // Push ad to Google AdSense queue
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (err) {
      console.error('[AdUnit] Error pushing ad:', err)
    }
  }, [ADSENSE_CLIENT_ID, slotId])

  // If AdSense is not configured, show nothing
  if (!ADSENSE_CLIENT_ID) {
    return null
  }

  // Determine styling based on format
  const getFormatStyles = () => {
    switch (format) {
      case 'square':
        return 'w-full max-w-xs h-80'
      case 'horizontal':
        return 'w-full h-28'
      case 'vertical':
        return 'w-48 h-full'
      default:
        return 'w-full'
    }
  }

  return (
    <div
      className={`ad-container flex justify-center my-6 ${getFormatStyles()} ${className}`}
      data-tracking={dataTrackingLabel}
    >
      <ins
        className={`adsbygoogle ${getFormatStyles()}`}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slotId}
        data-ad-format={format === 'responsive' ? 'auto' : format}
        data-full-width-responsive="true"
      />
    </div>
  )
}

// Type augmentation for global window object
declare global {
  interface Window {
    adsbygoogle: Array<Record<string, unknown>>
  }
}
