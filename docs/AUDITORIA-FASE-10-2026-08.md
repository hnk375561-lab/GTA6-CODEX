# FASE 10 — Auditoría final integral (agosto 2026)

Auditoría de producto, arquitectura y sistema de datos sobre el estado del
repositorio tras las FASES 1–9. Metodología: lectura de arquitectura completa
(rutas, `src/lib`, `src/types`, `src/content`, scripts de verificación) +
ejecución real de la suite de verificación (no simulada) contra el repositorio
clonado de `main`.

## Baseline objetivo (antes de cualquier cambio)

| Check | Resultado |
|---|---|
| `type-check` | ✅ 0 errores |
| `lint` | ⚠️ 0 errores, 1 warning (`skipped` sin usar en `generate-manufacturers.mjs`) |
| `test` | ✅ 440/440 tests, 25 archivos |
| `verify:content` | ✅ OK |
| `verify:relations` | ✅ OK — todas las relaciones apuntan a entidades existentes |
| `verify:min-count` | ✅ 250 vehículos (mínimo 200) |
| `verify:manufacturer-slugs` | ✅ OK |
| `verify:reserved-keys` | ✅ OK |
| `verify:seo` | ✅ robots.txt + sitemap.xml (814 URLs) |
| `verify:tailwind` | ✅ OK |
| `build` | ✅ 829/829 páginas estáticas, ~33s |
| `knip` (código muerto) | ⚠️ No concluyente — crashea por límite de memoria del entorno de auditoría (`RangeError: Array buffer allocation failed` en `oxc-parser`), no es un fallo del proyecto. Recomendado correrlo en CI con más memoria. |

**No había ningún P0 de build/tests/type-check/relaciones roto.** El proyecto
llega a esta auditoría en buen estado funcional. Los hallazgos de abajo son
de consistencia, mantenibilidad, SEO y preparación para escalar — no
regresiones activas.

---

## P0 — CRÍTICO

Ninguno encontrado. No hay errores que rompan datos, build, producción o
arquitectura en el estado actual del repositorio.

---

## P1 — IMPORTANTE

### P1-1. `SITE_URL` redefinida en 3 lugares en vez de importarse de la fuente única

- **Archivos:** `src/app/robots.ts`, `src/app/sitemap.ts` (antes de esta
  fase); fuente única real: `src/config/site.ts`.
- **Problema:** `config/site.ts` fue creado explícitamente (según su propio
  comentario) para eliminar copias duplicadas de `SITE_NAME`/`SITE_URL` tras
  encontrar 10+ copias idénticas de `SITE_NAME`. Ese trabajo quedó incompleto:
  `robots.ts` y `sitemap.ts` seguían con su propia constante `const SITE_URL
  = process.env.NEXT_PUBLIC_SITE_URL || 'https://autoficha.vercel.app'`
  idéntica a la de `config/site.ts`.
- **Por qué importa:** si el dominio de fallback cambia, hay que
  recordarse de tocarlo en 3 archivos en vez de 1 — el mismo riesgo que
  motivó crear `config/site.ts` en primer lugar, pero solo resuelto a medias.
- **Impacto:** bajo hoy (los 3 valores están sincronizados), pero es una
  regresión latente esperando a que alguien edite un solo lugar.
- **Solución recomendada:** importar `SITE_URL` desde `@/config/site` en
  ambos archivos.
- **Prioridad:** P1 (mantenibilidad / riesgo de drift silencioso).
- **Riesgo de modificarlo:** ninguno — mismo valor, mismo tipo, sin lógica
  adicional.
- **Estado:** ✅ **Implementado en esta fase.**

### P1-2. `README.md` y `CHANGELOG.md` de la raíz del repo desactualizados respecto de los reales

- **Archivos:** `/README.md`, `/CHANGELOG.md` (raíz del repo) vs.
  `/GTA6-CODEX/README.md`, `/GTA6-CODEX/CHANGELOG.md` (los reales/actuales).
