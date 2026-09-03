import { NextResponse } from 'next/server'
import { EntityType, type Vehicle } from '@/types'
import { getEntitiesByType } from '@/lib/entities'
import { createPreference, isMercadoPagoConfigured } from '@/lib/mercadopago'
import {
  PREMIUM_REPORT_PRICE_ARS,
  buildExternalReference,
  isValidSlugSelection,
  normalizeSlugs,
} from '@/lib/premium-report'
import { SITE_URL } from '@/config/site'

/**
 * POST /api/premium-report/create-preference
 * Body: { slugs: string[] }  — 2 a 5 slugs de vehículos reales.
 * Devuelve: { initPoint: string } listo para redirigir a Mercado Pago,
 * o un error legible si algo no está listo para operar.
 *
 * Fail-closed igual que `middleware.ts` con `DASHBOARD_PASSWORD`: sin
 * `MERCADOPAGO_ACCESS_TOKEN` configurado, este endpoint devuelve 503 en
 * vez de romper con un error genérico de fetch — el botón del cliente
 * (`PremiumReportButton.tsx`) muestra ese mensaje tal cual.
 *
 * Nota de infraestructura (Vercel Hobby): este proyecto no tenía ninguna
 * Route Handler antes de esta ronda (todo el sitio es estático). Cada
 * `route.ts` es una Serverless Function nueva — hoy son 2
 * (`create-preference` + `pdf`), lejos del tope de 12 del plan Hobby.
 * Si en el futuro se agregan muchas más, revisar el límite antes de
 * seguir sumando.
 */
export async function POST(request: Request) {
  if (!isMercadoPagoConfigured()) {
    return NextResponse.json(
      {
        error:
          'El reporte premium todavía no está activo (falta configurar MERCADOPAGO_ACCESS_TOKEN). Ver docs/monetizacion-plan.md.',
      },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido, se esperaba JSON.' }, { status: 400 })
  }

  const rawSlugs = (body as { slugs?: unknown })?.slugs
  if (!Array.isArray(rawSlugs) || !rawSlugs.every((s) => typeof s === 'string')) {
    return NextResponse.json({ error: '"slugs" debe ser un array de strings.' }, { status: 400 })
  }

  const slugs = normalizeSlugs(rawSlugs)
  if (!isValidSlugSelection(slugs)) {
    return NextResponse.json(
      { error: 'Seleccioná entre 2 y 5 vehículos para generar el reporte.' },
      { status: 400 }
    )
  }

  // No confiar en los títulos que mande el cliente: se resuelven acá
  // contra el contenido real para que el ítem de Mercado Pago (y el PDF,
  // más adelante) siempre reflejen datos genuinos del catálogo.
  const vehicles = (await getEntitiesByType(EntityType.VEHICLE)) as Vehicle[]
  const selected = slugs
    .map((slug) => vehicles.find((v) => v.slug === slug))
    .filter((v): v is Vehicle => Boolean(v))

  if (selected.length !== slugs.length) {
    return NextResponse.json({ error: 'Uno o más vehículos seleccionados no existen.' }, { status: 400 })
  }

  const titleList = selected.map((v) => v.title).join(' vs ')
  const externalReference = buildExternalReference(slugs)
  const returnUrl = `${SITE_URL}/reporte-premium/descargar?slugs=${encodeURIComponent(slugs.join(','))}`

  try {
    const preference = await createPreference({
      items: [
        {
          title: `Reporte comparativo premium: ${titleList}`,
          description: 'PDF descargable con ficha técnica completa y evidencia citada de cada vehículo comparado.',
          quantity: 1,
          unit_price: PREMIUM_REPORT_PRICE_ARS,
          currency_id: 'ARS',
        },
      ],
      externalReference,
      successUrl: returnUrl,
      pendingUrl: returnUrl,
      failureUrl: returnUrl,
    })

    return NextResponse.json({ initPoint: preference.init_point })
  } catch (error) {
    console.error('[premium-report] Error creando preferencia de Mercado Pago:', error)
    return NextResponse.json(
      { error: 'No se pudo iniciar el pago. Probá de nuevo en un momento.' },
      { status: 502 }
    )
  }
}
