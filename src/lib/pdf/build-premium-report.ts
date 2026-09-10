import { PDFDocument } from 'pdf-lib'
import { EntityType, type Vehicle } from '@/types'
import { getEntitiesByType } from '@/lib/entities'
import { isValidSlugSelection, normalizeSlugs } from '@/lib/premium-report'
import { SITE_NAME, SITE_URL } from '@/config/site'
import { A4_HEIGHT, A4_WIDTH, PdfCursor, embedStandardFonts, hexToRgb } from '@/lib/pdf/render'

// Antes: `src/app/api/premium-report/pdf/route.ts`, un Route Handler que
// verificaba el pago contra Mercado Pago y generaba el PDF server-side.
// GitHub Pages no ejecuta nada server-side, así que la única forma de
// que esta feature siga viva es moverla 100% al navegador — `pdf-lib` no
// depende de Node ni del filesystem, corre igual en un `'use client'`.
//
// El cobro con Mercado Pago se cae en esta migración (necesita un
// `MERCADOPAGO_ACCESS_TOKEN` server-side que no existe en hosting
// estático): el reporte pasa a ser gratis. Ver `PremiumReportButton.tsx`.

const COLORS = {
  bg: '#12151a',
  accent: '#ff6a1a',
  text: '#eef1f4',
  textSecondary: '#9fa8b5',
  border: '#242a32',
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

/**
 * Arma el PDF comparativo para 2 a 5 vehículos (mismos slugs que antes
 * validaba `/api/premium-report/create-preference`). Tira un Error con
 * mensaje legible si la selección no es válida o algún vehículo no existe
 * — `PremiumReportButton.tsx` lo muestra tal cual.
 */
export async function buildPremiumReportPdf(rawSlugs: string[]): Promise<Uint8Array> {
  const slugs = normalizeSlugs(rawSlugs)
  if (!isValidSlugSelection(slugs)) {
    throw new Error('Seleccioná entre 2 y 5 vehículos para generar el reporte.')
  }

  const allVehicles = (await getEntitiesByType(EntityType.VEHICLE)) as Vehicle[]
  const vehicles = slugs
    .map((slug) => allVehicles.find((v) => v.slug === slug))
    .filter((v): v is Vehicle => Boolean(v))

  if (vehicles.length !== slugs.length) {
    throw new Error('Uno o más vehículos seleccionados no existen.')
  }

  const doc = await PDFDocument.create()
  const { regular, bold } = await embedStandardFonts(doc)

  const bg = hexToRgb(COLORS.bg)
  const accent = hexToRgb(COLORS.accent)
  const text = hexToRgb(COLORS.text)
  const textSecondary = hexToRgb(COLORS.textSecondary)
  const border = hexToRgb(COLORS.border)

  const CONTENT_WIDTH = 495

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

    cursor.text(label, 50, 160, { font: bold, size: 9.5, color: textSecondary })
    const labelEndY = cursor.y

    cursor.y = startY
    cursor.text(value, 220, 325, { font: regular, size: 9.5, color: text })
    const valueEndY = cursor.y

    cursor.y = Math.max(labelEndY, valueEndY) + 6
  }

  function divider() {
    cursor.hLine(50, 545, cursor.y, border, 1)
    cursor.y += 16
  }

  heading(SITE_NAME, 22)
  paragraph('Reporte comparativo', text, 13)
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
