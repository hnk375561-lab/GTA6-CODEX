#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Motor families database - agrupaciones por motor/plataforma compartida
const motorFamilies = {
  'Toyota M20A': {
    models: ['toyota-rav4', 'toyota-camry', 'toyota-corolla-cross', 'toyota-corolla-2024'],
    specs: {
      cilindrada: '1987 cc',
      tipoMotor: 'Nafta 2.0L DOHC',
      potenciaKW: '131 kW',
      power: '178 CV',
      torque: '210 Nm',
      tiempoRecorrido: '0-100 km/h en 8.5s'
    }
  },
  'VW MQB A0 EA211': {
    models: ['volkswagen-polo', 'volkswagen-virtus', 'volkswagen-nivus', 'volkswagen-t-cross', 'volkswagen-taos'],
    specs: {
      cilindrada: '998 cc',
      tipoMotor: 'Nafta 1.0L TSI',
      potenciaKW: '81 kW',
      power: '110 CV',
      torque: '200 Nm',
      ratio_compresion: '10.5:1'
    }
  },
  'Chevrolet LDE/LLE': {
    models: ['chevrolet-onix', 'chevrolet-onix-plus', 'chevrolet-montana', 'chevrolet-tracker'],
    specs: {
      cilindrada: '1197 cc',
      tipoMotor: 'Nafta 1.2L DOHC',
      potenciaKW: '59 kW',
      power: '80 CV',
      PCD: '5x100'
    }
  },
  'Renault HR14': {
    models: ['renault-sandero', 'renault-logan', 'renault-kwid'],
    specs: {
      cilindrada: '1427 cc',
      tipoMotor: 'Nafta 1.4L DOHC',
      potenciaKW: '74 kW',
      power: '100 CV'
    }
  },
  'Fiat FireFly': {
    models: ['fiat-argo', 'fiat-mobi', 'fiat-cronos'],
    specs: {
      cilindrada: '1193 cc',
      tipoMotor: 'Nafta 1.2L',
      potenciaKW: '59 kW',
      power: '80 CV'
    }
  }
};

