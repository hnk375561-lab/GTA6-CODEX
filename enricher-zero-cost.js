#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Colores para salida
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

// Función para hacer requests HTTPS
function makeRequest(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// Buscar Wikipedia para obtener especificaciones
async function fetchWikipediaSpecs(vehicleTitle) {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(vehicleTitle)}&format=json`;
    const { data: searchData } = await makeRequest(searchUrl, 5000);
    const searchResult = JSON.parse(searchData);
    
    if (!searchResult.query?.search?.[0]) return null;
    
    const pageTitle = searchResult.query.search[0].title;
    const pageUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=extracts&explaintext=true&format=json`;
    
    const { data: pageData } = await makeRequest(pageUrl, 5000);
    const pageResult = JSON.parse(pageData);
    const pages = pageResult.query?.pages || {};
    const page = Object.values(pages)[0];
    
    return page?.extract || null;
  } catch (e) {
    return null;
  }
}

// Parser básico de especificaciones desde texto
function parseSpecsFromText(text) {
  if (!text) return {};
  
  const specs = {};
  
  // Motor
  const engineMatch = text.match(/(\d+)\s*(?:cc|cm³|L|liter)/i);
  if (engineMatch) specs.cilindrada = engineMatch[1] + ' cc';
  
  // Potencia
  const powerMatch = text.match(/(\d+)\s*(?:PS|hp|CV|kW)/i);
  if (powerMatch) specs.potencia = powerMatch[1] + ' CV';
  
  // Peso
  const weightMatch = text.match(/(\d+)\s*kg/i);
  if (weightMatch) specs.peso = weightMatch[1] + ' kg';
  
  // Dimensiones
  const lengthMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:m|mm)\s*(?:long|length)/i);
  if (lengthMatch) {
    specs.largo = parseFloat(lengthMatch[1]) > 100 ? lengthMatch[1] + ' mm' : lengthMatch[1] + ' m';
  }
  
  return specs;
}

// Enriquecer un vehículo
async function enrichVehicle(vehiclePath, vehicleData) {
  const vehicleTitle = vehicleData.title;
  const isIncomplete = !vehicleData.dimensiones || Object.keys(vehicleData.dimensiones || {}).length === 0;
  
  if (!isIncomplete) {
    console.log(`${colors.green}✓${colors.reset} ${vehicleTitle} - Ya completo`);
    return { changed: false };
  }
  
  console.log(`${colors.blue}→${colors.reset} Enriqueciendo ${vehicleTitle}...`);
  
  try {
    // Intentar obtener specs de Wikipedia
    const wikiText = await fetchWikipediaSpecs(vehicleTitle);
    const specs = parseSpecsFromText(wikiText);
    
    if (Object.keys(specs).length > 0) {
      // Actualizar datos
      if (specs.cilindrada && !vehicleData.cilindrada) vehicleData.cilindrada = specs.cilindrada;
      if (specs.potencia && !vehicleData.power) vehicleData.power = specs.potencia;
      if (specs.peso && !vehicleData.peso) vehicleData.peso = specs.peso;
      
      if (!vehicleData.dimensiones) {
        vehicleData.dimensiones = {};
      }
      if (specs.largo) vehicleData.dimensiones.largo = specs.largo;
      
      vehicleData.updatedAt = new Date().toISOString();
      
      console.log(`${colors.green}✓${colors.reset} ${vehicleTitle} - Enriquecido con ${Object.keys(specs).length} campos`);
      return { changed: true, specs };
    } else {
      console.log(`${colors.yellow}⚠${colors.reset} ${vehicleTitle} - No se encontraron especificaciones`);
      return { changed: false };
    }
  } catch (e) {
    console.log(`${colors.red}✗${colors.reset} ${vehicleTitle} - Error: ${e.message}`);
    return { changed: false, error: e.message };
  }
}

// Main
async function main() {
  const vehiculosDir = './src/content/vehiculos';
  const files = fs.readdirSync(vehiculosDir)
    .filter(f => f.endsWith('.json'))
    .sort();
  
  console.log(`${colors.blue}🚗 ENRIQUECEDOR AUTOMÁTICO - ZERO COST${colors.reset}`);
  console.log(`📁 ${files.length} vehículos encontrados\n`);
  
  let enriched = 0;
  let failed = 0;
  let skipped = 0;
  const errors = [];
  
  // Procesar con un máximo de 10 simultáneamente (para no saturar)
  for (let i = 0; i < files.length; i += 10) {
    const batch = files.slice(i, i + 10);
    const promises = batch.map(async (file) => {
      const vehiclePath = path.join(vehiculosDir, file);
      const vehicleData = JSON.parse(fs.readFileSync(vehiclePath));
      
      const result = await enrichVehicle(vehiclePath, vehicleData);
      
      if (result.changed) {
        fs.writeFileSync(vehiclePath, JSON.stringify(vehicleData, null, 2));
        enriched++;
      } else if (result.error) {
        failed++;
        errors.push({ vehicle: vehicleData.title, error: result.error });
      } else {
        skipped++;
      }
    });
    
    await Promise.all(promises);
    console.log(`${colors.blue}→${colors.reset} Progreso: ${Math.min(i + 10, files.length)}/${files.length}`);
  }
  
  console.log(`\n${colors.blue}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}✓ Enriquecidos: ${enriched}${colors.reset}`);
  console.log(`${colors.yellow}⚠ Sin datos: ${skipped}${colors.reset}`);
  console.log(`${colors.red}✗ Errores: ${failed}${colors.reset}`);
  
  if (enriched > 0) {
    console.log(`\n${colors.green}Cambios listos para commit:${colors.reset}`);
    console.log(`  git add src/content/vehiculos/`);
    console.log(`  git commit -m "Enriquecimiento automático: +${enriched} vehículos"`);
  }
}

main().catch(console.error);
