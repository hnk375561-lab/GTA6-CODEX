<#
  reorganizar-repo.ps1
  -----------------------------------------------------------------
  Reordena los archivos mal ubicados en la raiz del repo Sin-Frenos
  (quedaron sueltos por una subida masiva via GitHub web upload).

  COMO USARLO:
    1. Abri PowerShell parado en la raiz de tu clon local del repo
       (donde estan package.json, .git, src\, etc.)
    2. Corre:  .\reorganizar-repo.ps1
    3. Revisa "git status" y la carpeta _REVISAR-DUPLICADOS\
    4. Si todo esta bien, comiteas y haces push vos mismo.

  Este script NO hace commit ni push. Solo mueve archivos con
  "git mv" (asi git seguisu historial) y te deja todo listo para
  que revises antes de confirmar.
#>

$ErrorActionPreference = "Stop"

# --- 0. Verificacion de seguridad: ¿estamos parados en el repo correcto? ---
if (-not (Test-Path ".\package.json") -or -not (Test-Path ".\.git")) {
    Write-Host "ERROR: no encuentro package.json o .git en esta carpeta." -ForegroundColor Red
    Write-Host "Parate en la raiz de tu clon local del repo antes de correr este script." -ForegroundColor Red
    exit 1
}

function Move-Safe {
    param(
        [string]$From,
        [string]$To
    )
    if (Test-Path $From) {
        $destDir = Split-Path $To -Parent
        if ($destDir -and -not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Write-Host "  mv  $From  ->  $To"
        git mv $From $To
    } else {
        Write-Host "  (omitido, no existe) $From" -ForegroundColor DarkGray
    }
}

Write-Host "`n=== 1. Moviendo scripts sueltos a scripts/ ===" -ForegroundColor Cyan
Move-Safe "convert-images.mjs"              "scripts/convert-images.mjs"
Move-Safe "enrich-fabricantes.mjs"          "scripts/enrich-fabricantes.mjs"
Move-Safe "enrich-vehiculos.mjs"            "scripts/enrich-vehiculos.mjs"
Move-Safe "enrich-vehiculos-v2.mjs"         "scripts/enrich-vehiculos-v2.mjs"
Move-Safe "enrich-vehiculos-v3.mjs"         "scripts/enrich-vehiculos-v3.mjs"
Move-Safe "enricher-motor-families.mjs"     "scripts/enricher-motor-families.mjs"
Move-Safe "enricher-zero-cost.mjs"          "scripts/enricher-zero-cost.mjs"
Move-Safe "normalize-dimensiones.mjs"       "scripts/normalize-dimensiones.mjs"
Move-Safe "normalize-generacion.mjs"        "scripts/normalize-generacion.mjs"
Move-Safe "run-enrichment-suite.sh"         "scripts/run-enrichment-suite.sh"
Move-Safe "cleanup-dead-hero-files.sh"      "scripts/cleanup-dead-hero-files.sh"

Write-Host "`n=== 2. Moviendo documentacion suelta a docs/ ===" -ForegroundColor Cyan
Move-Safe "AUDITORIA-DARK-MODE-COMPLETA.md" "docs/AUDITORIA-DARK-MODE-COMPLETA.md"
Move-Safe "HERO_HOME_180_REDESIGN_REPORT.txt" "docs/HERO_HOME_180_REDESIGN_REPORT.txt"
Move-Safe "HERO_HOME_PRODUCTION_AUDIT.txt"  "docs/HERO_HOME_PRODUCTION_AUDIT.txt"
Move-Safe "__SUMMARY_ANCHORED.md"           "docs/__SUMMARY_ANCHORED.md"
Move-Safe "ENRICHMENT-README.md"            "docs/ENRICHMENT-README.md"

Write-Host "`n=== 3. Poniendo en cuarentena los duplicados que DIVERGEN de src/ ===" -ForegroundColor Yellow
Write-Host "    (no se borran - se mueven a _REVISAR-DUPLICADOS/ para que los mires)" -ForegroundColor Yellow

Move-Safe "Header.tsx"              "_REVISAR-DUPLICADOS/Header.tsx"
Move-Safe "ManufacturerCardV2.tsx"  "_REVISAR-DUPLICADOS/ManufacturerCardV2.tsx"
Move-Safe "globals.css"             "_REVISAR-DUPLICADOS/globals.css"
Move-Safe "page.tsx"                "_REVISAR-DUPLICADOS/page.tsx"
Move-Safe "content-bundle.ts"       "_REVISAR-DUPLICADOS/content-bundle.ts"

$vehiculosDuplicados = @(
    "byd-atto-3.json","byd-dolphin-mini.json","byd-dolphin.json","byd-han.json",
    "byd-seal.json","byd-tang.json","chevrolet-bolt-ev.json","hyundai-ioniq-5.json",
    "hyundai-kona-electric.json","kia-ev6.json","kia-sorento.json","mg4.json",
    "nio-et5.json","nissan-leaf.json","porsche-taycan.json","renault-megane-e-tech.json",
    "smart-1.json","tesla-cybertruck.json","tesla-model-3.json","tesla-model-s.json",
    "tesla-model-x.json","tesla-model-y.json","volkswagen-id-4.json","wuling-mini-ev.json",
    "xiaomi-su7.json"
)
foreach ($f in $vehiculosDuplicados) {
    Move-Safe $f "_REVISAR-DUPLICADOS/vehiculos-raiz/$f"
}

Write-Host "`n=== RESUMEN ===" -ForegroundColor Green
git status --short
Write-Host "`nProximos pasos:" -ForegroundColor Green
Write-Host "  1. Compara cada archivo en _REVISAR-DUPLICADOS\ contra su version en src\"
Write-Host "     (por ejemplo: code --diff _REVISAR-DUPLICADOS\Header.tsx src\components\layout\Header.tsx)"
Write-Host "  2. Si confirmas que la version de src\ es la buena, borra la carpeta:"
Write-Host "       git rm -r _REVISAR-DUPLICADOS"
Write-Host "  3. Corre 'npm run type-check' y 'npm run test' para confirmar que nada se rompio"
Write-Host "  4. git add -A"
Write-Host "  5. git commit -m 'Reordenar archivos mal ubicados por la subida masiva'"
Write-Host "  6. git push"
