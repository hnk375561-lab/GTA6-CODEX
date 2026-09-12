#!/usr/bin/env bash
# Ejecutar desde la raíz del repo (Sin-Frenos/).
# Borra 19 archivos confirmados como 100% muertos: 0 referencias directas
# ni transitivas desde src/app, ni desde tests, ni desde ningún barrel
# export. Son restos de iteraciones anteriores del hero/home (antes de
# llegar al ArchiveHero actual) que quedaron en el repo sin usarse.
#
# Verificado antes de generar este script:
#   - npx tsc --noEmit sobre el proyecto completo: 0 errores nuevos tras
#     el borrado (mismo warning preexistente de baseUrl, no relacionado).
#   - grep de cada nombre de componente contra todo src/ (incluidos
#     tests): sin matches reales.
# NO verificado (este entorno no tiene navegador ni node_modules
# instalado): build visual, `npm run build` completo, `vitest run`.
# Corré esos dos antes de mergear a main, por las dudas.

set -euo pipefail

git rm \
  src/components/home/CategoryQuickFilter.tsx \
  src/components/home/CompareShowcase.tsx \
  src/components/home/EvidenceShowcase.tsx \
  src/components/home/EvidenceSpotlight.tsx \
  src/components/home/HeroCatalogIndex.tsx \
  src/components/home/HeroPromoBanner.tsx \
  src/components/home/HeroSelfPromoCard.tsx \
  src/components/home/HeroShowroom.tsx \
  src/components/home/HeroVehicleShowcase.tsx \
  src/components/home/HeroVehicleShowcaseV2.tsx \
  src/components/home/HomeFaqPanel.tsx \
  src/components/home/HomeIntroduction.tsx \
  src/components/home/LiveCompareTeaser.tsx \
  src/components/home/ManufacturerVisualization.tsx \
  src/components/home/ManufacturersMarquee.tsx \
  src/components/home/PinnedScrollStages.tsx \
  src/components/home/RankingsSpotlight.tsx \
  src/components/home/VehicleRadarExplorer.tsx \
  src/config/hero-quick-links.tsx

echo "Listo. Revisá 'git status', corré tsc/lint/build/tests, y commiteá."