- **Problema confirmado por diff:** el `README.md` de la raíz —el que
  GitHub muestra como portada del repositorio— declaraba:
  - Evidencia: *"126 oficial-nombrado + 124 respaldado"* vs. la cifra real
    actual, *"250/250 con fuente citada sólida (100%)"*.
  - Stack del hero: *"Three.js (r185)"*, tecnología ya reemplazada por
    Canvas 2D nativo según el README real.
  - Le faltaba por completo la sección de la auditoría de integridad de
    powertrain (agosto 2026) y la limpieza de branding legado, ambas ya
    documentadas en el README real.
  - El `CHANGELOG.md` de la raíz se detenía antes de la FASE 9 — le
    faltaban ~389 líneas de historial ya registradas en el real.
- **Por qué importa:** es la primera impresión del repositorio para
  cualquier visitante o colaborador nuevo en GitHub, y estaba
  desinformando activamente sobre el estado del proyecto.
- **Impacto:** confusión para colaboradores, credibilidad del repo,
  ningún impacto en runtime/producción (son solo docs).
- **Solución recomendada:** no mantener dos copias completas en paralelo
  (es la causa raíz del drift); convertir los archivos de la raíz en un
  puntero corto al real dentro de `GTA6-CODEX/`.
- **Prioridad:** P1 (documentación/confianza, no funcional).
- **Riesgo de modificarlo:** ninguno — no son leídos por ningún código ni
  proceso de build.
- **Estado:** ✅ **Implementado en esta fase** (reemplazados por
  punteros permanentes a `GTA6-CODEX/README.md` y
  `GTA6-CODEX/CHANGELOG.md`, para que el drift no pueda repetirse).

### P1-3. Campo `gallery` presente en las 250 fichas de vehículo sin schema ni lector en código

- **Archivos:** los 250 JSON de `src/content/vehiculos/*.json`.
- **Problema:** cada ficha tenía un bloque
  `"gallery": { "images": { "exterior": [], "interior": [], "detalles": [],
  "accion": [] }, "videos": [], "thumbnailUrl": null }` — siempre vacío,
  sin excepción en las 250 fichas. Confirmado por grep en todo `src/`: no
  hay un solo `.gallery` real en el código (el único match era un
  selector CSS no relacionado, `.gallery-tile-viewport`), y no existe en
  `VehicleSchema`/`BaseEntitySchema` (por eso `verify:relations`/
  `verify:content` nunca lo tocaban). El sistema de galería real (FASE 9,
  documentado en el CHANGELOG) usa una convención de archivo
  (`{slug}-2.ext`, `{slug}-3.ext`...) completamente distinta.
- **Por qué importa:** dos "sistemas de galería" conviviendo en el mismo
  dato (uno muerto, uno real) es la clase de ambigüedad que hace que un
  colaborador futuro pierda tiempo editando el campo equivocado, o asuma
  que `gallery.images` es la fuente de verdad cuando no lo es.
- **Impacto:** ninguno en runtime hoy (nunca se lee), pero es deuda que
  crece con cada vehículo nuevo (`new-vehicle.mjs` probablemente lo sigue
  generando) y con cada catálogo de 250 → 1000+.
- **Solución recomendada:** eliminar el campo de los 250 JSON.
- **Prioridad:** P1 (consistencia dato/schema/código; riesgo de confusión
  a futuro, no de ruptura activa).
- **Riesgo de modificarlo:** bajo — no está en el schema, no lo lee
  ningún componente ni script de verificación; confirmado con
  `type-check`, `test`, `verify:content`, `verify:relations` y `build`
  en verde después de sacarlo.
- **Estado:** ✅ **Implementado en esta fase** (250/250 archivos).

### P1-4. Estructura de repositorio anidada (`GTA6-CODEX-main` → `GTA6-CODEX/`) sin documentar

- **Archivos:** layout general del repo — `.github/`, patches (`*.patch`),
  scripts de enrichment y `README`/`CHANGELOG` viven en la raíz real del
  repo, mientras que la app Next.js completa (con su propio
  `README`/`CHANGELOG`/scripts) vive en una subcarpeta `GTA6-CODEX/` con
  el mismo nombre que el repo.
- **Por qué importa:** no está explicado en ningún lado *por qué* existe
  este anidamiento (¿migración de otro repo? ¿monorepo intencional?). Un
  colaborador nuevo puede razonablemente asumir que el repo raíz *es* el
  proyecto y perderse la carpeta real, o viceversa.
