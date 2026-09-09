import { NextResponse } from 'next/server'
import { createPreference, isMercadoPagoConfigured } from '@/lib/mercadopago'
import {
  FLYER_PRICE_ARS,
  buildExternalReference,
  encodeFlyerData,
  isValidFlyerData,
  type FlyerData,
} from '@/lib/for-sale-flyer'
import { isWinAnsiEncodable } from '@/lib/pdf/render'
import { SITE_URL } from '@/config/site'

const FLYER_TEXT_FIELDS: Array<keyof FlyerData> = ['marca', 'modelo', 'anio', 'precio', 'km', 'contacto', 'ubicacion']

/**
 * Encuentra el primer campo con un caracter que el PDF no va a poder
 * dibujar (fuente estándar = encoding WinAnsi, sin emoji ni la mayoría
 * de símbolos fuera de Latin-1). Se corre ACÁ, antes de `createPreference`,
 * para rechazar con un 400 barato en vez de cobrar $690 y recién
 * enterarse en `/pdf` cuando ya no hay nada que devolver sin reembolsar
 * a mano. Ver `isWinAnsiEncodable` en `src/lib/pdf/render.ts`.
 */
async function findUnencodableField(data: FlyerData): Promise<string | null> {
  for (const field of FLYER_TEXT_FIELDS) {
    const value = data[field]
    if (typeof value !== 'string' || !value) continue
    if (!(await isWinAnsiEncodable(value))) return field
  }
  return null
}

/**
 * POST /api/for-sale-flyer/create-preference
 * Body: FlyerData (marca, modelo, anio, precio, contacto, km?, ubicacion?)
 * Devuelve: { initPoint: string } listo para redirigir a Mercado Pago.
 *
 * Mismo criterio fail-closed que `/api/premium-report/create-preference`:
 * sin `MERCADOPAGO_ACCESS_TOKEN`, 503 con mensaje legible en vez de un
 * error genérico de fetch.
 *
 * Nota de infraestructura (Vercel Hobby): esta ronda suma 2 Serverless
 * Functions nuevas (`create-preference` + `pdf` de este canal), que se
 * acumulan a las 2 que ya sumó el reporte premium — 4 en total, todavía
 * lejos del tope de 12 del plan Hobby (ver next.config.js), pero
 * cualquier canal futuro que agregue más Route Handlers debería revisar
 * ese conteo antes de desplegar.
 */
export async function POST(request: Request) {
  if (!isMercadoPagoConfigured()) {
    return NextResponse.json(
      {
        error:
          'El cartel de venta todavía no está activo (falta configurar MERCADOPAGO_ACCESS_TOKEN). Ver docs/monetizacion-plan.md.',
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

  const data = body as Partial<FlyerData>
  if (!isValidFlyerData(data)) {
    return NextResponse.json(
      { error: 'Faltan datos: marca, modelo, año, precio y contacto son obligatorios.' },
      { status: 400 }
    )
  }

  const unencodableField = await findUnencodableField(data)
  if (unencodableField) {
    return NextResponse.json(
      {
        error: `El campo "${unencodableField}" tiene un caracter que el cartel no puede imprimir (ej. emoji). Sacalo e intentá de nuevo.`,
      },
      { status: 400 }
    )
  }

  const externalReference = buildExternalReference(data)
  const encoded = encodeFlyerData(data)
  const returnUrl = `${SITE_URL}/vender-tu-auto/cartel/descargar?data=${encodeURIComponent(encoded)}`

  try {
    const preference = await createPreference({
      items: [
        {
          title: `Cartel de venta: ${data.marca} ${data.modelo}`,
          description: 'PDF listo para imprimir o compartir con los datos de tu vehículo en venta.',
          quantity: 1,
          unit_price: FLYER_PRICE_ARS,
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
    console.error('[for-sale-flyer] Error creando preferencia de Mercado Pago:', error)
    return NextResponse.json(
      { error: 'No se pudo iniciar el pago. Probá de nuevo en un momento.' },
      { status: 502 }
    )
  }
}
