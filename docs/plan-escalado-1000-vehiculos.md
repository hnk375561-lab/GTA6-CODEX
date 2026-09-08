# Plan de escalado a 1000+ vehículos — Sin Frenos

> **LEER ESTO PRIMERO en cualquier sesión nueva de Claude sobre este repo.**
> Esta sección de estado se actualiza al final de cada sesión de trabajo.
> Todo lo de abajo de "Fases" es el plan original — no se edita, solo se
> marcan checkboxes. Los cambios de contexto/hallazgos van acá arriba.

## Estado al 8 sep 2026 (actualizado — build confirmado)

**Hecho y en `main`:**
- ✅ **Fase 0** (medición base) — números tomados, ver más abajo.
- ✅ **Fase 1** (búsqueda server-side) — mergeado en `main`, commit
  `5c1abe1f`. **Build de Cloudflare confirmado en verde** (check
  "Workers Builds: sinfrenos" → `success`).
- ✅ **Fase 2, paso 1** (reducir matriz anchos/calidad) — ya estaba hecho
  de una sesión anterior a esta (ver comentario "CALIDAD (por ancho, no
  plana)" en `scripts/pregenerate-image-variants.mjs`). Ganancia real
  pero chica: solo 256px baja de q100 a q95.
- ✅ **Fase 2, paso 2** (paralelismo real) — mergeado en `main`, commit
  `c48e1af0`. Concurrencia bajada de 4 a 2 (el proyecto corre en
  **Cloudflare Workers Builds plan FREE = 2 vCPU real**, confirmado
  contra el changelog de Cloudflare) + `sharp.concurrency(1)` para evitar
  que libvips compita con nuestro propio pool. Configurable sin tocar
  código: `--concurrency=N` o `IMAGE_BUILD_CONCURRENCY=N`.
  **Build de Cloudflare confirmado en verde para este commit**: el check
  "Workers Builds: sinfrenos" corrió de 04:39:13 UTC a 04:52:26 UTC
  (**~13.2 minutos, build completo, `conclusion: success`**). No fue un
  problema de la concurrencia nueva — el retraso que se vio al cierre de
  la sesión anterior (17+ min "in_progress") era cola de builds
  encadenados por los pushes seguidos de esa sesión, no una regresión.
  Ambos commits (`5c1abe1f` y `c48e1af0`) terminaron con éxito.
- ✅ **Fase 4** (auditoría O(n²)) — completa, **sin cambios de código**:
  `entities.ts`, `rankings.ts` y `relations.ts` ya están limpios (el fix
  del índice invertido de `47c6cfb5` sigue vigente y cubre todo). Además
  se confirmó que las páginas de listado de mayor tráfico usan
  `generateStaticParams` (build-time, no runtime) — la única página
  dinámica real era `/buscar`, ya resuelta en Fase 1.

**Pendiente / siguiente paso sugerido:**
- ✅ ~~Confirmar el build real de Cloudflare con la concurrencia nueva~~ —
  **Resuelto en esta sesión.** ~13.2 min de build completo (no solo el
  paso de imágenes) a concurrencia=2. Como referencia previa se sabía que
  el paso de imágenes *solo* tardaba 15+ min a concurrencia=4 — no es una
  comparación 1:1 exacta (build completo vs. paso aislado), pero no hay
  señal de regresión ni de que el build esté en riesgo de exceder límites
  de tiempo de Cloudflare. **No se ejecutó en esta sesión una medición
  aislada del paso de imágenes solo** (con `node
  scripts/pregenerate-image-variants.mjs` corrido a mano) — si se quiere
  el número exacto y comparable 1:1 contra el "15+ min" previo, ese es el
  comando a correr en la próxima sesión.
- ⏳ **Fase 2, paso 3** (transformación on-demand) — sigue **sin
  justificación para arrancar**: el build completo terminó en ~13 min,
  bien dentro de límites razonables. No tocar esto salvo que el bundle
  crezca mucho (más entidades con imagen) y el tiempo empiece a acercarse
  a un límite real documentado de Cloudflare.
- ⏳ **Fase 3** (checkpoint de `content-bundle.ts`) — no llegamos, sigue
  en pie tal cual está descrita abajo. Catálogo sigue en 341, falta
  llegar a 600-700 para el checkpoint.
