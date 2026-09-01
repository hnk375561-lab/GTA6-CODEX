# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto no usa versionado semántico formal todavía (sitio de
contenido en evolución continua, no una librería con API pública) — las
entradas se agrupan por fecha en vez de por número de versión.

## [Sin publicar]

### Agregado
- **Slot IDs reales de AdSense**: los 3 `<AdUnit>` insertados en producción
  (ficha de vehículo, comparador, fabricantes) usaban `data-ad-slot`
  inventados desde la Tarea 1.1 original — Google nunca los iba a servir.
  Reemplazados por los 3 slot IDs reales creados en la cuenta de AdSense
  (`pub-8424604961377300`): `8314744878` (ficha), `5425797006`
  (comparador), `2894897236` (fabricantes). `NEXT_PUBLIC_ADSENSE_CLIENT_ID`
  ya estaba cargado en Vercel — con esto los anuncios deberían empezar a
  servir de verdad (Google tarda de minutos a ~1h en activarlos).
- **FASE 4.2 (A/B testing de monetización)**: framework 100% cliente en
  `src/lib/hooks/useAbTest.ts` (sin backend ni feature-flag service, mismo
  criterio que `useWishlist.ts`) — sortea una variante determinística por
  visitante con `crypto.randomUUID()`, la persiste en `localStorage`
  (`autoficha:ab:<testId>`) y reporta la asignación a GA4 (evento
  `ab_test_assignment`, dimensiones `ab_test_id` / `ab_variant`).
  `analytics-events.ts` suma `trackAbAssignment` y `trackAbConversion` para
  poder cruzar variante vs. conversión en un Explore de GA4. Primer test
  real ya corriendo: `OlxAffiliateButton` sortea el copy del botón entre
  "Ver en OLX" / "Buscar en OLX" / "Ver publicaciones" cuando no se le
  pasa `buttonText` explícito, y reporta `ab_test_conversion` en el click
  junto al `affiliate_click` de siempre. 7 tests nuevos en
  `useAbTest.test.ts` (función pura `pickVariant` + hook con
  localStorage/jsdom, mismo patrón que `useWishlist.test.ts`).
- FASE 11 (prospección — media kit + dashboard de monetización):
  - **Media kit PDF automatizado**: `scripts/generate-media-kit.mjs` genera
    `prospeccion/media-kit-autoficha.pdf` a partir de
    `prospeccion/media-kit-data.json` (editable a mano). Usa `pdfkit`
    (nueva devDependency), branding con la paleta real del sitio
    (`auto-accent` naranja sobre fondo oscuro), y se regenera con
    `npm run generate:media-kit` cada vez que cambian los números de
    tráfico — no hay que rehacer el diseño a mano. Verificado
    visualmente (render a PNG con `pdftoppm`).
  - **Dashboard de monetización** (`/dashboard`): página protegida por
    Basic Auth vía `middleware.ts` nuevo, contra `DASHBOARD_PASSWORD`
    (env var; sin ella el dashboard responde 503, fail-closed). Muestra
    total acumulado, desglose por fuente (AdSense/OLX/MercadoLibre/
    publicidad directa/otro), desglose por mes y el historial completo,
    todo leído de `src/content/monetizacion/revenue-log.json` — carga
    100% manual a propósito: conectar la API real de AdSense o de GA4
    Data requiere OAuth y credenciales que hoy no existen, mientras que
    cargar 3 datos a mano toma 1 minuto (instrucciones en
    `src/content/monetizacion/README.md`). Incluye además links directos
    a los paneles oficiales (AdSense, GA4, Search Console, Vercel
    Analytics) para no perder la fuente real de cada número.
  - `npm run type-check`, `npm run lint` (0 errores) y `npm test`
    (440/440) en verde; `npm run build` genera `/dashboard` como ruta
    dinámica (`ƒ`) y confirma el middleware activo (`ƒ Proxy
    (Middleware)`), sin afectar ninguna de las 839 páginas estáticas
    existentes.

