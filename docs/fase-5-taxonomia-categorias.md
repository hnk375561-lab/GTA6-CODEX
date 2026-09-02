# FASE 5 — Taxonomía de 2 niveles (`class` + `category`)

## 1. Objetivo

Agregar una capa de categoría principal (`category`) por encima del
`class` detallado existente, sin perder granularidad ni tocar los 250
archivos de contenido. `class` sigue siendo la fuente de verdad; `category`
es una agrupación derivada, 100% programática y determinista.

## 2. Las 77 clases detectadas (auditoría completa)

Extraídas de `src/content/vehiculos/*.json` (250/250 fichas con `class`
poblado). Conteo real entre paréntesis.

| # | class | n | category propuesta |
|---|-------|---|---------------------|
| 1 | 4x4 compacto | 2 | SUV |
| 2 | City car | 1 | Hatchback |
| 3 | Crossover fastback | 1 | SUV |
| 4 | Deportivo | 10 | Deportivo |
| 5 | Deportivo eléctrico | 1 | Deportivo |
| 6 | Deportivo híbrido | 1 | Deportivo |
| 7 | Furgon compacto | 1 | Utilitario |
| 8 | Furgón | 1 | Utilitario |
| 9 | Gran turismo | 1 | Deportivo |
| 10 | Gran turismo de lujo | 1 | Deportivo |
| 11 | Hatchback | 19 | Hatchback |
| 12 | Hatchback compacto | 1 | Hatchback |
| 13 | Hatchback deportivo | 3 | Hatchback |
| 14 | Hatchback económico | 2 | Hatchback |
| 15 | Hatchback eléctrico | 6 | Hatchback |
| 16 | Hatchback premium | 1 | Hatchback |
| 17 | Hatchback urbano | 2 | Hatchback |
| 18 | Hatchback/SUV | 1 | SUV |
| 19 | Hatchback/SUV coupé | 1 | SUV |
| 20 | Hatchback/Sedán | 3 | Hatchback |
| 21 | Microcar eléctrico | 1 | Otros |
| 22 | Minivan | 2 | Monovolumen |
| 23 | Minivan compacta | 1 | Monovolumen |
| 24 | Minivan de lujo | 1 | Monovolumen |
| 25 | Moto | 3 | Moto |
| 26 | Moto adventure | 1 | Moto |
| 27 | Moto aventura | 4 | Moto |
| 28 | Moto chopper | 1 | Moto |
| 29 | Moto clásica | 2 | Moto |
| 30 | Moto deportiva | 5 | Moto |
| 31 | Moto dual-sport 250cc | 1 | Moto |
| 32 | Moto enduro | 1 | Moto |
| 33 | Moto naked | 7 | Moto |
| 34 | Moto naked 200cc | 1 | Moto |
| 35 | Moto naked deportiva | 1 | Moto |
| 36 | Moto superdeportiva | 3 | Moto |
| 37 | Moto touring | 1 | Moto |
| 38 | Moto trail | 1 | Moto |
| 39 | Moto trail 150cc | 1 | Moto |
| 40 | Moto utilitaria | 2 | Moto |
| 41 | Pickup | 8 | Pickup |
| 42 | Pickup compacta | 5 | Pickup |
| 43 | Pickup eléctrica | 1 | Pickup |
| 44 | Pickup grande | 3 | Pickup |
| 45 | Pickup mediana | 4 | Pickup |
| 46 | SUV | 9 | SUV |
| 47 | SUV 4x4 | 4 | SUV |
| 48 | SUV 4x4 grande | 2 | SUV |
| 49 | SUV 4x4 premium | 1 | SUV |
| 50 | SUV compacto | 37 | SUV |
| 51 | SUV compacto premium | 1 | SUV |
| 52 | SUV coupé | 1 | SUV |
| 53 | SUV coupé compacta | 1 | SUV |
| 54 | SUV coupé deportiva | 1 | SUV |
| 55 | SUV de lujo | 3 | SUV |
| 56 | SUV de ultralujo | 1 | SUV |
| 57 | SUV deportivo | 2 | SUV |
| 58 | SUV eléctrico | 9 | SUV |
| 59 | SUV grande | 6 | SUV |
| 60 | SUV mediano | 8 | SUV |
| 61 | SUV mediano premium | 2 | SUV |
| 62 | SUV premium | 7 | SUV |
| 63 | SUV premium compacta | 2 | SUV |
| 64 | SUV todoterreno | 1 | SUV |
| 65 | Scooter | 4 | Moto |
| 66 | Sedán | 6 | Sedán |
| 67 | Sedán compacto | 2 | Sedán |
| 68 | Sedán deportivo premium | 1 | Sedán |
| 69 | Sedán económico | 2 | Sedán |
| 70 | Sedán ejecutivo | 3 | Sedán |
| 71 | Sedán eléctrico | 5 | Sedán |
| 72 | Sedán fastback | 1 | Sedán |
| 73 | Sedán híbrido | 1 | Sedán |
| 74 | Sedán mediano | 2 | Sedán |
| 75 | Sedán premium | 2 | Sedán |
| 76 | Sedán/Wagon grande | 1 | Familiar |
| 77 | Utilitario | 2 | Utilitario |