function makeRequest(url, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const req = client.get(url, { timeout }, (res) => {
      clearTimeout(timeoutId);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    
    req.on('error', err => {
      clearTimeout(timeoutId);
      reject(err);
    });
    
    req.on('timeout', () => {
      clearTimeout(timeoutId);
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Buscar PDF de ficha técnica
async function searchTechnicalSheetPDF(brand, model, country = 'AR') {
  const queries = [
    `${brand} ${model} ficha técnica PDF ${country}`,
    `${brand} ${model} specifications PDF`,
    `site:${brand.toLowerCase()}.com ${model} ficha técnica filetype:pdf`
  ];
  
  for (const query of queries) {
    try {
      // Buscar en DuckDuckGo (sin límite de requests)
      const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query + ' filetype:pdf')}&format=json`;
      const { data } = await makeRequest(searchUrl, 5000);
      // DuckDuckGo API limitado pero puedes intentar otros métodos
      return null; // Placeholder para expandir
    } catch (e) {
      // Continuar con siguiente query
    }
  }
  
  return null;
}

// Buscar en Motor1.com
async function fetchMotor1Specs(brand, model) {
  try {
    const url = `https://www.motor1.com/${brand.toLowerCase()}/${model.toLowerCase()}/`;
    const { data } = await makeRequest(url, 6000);
    
    // Parser básico de HTML
    const specs = {};
    
    // Buscar engine specs
    const engineMatch = data.match(/(?:Engine|Motor)[\s\S]{0,200}?(\d+)\s*(?:cc|L)/i);
    if (engineMatch) specs.cilindrada = engineMatch[1];
    
    const powerMatch = data.match(/(?:Power|Potencia)[\s\S]{0,100}?(\d+)\s*(?:PS|hp|CV|kW)/i);
    if (powerMatch) specs.potencia = powerMatch[1];
    
    return Object.keys(specs).length > 0 ? specs : null;
  } catch (e) {
    return null;
  }
}

// Obtener specs de familia de motores
function getMotorFamilySpecs(vehicleSlug) {
  for (const [familyName, family] of Object.entries(motorFamilies)) {
    if (family.models.some(m => vehicleSlug.includes(m.split('-').pop()))) {
      return { familyName, specs: family.specs };
    }
  }
  return null;
}

// Enriquecer vehículo
async function enrichVehicle(vehiclePath, vehicleData) {
  const slug = vehicleData.slug;
  const title = vehicleData.title;
  
  // Verificar si necesita enriquecimiento
  const needsEnrichment = 
    !vehicleData.especificacionesMotor || 
    Object.keys(vehicleData.especificacionesMotor || {}).length < 3;
  
  if (!needsEnrichment) {
    return { status: 'skip', reason: 'Ya completo' };
  }
  
  // Paso 1: Intentar obtener de familia de motores
  const motorFamily = getMotorFamilySpecs(slug);
  let newSpecs = {};
  let source = 'unknown';
  
  if (motorFamily) {
    console.log(`  ${colors.cyan}↳ Familia motor encontrada: ${motorFamily.familyName}${colors.reset}`);
    newSpecs = motorFamily.specs;
    source = `motor-family:${motorFamily.familyName}`;
  }
  
  // Paso 2: Intentar Motor1
  if (Object.keys(newSpecs).length < 3) {
    try {
      const motor1Specs = await fetchMotor1Specs(vehicleData.manufacturer, vehicleData.title);
      if (motor1Specs) {
        newSpecs = { ...newSpecs, ...motor1Specs };
        source = 'motor1.com';
      }
    } catch (e) {
      // Continuar
    }
  }
  
  // Paso 3: Actualizar JSON
  if (Object.keys(newSpecs).length > 0) {
    if (!vehicleData.especificacionesMotor) {
      vehicleData.especificacionesMotor = {};
    }
    
    Object.assign(vehicleData.especificacionesMotor, newSpecs);
    vehicleData.updatedAt = new Date().toISOString();
    
    if (vehicleData.evidence) {
      vehicleData.evidence.lastEnrichment = {
        date: new Date().toISOString(),
        source: source,
        fieldsAdded: Object.keys(newSpecs).length
      };
    }
    
    return { status: 'enriched', specs: newSpecs, source };
  }
  
  return { status: 'no-data-found' };
}

// Main
async function main() {
  const vehiculosDir = './src/content/vehiculos';
  const files = fs.readdirSync(vehiculosDir)
    .filter(f => f.endsWith('.json'))
    .sort();
  
  console.log(`\n${colors.magenta}🚗 ENRIQUECEDOR INTELIGENTE - AGRUPACIÓN POR MOTOR${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
  console.log(`📁 ${files.length} vehículos encontrados\n`);
  
  // Agrupar por familia
  const byFamily = {};
  const motorFamilyNames = Object.keys(motorFamilies);
  
  let processed = 0;
  let enriched = 0;
  let skipped = 0;
  const results = [];
  
  for (const file of files) {
    const vehiclePath = path.join(vehiculosDir, file);
    const vehicleData = JSON.parse(fs.readFileSync(vehiclePath));
    
    const result = await enrichVehicle(vehiclePath, vehicleData);
    
    if (result.status === 'enriched') {
      fs.writeFileSync(vehiclePath, JSON.stringify(vehicleData, null, 2));
      enriched++;
      console.log(`${colors.green}✓${colors.reset} ${vehicleData.title} - Enriquecido (${result.source})`);
    } else if (result.status === 'skip') {
      skipped++;
    } else {
      console.log(`${colors.yellow}⚠${colors.reset} ${vehicleData.title} - Sin datos encontrados`);
    }
    
    processed++;
    if (processed % 20 === 0) {
      console.log(`${colors.blue}→${colors.reset} Progreso: ${processed}/${files.length}`);
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log(`\n${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}✓ Enriquecidos: ${enriched}${colors.reset}`);
  console.log(`${colors.yellow}⚠ Sin cambios: ${skipped}${colors.reset}`);
  console.log(`${colors.cyan}→ Procesados: ${processed}${colors.reset}\n`);
  
  if (enriched > 0) {
    console.log(`${colors.green}🎯 Listo para commit:${colors.reset}`);
    console.log(`  ${colors.cyan}git add src/content/vehiculos/\n  git commit -m "Enriquecimiento automático: +${enriched} vehículos por familia de motores"${colors.reset}\n`);
  }
}

main().catch(err => {
  console.error(`${colors.red}❌ Error fatal:${colors.reset}`, err.message);
  process.exit(1);
});