- **Impacto:** fricción de onboarding, no funcional (confirmado: CI,
  Vercel y todos los scripts apuntan correctamente a `GTA6-CODEX/`).
- **Solución recomendada:** documentar la razón del anidamiento en el
  README de la raíz (ya cubierto parcialmente por el puntero de P1-2), o
  evaluar en una fase futura aplanar la estructura moviendo todo el
  contenido de `GTA6-CODEX/` a la raíz — **cambio estructural grande,
  fuera de alcance de esta fase de hardening**, requiere coordinarse con
  la config de Vercel/CI antes de tocarlo.
- **Prioridad:** P1 (mantenibilidad/onboarding).
- **Riesgo de modificarlo:** alto si se aplana la estructura sin
  actualizar CI/Vercel en el mismo cambio — **no implementado en esta
  fase**, queda documentado para decisión explícita.
- **Estado:** ⚠️ **No implementado** — requiere decisión del equipo, no
  es un fix mecánico seguro.

### P1-5. `.ci-debug/` y varios artefactos de proceso commiteados al repo

- **Archivos:** `GTA6-CODEX/.ci-debug/import-real-images-below-2k.json`,
  `GTA6-CODEX/.ci-debug/import-real-images-errors.json`,
  `enrichment-log.jsonl`, `enrichment-fabricantes-log.jsonl`,
  `.commons-image-cache.json`, `real-images-manifest.json`.
- **Problema:** `.ci-debug/` es, por nombre y contenido, output de debug
  de una corrida puntual de `scripts/import-real-images.mjs` — no aporta
  valor versionado.
- **Por qué importa:** ruido en el repo, diffs innecesarios en cada
  corrida del script si se vuelve a generar con contenido distinto.
- **Impacto:** bajo, cosmético/higiene de repo.
- **Solución recomendada:** agregar `.ci-debug/` a `.gitignore` y
  destrackearlo. **Los otros archivos** (`enrichment-log.jsonl`,
  `real-images-manifest.json`, `.commons-image-cache.json`) **no se
  tocan**: no hay evidencia de que sean puramente desechables —
  `real-images-manifest.json` en particular puede ser la fuente de
  verdad de procedencia de imágenes que otros scripts (`process-images.mjs`,
  `import-real-images.mjs`) consumen en corridas futuras; borrarlos sin
  confirmar su rol sería modificar datos sin justificación suficiente.
- **Prioridad:** P1 para `.ci-debug/` específicamente (higiene, bajo
  riesgo); el resto queda **fuera de alcance** por falta de certeza.
- **Riesgo de modificarlo:** ninguno para `.ci-debug/` (es debug output
  puro, regenerable). Sin evaluar para el resto.
- **Estado:** ✅ **`.ci-debug/` destrackeado en esta fase** (ya estaba en
  `.gitignore` desde antes, pero había quedado commiteado de una corrida
  previa a esa regla — `git rm -r --cached`, el archivo sigue en disco,
  solo sale del control de versiones). **El resto de los archivos
  listados** (`enrichment-log.jsonl`, `real-images-manifest.json`,
  `.commons-image-cache.json`) **no se tocan** por la razón ya explicada.

---

## P2 — MEJORA

### P2-1. 8 archivos `.patch` en la raíz del repo, ya aplicados

- **Archivos:** `00-TODO-COMBINADO.patch` y `01`–`07-bloque-*.patch`.
- **Problema:** verificado contra el código real: los 8 patches (incluido
  el nombrado `01-bloque-A-critico-ci-injection.patch`) **ya están
  aplicados** en el árbol actual (confirmado línea por línea contra
  `.github/workflows/check-evidence-links.yml` y `serializeJsonLd` en
  `seo.ts`/`[entityType]/[slug]/page.tsx`). No representan trabajo
  pendiente ni una vulnerabilidad activa.
- **Por qué importa:** el nombre "crítico" de uno de ellos puede generar
  una falsa alarma en cualquier auditoría futura (incluida esta, hasta
  que se verificó el contenido real) — vale la pena para quien lea el
  repo saber que es un archivo histórico, no una tarea pendiente.
