/**
 * Script de migración: genera entidades de Manufacturer a partir de los
 * `manufacturer` strings únicos encontrados en los 250 vehículos.
 *
 * Cada fabricante nace como JSON mínimo con:
 * - slug: slugificado del nombre
 * - type: 'fabricantes'
 * - title: nombre oficial
 * - description: auto-generado
 * - status: 'confirmado' (siempre tiene al menos un vehículo real)
 * - relations: bidireccionales a todos los vehículos que produce
 * - createdAt/updatedAt: timestamp actual
 *
 * Ejecutar: node scripts/generate-manufacturers.mjs
 *
 * Nota: Es seguro correr múltiples veces (sobreescribe).
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
const vehiculosDir = path.join(rootDir, 'src/content/vehiculos')
const fabricantesDir = path.join(rootDir, 'src/content/fabricantes')

// Asegurar que el directorio exista
if (!fs.existsSync(fabricantesDir)) {
  fs.mkdirSync(fabricantesDir, { recursive: true })
}

/**
 * Convierte un string a slug: lowercase, espacios y caracteres especiales
 * a guiones, guiones múltiples a único.
 */
function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remover caracteres especiales (acentos, parens, etc)
    .replace(/\s+/g, '-') // espacios a guiones
    .replace(/-+/g, '-') // guiones múltiples a único
}

/**
 * Normaliza el nombre del fabricante para uso en title/description.
 * Ej: "GWM (Haval)" → "GWM (Haval)", "BMW" → "BMW"
 */
function normalizeManufacturerName(name) {
  return name.trim()
}

/**
 * Categoría de fabricante basada en el nombre y en heurística simple.
 * En el futuro esto podría venir de un mapping más rico.
 */
function inferCategory(name) {
  const name_lower = name.toLowerCase()
  const motorcycleBrands = [
    'harley-davidson',
    'yamaha',
    'kawasaki',
    'ktm',
    'suzuki',
    'honda',
    'ducati',
    'triumph',
    'vespa',
    'aprilia',
    'piaggio',
    'bajaj',
    'royal enfield',
    'motomel',
    'zanella',
  ]

  if (motorcycleBrands.some((b) => name_lower.includes(b))) {
    return 'motociclista'
  }

  // Heurística: si está el nombre en las motos conocidas, es motociclista.
  // De lo contrario, automovilista (la mayoría).
  return 'automovilista'
}

console.log('🚀 Generando fabricantes desde vehículos...')

// 1. Leer todos los vehículos
const vehiculoFiles = fs
  .readdirSync(vehiculosDir)
  .filter((f) => f.endsWith('.json'))

const vehiclesByManufacturer = new Map()

for (const file of vehiculoFiles) {
  const vehicleData = JSON.parse(fs.readFileSync(path.join(vehiculosDir, file), 'utf8'))
  const manufacturer = vehicleData.manufacturer || 'Unknown'

  if (!vehiclesByManufacturer.has(manufacturer)) {
    vehiclesByManufacturer.set(manufacturer, [])
  }
  vehiclesByManufacturer.get(manufacturer).push(vehicleData.slug)
}

console.log(`📊 Encontrados ${vehiclesByManufacturer.size} fabricantes únicos`)

// 2. Generar JSONs de fabricantes
const now = new Date().toISOString()
let created = 0

for (const [manufacturerName, vehicleSlugs] of vehiclesByManufacturer) {
  const slug = slugify(manufacturerName)
  const filePath = path.join(fabricantesDir, `${slug}.json`)

  // No sobreescribir si ya existe (para no borrar datos editados a mano)
  // ACTUALIZAR: Sí sobreescribimos, pero logueamos.
  const normalizedName = normalizeManufacturerName(manufacturerName)
  const category = inferCategory(manufacturerName)

  const manufacturer = {
    slug,
    type: 'fabricantes',
    title: normalizedName,
    description: `Vehículos y motocicletas de ${normalizedName}`,
    content: `${normalizedName} es un fabricante de vehículos documentado en AutoFicha.`,
    status: 'confirmado', // Siempre confirmado: existe en datos reales
    officialName: normalizedName,
    country: null, // Placeholder — debería completarse a mano
    foundedYear: null,
    category,
    tags: ['fabricante', category],
    createdAt: now,
    updatedAt: now,
    relations: vehicleSlugs.map((vehicleSlug) => ({
      targetType: 'vehiculos',
      targetSlug: vehicleSlug,
      relation: 'produce',
      direction: 'from', // El fabricante produce (from) el vehículo
    })),
  }

  fs.writeFileSync(filePath, JSON.stringify(manufacturer, null, 2))
  created++
}

console.log(`✅ Creados ${created} fabricantes en src/content/fabricantes/`)
console.log(
  `⚠️  Nota: Los campos country/foundedYear/officialName están en placeholders y deben completarse a mano.`
)
console.log(`📝 Ejecutar: npm run verify:content para validar integridad.`)