**Verificación automática:** `sum(n) == 250`, `len(classes) == 77`, y el
mapa fue validado contra el dataset real por script antes de escribir
código (`set(map.keys()) == set(classes_en_disco)`).

## 3. Distribución final por categoría

| category | vehículos | ¿página SEO propia? |
|---|---|---|
| SUV | 103 | Sí (`/categorias/suv`) |
| Moto | 39 | Sí (`/categorias/moto`) |
| Hatchback | 38 | Sí (`/categorias/hatchback`) |
| Sedán | 25 | Sí (`/categorias/sedan`) |
| Pickup | 21 | Sí (`/categorias/pickup`) |
| Deportivo | 14 | Sí (`/categorias/deportivo`) |
| Monovolumen | 4 | No (bajo umbral) |
| Utilitario | 4 | No (bajo umbral) |
| Familiar | 1 | No (bajo umbral) |
| Otros | 1 | No (excluido por diseño) |
| Coupé | 0 | No (sin representantes hoy) |
| Cabrio | 0 | No (sin representantes hoy) |
| **Total** | **250** | |

Umbral SEO: `MIN_VEHICLES_PER_SEO_CATEGORY = 8` (mismo criterio
preexistente del sitio, evita páginas de contenido pobre). Coupé y
Cabrio se incluyen en la taxonomía porque son carrocerías reales que
pueden aparecer en el catálogo a futuro; el sistema ya está listo para
generarles página el día que crucen el umbral, sin tocar código.

## 4. Casos ambiguos y su resolución

- **City car → Hatchback**: la carrocería real de un city car es un
  hatchback pequeño; no amerita categoría propia por 1 vehículo.
- **Hatchback/SUV, Hatchback/SUV coupé → SUV**: clases híbridas del
  dataset; el mercado posiciona estos modelos como SUV/crossover.
- **Hatchback/Sedán → Hatchback**: se resuelve por el primer término
  listado (carrocería predominante en estos casos concretos).
- **SUV coupé, SUV coupé compacta, SUV coupé deportiva → SUV**: mantienen
  altura y plataforma de SUV pese al techo estilo coupé; con solo 3
  vehículos no justifica una subcategoría "SUV coupé" separada. Si el
  catálogo crece en este segmento, se puede reevaluar.
- **Gran turismo, Gran turismo de lujo → Deportivo**: agrupación
  histórica del sitio (ya existía en el sistema previo de 7 grupos); un
  GT se busca y se vende como deportivo.
- **Sedán/Wagon grande → Familiar**: "Wagon" (station wagon) es señal de
  carrocería familiar más fuerte que "Sedán" en este caso puntual.
- **Microcar eléctrico → Otros**: único caso real sin encaje claro en
  ninguna de las 11 categorías con nombre; bucket residual honesto en
  vez de forzar una categoría de un solo vehículo.