- **Impacto:** ninguno funcional; posible confusión/pérdida de tiempo en
  auditorías futuras.
- **Solución recomendada:** si ya no aportan valor como registro
  histórico, se pueden eliminar; si se quieren conservar como bitácora,
  mover a `docs/patches-aplicados/` con una nota explícita de que ya
  están mergeados.
- **Prioridad:** P2 (cosmético, cero riesgo funcional).
- **Riesgo de modificarlo:** ninguno si se conserva su contenido en
  algún lado (git history ya los tiene de cualquier forma).
- **Estado:** ⚠️ **No implementado** — es una decisión editorial (¿se
  quieren conservar como bitácora o no?), no un fix técnico; se deja a
  criterio del equipo.

### P2-2. `knip` no pudo correr en el entorno de esta auditoría

- **Problema:** `npx knip` crashea con `RangeError: Array buffer
  allocation failed` dentro de `oxc-parser`, un límite de memoria del
  sandbox de auditoría, no del proyecto.
- **Recomendación:** correr `npm run check:unused` en CI (más memoria
  disponible) para tener un veredicto real de código/exports no usados;
  no se puede afirmar ni descartar código muerto adicional sin esa
  corrida.
- **Prioridad:** P2 (housekeeping, bloqueado por entorno, no por el
  proyecto).
- **Estado:** No implementado (no ejecutable en este entorno).

---

## LO QUE NO DEBE TOCARSE

Partes ya bien diseñadas, con justificación explícita en el propio código,
que no necesitan intervención:

