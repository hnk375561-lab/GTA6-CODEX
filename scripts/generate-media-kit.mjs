#!/usr/bin/env node
/**
 * Genera prospeccion/media-kit-sinfrenos.pdf a partir de
 * prospeccion/media-kit-data.json.
 *
 * Por qué un script y no un PDF estático hecho una vez: los números de
 * tráfico van a cambiar semana a semana. Editar el JSON y volver a correr
 * este script (`npm run generate:media-kit`) regenera el PDF completo en
 * segundos, sin tocar diseño ni maquetación a mano cada vez.
 *
 * Uso:
 *   npm run generate:media-kit
 */
import PDFDocument from 'pdfkit'
import { createWriteStream, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataPath = join(__dirname, '..', 'prospeccion', 'media-kit-data.json')
const outputPath = join(__dirname, '..', 'prospeccion', 'media-kit-sinfrenos.pdf')

const data = JSON.parse(readFileSync(dataPath, 'utf-8'))

// Paleta tomada de tailwind.config.js (auto-accent / auto-text / etc.) para
// que el PDF se sienta del mismo producto que el sitio, no un documento
// genérico aparte.
const COLORS = {
  bg: '#12151a',
  accent: '#ff6a1a',
  text: '#eef1f4',
  textSecondary: '#9fa8b5',
  border: '#242a32',
}

const doc = new PDFDocument({ size: 'A4', margin: 50 })
doc.pipe(createWriteStream(outputPath))

// --- Fondo oscuro en toda la página (igual que el sitio) ---
function paintBackground() {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.bg)
}
paintBackground()
doc.on('pageAdded', paintBackground)

let y = 60

function subheading(text) {
  doc
    .fillColor(COLORS.accent)
    .font('Helvetica-Bold')
    .fontSize(13)
    .text(text, 50, y)
  y = doc.y + 6
}

function paragraph(text, color = COLORS.textSecondary) {
  doc
    .fillColor(color)
    .font('Helvetica')
    .fontSize(10.5)
    .text(text, 50, y, { width: 495 })
  y = doc.y + 10
}

function divider() {
  doc.moveTo(50, y).lineTo(545, y).strokeColor(COLORS.border).lineWidth(1).stroke()
  y += 20
}

function ensureSpace(minSpace = 100) {
  if (y > doc.page.height - minSpace) {
    doc.addPage()
    y = 60
  }
}

// --- Portada / header ---
doc
  .fillColor(COLORS.accent)
  .font('Helvetica-Bold')
  .fontSize(28)
  .text('Sin Frenos', 50, y)
y = doc.y + 2
doc
  .fillColor(COLORS.textSecondary)
  .font('Helvetica')
  .fontSize(11)
  .text('Catálogo de fichas técnicas de autos y motos — gta-6-codex.vercel.app', 50, y)
y = doc.y + 4
doc
  .fillColor(COLORS.textSecondary)
  .font('Helvetica')
  .fontSize(9)
  .text(`Media Kit — actualizado al ${data.actualizadoAl}`, 50, y)
y = doc.y + 24
divider()

// --- Qué es Sin Frenos ---
subheading('Qué es Sin Frenos')
paragraph(
  'Catálogo de referencia técnica de autos y motos: fichas verificadas, comparador ' +
    'lado a lado y guías de compra. Pensado para gente que ya decidió comprar y está ' +
    'en la etapa de comparar antes de elegir — no es contenido de entretenimiento, es ' +
    'contenido de decisión de compra.',
)
divider()

// --- Tráfico ---
subheading('Tráfico y contenido')
paragraph(`Fichas técnicas publicadas: ${data.trafico.fichasPublicadas}`)
paragraph(`Artículos / guías publicados: ${data.trafico.articulosPublicados}`)
paragraph(`Visitas mensuales: ${data.trafico.visitasMensuales}`)
paragraph(`Páginas vistas por visita: ${data.trafico.paginasVistasPorVisita}`)
divider()

// --- Audiencia ---
subheading('Audiencia')
paragraph(data.audiencia.resumen)
paragraph(data.audiencia.intencion)
divider()

// --- Opciones de publicidad ---
ensureSpace(220)
subheading('Opciones de publicidad')
for (const opcion of data.opcionesPublicidad) {
  ensureSpace(90)
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(11).text(opcion.nombre, 50, y)
  y = doc.y + 3
  paragraph(opcion.descripcion)
  doc
    .fillColor(COLORS.accent)
    .font('Helvetica-Bold')
    .fontSize(10.5)
    .text(`ARS ${opcion.precioMensualArs} / mes`, 50, y)
  y = doc.y + 14
}
divider()

// --- ROI ---
ensureSpace(120)
subheading('Por qué Sin Frenos vs. un ad genérico')
paragraph(data.roiEjemplo)

// --- Footer / contacto ---
ensureSpace(80)
divider()
doc
  .fillColor(COLORS.textSecondary)
  .font('Helvetica')
  .fontSize(9)
  .text(
    `Contacto: ${data.contacto.nombre} — ${data.contacto.telefono}`,
    50,
    y,
  )

doc.end()

console.log(`✅ Media kit generado: ${outputPath}`)
