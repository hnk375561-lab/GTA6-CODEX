import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { EntityType, type Vehicle } from '@/types'
import { getEntitiesByType } from '@/lib/entities'
import { getPayment, isMercadoPagoConfigured } from '@/lib/mercadopago'
import { externalReferenceMatchesSlugs, isValidSlugSelection, normalizeSlugs } from '@/lib/premium-report'
import { SITE_NAME, SITE_URL } from '@/config/site'

// pdfkit necesita el runtime de Node (fs, streams reales) — no corre en
// el runtime Edge. Mismo motivo por el que `generate-media-kit.mjs` es
// un script de Node y no algo que corra en el navegador.
export const runtime = 'nodejs'

const COLORS = {
  bg: '#12151a',
  accent: '#ff6a1a',
  text: '#eef1f4',
  textSecondary: '#9fa8b5',
  border: '#242a32',
}

/**
 * GET /api/premium-report/pdf?slugs=a,b,c&payment_id=123
 *
 * Verifica el pago CONTRA LA API DE MERCADO PAGO (nunca contra el query
 * param `status` que pudo haber vuelto en la URL del navegador — ver
 * `getPayment` en `src/lib/mercadopago.ts`) y, solo si está aprobado y
 * corresponde exactamente a los vehículos pedidos, genera el PDF al
 * vuelo (sin guardar nada en disco ni en una base de datos: no hace
 * falta, el pago ya quedó registrado del lado de Mercado Pago y
 * regenerar el PDF es barato).
 */
export async function GET(request: Request) {
  if (!isMercadoPagoConfigured()) {
    return NextResponse.json({ error: 'El reporte premium todavía no está activo.' }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const paymentId = searchParams.get('payment_id')
  const slugsParam = searchParams.get('slugs') || ''
  const slugs = normalizeSlugs(slugsParam.split(','))

  if (!paymentId) {
    return NextResponse.json({ error: 'Falta payment_id.' }, { status: 400 })
  }
  if (!isValidSlugSelection(slugs)) {
    return NextResponse.json({ error: 'Selección de vehículos inválida.' }, { status: 400 })
  }

  let payment
  try {
    payment = await getPayment(paymentId)
  } catch (error) {
    console.error('[premium-report] Error verificando pago:', error)
    return NextResponse.json({ error: 'No se pudo verificar el pago.' }, { status: 502 })
  }

  if (payment.status !== 'approved') {
    return NextResponse.json(
      { error: `El pago todavía no está aprobado (estado: ${payment.status}).` },
      { status: 402 }
    )
  }

  if (!externalReferenceMatchesSlugs(payment.external_reference, slugs)) {
    return NextResponse.json(
      { error: 'El pago no corresponde a esta selección de vehículos.' },
      { status: 403 }
    )
  }

  const allVehicles = (await getEntitiesByType(EntityType.VEHICLE)) as Vehicle[]
  const vehicles = slugs
    .map((slug) => allVehicles.find((v) => v.slug === slug))
    .filter((v): v is Vehicle => Boolean(v))

  if (vehicles.length !== slugs.length) {
    return NextResponse.json({ error: 'Uno o más vehículos ya no están disponibles.' }, { status: 404 })
  }

  const pdfBuffer = await buildReportPdf(vehicles)

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-${vehicles.map((v) => v.slug).join('-')}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}

const SPEC_ROWS: Array<{ key: keyof Vehicle; label: string }> = [
  { key: 'price', label: 'Precio' },
  { key: 'power', label: 'Potencia' },
  { key: 'consumo', label: 'Consumo' },
  { key: 'dimensiones', label: 'Dimensiones' },
  { key: 'transmision', label: 'Transmisión' },
  { key: 'traccion', label: 'Tracción' },
  { key: 'peso', label: 'Peso' },
  { key: 'cilindrada', label: 'Cilindrada' },
  { key: 'anoProduccion', label: 'Año de producción' },
]

function fieldToText(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Sin dato'
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

async function buildReportPdf(vehicles: Vehicle[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk as Buffer))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    function paintBackground() {
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.bg)
    }
    paintBackground()
    doc.on('pageAdded', paintBackground)

    let y = 60

    function heading(text: string, size = 18) {
      doc.fillColor(COLORS.accent).font('Helvetica-Bold').fontSize(size).text(text, 50, y, { width: 495 })
      y = doc.y + 8
    }

    function subheading(text: string) {
      doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(13).text(text, 50, y, { width: 495 })
      y = doc.y + 6
    }

    function paragraph(text: string, color = COLORS.textSecondary, size = 10.5) {
      doc.fillColor(color).font('Helvetica').fontSize(size).text(text, 50, y, { width: 495 })
      y = doc.y + 8
    }

    function row(label: string, value: string) {
      ensureSpace(40)
      doc.fillColor(COLORS.textSecondary).font('Helvetica-Bold').fontSize(9.5).text(label, 50, y, { width: 160 })
      doc.fillColor(COLORS.text).font('Helvetica').fontSize(9.5).text(value, 220, y, { width: 325 })
      y = Math.max(doc.y, y) + 6
    }

    function divider() {
      doc.moveTo(50, y).lineTo(545, y).strokeColor(COLORS.border).lineWidth(1).stroke()
      y += 16
    }

    function ensureSpace(minSpace = 100) {
      if (y > doc.page.height - minSpace) {
        doc.addPage()
        y = 60
      }
    }

    // --- Portada ---
    heading(SITE_NAME, 22)
    paragraph('Reporte comparativo premium', COLORS.text, 13)
    paragraph(
      `Generado el ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })} · ${SITE_URL}`
    )
    divider()

    paragraph(
      `Comparación entre ${vehicles.length} vehículos: ${vehicles.map((v) => v.title).join(', ')}. Cada dato ` +
        'conserva el nivel de evidencia y la fuente citada en la ficha original — este PDF no agrega ni ' +
        'infiere ningún valor que no esté ya publicado en el sitio.'
    )
    divider()

    for (const vehicle of vehicles) {
      ensureSpace(160)
      subheading(`${vehicle.title}${vehicle.manufacturer ? ` — ${vehicle.manufacturer}` : ''}`)
      y += 4

      for (const { key, label } of SPEC_ROWS) {
        row(label, fieldToText(vehicle[key]))
      }

      if (vehicle.evidence) {
        row('Nivel de evidencia', vehicle.evidence.level)
        if (vehicle.evidence.primarySource) {
          row('Fuente primaria', vehicle.evidence.primarySource)
        }
      }

      row('Ficha completa', `${SITE_URL}/vehiculos/${vehicle.slug}`)
      divider()
    }

    ensureSpace(120)
    subheading('Aviso')
    paragraph(
      'Este reporte es una recopilación de datos técnicos publicados y citados en ' +
        `${SITE_NAME}, pensada para guardar o compartir. No constituye asesoramiento de compra, ` +
        'legal ni financiero. Precios y specs pueden variar por región y quedar desactualizados con ' +
        'el tiempo — la ficha online enlazada arriba siempre tiene la versión más reciente.'
    )

    doc.end()
  })
}