- ⏳ **Fase 5** (reevaluación a los 1000 vehículos) — no llegamos.
- 🔍 **Hallazgo extra, fuera del alcance literal de la Fase 4**:
  `src/app/favoritos/page.tsx` manda el catálogo completo (341+
  entidades, todos los tipos) como prop a un client component
  (`WishlistExplorer`) — mismo patrón que tenía `/buscar` antes de la
  Fase 1. Como esa página es estática (sin `searchParams`/`cookies()`),
  el costo es de payload/hidratación servido desde caché, NO de CPU por
  request — por eso no entra en el criterio literal de la Fase 4. Sigue
  siendo un fix legítimo si en algún momento se quiere bajar el peso de
  esa página. No se tocó en esta sesión.
- 🔧 **Deuda técnica preexistente, no de este plan**: el check
  `Deploy to Cloudflare Pages / build-and-test` sigue **roto en `main`**
  (confirmado de nuevo en esta sesión, `conclusion: failure` en ambos
  commits `5c1abe1f` y `c48e1af0`) por los 33 errores de lint
  (`@typescript-eslint/no-explicit-any` y similares) en archivos sin
  relación con este plan (`vehicle-history.ts`, `vehicle-variants.ts`,
  `content-bundle.ts`, `media.ts`, `entities.ts`). No bloquea nada de
  este plan (deploy real corre por Cloudflare Workers Builds, que sí está
  en verde), pero conviene arreglarlo en algún momento para que el check
  deje de aparecer rojo en cada PR/push.
- 📝 **Nota de esta sesión**: este archivo (`docs/plan-escalado-1000-vehiculos.md`)
  no existía todavía como archivo versionado en el repo — se creó recién
  ahora para que el plan y su estado vivan en git en vez de solo pegado
  en el chat.

**Cómo retomar (comandos exactos):**