- FASE 9 (imágenes/multimedia):
  - **Galería multi-imagen por vehículo**: `resolveEntityImages`/
    `resolveEntityDisplayImages` (`src/lib/images.ts`, `src/lib/media.ts`)
    extienden la convención de archivo existente (`{slug}.ext`) a
    `{slug}-2.ext`, `{slug}-3.ext`, ... (hasta 12), sin usar el campo
    `gallery` heredado de los 250 JSON (queda intacto, sin tocar, sin
    migrar — sigue sin estar en el schema ni leído por ningún código).
    Nuevo componente `EntityGallery.tsx` (miniaturas + lightbox con
    zoom/prev/next, reutilizando `ZoomableImage`/`useModalFocus`) se
    monta en `[entityType]/[slug]/page.tsx` SOLO cuando hay 2+ imágenes
    resueltas; con 0 o 1 imagen (los 239 vehículos actuales) el render
    sigue siendo exactamente el `EntityImage` de siempre, sin cambios de
    comportamiento (confirmado con el resolver real: 0 vehículos con
    imagen extra numerada hoy).
  - **Imágenes de fabricante habilitadas**: se agregó `"fabricantes"` a
    `src/config/entity-image-categories.json` y se limpiaron las
    categorías muertas del proyecto anterior a GTA6 (`personajes`,
    `armas`, `misiones`, `trailers`, etc. — ya no existen en
    `EntityType`), dejando solo los 4 tipos reales
    (`vehiculos`/`fabricantes`/`guias`/`noticias`). Se creó
    `public/images/entities/fabricantes/` (vacía). La ficha de
    fabricante ahora sí intenta resolver imagen (antes estaba excluida
    explícitamente); sin assets todavía, cae al fallback CSS existente.
  - **Corrección del badge "IA" falso**: el fallback sin imagen
    (glifo vacío) mostraba incondicionalmente un sello "Recreación
    generada con IA" pese a que nunca se generó ninguna imagen con IA
    para ningún vehículo — se removió (`EntityImage.tsx`). El sello
    queda reservado para el caso real (`image.source === 'unverified'`
    con un archivo ya subido), que hoy no se usa en ningún vehículo,
    por decisión explícita del usuario de no generar imágenes con IA.
  - **3 pares de imágenes duplicadas corregidos** (decisión del
    usuario): `mercedes-benz-clase-e.webp`, `toyota-corolla-2024.webp` y
    `volkswagen-tera.webp` compartían bytes idénticos con la foto de
    otro vehículo (Clase C, Corolla Cross y T-Cross respectivamente —
    confirmado visualmente por badge/logo visible en cada foto). Se
    eliminaron los 3 archivos "equivocados"; esos vehículos quedan con
    el fallback CSS en vez de una foto que no les corresponde. Vehículos
    sin imagen: pasan de 8 a 11.
  - **No se tocó**: el registro editorial de video (`src/content/media/`
    sigue vacío, sin videos inventados) ni el sitemap de imágenes (se
    evalúa cuando haya contenido real de galería que lo justifique) —
    ver `AUDITORIA-FASE-9-IMAGENES-MULTIMEDIA.md`.
  - `npm run verify:all` en verde (type-check, lint, 440 tests,
    verify:min-count, verify:content, verify:relations,
    verify:manufacturer-slugs, verify:reserved-keys, verify:seo, build
    de 829 páginas, verify:tailwind).
- FASE 8 (fabricantes): se completaron `country` y `foundedYear` para los
  13 fabricantes que faltaban (abarth, aprilia, baic, changan, chery,
  gwm-haval, jac, mg, motomel, piaggio, wuling, xiaomi, zanella),
  agregando sus entradas a `MANUFACTURER_DATA` en
  `scripts/enrich-manufacturers.mjs` con datos verificados (Wikipedia
  ES/EN, sitios/comunicados oficiales de cada marca) y corriendo el
  script. No se tocó `content` (narrativa editorial) de ningún
  fabricante — ya existía y no era genérica. Confirmado 75/75
  fabricantes completos y `npm run verify:all` en verde (type-check,
  lint, 440 tests, verify:min-count, verify:content, verify:relations,
  verify:manufacturer-slugs, verify:reserved-keys, verify:seo, build,
  verify:tailwind). No se tocó `noticias`/`guias` (siguen en 0
  contenido, sin pedido de contenido específico — ver
  `AUDITORIA-FASE-8-CONTENIDO.md`).
