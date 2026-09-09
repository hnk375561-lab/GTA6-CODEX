import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib'

/**
 * Reemplazo de `pdfkit` para runtimes sin filesystem real (Cloudflare
 * Workers / workerd). `pdfkit` carga sus fuentes estándar (Helvetica,
 * Helvetica-Bold) leyendo archivos `.afm` de su propia carpeta con
 * `fs.readFileSync` EN TIEMPO DE EJECUCIÓN — eso revienta con ENOENT en
 * workerd, que no tiene acceso a filesystem ni siquiera con
 * `nodejs_compat` (ver release notes de @opennextjs/cloudflare).
 *
 * `pdf-lib` no tiene ese problema: sus 14 fuentes estándar (incluida
 * Helvetica) están embebidas como métricas en el propio código JS, sin
 * ningún acceso a disco.
 *
 * Estas fuentes estándar usan encoding WinAnsi, que NO incluye emoji.
 * Si necesitás un ícono, usá texto plano (ej. "Tel:" en vez de "📞").
 */

export const A4_WIDTH = 595.28
export const A4_HEIGHT = 841.89

export function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16) / 255
  const g = parseInt(clean.substring(2, 4), 16) / 255
  const b = parseInt(clean.substring(4, 6), 16) / 255
  return rgb(r, g, b)
}

/** Parte un texto en líneas que entran en `maxWidth` para una fuente y tamaño dados. */
export function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']

  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word
    if (current && font.widthOfTextAtSize(attempt, fontSize) > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = attempt
    }
  }
  if (current) lines.push(current)
  return lines
}

export type PdfColor = ReturnType<typeof rgb>

export interface TextOptions {
  font: PDFFont
  size: number
  color: PdfColor
  align?: 'left' | 'center'
  lineHeightMultiplier?: number
}

/**
 * Wrapper con estado sobre una página de pdf-lib que imita el modelo
 * mental de pdfkit: coordenadas Y medidas desde ARRIBA de la página
 * (pdf-lib mide desde abajo de forma nativa), con wrap automático y
 * salto de página cuando no entra más contenido.
 */
export class PdfCursor {
  doc: PDFDocument
  page: PDFPage
  pageWidth: number
  pageHeight: number
  y: number
  private onNewPage?: (page: PDFPage) => void

  constructor(doc: PDFDocument, page: PDFPage, startY: number, onNewPage?: (page: PDFPage) => void) {
    this.doc = doc
    this.page = page
    this.pageWidth = page.getWidth()
    this.pageHeight = page.getHeight()
    this.y = startY
    this.onNewPage = onNewPage
  }

  /** Asegura que queden al menos `minSpace` puntos antes del borde inferior; si no, agrega página. */
  ensureSpace(minSpace: number, restartY = 60) {
    if (this.y > this.pageHeight - minSpace) {
      this.page = this.doc.addPage([this.pageWidth, this.pageHeight])
      this.y = restartY
      this.onNewPage?.(this.page)
    }
  }

  /** Dibuja una o más líneas de texto (con wrap) empezando en `x` con un ancho de caja `boxWidth`. */
  text(value: string, x: number, boxWidth: number, opts: TextOptions): number {
    const { font, size, color, align = 'left', lineHeightMultiplier = 1.25 } = opts
    const lines = wrapText(value, font, size, boxWidth)
    const lineHeight = size * lineHeightMultiplier

    for (const line of lines) {
      const lineWidth = font.widthOfTextAtSize(line, size)
      const drawX = align === 'center' ? x + Math.max(0, (boxWidth - lineWidth) / 2) : x
      const baselineY = this.pageHeight - this.y - size * 0.82
      this.page.drawText(line, { x: drawX, y: baselineY, size, font, color })
      this.y += lineHeight
    }

    return this.y
  }

  rect(x: number, y: number, width: number, height: number, color: PdfColor) {
    this.page.drawRectangle({ x, y: this.pageHeight - y - height, width, height, color })
  }

  hLine(x1: number, x2: number, yFromTop: number, color: PdfColor, thickness = 1) {
    const y = this.pageHeight - yFromTop
    this.page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color })
  }
}

export async function embedStandardFonts(doc: PDFDocument) {
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  return { regular, bold }
}

// Font Helvetica reutilizada solo para VALIDAR texto libre antes de
// dibujarlo (nunca para render final — cada PDF sigue embebiendo la
// suya propia vía `embedStandardFonts`). Se cachea a nivel módulo:
// `PDFDocument.create()` + `embedFont` no tocan filesystem ni red, así
// que es seguro reusar la instancia entre requests de la misma isolate.
let validationFontPromise: Promise<PDFFont> | null = null

async function getValidationFont(): Promise<PDFFont> {
  if (!validationFontPromise) {
    validationFontPromise = PDFDocument.create().then((doc) => doc.embedFont(StandardFonts.Helvetica))
  }
  return validationFontPromise
}

/**
 * true si `text` se puede dibujar con las fuentes estándar de pdf-lib
 * (encoding WinAnsi/cp1252 — cubre español con tildes y ñ, pero NO
 * emoji ni la mayoría de símbolos fuera de Latin-1).
 *
 * Por qué existe: sin este chequeo, texto libre que llega de un
 * formulario (marca/modelo/contacto de `for-sale-flyer`, por ejemplo)
 * podía pasar la validación de "no vacío", cobrarse vía Mercado Pago, y
 * recién reventar con un error de encoding al generar el PDF en
 * `/api/.../pdf` — es decir, DESPUÉS de que la persona ya pagó. Usar
 * esto en la validación de `create-preference` (antes de cobrar) mueve
 * el rechazo a un 400 barato, sin plata de por medio.
 */
export async function isWinAnsiEncodable(text: string): Promise<boolean> {
  if (!text) return true
  const font = await getValidationFont()
  try {
    font.encodeText(text)
    return true
  } catch {
    return false
  }
}
