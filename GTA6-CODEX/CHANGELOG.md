# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto no usa versionado semántico formal todavía (sitio de
contenido en evolución continua, no una librería con API pública) — las
entradas se agrupan por fecha en vez de por número de versión.

## [Sin publicar]

_Sin cambios pendientes de publicar todavía. Las próximas entradas van acá arriba._

## [2026-08-26] — Enriquecimiento lote 5 (gama Honda)

### Cambiado
- Enriquecidas 5 fichas de Honda con datos reales verificados (specs,
  precio, evidencia con fuentes primarias/secundarias): `honda-africa-twin`,
  `honda-cbr600rr`, `honda-cr-v`, `honda-freed`, `honda-pcx-150`.
- Cobertura de evidencia sólida sube de 155/250 a 180/250 (72%).
- Nuevo script `scripts/apply-enrich-lote5-honda.mjs`.
- `docs/evidence-gap-queue.txt` actualizado (5 slugs removidos de la cola).

## [2026-08-26] — Filtro de potencia + tests del comparador

### Agregado
- Filtro avanzado de **potencia (hp)** en el listado de Vehículos: dos
  inputs numéricos (mín/máx) que se suman a los filtros existentes de
  estado/clase/tags, sincronizados con `?potencia=min,max` en la URL
  igual que el resto. Nuevo módulo `src/lib/vehicle-power.ts`
  (`parsePowerHp`, `computePowerBounds`) que extrae el número inicial
  del campo `power` (texto libre tipo "255 hp" o "200 hp (2.0 TFSI
  base)") — parseable en las 250 fichas actuales (0 fallos). El filtro
  solo se muestra si hay al menos 2 vehículos con potencia distinta
  entre sí (si no, no aporta nada real — mismo criterio que ya usaban
  `computeClassOptions`/`computeTagOptions`). Se agregó `power?: string`
  a la interfaz `Vehicle` (`src/types/entity.ts`): el campo ya existía
  en el contenido pero no estaba tipado.
- Tests unitarios: `parsePowerHp`/`computePowerBounds` (10 casos,
  `vehicle-power.test.ts`), el filtro de potencia combinado con el
  resto de `filterAndSortEntities` (4 casos nuevos en
  `entity-list-filters.test.ts`), y el hook `useVehicleCompare` completo
  (10 casos nuevos, `useVehicleCompare.test.ts`: selección, tope
  `MAX_COMPARE`, remove/clear, y que `compareVehicles` nunca invente un
  vehículo para un slug que ya no está en la lista de entidades).

### No incluido en este batch — filtros de precio y año
- **Precio**: el campo `price` sigue siendo texto libre con **múltiples
  monedas mezcladas sin conversión** (`"USD 58.000"`, `"EUR 13.500"`,
  `"ARS 41.464.000"`, a veces dos monedas en el mismo string). Un filtro
  de rango numérico sobre eso compararía cifras de escalas totalmente
  distintas como si fueran comparables — el mismo problema de fondo que
  ya había frenado las notificaciones de cambio de precio. Hace falta
  primero normalizar precio a un valor numérico + moneda estructurados
  (con tasas de conversión, que además quedan desactualizadas) antes de
  poder filtrar por precio sin mentir.
- **Año**: `anoLanzamiento` (el único campo numérico limpio para esto)
  está vacío en **240 de las 250 fichas** (96%). `anoProduccion` está
  presente en el 100%, pero **237 de 250 comparten literalmente el
  mismo valor** (`"2023-2024"`, placeholder genérico) — un filtro sobre
  ese campo agruparía casi todo el catálogo en un solo bucket y daría
  la falsa sensación de precisión. Este es un problema de completitud de
  datos (ver TODO.md → "Data Completitud" → "Llenar campos vacíos"), no
  de lógica de filtro — construir el filtro no lo resuelve, solo lo
  disimula.
- **Notificaciones de cambio de precio**: sigue sin construirse, mismo
  motivo que la entrada anterior (precio no estructurado + falta
  scraper programado + falta canal de envío real).

## [2026-08-26] — Comparador ampliado a 5 vehículos

### Cambiado
- El comparador de vehículos (barra flotante + panel modal sobre
  `/vehiculos`, y la página standalone `/comparar`) ahora permite elegir
  **hasta 5 vehículos** en vez de 3 (`MAX_COMPARE` en
  `VehicleCompareSheet.tsx`). El resto de la UI (barra inferior, sheet
  modal, selector con búsqueda, sincronización con `?v=` en la URL) ya
  estaba armado para leer ese límite desde una sola constante, así que
  no hizo falta tocar la lógica de selección — solo el número y el copy
  de `/comparar` ("hasta 3" → "hasta 5" en título, metadata y texto de
  ayuda).
- La tabla de comparación (`VehicleCompareTable`) gana scroll horizontal
  cuando hay más de 3 vehículos seleccionados: por debajo de ese umbral
  el layout es exactamente el de antes (columnas `1fr`, sin scroll); a
  partir de 4-5 cada columna tiene un piso de 180px y el contenedor
  scrollea en horizontal en pantallas angostas, en vez de aplastar las
  columnas hasta hacerlas ilegibles.