- Ranking programático por potencia y precio en el listado de vehículos
  (audit2.md, sección 15, oportunidad #5: "Ranking programático — más
  potentes / mejor consumo"). Dos nuevas opciones de orden en `/vehiculos`:
  "Más potentes" (`parsePowerHp`, descendente) y "Menor precio"
  (`parsePriceUsd`, ascendente) — mismo patrón que el orden "Mejor
  rendimiento" ya existente. Los vehículos sin valor parseable van al
  final del listado, nunca se tratan como 0 (evita un ranking falso).
  Deliberadamente no se agrega "mejor consumo": `consumo` es texto libre
  que mezcla unidades donde un número más alto significa cosas opuestas
  (l/100km vs. MPGe/km·l — ver nota en `vehicle-compare-best.ts`), así
  que ordenar por ese campo de forma automática inventaría una
  comparación que el dato no respalda. Cada opción solo se ofrece si hay
  al menos 2 vehículos con valor parseable en la lista actual.
- Comparador: destacar el mejor valor por fila (audit2.md, sección 16,
  quick win #13). Se marca con una etiqueta "Mejor" el vehículo con
  menor precio (USD, vía `parsePriceUsd`) y el/los vehículo(s) con mayor
  puntaje en cada métrica de rendimiento (velocidad/aceleración/manejo/
  frenado, vía `performanceToScale`). Deliberadamente NO se destaca en
  consumo/dimensiones/transmisión/tracción/clase: son texto libre
  heterogéneo sin una dirección de "mejor" confiable (`consumo` en
  particular mezcla unidades donde un número más alto significa cosas
  opuestas según l/100km vs. MPGe/km·l). Nuevo helper puro
  `getBestValueIndices` en `vehicle-compare-best.ts`, con tests.

### Quitado
- `competition` (bloque completo: `competidores`/`posicionMercado`/
  `ventajas`) en las 250 fichas de vehículo, más su tipo/schema
  (`VehicleCompetition`). Auditado el dato (parte del quick win #13 de
  audit2.md, sección 16: "consolidar el copy de `competition.competidores`
  para que se alimente de `relations` en vez de mantenerse vacío por
  separado"), resultó ser relleno genérico — `posicionMercado` tiene solo
  9 valores únicos en 250 fichas, `ventajas` solo 6 tuplas únicas en 155
  — y nunca se renderizó en ningún punto de la UI. La necesidad real
  (mostrar competidores de un vehículo) ya la resuelve `relations[]` con
  `relation: "competidor"` (poblada en 244/250 fichas), consumida por
  `RelationsPanel` con imagen, link y botón "Comparar". Limpieza aplicada
  vía `audit-placeholder-data.mjs --apply`, extendido para este caso
  (mismo patrón que ya usó para `specifications`/`audit` en `8a8422b5`).

### Corregido
- **Branding legado de GTA6 en dos lugares "vivos" (no comentarios
  históricos):** auditoría de todo el repo buscando `gta6|gta-|leonida|
  rockstar|take-two` encontró que casi todos los hits restantes son
  comentarios que documentan el pivote a propósito (correcto, quedan). Pero
  dos eran artefactos reales todavía en uso:
  - `ConsentBanner.tsx` guardaba el consentimiento de cookies bajo la key
    de `localStorage` `gta6zona-cookie-consent`. Renombrada a
    `autoficha-cookie-consent`. Efecto secundario aceptado: quien ya había
    aceptado/rechazado bajo la key vieja va a ver el banner una vez más.
  - `src/content/README.md` seguía describiendo el modelo de datos del
    proyecto anterior (tipos `personajes`, `misiones`, `armas`, etc. que
    nunca existieron en este repo tras el pivote) en vez del modelo real
    (`vehiculos` / `noticias` / `guias`, ver `src/types/entity.ts`).
    Reescrito para reflejar el schema real (`Vehicle`, niveles de
    `evidence`, campos de `BaseEntity`) en vez de contenido ficticio de
    GTA6.

### Quitado
- **`scroll-behavior: smooth` global en `<html>`:** último remanente de
  suavizado de scroll, independiente de Lenis. En navegadores basados en
  Chromium esta propiedad CSS también se aplica al scroll disparado por la
  rueda del mouse (no solo a saltos por ancla o `scrollIntoView` sin
  `behavior` explícito) — cada movimiento de rueda quedaba "de más" animado
  por el navegador en vez de aplicarse al instante, dando la sensación de
  que la página seguía bajando/subiendo sola después de mover la rueda.
  Los saltos puntuales que sí quieren animación (botón "seguir
  scrolleando", restauración de posición al volver atrás) siguen andando
  igual: piden `behavior: 'smooth'` de forma explícita en JS
  (`scroll-telemetry.tsx`), que no depende de esta propiedad global.
  Validado: `tsc --noEmit`, `eslint src` y `next build` (344 páginas)
  limpios.
- **Scroll con inercia (Lenis), rebote elástico y snap automático — sitio
  ESTÁTICO:** el pedido explícito, repetido varias veces, fue que mover la
  rueda hacia abajo/arriba mueva el documento exactamente eso y nada más —
  sin que la página siga desplazándose sola después de soltar la rueda, sin
  rebote en los bordes, sin saltos automáticos a un borde de sección. Se
  quitan los tres mecanismos que rompían eso:
  - `LenisProvider` (`lenis-provider.tsx`, borrado): instanciaba Lenis con
    una desaceleración larga (~1.35s) — la página seguía moviéndose después
    de soltar la rueda. Reemplazado por `ScrollTelemetryProvider`
    (`scroll-telemetry.tsx`, nuevo): NO toca el scroll en absoluto, solo
    lee `window.scrollY` real (rAF-throttled) para seguir alimentando los
    efectos decorativos de fondo (grano fílmico reactivo a velocidad,
    canvas "horizonte vivo") que ya consumían `webglSceneBus` — esos
    siguen vivos, solo que ahora reaccionan a la velocidad REAL de la
    rueda, sin inercia artificial.
  - `OverscrollBounceBridge` (borrado): estiraba `#page-content` con un
    transform elástico transitorio al pegar contra los extremos del
    scroll. Sin reemplazo — el navegador vuelve a su comportamiento nativo
    en los bordes.
  - `ScrollSnapCatch`/`scroll-snap.ts` (borrados): auto-scrolleaba a un
    borde de sección cuando el usuario se detenía cerca. Ya no se montaba
    en ninguna página; se termina de borrar por completo (dependía de
    Lenis).
  - `smoothScrollTo` se mantiene (ahora en `scroll-telemetry.tsx`) para los
    dos únicos usos legítimos que quedan — un salto puntual disparado por
    una acción explícita de la persona, no movimiento ambiental: el botón
    "seguir scrolleando" del hero y la restauración de posición al volver
    atrás. Usa `scrollIntoView`/`scrollTo` nativos, sin motor propio.
  - `RotatingHeroBackground`: se saca el parallax de scroll que desplazaba
    y hacía zoom al fondo del hero según cuánto se había scrolleado (efecto
    "cámara acercándose"). Se conserva solo el parallax de cursor (mouse,
    no scroll) y la rotación con crossfade entre paletas.
  - Dependencia `lenis` removida de `package.json`.
  Validado: `tsc --noEmit`, `eslint src`, `npm test` (197 tests) y
  `next build` (344 páginas) limpios.
- **Parallax de scroll en cards de la home (Capítulo 2.2, `useParallax`/
  `ParallaxElement`):** las cards de categorías, destacados, niveles de
  evidencia y últimas noticias trasladaban y escalaban a una fracción de
  la velocidad de scroll durante todo su tránsito por el viewport —
  contrario al pedido de "sitio estático": el contenido debe aparecer
  una vez al entrar en pantalla y quedar fijo, sin moverse en ningún
  sentido mientras se scrollea por encima. Se reemplazan los
  `<ParallaxElement>` por `<div>`/componentes simples y se borra el hook
  (`src/lib/hooks/useParallax.tsx`, sin otros usos en el código) y su
  regla CSS asociada (`[style*="--parallax-offset"]`). El fondo del hero
  (`RotatingHeroBackground`) mantiene su propio parallax leve, acotado a
  esa capa de fondo dentro del hero, sin afectar el resto de la página.
  Validado: `tsc --noEmit`, `eslint` y `next build` (344 páginas) limpios.

### Cambiado
- **`<Reveal>` vuelve a un reveal simple, sin parallax/skew continuo:**
  revert de las tres vueltas anteriores (parallax continuo, versión "a
  full" y el `skewX` atado a `webglSceneBus`). El componente vuelve a su
  comportamiento original: IntersectionObserver único, fade + slide
  corto de un solo disparo por elemento, sin drift ni inclinación
  mientras el elemento permanece en pantalla. Pedido explícito: sitio
  quieto y estable, donde el único "evento" es que el contenido aparece
  al llegar al viewport y después queda fijo. Sin cambios de firma
  pública salvo la baja del prop `disableMotion` (no tenía usos en el
  resto del código). Validado: `tsc --noEmit` limpio.
- **`<Reveal>` reacciona a la velocidad real de scroll, no solo a la
  posición:** tercera vuelta sobre el parallax, pedido explícito de
  "más movimiento, más vida". Mientras un `<Reveal>` está efectivamente
  en pantalla, se suscribe a `webglSceneBus` (la misma señal de
  velocidad de scroll que ya alimenta al motor WebGL) y aplica un
  `skewX` proporcional a esa velocidad en tiempo real, saturado suave
  con `tanh` a ±9° — el gesto característico de rockstargames.com/VI:
  el contenido se inclina cuando se scrollea rápido y se endereza solo
  al frenar. La suscripción se abre/cierra con la propia visibilidad
  del elemento (motionObserver ya existente), así que en cualquier
  momento hay como mucho una decena de listeners vivos sobre el bus, no
  uno por cada `<Reveal>` del sitio. Sin cambios de firma pública ni en
  los usos existentes. Validado: `tsc --noEmit` limpio, build de
  producción (344 páginas) OK, 197/197 tests pasando.

- **Parallax "a full" en `<Reveal>`, segunda vuelta:** el primer pase
  (drift ±18px, escala ±2%, transición de 700ms) resultó demasiado sutil
  — pedido explícito de hacerlo mucho más agresivo/notorio. Se subió
  todo de escala: entrada con traslados de hasta 160px y rotación
  inicial (±2-4°) por dirección, blur de entrada (6px→0) tipo
  profundidad de campo, y el drift continuo ahora combina traslado
  diagonal (26px horizontal / 70px vertical), escala de hasta 14% y
  rotación continua de hasta 4.5° que invierte de signo al cruzar el
  centro del viewport, más blur continuo (hasta 2.5px) que aparece lejos
  del centro y se disuelve al pasar por él. Transiciones de transform
  bajadas de 700ms a 460ms (con un leve overshoot, `cubic-bezier(0.34,
  1.56, 0.64, 1)`) para que el drift se sienta pegado al scroll real en
  vez de un arrastre perezoso. `direction="curtain"` ya no queda
  excluido del drift continuo (antes no montaba el segundo observer):
  ahora el clip-path y el parallax conviven. Observer de movimiento
  pasado de 25 a 33 umbrales para más resolución con transiciones más
  cortas. Sin cambios de firma pública ni en los 19 usos existentes.
  Validado: `tsc --noEmit` limpio, build de producción (344 páginas) OK,
  197/197 tests pasando.

- **Parallax continuo en `<Reveal>` (primera vuelta):** hasta ahora
  `<Reveal>` (usado en
  autos/`EntityCard`, fichas de vehículo, galería de fotos y
  `MediaCarousel`/clips en toda la home y las 344 páginas del sitio)
  solo hacía un fade+slide de un único disparo al entrar al viewport —
  el contenido "aparecía" pero quedaba estático el resto del scroll,
  muy lejos del efecto continuo tipo rockstargames.com/VI que se busca.
  Se le sumó un segundo `IntersectionObserver` (25 umbrales) que calcula
  la posición del elemento relativa al centro del viewport durante todo
  su tránsito y expone `--rv-offset`/`--rv-mag` como CSS vars — sin
  tocar React state ni forzar re-render (escritura directa al DOM), así
  que el costo en listados grandes (`/vehiculos`, 62 cards) es
  despreciable. El resultado: todo el contenido envuelto en `<Reveal>`
  ahora entra deslizándose, se asienta al pasar por el centro del
  viewport y sale con un leve flote hacia arriba (drift ±18px, escala
  ±2%), sin cambiar la firma pública del componente ni ninguno de sus
  19 usos existentes. Nueva prop opcional `disableMotion` para
  bloques donde el drift no suma. La variante `curtain` queda sin
  drift a propósito (su clip-path ya es el movimiento). Respeta
  `prefers-reduced-motion: reduce` (ya forzaba `transform: none` en
  `.reveal`, sin cambios ahí).

## [2026-08-26] — Enriquecimiento lote 6 + fix de nivel de evidencia inválido

### Cambiado
- Enriquecidas 6 fichas con datos reales verificados: `hyundai-elantra`,
  `hyundai-santa-fe`, `isuzu-mu-x`, `jac-js6`, `jaguar-f-type`,
  `kawasaki-z900`.
- Nuevo script `scripts/apply-enrich-lote6.mjs`.
- `docs/evidence-gap-queue.txt` actualizado (6 slugs removidos de la cola).

### Corregido
- **Bug de datos:** los lotes 4 y 5 (10 fichas: `toyota-hilux`,
  `ford-mustang`, `porsche-911-carrera`, `ferrari-296-gtb`,
  `volkswagen-golf-gti`, `honda-africa-twin`, `honda-cbr600rr`,
  `honda-cr-v`, `honda-freed`, `honda-pcx-150`) usaban
  `evidence.level: "oficial-verificado"`, un valor que **no existe** en
  el enum de `src/types/entity.ts` (`oficial-nombrado` /
  `oficial-visual` / `oficial-visual-multifuente` / `respaldado` /
  `especulativo`). `scripts/audit-evidence-coverage.mjs` las contaba
  como "level inválido", ocultando su evidencia real. Corregido a
  `oficial-nombrado` en las 16 fichas afectadas y en los scripts de
  lote 4/5/6.
- Cobertura de evidencia sólida: 155/250 → **196/250 (78%)**.

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
