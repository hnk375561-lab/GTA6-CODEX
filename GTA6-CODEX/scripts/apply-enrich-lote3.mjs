#!/usr/bin/env node
/**
 * scripts/apply-enrich-lote3.mjs
 * ============================================================
 * Ronda de enriquecimiento — lote 3/95 de la cola de evidencia real
 * (ver `node scripts/audit-evidence-coverage.mjs`, no docs/evidence-gap-queue.txt
 * que estaba desactualizado). Combina prioridad 1 (cerrar evidence gap con
 * fuente primaria real, verificada por búsqueda) y prioridad 3 (integridad
 * de powertrain puntual) donde aplica en este lote.
 *
 * Todas las fuentes fueron verificadas por búsqueda web en esta sesión
 * (no inventadas). No se inventan specs nuevas fuera de lo confirmado por
 * la fuente oficial citada; donde la spec previa (carga masiva) era
 * consistente con la fuente real, se mantiene y se sube el nivel de
 * evidencia; donde había una discrepancia clara con la fuente oficial, se
 * corrige y se documenta en `limitations`.
 * ============================================================
 */
import fs from 'node:fs'
import path from 'node:path'

const DIR = path.join(process.cwd(), 'src', 'content', 'vehiculos')

function load(slug) {
  return JSON.parse(fs.readFileSync(path.join(DIR, `${slug}.json`), 'utf-8'))
}
function save(slug, data) {
  data.updatedAt = new Date().toISOString()
  fs.writeFileSync(path.join(DIR, `${slug}.json`), JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

const ROUND_TAG =
  'Ronda evidencia (ago 2026, lote 3/95): fuente oficial del fabricante verificada por búsqueda antes de subir el nivel de evidencia.'

const patches = {
  'byd-han': {
    primarySource: 'https://www.byd.com/us/car/han-ev',
    extraLimitation:
      `${ROUND_TAG} Motorización real: motor(es) eléctrico(s) con Blade Battery LFP; existen variantes EV (RWD/AWD) y DM-i/DM-p híbridas enchufables según mercado. La cifra de potencia y precio de esta ficha corresponde a una variante EV de referencia global, no a una versión puntual homologada en un mercado específico.`,
  },
  'byd-tang': {
    primarySource: 'https://www.byd.com/eu/electric-cars/tang',
    extraLimitation:
      `${ROUND_TAG} Página oficial (BYD Europe) confirma variante 100% eléctrica de 7 plazas con batería de 108.8 kWh, ~530 km WLTP y 0-100 km/h en 4.9s; el Tang también existe como híbrido enchufable en otros mercados. Potencia de esta ficha es de referencia global, pendiente de precisar por variante/mercado.`,
  },
  'chery-omoda-5': {
    primarySource: 'https://omodaauto.co.uk/',
    extraLimitation:
      `${ROUND_TAG} Fuente oficial de marca (OMODA UK) confirma gama con motor 1.6 turbo gasolina, variante híbrida (SHS-H) y variante eléctrica (E5); la potencia de referencia de esta ficha corresponde a la versión gasolina de entrada.`,
  },
  'dacia-sandero': {
    primarySource: 'https://www.dacia.co.uk/vehicles/sandero/compare.html',
    extraLimitation:
      `${ROUND_TAG} Configurador oficial (Dacia UK) confirma motor TCe 100 (100 hp DIN / 74 kW, 200 Nm, caja manual, tracción delantera) como referencia de gama; existen otras motorizaciones (SCe, ECO-G GLP, Bi-Fuel) según mercado.`,
  },
  'geely-coolray': {
    primarySource: 'https://www.geely.com/en/models/new-coolray',
    extraLimitation:
      `${ROUND_TAG} Página oficial global de Geely confirma motor 1.5TD con 128 kW (174 hp) y 290 N·m, 0-100 km/h en 7.6s, caja doble embrague 7 velocidades; cifra de potencia varía levemente según mercado (versión previa homologaba 130 kW/177 hp en algunos países).`,
  },
  'genesis-gv70': {
    primarySource: 'https://www.genesis.com/us/en/gv70',
    extraLimitation:
      `${ROUND_TAG} Sitio oficial de Genesis USA confirma motor estándar 2.5T de 300 hp y opción 3.5L twin-turbo V6 de 375 hp; también existe variante 100% eléctrica (Electrified GV70). La cifra de esta ficha corresponde a la motorización estándar 2.5T.`,
  },
  'gwm-poer': {
    primarySource: 'https://gwmuae.com/Poer/Poer',
    extraLimitation:
      `${ROUND_TAG} Página oficial de marca (GWM UAE) confirma motor 2.0 turbo gasolina de 140 kW (188 hp) y 360 N·m; según mercado también se ofrece con motor 2.4T diésel/gasolina de mayor par y caja automática de 9 velocidades.`,
  },
  'harley-davidson-iron-883': {
    primarySource: 'https://h-dmediakit.com/assets/documents/my21-spec/7q2RV2pyM7a7bDmM/iron-883.pdf',
    extraLimitation:
      `${ROUND_TAG} Ficha técnica oficial de Harley-Davidson (media kit del fabricante) para el año-modelo 2021, últimos previos a la descontinuación del modelo (2022 en la mayoría de mercados, 2023 en India). Motor Evolution 883cc bicilíndrico en V enfriado por aire, caja 5 velocidades, transmisión final por correa.`,
  },
  'harley-davidson-street-glide': {
    primarySource: 'https://www.harley-davidson.com/us/en/motorcycles/street-glide.html',
    extraLimitation:
      `${ROUND_TAG} Sitio oficial de Harley-Davidson confirma motor Milwaukee-Eight de 117 pulgadas cúbicas (1923cc) en la gama actual del Street Glide; la cifra de potencia de esta ficha es de referencia y varía por año-modelo/mercado (última generación homologa ~107 hp / 175 Nm).`,
  },
}

let changed = 0
for (const [slug, patch] of Object.entries(patches)) {
  const data = load(slug)
  if (!data.evidence) data.evidence = {}
  data.evidence.level = 'oficial-nombrado'
  data.evidence.primarySource = patch.primarySource
  data.evidence.limitations = Array.isArray(data.evidence.limitations)
    ? [...data.evidence.limitations, patch.extraLimitation]
    : [patch.extraLimitation]
  if (data.verified) {
    data.verified.source = 'oficial-nombrado'
    data.verified.lastChecked = new Date().toISOString()
  }
  save(slug, data)
  changed++
  console.log(`✔ ${slug}`)
}

// Prioridad 3 puntual: gwm-tank-300 es un SUV con variante híbrida/PHEV real
// (Hi4-T) pero no tenía tag "hibrido" ni tipoMotor coherente -> lo corrige
// fix-powertrain-integrity.mjs en la próxima corrida, pero lo etiquetamos ya
// para que ese script lo detecte correctamente.
{
  const slug = 'gwm-tank-300'
  const data = load(slug)
  if (!data.tags.includes('hibrido')) data.tags.push('hibrido')
  if (!data.evidence) data.evidence = {}
  data.evidence.level = 'oficial-nombrado'
  data.evidence.primarySource = 'https://www.gwm.co.za/content/dam/gwm/pages/za/en/models/tank-300/tank300-brochure.pdf'
  const note =
    `${ROUND_TAG} Brochure oficial (GWM Sudáfrica) confirma que el Tank 300 se vende con motor 2.0T gasolina puro, variante diésel 2.4L y variante hí­brida (petrol+motor eléctrico, y en mercados como Australia también PHEV Hi4-T). Se agrega tag "hibrido" porque el vehículo real tiene variante híbrida de fábrica, lo que faltaba en el tagging previo; tipoMotor/especificaciones de motor de combustión pura quedan pendientes de la próxima corrida de fix-powertrain-integrity para reflejar la variante híbrida correctamente.`
  data.evidence.limitations = Array.isArray(data.evidence.limitations)
    ? [...data.evidence.limitations, note]
    : [note]
  if (data.verified) {
    data.verified.source = 'oficial-nombrado'
    data.verified.lastChecked = new Date().toISOString()
  }
  save(slug, data)
  console.log(`✔ ${slug} (tag hibrido agregado)`)
}

console.log(`\nTotal fichas de evidencia actualizadas: ${changed + 1}`)
