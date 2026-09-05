'use client'

import Link from 'next/link'
import { trackAffiliateClick } from '@/lib/analytics-events'
import type { VehicleCategory } from '@/lib/vehicle-category'

/**
 * Cross-sell de accesorios — canal nuevo (03/09/2026), documentado en
 * `docs/monetizacion-plan.md` sección 2.14.
 *
 * Por qué esto es un canal aparte de `MercadoLibreAffiliateButton.tsx`
 * (que ya existe): ese botón vende EL VEHÍCULO ("Ver en Mercado Libre" —
 * autos/motos similares). Esto vende lo que se compra DESPUÉS de decidirse
 * por un vehículo: cubre-asientos, baulera para pickup, cascos para moto,
 * etc. Es intención de compra distinta (accesorios, no el vehículo en sí)
 * y no compite por el mismo espacio ni canibaliza el click del botón
 * principal — de hecho amplía cuántas categorías de producto puede vender
 * el mismo tag de afiliado en la misma visita.
 *
 * Cero trabajo de activación adicional: reutiliza exactamente el mismo
 * programa de Afiliados y Creadores de Mercado Libre Argentina que ya usa
 * `MercadoLibreAffiliateButton.tsx` (mismo tag, mismos parámetros
 * `matt_word`/`matt_tool` de atribución) — no hace falta ninguna cuenta
 * nueva ni ningún acuerdo comercial nuevo para que esto empiece a generar
 * comisión. Por eso nace directo en 🟢 Activo en vez de 🟡.
 *
 * Los términos de búsqueda por categoría son intencionalmente genéricos
 * ("funda cubre asientos auto", no una marca puntual) para no atarse a un
 * producto que puede dejar de existir en el catálogo de ML — matchea
 * cualquier resultado vigente de esa categoría.
 */
const MELI_AFFILIATE_TAG_DEFAULT = 'solissantiago20220712193414'
const MELI_AFFILIATE_TOOL_DEFAULT = '17664360'

interface AccessoryIdea {
  label: string
  query: string
}

/**
 * Mapeo categoría de vehículo -> ideas de accesorios relevantes.
 * Deliberadamente acotado a 3 ideas por categoría (suficiente para dar
 * opciones sin que el widget se sienta como spam de productos genéricos).
 */
const ACCESSORIES_BY_CATEGORY: Record<VehicleCategory, AccessoryIdea[]> = {
  SUV: [
    { label: 'Barras de techo', query: 'barras de techo suv' },
    { label: 'Organizador de baúl', query: 'organizador baul auto' },
    { label: 'Cubre asientos', query: 'funda cubre asientos auto' },
  ],
  Sedán: [
    { label: 'Cubre asientos', query: 'funda cubre asientos auto' },
    { label: 'Alfombras a medida', query: 'alfombras goma auto a medida' },
    { label: 'Cargador USB para auto', query: 'cargador usb auto' },
  ],
  Hatchback: [
    { label: 'Cubre asientos', query: 'funda cubre asientos auto' },
    { label: 'Organizador de baúl', query: 'organizador baul auto' },
    { label: 'Soporte celular para auto', query: 'soporte celular auto' },
  ],
  Pickup: [
    { label: 'Cubre caja / lona marina', query: 'lona cubre caja pickup' },
    { label: 'Estribos laterales', query: 'estribos laterales pickup' },
    { label: 'Barra antivuelco', query: 'barra antivuelco pickup' },
  ],
  Deportivo: [
    { label: 'Cámara de estacionamiento', query: 'camara estacionamiento auto' },
    { label: 'Cera y kit de detailing', query: 'kit detailing auto cera' },
    { label: 'Cubre auto (funda exterior)', query: 'cubre auto funda exterior' },
  ],
  Familiar: [
    { label: 'Organizador de baúl', query: 'organizador baul auto' },
    { label: 'Parasoles para ventanillas', query: 'parasol ventanilla auto niños' },
    { label: 'Cubre asientos', query: 'funda cubre asientos auto' },
  ],
  Coupé: [
    { label: 'Cubre auto (funda exterior)', query: 'cubre auto funda exterior' },
    { label: 'Kit de detailing', query: 'kit detailing auto cera' },
    { label: 'Soporte celular para auto', query: 'soporte celular auto' },
  ],
  Cabrio: [
    { label: 'Cubre auto (funda exterior)', query: 'cubre auto funda exterior' },
    { label: 'Kit de detailing', query: 'kit detailing auto cera' },
    { label: 'Cámara de estacionamiento', query: 'camara estacionamiento auto' },
  ],
  Monovolumen: [
    { label: 'Organizador de baúl', query: 'organizador baul auto' },
    { label: 'Parasoles para ventanillas', query: 'parasol ventanilla auto niños' },
    { label: 'Alfombras a medida', query: 'alfombras goma auto a medida' },
  ],
  Utilitario: [
    { label: 'Organizador de carga', query: 'organizador carga utilitario' },
    { label: 'Cubre caja / lona', query: 'lona cubre caja pickup' },
    { label: 'GPS / rastreo satelital', query: 'gps rastreo satelital vehiculo' },
  ],
  Moto: [
    { label: 'Casco', query: 'casco moto' },
    { label: 'Baulera / valija trasera', query: 'baulera moto valija trasera' },
    { label: 'Cubre moto', query: 'cubre moto funda impermeable' },
  ],
  Otros: [
    { label: 'Cubre asientos', query: 'funda cubre asientos auto' },
    { label: 'GPS / rastreo satelital', query: 'gps rastreo satelital vehiculo' },
    { label: 'Kit de detailing', query: 'kit detailing auto cera' },
  ],
}

function buildAffiliateSearchUrl(query: string): string {
  const affiliateTag = process.env.NEXT_PUBLIC_MELI_AFFILIATE_TAG || MELI_AFFILIATE_TAG_DEFAULT
  const encodedQuery = encodeURIComponent(query)
  const params = new URLSearchParams({
    utm_source: 'sinfrenos',
    utm_medium: 'affiliate',
    utm_campaign: 'accesorios-cross-sell',
  })
  params.set('matt_word', affiliateTag)
  params.set('matt_tool', MELI_AFFILIATE_TOOL_DEFAULT)
  return `https://listado.mercadolibre.com.ar/${encodedQuery}?${params.toString()}`
}

export function AccessoriesAffiliateWidget({
  category,
  vehicleName,
  className = '',
}: {
  category: VehicleCategory | null
  vehicleName: string
  className?: string
}) {
  const ideas = ACCESSORIES_BY_CATEGORY[category ?? 'Otros']
  if (!ideas || ideas.length === 0) return null

  return (
    <div className={`rounded-lg border border-edge bg-surface-card p-4 ${className}`}>
      <p className="mb-3 text-sm font-semibold text-neutral-900">
        🛍️ Accesorios recomendados para este {category === 'Moto' ? 'modelo' : 'vehículo'}
      </p>
      <div className="flex flex-wrap gap-2">
        {ideas.map((idea) => (
          <Link
            key={idea.query}
            href={buildAffiliateSearchUrl(idea.query)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={() =>
              trackAffiliateClick({
                platform: 'mercadolibre-accesorios',
                vehicleName,
                label: `accesorio-${idea.query}`,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-surface-card px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:border-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-500/10"
          >
            {idea.label}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-neutral-400">Enlaces de afiliado a Mercado Libre — el precio no cambia para vos.</p>
    </div>
  )
}
