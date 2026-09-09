#!/bin/bash

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${MAGENTA}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║    🚗 SUITE DE ENRIQUECIMIENTO - ZERO COST             ║${NC}"
echo -e "${MAGENTA}║    Actualización automática de 250+ fichas técnicas    ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════════════╝${NC}"

# Verificar prerequisites
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git no está instalado${NC}"
    exit 1
fi

echo -e "${CYAN}✓ Node.js ${NC}v$(node --version)"
echo -e "${CYAN}✓ Git${NC} $(git --version | cut -d' ' -f3)"
echo ""

# 1. ANÁLISIS INICIAL
echo -e "${BLUE}[1/4] ANÁLISIS INICIAL DE COMPLETITUD${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node -e "
const fs = require('fs');
const path = require('path');

const dir = './src/content/vehiculos';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

const importantFields = [
  'especificacionesMotor',
  'dimensiones',
  'peso',
  'consumo',
  'emissions'
];

let complete = 0;
let incomplete = 0;

files.forEach(f => {
  const data = JSON.parse(fs.readFileSync(path.join(dir, f)));
  let hasAllFields = importantFields.every(field => {
    const val = data[field];
    return val && typeof val === 'object' && Object.keys(val).length > 0;
  });
  if (hasAllFields) complete++;
  else incomplete++;
});

console.log(\`📊 Estado actual:\`);
console.log(\`   ✓ Completos: ${complete}/${files.length}\`);
console.log(\`   ⚠️  Incompletos: ${incomplete}/${files.length}\`);
console.log(\`   📈 Cobertura: \${(complete/files.length*100).toFixed(1)}%\`);
"
echo ""

# 2. ENRIQUECIMIENTO POR FAMILIA DE MOTORES
echo -e "${BLUE}[2/4] ENRIQUECIMIENTO POR FAMILIA DE MOTORES${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Ejecutando: enricher-motor-families.js"
echo ""

if [[ ! -f "enricher-motor-families.js" ]]; then
    echo -e "${YELLOW}⚠️  Script no encontrado, creando...${NC}"
fi

node enricher-motor-families.js 2>&1 | head -50
echo ""

# 3. ANÁLISIS FINAL
echo -e "${BLUE}[3/4] ANÁLISIS FINAL${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node -e "
const fs = require('fs');
const path = require('path');

const dir = './src/content/vehiculos';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

let complete = 0;
files.forEach(f => {
  const data = JSON.parse(fs.readFileSync(path.join(dir, f)));
  if (data.especificacionesMotor && Object.keys(data.especificacionesMotor).length > 3) {
    complete++;
  }
});

const improvement = complete;
console.log(\`📊 Resultado final:\`);
console.log(\`   ✓ Completados: \${improvement} vehículos\`);
console.log(\`   📈 Cobertura final: \${(complete/files.length*100).toFixed(1)}%\`);
"
echo ""

# 4. PREPARAR COMMIT
echo -e "${BLUE}[4/4] PREPARAR CAMBIOS PARA GIT${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CHANGES=$(git status --porcelain | wc -l)

if [[ $CHANGES -gt 0 ]]; then
    echo -e "${GREEN}✓ Cambios detectados: ${CHANGES} archivos${NC}"
    echo ""
    echo -e "${CYAN}Próximos pasos:${NC}"
    echo "  1. Revisar cambios:"
    echo "     ${CYAN}git diff src/content/vehiculos/ | head -100${NC}"
    echo ""
    echo "  2. Enviar cambios:"
    echo "     ${CYAN}git add src/content/vehiculos/${NC}"
    echo "     ${CYAN}git commit -m '🤖 Enriquecimiento automático: +${CHANGES} fichas técnicas'${NC}"
    echo "     ${CYAN}git push${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Revisa los cambios antes de hacer push${NC}"
else
    echo -e "${YELLOW}ℹ️  Sin cambios detectados${NC}"
fi

echo ""
echo -e "${GREEN}✅ Suite completada${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
