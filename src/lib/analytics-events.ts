/**
 * Analytics Events for Monetization
 *
 * Tracks all affiliate clicks, ad impressions, and monetization events
 * in Google Analytics 4.
 */

/**
 * Track affiliate platform clicks
 */
export function trackAffiliateClick(params: {
  platform: 'olx' | 'mercadolibre' | 'seguro' | 'financiera' | string
  vehicleName: string
  label: string
}) {
  if (typeof window === 'undefined') return

  // Track in Google Analytics
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'affiliate_click', {
      platform: params.platform,
      vehicle_name: params.vehicleName,
      label: params.label,
      value: 1,
    })
  }

  // Console log for debugging (remove in production if needed)
  console.debug('[Analytics] Affiliate click tracked:', params)
}

/**
 * Track ad impressions
 */
export function trackAdImpression(params: {
  slotId: string
  format: string
  location: string
}) {
  if (typeof window === 'undefined') return

  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'ad_impression', {
      ad_slot_id: params.slotId,
      ad_format: params.format,
      ad_location: params.location,
    })
  }

  console.debug('[Analytics] Ad impression tracked:', params)
}

/**
 * Track article views (for content strategy)
 */
export function trackArticleView(params: { title: string; slug: string }) {
  if (typeof window === 'undefined') return

  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'article_view', {
      article_title: params.title,
      article_slug: params.slug,
    })
  }
}

/**
 * Track vehicle comparison (monetizable moment)
 */
export function trackVehicleComparison(params: {
  vehicles: string[]
  comparison_type: string
}) {
  if (typeof window === 'undefined') return

  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'vehicle_comparison', {
      vehicles: params.vehicles.join(', '),
      comparison_type: params.comparison_type,
    })
  }
}

/**
 * Track search queries (identify trends)
 */
export function trackSearch(params: { query: string; results_count: number }) {
  if (typeof window === 'undefined') return

  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'search', {
      search_term: params.query,
      results_count: params.results_count,
    })
  }
}

/**
 * Track newsletter signup (future monetization)
 */
export function trackNewsletterSignup() {
  if (typeof window === 'undefined') return

  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'newsletter_signup', {
      value: 1,
    })
  }
}

/**
 * Track lead capture (calculadora de financiamiento → WhatsApp). Se
 * dispara al hacer click en "Enviar por WhatsApp", no al tipear — evita
 * contar como lead a alguien que completó el form pero nunca lo mandó.
 * `value: 1` sigue la misma convención que trackAffiliateClick /
 * trackNewsletterSignup (permite sumarlos en GA4 sin lógica extra).
 */
export function trackLeadSubmit(params: {
  source: 'financiamiento-calculadora' | string
  vehicleName?: string
}) {
  if (typeof window === 'undefined') return

  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'lead_submit', {
      lead_source: params.source,
      vehicle_name: params.vehicleName || 'general',
      value: 1,
    })
  }

  console.debug('[Analytics] Lead submit tracked:', params)
}

/**
 * Track A/B test variant assignment — se dispara una vez por visitante al
 * montar el componente que usa `useAbTest` (ver src/lib/hooks/useAbTest.ts).
 * En GA4 esto permite armar un Explore con dimensión `ab_variant` segmentado
 * por `ab_test_id` y cruzarlo contra `affiliate_click` / `ad_impression`
 * para ver qué variante convierte mejor.
 */
export function trackAbAssignment(params: { testId: string; variant: string }) {
  if (typeof window === 'undefined') return

  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'ab_test_assignment', {
      ab_test_id: params.testId,
      ab_variant: params.variant,
    })
  }

  console.debug('[Analytics] A/B assignment tracked:', params)
}

/**
 * Track A/B test conversion (ej. click en un botón cuyo texto está bajo
 * test). Se dispara desde el mismo componente que ya reporta su propio
 * evento de negocio (affiliate_click, etc.) — este es un evento adicional
 * pensado para que el análisis de A/B no dependa de cruzar dos reportes.
 */
export function trackAbConversion(params: { testId: string; variant: string }) {
  if (typeof window === 'undefined') return

  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'ab_test_conversion', {
      ab_test_id: params.testId,
      ab_variant: params.variant,
      value: 1,
    })
  }

  console.debug('[Analytics] A/B conversion tracked:', params)
}

// Type augmentation for window.gtag
declare global {
  interface Window {
    gtag: (
      command: string,
      action: string,
      params?: Record<string, unknown>
    ) => void
  }
}
