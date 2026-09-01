/**
 * Script de enriquecimiento: agrega country/foundedYear a fabricantes
 * usando datos públicos verificados.
 *
 * Ejecutar: node scripts/enrich-manufacturers.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
const fabricantesDir = path.join(rootDir, 'src/content/fabricantes')

// Datos verificados de fabricantes principales
// Fuentes: Wikipedia, sitios oficiales, bases de datos automotrices
const MANUFACTURER_DATA = {
  toyota: {
    country: 'Japón',
    foundedYear: 1937,
    officialName: 'Toyota Motor Corporation',
  },
  honda: {
    country: 'Japón',
    foundedYear: 1946,
    officialName: 'Honda Motor Co., Ltd.',
  },
  'mercedes-benz': {
    country: 'Alemania',
    foundedYear: 1926,
    officialName: 'Mercedes-Benz AG',
  },
  bmw: {
    country: 'Alemania',
    foundedYear: 1916,
    officialName: 'Bayerische Motoren Werke AG',
  },
  volkswagen: {
    country: 'Alemania',
    foundedYear: 1937,
    officialName: 'Volkswagen AG',
  },
  audi: {
    country: 'Alemania',
    foundedYear: 1910,
    officialName: 'Audi AG',
  },
  porsche: {
    country: 'Alemania',
    foundedYear: 1948,
    officialName: 'Porsche AG',
  },
  ford: {
    country: 'Estados Unidos',
    foundedYear: 1903,
    officialName: 'Ford Motor Company',
  },
  'general-motors': {
    country: 'Estados Unidos',
    foundedYear: 1908,
    officialName: 'General Motors Company',
  },
  tesla: {
    country: 'Estados Unidos',
    foundedYear: 2003,
    officialName: 'Tesla, Inc.',
  },
  hyundai: {
    country: 'Corea del Sur',
    foundedYear: 1967,
    officialName: 'Hyundai Motor Company',
  },
  kia: {
    country: 'Corea del Sur',
    foundedYear: 1944,
    officialName: 'Kia Corporation',
  },
  nissan: {
    country: 'Japón',
    foundedYear: 1933,
    officialName: 'Nissan Motor Co., Ltd.',
  },
  mazda: {
    country: 'Japón',
    foundedYear: 1920,
    officialName: 'Mazda Motor Corporation',
  },
  subaru: {
    country: 'Japón',
    foundedYear: 1953,
    officialName: 'Subaru Corporation',
  },
  suzuki: {
    country: 'Japón',
    foundedYear: 1909,
    officialName: 'Suzuki Motor Corporation',
  },
  mitsubishi: {
    country: 'Japón',
    foundedYear: 1970,
    officialName: 'Mitsubishi Motors Corporation',
  },
  lexus: {
    country: 'Japón',
    foundedYear: 1989,
    officialName: 'Lexus (Toyota Luxury Division)',
  },
  volvo: {
    country: 'Suecia',
    foundedYear: 1927,
    officialName: 'Volvo Cars AB',
  },
  lamborghini: {
    country: 'Italia',
    foundedYear: 1963,
    officialName: 'Automobili Lamborghini S.p.A.',
  },
  ferrari: {
    country: 'Italia',
    foundedYear: 1947,
    officialName: 'Ferrari S.p.A.',
  },
  maserati: {
    country: 'Italia',
    foundedYear: 1914,
    officialName: 'Maserati S.p.A.',
  },
  fiat: {
    country: 'Italia',
    foundedYear: 1899,
    officialName: 'Fiat S.p.A.',
  },
  alfa: {
    country: 'Italia',
    foundedYear: 1910,
    officialName: 'Alfa Romeo S.p.A.',
  },
  'alfa-romeo': {
    country: 'Italia',
    foundedYear: 1910,
    officialName: 'Alfa Romeo S.p.A.',
  },
  renault: {
    country: 'Francia',
    foundedYear: 1898,
    officialName: 'Renault S.A.S.',
  },
  peugeot: {
    country: 'Francia',
    foundedYear: 1810,
    officialName: 'Peugeot S.A.',
  },
  citroen: {
    country: 'Francia',
    foundedYear: 1919,
    officialName: 'Citroën S.A.S.',
  },
  'jeep': {
    country: 'Estados Unidos',
    foundedYear: 1941,
    officialName: 'Jeep (Stellantis)',
  },
  ram: {
    country: 'Estados Unidos',
    foundedYear: 2009,
    officialName: 'RAM Trucks (Stellantis)',
  },
  chevrolet: {
    country: 'Estados Unidos',
    foundedYear: 1911,
    officialName: 'Chevrolet (General Motors)',
  },
  'harley-davidson': {
    country: 'Estados Unidos',
    foundedYear: 1903,
    officialName: 'Harley-Davidson, Inc.',
  },
  yamaha: {
    country: 'Japón',
    foundedYear: 1955,
    officialName: 'Yamaha Motor Co., Ltd.',
  },
  kawasaki: {
    country: 'Japón',
    foundedYear: 1896,
    officialName: 'Kawasaki Heavy Industries Motorcycle',
  },
  ktm: {
    country: 'Austria',
    foundedYear: 1992,
    officialName: 'KTM AG',
  },
  ducati: {
    country: 'Italia',
    foundedYear: 1926,
    officialName: 'Ducati Motor Holding S.p.A.',
  },
  triumph: {
    country: 'Reino Unido',
    foundedYear: 1902,
    officialName: 'Triumph Motorcycles Ltd.',
  },
  vespa: {
    country: 'Italia',
    foundedYear: 1946,
    officialName: 'Piaggio Vespa',
  },
  byd: {
    country: 'China',
    foundedYear: 1995,
    officialName: 'BYD Co., Ltd.',
  },
  geely: {
    country: 'China',
    foundedYear: 1997,
    officialName: 'Geely Automobile Holdings Limited',
  },
  gwm: {
    country: 'China',
    foundedYear: 1984,
    officialName: 'Great Wall Motor Company Limited',
  },
  haval: {
    country: 'China',
    foundedYear: 2005,
    officialName: 'Haval (Great Wall Motor)',
  },
  nio: {
    country: 'China',
    foundedYear: 2014,
    officialName: 'NIO Inc.',
  },
  mclaren: {
    country: 'Reino Unido',
    foundedYear: 1985,
    officialName: 'McLaren Automotive',
  },
  'rolls-royce': {
    country: 'Reino Unido',
    foundedYear: 1906,
    officialName: 'Rolls-Royce Motor Cars',
  },
  bentley: {
    country: 'Reino Unido',
    foundedYear: 1919,
    officialName: 'Bentley Motors Limited',
  },
  'land-rover': {
    country: 'Reino Unido',
    foundedYear: 1948,
    officialName: 'Land Rover (JLR)',
  },
  jaguar: {
    country: 'Reino Unido',
    foundedYear: 1935,
    officialName: 'Jaguar Cars Limited',
  },
  'aston-martin': {
    country: 'Reino Unido',
    foundedYear: 1913,
    officialName: 'Aston Martin Lagonda Limited',
  },
  mini: {
    country: 'Reino Unido',
    foundedYear: 1959,
    officialName: 'Mini (BMW Group)',
  },
  dacia: {
    country: 'Rumania',
    foundedYear: 1966,
    officialName: 'Dacia S.A.',
  },
  skoda: {
    country: 'República Checa',
    foundedYear: 1894,
    officialName: 'Skoda Auto a.s.',
  },
  seat: {
    country: 'España',
    foundedYear: 1950,
    officialName: 'SEAT S.A.',
  },
  opel: {
    country: 'Alemania',
    foundedYear: 1862,
    officialName: 'Opel Automobile GmbH',
  },
  tata: {
    country: 'India',
    foundedYear: 1997,
    officialName: 'Tata Motors Limited',
  },
  mahindra: {
    country: 'India',
    foundedYear: 1945,
    officialName: 'Mahindra & Mahindra Limited',
  },
  proton: {
    country: 'Malasia',
    foundedYear: 1983,
    officialName: 'Proton Holdings Berhad',
  },
  perodua: {
    country: 'Malasia',
    foundedYear: 1993,
    officialName: 'Perodua (Daimler-Benz/Malaysia)',
  },
  isuzu: {
    country: 'Japón',
    foundedYear: 1937,
    officialName: 'Isuzu Motors Limited',
  },
  'royal-enfield': {
    country: 'India',
    foundedYear: 1901,
    officialName: 'Royal Enfield',
  },
  bajaj: {
    country: 'India',
    foundedYear: 1945,
    officialName: 'Bajaj Auto Limited',
  },
  cupra: {
    country: 'España',
    foundedYear: 2018,
    officialName: 'CUPRA (SEAT Performance)',
  },
  smart: {
    country: 'Alemania',
    foundedYear: 1994,
    officialName: 'Smart (Daimler-Benz)',
  },
  genesis: {
    country: 'Corea del Sur',
    foundedYear: 2015,
    officialName: 'Genesis (Hyundai Luxury)',
  },
  // --- FASE 8: 13 fabricantes incompletos (ver AUDITORIA-FASE-8-CONTENIDO.md) ---
  // Fuentes: Wikipedia ES/EN y sitios/comunicados oficiales de cada marca (consultado 2026-08-30)
  abarth: {
    country: 'Italia',
    foundedYear: 1949,
    officialName: 'Abarth & C. S.p.A.',
  },
  aprilia: {
    country: 'Italia',
    foundedYear: 1945,
    officialName: 'Aprilia S.p.A. (Piaggio Group)',
  },
  baic: {
    country: 'China',
    foundedYear: 1958,
    officialName: 'Beijing Automotive Group Co., Ltd. (BAIC)',
  },
  changan: {
    country: 'China',
    foundedYear: 1862,
    officialName: 'China Changan Automobile Group Co., Ltd.',
  },
  chery: {
    country: 'China',
    foundedYear: 1997,
    officialName: 'Chery Automobile Co., Ltd.',
  },
  'gwm-haval': {
    country: 'China',
    foundedYear: 1984,
    officialName: 'Great Wall Motor Company Limited (Haval)',
  },
  jac: {
    country: 'China',
    foundedYear: 1964,
    officialName: 'Anhui Jianghuai Automobile Group Corp., Ltd. (JAC Motors)',
  },
  mg: {
    country: 'Reino Unido',
    foundedYear: 1924,
    officialName: 'MG Motor (SAIC Motor)',
  },
  motomel: {
    country: 'Argentina',
    foundedYear: 1992,
    officialName: 'MotoMel (La Emilia S.A.)',
  },
  piaggio: {
    country: 'Italia',
    foundedYear: 1884,
    officialName: 'Piaggio & C. S.p.A.',
  },
  wuling: {
    country: 'China',
    foundedYear: 2002,
    officialName: 'SAIC-GM-Wuling Automobile Co., Ltd.',
  },
  xiaomi: {
    country: 'China',
    foundedYear: 2010,
    officialName: 'Xiaomi Corporation',
  },
  zanella: {
    country: 'Argentina',
    foundedYear: 1948,
    officialName: 'Zanella Hnos. y Cía.',
  },
}

console.log('🚀 Enriqueciendo fabricantes con datos reales...')

let updated = 0
let skipped = 0

for (const [slug, data] of Object.entries(MANUFACTURER_DATA)) {
  const filePath = path.join(fabricantesDir, `${slug}.json`)

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  No encontrado: ${slug}`)
    skipped++
    continue
  }

  try {
    const manufacturer = JSON.parse(fs.readFileSync(filePath, 'utf8'))

    // Solo actualizar si no están completos (preservar ediciones manuales)
    if (!manufacturer.country || manufacturer.country === null) {
      manufacturer.country = data.country
    }
    if (!manufacturer.foundedYear || manufacturer.foundedYear === null) {
      manufacturer.foundedYear = data.foundedYear
    }
    if (!manufacturer.officialName || manufacturer.officialName === slug) {
      manufacturer.officialName = data.officialName
    }

    // Actualizar timestamp
    manufacturer.updatedAt = new Date().toISOString()

    fs.writeFileSync(filePath, JSON.stringify(manufacturer, null, 2))
    updated++
  } catch (err) {
    console.error(`❌ Error procesando ${slug}:`, err.message)
    skipped++
  }
}

console.log(`✅ Enriquecidos ${updated} fabricantes`)
console.log(`⏭️  Salteados ${skipped}`)
console.log(`📝 Ejecutar: npm run verify:content para validar.`)
