import { PDFDocument } from 'pdf-lib'
import type { FlyerData } from '@/lib/for-sale-flyer'
import { SITE_NAME, SITE_URL } from '@/config/site'
import { A4_HEIGHT, A4_WIDTH, PdfCursor, embedStandardFonts, hexToRgb, isWinAnsiEncodable } from '@/lib/pdf/render'

// Antes: `src/app/api/for-sale-flyer/pdf/route.ts` + `create-preference`,
// que cobraban vía Mercado Pago y generaban el PDF server-side.
// GitHub Pages no ejecuta nada server-side, así que esto pasa a correr
// 100% en el navegador (igual que `build-premium-report.ts`) y, al no
// haber forma de cobrar sin backend, el cartel pasa a ser gratis.

const COLORS = {
  bg: '#12151a',
  accent: '#ff6a1a',
  text: '#eef1f4',
  textSecondary: '#9fa8b5',
  border: '#242a32',
}

const FLYER_TEXT_FIELDS: Array<keyof FlyerData> = ['marca', 'modelo', 'anio', 'precio', 'km', 'contacto', 'ubicacion']

/** Mismo chequeo que antes hacía `create-preference/route.ts` antes de
 *  cobrar: sin emoji ni símbolos fuera de WinAnsi, porque las fuentes
 *  estándar de pdf-lib no los pueden dibujar. Ahora se corre antes de
 *  generar el PDF (ya no hay cobro que evitar, pero el PDF igual
 *  reventaría al dibujar un caracter no soportado). */
export async function findUnencodableFlyerField(data: FlyerData): Promise<string | null> {
  for (const field of FLYER_TEXT_FIELDS) {
    const value = data[field]
    if (typeof value !== 'string' || !value) continue
    if (!(await isWinAnsiEncodable(value))) return field
  }
  return null
}

export async function buildFlyerPdf(data: FlyerData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const { regular, bold } = await embedStandardFonts(doc)

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

  cursor.text(data.precio, 40, pageWidth - 80, { font: bold, size: 48, color: accent, align: 'center' })
  cursor.y += 40

  cursor.hLine(60, pageWidth - 60, cursor.y, border, 1)
  cursor.y += 30

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