## 5. Reglas de clasificación

1. **Tabla explícita** (`CLASS_TO_CATEGORY` en `src/lib/vehicle-category.ts`):
   fuente de verdad para las 77 clases auditadas arriba. Se usa primero,
   siempre.
2. **Fallback por keyword** (`FALLBACK_RULES`): solo se activa para un
   valor de `class` que no esté en la tabla explícita (ej. una clase
   nueva agregada a futuro sin actualizar el mapa todavía). Prioridad:
   Moto → Pickup → Cabrio → Monovolumen → Familiar → SUV → Sedán →
   Hatchback → Coupé → Deportivo → Utilitario. Si ninguna keyword
   matchea, cae en `Otros` — nunca se inventa una categoría sin señal
   textual real.
3. `getVehicleCategory(class)` devuelve `null` solo si `class` no está
   documentado (nunca se fuerza un valor sin dato de base).

## 6. Impacto técnico

- **No se tocó ningún archivo de `src/content/vehiculos/*.json`** — cero
  riesgo de pérdida de dato o de drift entre dato y clasificación (la
  categoría se deriva en cada build/request, siempre en sync con `class`).
- **Módulo nuevo**: `src/lib/vehicle-category.ts` reemplaza a
  `src/lib/vehicle-class-groups.ts` (que existía de una fase anterior,
  con solo 7 grupos y matching por keyword). El archivo viejo pasa a ser
  un shim de compatibilidad (`export * from './vehicle-category'`) para
  no romper ningún import existente.
- **Archivos actualizados** para consumir los nuevos nombres
  (`VehicleCategory`, `getVehicleCategory`, `computeCategoryOptions`,
  `categoryToSlug`/`categoryFromSlug`, `SEO_CATEGORIES`,
  `MIN_VEHICLES_PER_SEO_CATEGORY`):
  - `src/app/categorias/[grupo]/page.tsx` (rutas dinámicas + metadata SEO)
  - `src/app/sitemap.ts` (URLs de categoría en el sitemap)
  - `src/components/entities/EntityListExplorer.tsx` (filtro de categoría en /vehiculos)
  - `src/lib/entity-list-filters.ts` (`computeCategoryOptionsForList`)
  - `src/lib/vehicle-similar.ts` ("vehículos similares" por categoría)
  - `src/app/[entityType]/[slug]/page.tsx` (comentario de referencia)
- **Tests**: `src/lib/vehicle-category.test.ts` (nuevo) — 87 tests:
  1 caso por cada una de las 77 clases auditadas + fallback + slugs +
  `computeCategoryOptions`. Reemplaza a `vehicle-class-groups.test.ts`
  (eliminado, quedaba obsoleto contra la nueva taxonomía de 12 categorías).
- **Rutas dinámicas** `/categorias/[grupo]`: sin cambios de infraestructura
  (la ruta ya existía de una fase anterior); ahora `generateStaticParams`
  itera sobre las 12 categorías y genera página solo para las que superan
  el umbral SEO — hoy: suv, sedan, hatchback, pickup, deportivo, moto.
- **Verificación ejecutada y en verde**: `type-check`, `lint`, `test`
  (424/424), `verify:content`, `verify:relations`, `verify:min-count`,
  `verify:manufacturer-slugs`, `verify:reserved-keys`, `verify:tailwind`,
  `verify:seo`, `build` (828 páginas estáticas generadas).

## 7. Escalabilidad

Si el catálogo crece con vehículos de carrocería Coupé o Cabrio en el
futuro, solo hace falta:
1. Agregar la nueva ficha con su `class` real (ej. "Coupé deportivo").
2. Si esa `class` no está en `CLASS_TO_CATEGORY`, el fallback por keyword
   ya la clasifica correctamente sin tocar código.
3. Cuando la categoría cruce `MIN_VEHICLES_PER_SEO_CATEGORY` (8), su
   página `/categorias/coupe` o `/categorias/cabrio` se genera sola en
   el próximo build — cero trabajo manual adicional.