```bash
# 1. Revisar si el build de Cloudflare terminó y con qué tiempo
export GIT_TOKEN='<pedirle el token al usuario si no lo tenés en contexto>'
curl -s -H "Authorization: Bearer ${GIT_TOKEN}" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/hnk375561-lab/GTA6-CODEX/commits/main/check-runs" \
  | python3 -c "
import json,sys
d=json.load(sys.stdin)
for c in d.get('check_runs',[]):
    print(c['name'], '|', c['status'], '|', c.get('conclusion'))
"

# 2. Clonar y pararse en el estado actual
git clone https://x-access-token:${GIT_TOKEN}@github.com/hnk375561-lab/GTA6-CODEX.git repo
cd repo && npm install --no-audit --no-fund

# 3. Workflow de trabajo ya acordado con el usuario en esta sesión:
#    commits directo a `main` (fast-forward), sin PR intermedio — el
#    usuario lo pidió explícitamente. Antes de cada push: type-check,
#    lint del archivo tocado, tests. Confirmar con `git log --oneline
#    origin/main..HEAD` que sigue siendo fast-forward antes de empujar.
```

**Contexto del repo:** viene de un pivote (era un fan-site de GTA VI,
ver README para el detalle) — el nombre `GTA6-CODEX` es un resabio, no
tiene relación con Rockstar/Take-Two. Sitio real: "Sin Frenos" /
"AutoFicha", catálogo de vehículos. Deploy en Cloudflare Workers Builds
(plan free), Next.js 15 + OpenNext.

---

**Objetivo real:** crecer de 341 a 1000+ entidades manteniendo orden, rendimiento
de build y de sitio, sin migrar a base de datos ni reescribir la arquitectura.

**Filosofía del plan:** arreglar los 3 cuellos de botella reales y medidos
(búsqueda en cliente, pipeline de imágenes, tamaño del bundle de contenido),
en ese orden de prioridad. Nada de esto requiere Postgres, Redis, un API
server nuevo ni un admin panel — la arquitectura JSON + git + build estático
ya demostró que escala bien cuando se ataca el problema puntual (ver el fix
de índice invertido de relaciones, commit `47c6cfb5`).

**Lo que este plan NO incluye a propósito** (y por qué):
- Migración a Postgres/Supabase/MongoDB — resuelve problemas que no tenés
  (escrituras concurrentes, transacciones) al costo de perder el flujo de
  edición vía chat + git que hoy funciona.
- API server dedicado (Hono/tRPC) — innecesario mientras el sitio siga
  siendo mayormente estático.
- Redis / caché distribuido — solo tiene sentido con tráfico real que hoy
  no existe (revenue-log en $0 a la fecha).
- Admin panel — solo se justifica el día que haya más de un editor.

Si en algún checkpoint futuro (ver Fase 3) los números muestran que alguno
de estos SÍ hace falta, se evalúa puntualmente — no antes.

---

## Fase 0 — Medición base (antes de tocar código)

**Por qué primero:** para saber si cada fase después funcionó, hace falta
un "antes" real, no una sensación.

- [x] Tiempo de build completo actual: **~13.2 minutos** confirmado en
      esta sesión para el commit `c48e1af0` (check "Workers Builds:
      sinfrenos", 04:39:13 → 04:52:26 UTC, `success`), ya con la
      concurrencia=2 de la Fase 2 paso 2 aplicada. No se tiene un número
      equivalente medido *antes* de ese cambio (solo se sabía que el paso
      de imágenes aislado tardaba 15+ min a concurrencia=4), así que esto
      es el primer dato real de "build completo" del que se dispone.
- [x] Tamaño de `src/lib/generated/content-bundle.ts`: **2,243,682 bytes
      sin comprimir / 459,495 bytes gzip**, 341 entidades. Medido 8 sep
      2026 corriendo `node scripts/generate-content-bundle.mjs` — coincide
      con lo que ya tenían anotado.
- [x] `pregenerate-image-variants.mjs` sola: confirmado 15+ min con
      concurrencia=4 (número previo a esta sesión). Con concurrencia=2
      (plan free, 2 vCPU real) el número aislado del paso de imágenes
      todavía no se midió por separado — lo que sí se confirmó es el
      build completo (~13.2 min, ver arriba), que ya incluye ese paso.
- [x] Payload de `/buscar`: confirmado en código (antes de Fase 1) que
      mandaba el catálogo completo (341 entidades + imageBySlug +
      relationCountBySlug) como prop a un client component. Ya resuelto
      en Fase 1 — ahora solo viaja `counts` (4 números) + hasta 60
      resultados por búsqueda.

**Tiempo estimado:** 30-45 minutos.

---

## Fase 1 — Búsqueda server-side (prioridad más alta)

**Problema real confirmado:** `/buscar/page.tsx` llama `getAllEntities()` y
pasa el catálogo completo como prop a `SearchClient` (`'use client'`), que
arma un índice Fuse.js en el navegador. A 1000+ entidades esto es la peor
experiencia posible en un celular gama media: descarga completa del catálogo
antes de poder escribir una sola letra.

**Qué hacer:**
1. [x] Crear una ruta de búsqueda server-side — puede ser un Route Handler
   (`src/app/api/buscar/route.ts`) o un Server Action, según lo que se
   acomode mejor a cómo `SearchClient` ya maneja el estado de URL
   (`useSyncedSearchParams`).
2. [x] Mover la construcción de Fuse (`buildFuse`, ya existe en
   `lib/entity-list-filters.ts`) al servidor. Se puede seguir usando
   Fuse.js — el problema nunca fue la librería, fue *dónde* corre.
3. [x] `SearchClient` pasa a mandar la query (debounced, como ya hace) a esa
   ruta y recibir solo los resultados ya filtrados/paginados (ej. primeros
   60, como ya limita hoy) — no el catálogo completo.
4. [x] Mantener el resto de la UI intacta: filtros de tags, orden, badges,
   imágenes — todo eso sigue funcionando igual, solo cambia el origen de
   los datos (fetch en vez de prop completa).
5. [x] Revisar si `imageBySlug` y `relationCountBySlug` (hoy también se pasan
   completos a `SearchClient`) necesitan el mismo tratamiento o si al
   dejar de mandar el catálogo completo ya alcanza con resolverlos server-side
   por resultado, no por catálogo completo. — Resuelto: ambos se
   resuelven en `/api/buscar` solo para los ≤60 resultados devueltos.

**Cómo verificar:**
- [x] `npm run type-check`, `lint`, `test` en verde (lint: sin errores
      *nuevos* — el repo ya tenía 33 errores preexistentes sin relación).
- [x] Medido: el payload de `/buscar` bajó de "catálogo completo" a "solo
      resultados visibles" (confirmado por código, `/api/buscar` solo
      devuelve `items` para query no vacía, máx 60).
- [x] Probado en código: deep-linking por `?q=` intacto
      (`useSyncedSearchParams` no se tocó, `initialQuery` sigue llegando
      server-side y dispara el fetch inicial).
- [x] **Build de Cloudflare en verde para el commit de esta fase**
      (`5c1abe1f`, `conclusion: success`, confirmado en esta sesión).

**Riesgo principal:** romper el deep-linking por `?q=` que ya existe — probar
explícitamente ese caso antes de dar por cerrada la fase. — Marcado como
verificado en código; falta prueba manual en navegador real (no se hizo
en esta sesión, solo verificación estática).

**Estado: mergeado en `main`, commit `5c1abe1f`, build en verde.**

---

## Fase 2 — Pipeline de imágenes (el verdadero límite de build)

**Problema real confirmado:** `pregenerate-image-variants.mjs` procesa cada
imagen en 12 anchos distintos, varios a calidad 100, y ya hoy —con 242
imágenes— es el paso más lento del build (15+ minutos medidos). A 1000
vehículos con foto esto no es "más lento", es potencialmente **el build
completo dejando de terminar** dentro de los límites de tiempo de Cloudflare
Workers/Pages.

**Qué hacer (evaluar en este orden, de más simple a más invasivo):**
1. [x] **Reducir la matriz de anchos/calidad.** — Ya estaba hecho de una
   sesión anterior (`buildQualityByWidth()` en
   `scripts/lib/image-usage-manifest.mjs`). Auditado de nuevo en esta
   sesión: de los 12 anchos, 11 siguen necesitando quality:100 (algún
   componente real los pide a esa calidad — galería, zoom, lightbox).
   Solo 256px bajó a q95. Techo real alcanzado por este camino salvo que
   se cambie qué calidad piden los componentes en sí (fuera de alcance:
   eso es una decisión de producto/UX, no de infraestructura).
2. [x] **Paralelismo real.** — Hecho. Confirmado contra el changelog de
   Cloudflare: plan free = 2 vCPU real (4 en pagos). Concurrencia bajada
   de 4 a 2 + `sharp.concurrency(1)` (evita que el thread pool interno de
   libvips compita con el pool externo del script). Configurable por
   `--concurrency=N` o `IMAGE_BUILD_CONCURRENCY=N` sin tocar código, para
   cuando pasen a un plan pago. **Build completo confirmado en verde,
   ~13.2 minutos** (ver Fase 0).
3. [ ] **Transformación on-demand como alternativa de fondo** — NO
   arrancado. Sin justificación para arrancar: el build completo terminó
   en ~13 min, sin señales de estar cerca de un límite de tiempo real de
   Cloudflare. Solo evaluar si, al crecer el catálogo, el tiempo empieza
   a acercarse a un límite documentado.

**Cómo verificar:**
- [x] Medir de nuevo el tiempo del paso de imágenes y confirmar mejora —
      **confirmado indirectamente**: el build completo (que incluye este
      paso) terminó en ~13.2 min con éxito. No se aisló el paso de
      imágenes solo en esta sesión (queda como comando sugerido para la
      próxima sesión si se quiere el número exacto 1:1 contra el "15+
      min" previo).
- [ ] Revisar visualmente una muestra de fichas — no hecho en esta
      sesión (no se corrió un smoke test visual, solo se confirmó el
      build vía CI).
- [ ] `verify:all` completo en verde — no corrido localmente en esta
      sesión (el build real de Cloudflare sí corrió y dio éxito, que es
      la señal más fuerte, pero `verify:all` local queda pendiente).

**Estado: paso 1 y 2 mergeados en `main`, commit `c48e1af0`, build de Cloudflare confirmado en verde (~13.2 min). Paso 3 sin empezar y sin justificación actual para arrancarlo.**

---

## Fase 3 — Checkpoint de `content-bundle.ts`

**Por qué esperar a un checkpoint y no actuar ya:** hoy pesa 2,24 MB sin
comprimir / ~460 KB gzip para 341 entidades. Escalando lineal a 1000-1200
entidades daría ~7-8 MB / ~1,4 MB gzip — no es alarmante todavía, pero es
el único de los tres puntos que depende de un límite externo (tamaño de
script de Cloudflare Workers) y conviene medirlo en el camino, no al final.

**Qué hacer:**
- [ ] Definir un número de entidades intermedio (ej. 600-700) como
      checkpoint para volver a medir el tamaño real del bundle.
- [ ] En ese checkpoint, comparar contra los límites de tamaño de script
      del plan de Cloudflare Workers que estén usando (plan free —
      confirmar el límite exacto de tamaño de Worker script vigente, no
      asumirlo de memoria).
- [ ] Si hay margen cómodo (ej. por debajo del 50% del límite): no tocar
      nada, seguir sumando contenido.
- [ ] Si se acerca al límite: evaluar partir `content-bundle.ts` por tipo
      de entidad (un bundle para vehículos, otro para fabricantes, etc.)
      y que cada página importe solo el que necesita — cambio acotado,
      no una migración de datos.

**Tiempo estimado:** 15 minutos de medición en el checkpoint; el trabajo
de partir el bundle (si hace falta) es aparte y se dimensiona en ese momento.

**Estado: no arrancado. El catálogo sigue en 341 — todavía no se llegó al checkpoint de 600-700.**

---

## Fase 4 — Aplicar el mismo criterio que ya funcionó (índices, no reescrituras)

**Contexto:** el fix de relaciones bidireccionales (commit `47c6cfb5`,
índice invertido en memoria en vez de recorrer todo en cada request) es la
prueba de que la arquitectura actual escala bien con ingeniería puntual.
Vale la pena barrer el resto del código buscando el mismo patrón de riesgo
antes de que se vuelva un 503 real, no después.

**Qué hacer:**
- [x] Revisar `lib/entities.ts`, `lib/rankings.ts` y cualquier función que
      recorra `getAllEntities()`/`getEntitiesByType()` completo en cada
      request (no en build time) buscando bucles O(n²) similares al que ya
      se arregló en relaciones. — **Limpio, sin hallazgos.** Ver detalle
      abajo.
- [x] Para cada uno que aparezca: mismo patrón — precomputar un índice
      (Map/Set) una vez, no recorrer todo por request. — No aplica, no
      apareció ninguno.
- [x] Priorizar las páginas de listado (`/vehiculos`, `/fabricantes`,
      rankings) por ser las de mayor tráfico esperado a medida que crece
      el catálogo. — Confirmado que todas usan `generateStaticParams`
      (build-time) salvo `/buscar` (ya resuelto en Fase 1).

**Hallazgos del audit (8 sep 2026):**
- `entities.ts`: cache a nivel módulo + `slugIndex` para O(1). Limpio.
- `rankings.ts`: reduce/sort/map en un solo pase sobre datos ya
  cacheados. Limpio.
- `relations.ts`: el índice invertido de `47c6cfb5` sigue vigente y cubre
  `getBidirectionalRelations`/`getBidirectionalRelationCount`/
  `getBidirectionalRelatedEntitiesWithLabel`. `detectCircularRelations` es
  DFS acotado por `maxDepth` (no full-scan) y además **no tiene ningún
  caller en código de producción** (solo se usa en tests) — no es un
  riesgo de tráfico real, no se tocó.
- Hallazgo fuera de alcance: `/favoritos` — ver nota en "Estado" arriba.

**Cómo verificar:** tests existentes + medir tiempo de respuesta de esas
páginas antes/después con el catálogo actual (341) como base, ya que a
1000 el problema recién se notaría en producción si no se previene antes.
— No aplica cambio de código, no hay antes/después que medir.

**Estado: auditoría completa, sin cambios de código necesarios.**

---

## Fase 5 — Reevaluación real a los 1000 vehículos

Cuando el catálogo llegue efectivamente a ~1000 vehículos, repetir la
medición de Fase 0 completa y comparar contra el baseline original. Recién
ahí, con números reales y no proyectados, decidir si algo de lo que este
plan dejó afuera (Postgres, caché distribuido, admin panel) pasó a ser
necesario — no antes, y no por precaución genérica.

**Estado: no arrancado — el catálogo sigue en 341 entidades.**

---

## Resumen de orden de ejecución

1. ✅ Fase 0 — Medición base (una vez, antes de arrancar)
2. ✅ Fase 1 — Búsqueda server-side (mayor impacto, menor esfuerzo) — build en verde
3. ✅ Fase 2 — Pipeline de imágenes (pasos 1-2 hechos y confirmados con build en verde ~13.2 min; paso 3 sin justificación para arrancar)
4. ✅ Fase 4 — Auditoría de patrones O(n²) restantes (completa, sin hallazgos que arreglar)
5. ⏳ Fase 3 — Checkpoint de bundle (no llegó el momento, catálogo sigue en 341)
6. ⏳ Fase 5 — Reevaluación con datos reales a los 1000 vehículos