- **`src/lib/fixed-comparisons.ts`**: las páginas `/comparar/[pair]`
  (472 pares) se derivan únicamente de relaciones `competidor` curadas
  editorialmente, no de todas las combinaciones posibles (que serían
  ~31.000 pares — thin/duplicate content masivo). Esto ya está resuelto
  correctamente y documentado como decisión deliberada ("Fase 19: DO NOT
  BUILD YET").
- **`src/app/sitemap.ts`**: solo anuncia rutas de categoría/ranking que
  superan el mismo umbral que usa la página real
  (`computeSeoCategoryOptions`, `isRankingEligible`) — evita anunciar
  URLs que devolverían 404. Correcto y consistente con la página real.
- **`src/lib/entities.ts`**: caché en memoria activada solo en
  producción/build (`NODE_ENV === 'production'`), desactivada en dev a
  propósito para que los cambios de contenido se reflejen sin reiniciar.
  Patrón correcto para este tipo de proyecto basado en filesystem.
- **`next.config.js`**: CSP en modo enforcement ya validada contra
  Report-Only sin falsos positivos, `qualities`/`deviceSizes` de
  `next/image` ajustados a los tamaños reales que importa el pipeline de
  imágenes, y el redirect 301 de `/vehiculos/fabricante/:manufacturer` →
  `/fabricantes/:manufacturer` está bien razonado (evita perder SEO ya
  indexado).
- **`scripts/verify-content-integrity.mjs`**: corre un `next build` real
  con un fixture de fecha inválida para confirmar que una entidad
  corrupta se excluye con warning en vez de tirar abajo el build entero
  — es un test de regresión de un bug real ya solucionado, no ruido.
- **Suite de tests** (440 tests, 25 archivos): buena cobertura por
  módulo de `src/lib`, incluye tests de los helpers de negocio más
  delicados (potencia, precio, rendimiento, comparación, relaciones
  bidireccionales).
- **`WebGLBackground.tsx`**: respeta `prefers-reduced-motion` y hace
  `dispose()` del engine en el cleanup del `useEffect` — patrón correcto,
  no genérico.

---

## ARQUITECTURA FUTURA — 250 → 500 → 1.000 → 5.000+ entidades

**Hoy (250 vehículos + 75 fabricantes):** el proyecto está sólido para
este volumen. Todo el contenido se carga a memoria en build/runtime desde
JSON en disco, cacheado (`Map` en memoria, solo en producción).

**A 500:** sin cambios necesarios. El propio código ya lo señala
(`getAllEntities`: *"Para volúmenes grandes (1000+ entidades), considerar
paginación o lazy loading"*) — a 500 sigue siendo una carga trivial en
memoria (JSON planos, sin imágenes ni binarios en el objeto).

**A 1.000:**
- **Build time**: 250 vehículos → 829 páginas en ~33s. El crecimiento no
  es lineal 1:1 porque `/comparar/[pair]` depende de la densidad de
  relaciones `competidor` curadas (hoy 472 pares desde 250 vehículos), no
  de combinatoria total — esto es la decisión correcta y ya evita el
  problema de escala más grande que tendría este proyecto (miles de
  páginas de comparación thin-content). A 1000 vehículos con la misma
  densidad de curación, esperable ~1900 páginas de comparación — sigue
  siendo manejable con SSG en Vercel, pero vale monitorear el tiempo de
  build.
- **`getAllEntities()` cargando todo a memoria**: a 1000 entidades
  (JSON planos, sin binarios) sigue siendo del orden de unos pocos MB —
  no es un problema real todavía, pero es el punto donde el propio
  comentario del código dice empezar a evaluar paginación/lazy loading
  si el build o el runtime empiezan a sentirlo.
- **Curación editorial de relaciones `competidor`**: es el cuello de
  botella real, no técnico — sostener el mismo % de cobertura (212/250 =
  ~85%) a 1000 fichas requiere el mismo esfuerzo editorial escalado, o
  las páginas de comparación se vuelven proporcionalmente menos densas.

**A 5.000+:** acá sí habría que revisar decisiones de arquitectura:
- Migrar de "JSON planos leídos con `fs` en cada build" a una base de
  datos o al menos un índice pre-computado, para no depender de escanear
  el directorio completo en cada `getAllEntities()`.
- Evaluar ISR (`revalidate`) en vez de SSG puro para las páginas menos
  visitadas, si el tiempo de build empieza a doler.
- El patrón de `/comparar/[pair]` basado en relaciones curadas sigue
  siendo válido a esta escala (crece con la curación, no con N²), así
  que **no es necesario rediseñarlo** — es de las pocas piezas ya
  preparadas para 5.000+ sin cambios.

**En resumen:** la arquitectura de datos/relaciones/SEO está diseñada con
criterio anti-escala-combinatoria desde el día uno (decisión explícita en
comentarios del propio código), que es la parte más difícil de corregir
después. El techo real no es técnico a corto/mediano plazo — es la
curación editorial de contenido y, eventualmente (5.000+), el modelo de
lectura de datos basado en filesystem plano.

---

## Resumen de lo implementado en esta fase (FASE 11 — Hardening, ejecutada junto con el diagnóstico)

| # | Hallazgo | Acción |
|---|---|---|
| P1-1 | `SITE_URL` triplicada | ✅ `robots.ts`/`sitemap.ts` ahora importan de `config/site.ts` |
| P1-2 | README/CHANGELOG raíz desactualizados | ✅ Reemplazados por punteros permanentes a los reales |
| P1-3 | Campo `gallery` muerto en 250 fichas | ✅ Eliminado de las 250 fichas |
| Lint warning | `skipped` sin usar | ✅ Eliminado |
| P1-4 | Anidamiento de repo sin documentar | ⚠️ Documentado, no accionado (decisión estructural) |
| P1-5 | `.ci-debug/` commiteado pese a estar en `.gitignore` | ✅ Destrackeado (`git rm --cached`); el resto de los artefactos de proceso, sin tocar |
| P2-1 | Patches ya aplicados en la raíz | ⚠️ Documentado, no accionado (decisión editorial) |
| P2-2 | `knip` no ejecutable en este entorno | ⚠️ Documentado, recomendado correr en CI |

**Verificación post-cambios:** `type-check` ✅, `lint` ✅ (0 warnings),
`test` ✅ (440/440), `verify:content` ✅, `verify:relations` ✅,
`verify:min-count` ✅, `verify:manufacturer-slugs` ✅,
`verify:reserved-keys` ✅, `build` ✅ (829/829 páginas, mismo conteo que
el baseline — ningún dato ni ruta se perdió).
