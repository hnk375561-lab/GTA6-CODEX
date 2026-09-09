import { NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import { EntityType, type Vehicle } from '@/types'
import { getEntitiesByType } from '@/lib/entities'
import { getPayment, isMercadoPagoConfigured } from '@/lib/mercadopago'
import { externalReferenceMatchesSlugs, isValidSlugSelection, normalizeSlugs } from '@/lib/premium-report'
import { SITE_NAME, SITE_URL } from '@/config/site'
import { A4_HEIGHT, A4_WIDTH, PdfCursor, embedStandardFonts, hexToRgb } from '@/lib/pdf/render'

// pdf-lib no toca el filesystem (a diferencia de pdfkit, que lee sus
// fuentes .afm con fs.readFileSync en runtime y por eso rompe en
// workerd/Cloudflare Workers), pero igual dejamos el runtime Node
// explícito por las dudas de otras dependencias del handler.
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

  const pdfBytes = await buildReportPdf(vehicles)

  return new NextResponse(pdfBytes as unknown as BodyInit, {
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

async function buildReportPdf(vehicles: Vehicle[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const { regular, bold } = await embedStandardFonts(doc)

  const bg = hexToRgb(COLORS.bg)
  const accent = hexToRgb(COLORS.accent)
  const text = hexToRgb(COLORS.text)
  const textSecondary = hexToRgb(COLORS.textSecondary)
  const border = hexToRgb(COLORS.border)

  const CONTENT_WIDTH = 495 // 545 - 50, igual que el margin:50 original

  function paintBackground(page: import('pdf-lib').PDFPage) {
    page.drawRectangle({ x: 0, y: 0, width: A4_WIDTH, height: A4_HEIGHT, color: bg })
  }

  const firstPage = doc.addPage([A4_WIDTH, A4_HEIGHT])
  paintBackground(firstPage)

  const cursor = new PdfCursor(doc, firstPage, 60, paintBackground)

  function heading(value: string, size = 18) {
    cursor.text(value, 50, CONTENT_WIDTH, { font: bold, size, color: accent })
    cursor.y += 8
  }

  function subheading(value: string) {
    cursor.text(value, 50, CONTENT_WIDTH, { font: bold, size: 13, color: text })
    cursor.y += 6
  }

  function paragraph(value: string, color = textSecondary, size = 10.5) {
    cursor.text(value, 50, CONTENT_WIDTH, { font: regular, size, color })
    cursor.y += 8
  }

  function row(label: string, value: string) {
    cursor.ensureSpace(40)
    const startY = cursor.y

    // Etiqueta (columna izquierda, ancho 160).
    cursor.text(label, 50, 160, { font: bold, size: 9.5, color: textSecondary })
    const labelEndY = cursor.y

    // Valor (columna derecha, ancho 325) — vuelve a partir de startY.
    cursor.y = startY
    cursor.text(value, 220, 325, { font: regular, size: 9.5, color: text })
    const valueEndY = cursor.y

    cursor.y = Math.max(labelEndY, valueEndY) + 6
  }

  function divider() {
    cursor.hLine(50, 545, cursor.y, border, 1)
    cursor.y += 16
  }

  // --- Portada ---
  heading(SITE_NAME, 22)
  paragraph('Reporte comparativo premium', text, 13)
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
    cursor.ensureSpace(160)
    subheading(`${vehicle.title}${vehicle.manufacturer ? ` — ${vehicle.manufacturer}` : ''}`)
    cursor.y += 4

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

  cursor.ensureSpace(120)
  subheading('Aviso')
  paragraph(
    'Este reporte es una recopilación de datos técnicos publicados y citados en ' +
      `${SITE_NAME}, pensada para guardar o compartir. No constituye asesoramiento de compra, ` +
      'legal ni financiero. Precios y specs pueden variar por región y quedar desactualizados con ' +
      'el tiempo — la ficha online enlazada arriba siempre tiene la versión más reciente.'
  )

  return doc.save()
}