### Nota de mantenimiento
- Sigue pendiente confirmar si `C:\dev\GTA6-CODEX\src\` (fuera de
  `GTA6-CODEX\GTA6-CODEX\`) tiene contenido que no esté ya en el
  proyecto real antes de borrarla — ver instrucciones en el mensaje de
  esta entrega.

## [2026-08-26] — Lint fix + validación completa

### Corregido
- Warning de lint en `src/lib/seo.test.ts`: quedaba declarada (y sin usar)
  una fixture `mockMediaAsset` de un test viejo. Se eliminó junto con el
  import de `MediaAsset` que solo se usaba ahí. `npm run lint` y
  `next build` ahora terminan en 0 errores / 0 warnings.

### Verificado
- Corrida completa de la suite de validación, en verde:
  - `type-check` (tsc --noEmit) — sin errores.
  - `lint` (eslint) — sin errores ni warnings.
  - `test` (vitest) — **173 tests** en 13 archivos, todos OK. Incluye
    cobertura nueva de `useWishlist` (persistencia, sync entre
    instancias, storage corrupto) y `calculateFinancing` (amortización,
    casos límite).
  - `verify:content` — todas las entidades con `updatedAt` válido (o
    excluidas con warning, sin tirar abajo el build).
  - `verify:relations` — todas las relaciones entre entidades resuelven
    a entidades existentes.
  - `build` (next build) — **345 páginas estáticas** generadas sin
    errores, incluyendo `/comparar`, `/favoritos` y `/financiamiento`.

### Nota de mantenimiento
- El export/zip del repo (descarga desde GitHub como
  `GTA6-CODEX-main.zip`) trae, además de la carpeta real del proyecto
  (`GTA6-CODEX/`, la que tiene `package.json` y con la que corren todos
  los `npm run ...`), una carpeta `src/` suelta en la raíz del repo que
  no forma parte del build. Antes de armar el próximo zip de entrega
  conviene confirmar que esa carpeta no está duplicando o pisando
  contenido más nuevo por accidente — es probablemente la causa de que
  antes hayan tenido que borrar recursivamente una carpeta
  `GTA6-CODEX\GTA6-CODEX\GTA6-CODEX` triplicada en local.

## [Wishlist y Financiamiento]

### Agregado
- Wishlist / favoritos: botón de corazón en cada ficha (listados y
  catálogo) para guardar vehículos y otras entidades, persistido en
  `localStorage` del navegador (sin cuenta de usuario). Nueva página
  `/favoritos` para ver y gestionar lo guardado, con acceso desde el
  header y el footer.
- Calculadora de cuota/financiamiento (`/financiamiento`, link en el
  footer): simulación de cuota mensual (sistema francés) según precio,
  entrega, tasa anual y plazo. El precio se ingresa a mano — no se
  auto-completa desde la ficha del vehículo porque ese campo hoy es
  texto libre sin formato consistente (ver comentario en
  `src/lib/financing.ts`); auto-parsearlo arriesgaba mostrar una cuota
  calculada sobre una cifra incorrecta.
- Tests unitarios: `useWishlist` y `calculateFinancing`.
- Este CHANGELOG.

### No incluido en este batch
- Notificaciones de cambio de precio: no es un quick win real. Requiere
  (a) un precio numérico estructurado por vehículo — hoy `price` es
  texto libre inconsistente entre las 250 fichas, (b) un proceso
  programado que vuelva a scrapear/actualizar precios (el propio
  TODO.md lo lista aparte, en "Data Maintenance" > "Scraper de precios
  actualizados", como Major Task, no Quick Win), y (c) un canal de
  envío real (email o push), que implica un servicio de backend nuevo.
  Construir esto "rápido" habría significado simular alguna de esas
  partes — se prefirió no entregarlo antes que entregarlo a medias.

### Pendiente (ver TODO.md para el detalle completo)
- Notificaciones de cambio de precio, reserva de test drive.
- Documentación de API (OpenAPI) y de arquitectura.
- Full-text search mejorada, autocompletado, faceted search.

## Historial previo

El proyecto no tenía CHANGELOG hasta la entrada de "Wishlist y
Financiamiento". En base a `TODO.md`, el trabajo previo ya entregado
incluye, sin fechas exactas por entrada:

- Catálogo de 250 fichas de vehículos, categorizadas en 10 tipos.
- Sistema de tags, galería y referencias de media.
- Especificaciones técnicas completas y ratings de seguridad (NCAP).
- Optimización SEO (rutas, metadata, sitemap).
- Registro de auditoría (audit trail) y auditorías de integridad de datos
  (ver `docs/audit-powertrain-integrity-2026-08.md` y
  `docs/audit-performance-2026-08.md`).
- Precios globales para 9 países.
- Sistema de ratings de usuarios.
- Datos de rendimiento (performance) por vehículo.
- Modelos relacionados (relations) entre entidades.
- Comparador de hasta 3 vehículos lado a lado (`/comparar`), embebido
  también en el listado de vehículos.

De acá en adelante, cada cambio notable se agrega arriba, en
"Sin publicar", y se cierra bajo una fecha (`## [YYYY-MM-DD]`) al
publicarse.
