# ============================================================
# aplicar_fixes.ps1 - Fixes criticos GTA6-CODEX
# Correr desde la RAIZ del repo clonado en tu maquina
# (la carpeta que tiene el .git, un nivel arriba de GTA6-CODEX/)
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host "1/5 - Verificando que estamos en la raiz de un repo git..." -ForegroundColor Cyan
if (-not (Test-Path ".git")) {
    Write-Host "ERROR: no se encontro .git en esta carpeta. Corre este script desde la raiz del repo (donde esta la carpeta .git)." -ForegroundColor Red
    exit 1
}

Write-Host "2/5 - Creando rama nueva para no tocar main directo..." -ForegroundColor Cyan
git checkout -b fix/critical-audit-fixes

Write-Host "3/5 - Aplicando patch (error.tsx, loading.tsx, manifest.ts, CI, headers, .env.example, LICENSE, ads.txt)..." -ForegroundColor Cyan
# Pone hero_and_audit_fixes.patch en la misma carpeta que este script antes de correrlo
git apply --check hero_and_audit_fixes.patch
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: el patch no aplica limpio (probablemente el repo local tiene cambios que difieren del punto de partida). Revisa manualmente." -ForegroundColor Red
    exit 1
}
git apply hero_and_audit_fixes.patch
Write-Host "Patch aplicado OK." -ForegroundColor Green

Write-Host "4/5 - Sacando del tracking las carpetas de staging/sourcing (no se borran del disco, solo de git)..." -ForegroundColor Cyan
git rm -r --cached GTA6-CODEX/assets-originals 2>$null
git rm -r --cached GTA6-CODEX/incoming 2>$null
git rm -r --cached GTA6-CODEX/incoming-images 2>$null

# Agregar al .gitignore del sitio para que no vuelvan a trackearse
$gitignorePath = "GTA6-CODEX/.gitignore"
$linesToAdd = @(
    "",
    "# Carpetas de staging/sourcing - no van en el repo entregable",
    "/assets-originals/",
    "/incoming/",
    "/incoming-images/"
)
Add-Content -Path $gitignorePath -Value $linesToAdd
Write-Host "Carpetas destrackeadas y agregadas a .gitignore." -ForegroundColor Green

Write-Host "5/5 - Moviendo documentos internos fuera del entregable..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "GTA6-CODEX/docs/internal" | Out-Null
$internalDocs = @(
    "FASE_A_AUDIT_FORENSIC.md",
    "IMAGE_CATALOG.md",
    "REPORTE_FINAL.md",
    "CANDIDATES_PENDING.md",
    "VEHICLE_IMAGE_SOURCING.md"
)
foreach ($doc in $internalDocs) {
    $src = "GTA6-CODEX/$doc"
    if (Test-Path $src) {
        git mv $src "GTA6-CODEX/docs/internal/$doc"
    }
}

Write-Host ""
Write-Host "=== LISTO ===" -ForegroundColor Green
Write-Host "Revisa los cambios con: git status" -ForegroundColor Yellow
Write-Host "Completa el nombre del titular en GTA6-CODEX/LICENSE (placeholder [COMPLETAR: ...])." -ForegroundColor Yellow
Write-Host "Cuando estes conforme: git add -A ; git commit -m fix-critical-audit-fixes" -ForegroundColor Yellow
Write-Host ""
Write-Host "PENDIENTE MANUAL (no automatizable de forma segura):" -ForegroundColor Magenta
Write-Host "  - Auditar/reemplazar imagenes oficiales de Rockstar en GTA6-CODEX/public/images/" -ForegroundColor Magenta
Write-Host "  - Escanear el HISTORIAL de git con gitleaks/trufflehog (esto no lo limpia, solo evita trackeo futuro)" -ForegroundColor Magenta
Write-Host "  - npm install ; npm run lint ; npm run type-check ; npm run test ; npm run build (validar que todo compila)" -ForegroundColor Magenta
