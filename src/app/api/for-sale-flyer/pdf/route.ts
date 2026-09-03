import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { getPayment, isMercadoPagoConfigured } from '@/lib/mercadopago'
import { decodeFlyerData, externalReferenceMatchesData } from '@/lib/for-sale-flyer'
import { SITE_NAME, SITE_URL } from '@/config/site'

// Mismo motivo que /api/premium-report/pdf: pdfkit necesita el runtime
// de Node.
export const runtime = 'nodejs'

const COLORS = {
  bg: '#12151a',
  accent: '#ff6a1a',
  text: '#eef1f4',
  textSecondary: '#9fa8b5',
  border: '#242a32',
}

/**
 * GET /api/for-sale-flyer/pdf?data=<base64url>&payment_id=123
 *
 * Igual que `/api/premium-report/pdf`: verifica el pago CONTRA LA API DE
 * MERCADO PAGO (nunca contra el query param que vuelve del navegador) y
 * solo si está `approved` y el hash del `external_reference` coincide
 * exactamente con los datos pedidos, genera el PDF al vuelo. No hay
 * ninguna base de datos ni almacenamiento — los datos viajan enteros en
 * la URL, igual que hace `slugs` en el reporte premium.
 */
export async function GET(request: Request) {
  if (!isMercadoPagoConfigured()) {
    return NextResponse.json({ error: 'El cartel de venta todavía no está activo.' }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const paymentId = searchParams.get('payment_id')
  const encoded = searchParams.get('data') || ''

  if (!paymentId) {
    return NextResponse.json({ error: 'Falta payment_id.' }, { status: 400 })
  }

  const data = decodeFlyerData(encoded)
  if (!data) {
    return NextResponse.json({ error: 'Datos del cartel inválidos o corruptos.' }, { status: 400 })
  }

  let payment
  try {
    payment = await getPayment(paymentId)
  } catch (error) {
    console.error('[for-sale-flyer] Error verificando pago:', error)
    return NextResponse.json({ error: 'No se pudo verificar el pago.' }, { status: 502 })
  }

  if (payment.status !== 'approved') {
    return NextResponse.json(
      { error: `El pago todavía no está aprobado (estado: ${payment.status}).` },
      { status: 402 }
    )
  }

  if (!externalReferenceMatchesData(payment.external_reference, data)) {
    return NextResponse.json({ error: 'El pago no corresponde a estos datos.' }, { status: 403 })
  }

  const pdfBuffer = await buildFlyerPdf(data)

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cartel-venta-${data.marca}-${data.modelo}.pdf"`.replace(/\s+/g, '-'),
      'Cache-Control': 'no-store',
    },
  })
}

async function buildFlyerPdf(data: {
  marca: string
  modelo: string
  anio: string
  precio: string
  km?: string
  contacto: string
  ubicacion?: string
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Tamaño A4 vertical pensado para imprimir y pegar en el parabrisas.
    const doc = new PDFDocument({ size: 'A4', margin: 0 })
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk as Buffer))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageWidth = doc.page.width
    const pageHeight = doc.page.height

    doc.rect(0, 0, pageWidth, pageHeight).fill(COLORS.bg)

    // Franja superior de marca.
    doc.rect(0, 0, pageWidth, 90).fill(COLORS.accent)
    doc
      .fillColor('#12151a')
      .font('Helvetica-Bold')
      .fontSize(26)
      .text('SE VENDE', 0, 28, { width: pageWidth, align: 'center' })

    let y = 140

    doc
      .fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .fontSize(38)
      .text(`${data.marca}`, 40, y, { width: pageWidth - 80, align: 'center' })
    y = doc.y + 4
    doc
      .fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .fontSize(30)
      .text(`${data.modelo}`, 40, y, { width: pageWidth - 80, align: 'center' })
    y = doc.y + 10

    doc
      .fillColor(COLORS.textSecondary)
      .font('Helvetica')
      .fontSize(16)
      .text(`Año ${data.anio}${data.km ? ` · ${data.km}` : ''}`, 40, y, { width: pageWidth - 80, align: 'center' })
    y = doc.y + 30

    // Precio, el elemento más grande de la página — es lo que se lee
    // desde lejos.
    doc
      .fillColor(COLORS.accent)
      .font('Helvetica-Bold')
      .fontSize(48)
      .text(data.precio, 40, y, { width: pageWidth - 80, align: 'center' })
    y = doc.y + 40

    doc.moveTo(60, y).lineTo(pageWidth - 60, y).strokeColor(COLORS.border).lineWidth(1).stroke()
    y += 30

    doc
      .fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .fontSize(20)
      .text(`📞 ${data.contacto}`, 40, y, { width: pageWidth - 80, align: 'center' })
    y = doc.y + 14

    if (data.ubicacion) {
      doc
        .fillColor(COLORS.textSecondary)
        .font('Helvetica')
        .fontSize(14)
        .text(`📍 ${data.ubicacion}`, 40, y, { width: pageWidth - 80, align: 'center' })
      y = doc.y + 14
    }

    doc
      .fillColor(COLORS.textSecondary)
      .font('Helvetica')
      .fontSize(10)
      .text(`Generado con ${SITE_NAME} · ${SITE_URL}`, 40, pageHeight - 50, {
        width: pageWidth - 80,
        align: 'center',
      })

    doc.end()
  })
}
