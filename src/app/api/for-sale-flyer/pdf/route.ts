import { NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import { getPayment, isMercadoPagoConfigured } from '@/lib/mercadopago'
import { decodeFlyerData, externalReferenceMatchesData } from '@/lib/for-sale-flyer'
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

  const pdfBytes = await buildFlyerPdf(data)

  return new NextResponse(pdfBytes as unknown as BodyInit, {
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
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const { regular, bold } = await embedStandardFonts(doc)

  // Tamaño A4 vertical pensado para imprimir y pegar en el parabrisas.
  const page = doc.addPage([A4_WIDTH, A4_HEIGHT])
  const pageWidth = A4_WIDTH
  const pageHeight = A4_HEIGHT

  const bg = hexToRgb(COLORS.bg)
  const accent = hexToRgb(COLORS.accent)
  const text = hexToRgb(COLORS.text)
  const textSecondary = hexToRgb(COLORS.textSecondary)
  const border = hexToRgb(COLORS.border)
  const dark = hexToRgb('#12151a')

  const cursor = new PdfCursor(doc, page, 0)

  cursor.rect(0, 0, pageWidth, pageHeight, bg)

  // Franja superior de marca.
  cursor.rect(0, 0, pageWidth, 90, accent)
  cursor.y = 28
  cursor.text('SE VENDE', 0, pageWidth, { font: bold, size: 26, color: dark, align: 'center' })

  cursor.y = 140

  cursor.text(data.marca, 40, pageWidth - 80, { font: bold, size: 38, color: text, align: 'center' })
  cursor.y += 4
  cursor.text(data.modelo, 40, pageWidth - 80, { font: bold, size: 30, color: text, align: 'center' })
  cursor.y += 10

  cursor.text(`Año ${data.anio}${data.km ? ` · ${data.km}` : ''}`, 40, pageWidth - 80, {
    font: regular,
    size: 16,
    color: textSecondary,
    align: 'center',
  })
  cursor.y += 30

  // Precio, el elemento más grande de la página — es lo que se lee
  // desde lejos.
  cursor.text(data.precio, 40, pageWidth - 80, { font: bold, size: 48, color: accent, align: 'center' })
  cursor.y += 40

  cursor.hLine(60, pageWidth - 60, cursor.y, border, 1)
  cursor.y += 30

  // Sin emoji: las fuentes estándar de pdf-lib usan WinAnsi, que no
  // los soporta (tirarían error al dibujar).
  cursor.text(`Tel: ${data.contacto}`, 40, pageWidth - 80, { font: bold, size: 20, color: text, align: 'center' })
  cursor.y += 14

  if (data.ubicacion) {
    cursor.text(`Zona: ${data.ubicacion}`, 40, pageWidth - 80, {
      font: regular,
      size: 14,
      color: textSecondary,
      align: 'center',
    })
    cursor.y += 14
  }

  cursor.y = pageHeight - 50
  cursor.text(`Generado con ${SITE_NAME} · ${SITE_URL}`, 40, pageWidth - 80, {
    font: regular,
    size: 10,
    color: textSecondary,
    align: 'center',
  })

  return doc.save()
}
