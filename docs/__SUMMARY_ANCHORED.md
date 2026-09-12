# Sin-Frenos — audit remediation (retrospectiva)

Trabajo completado y verificado frente a `AUDITORIA_UX_RED_TEAM_BRUTAL.txt` +
`HERO_HOME_PRODUCTION_AUDIT.txt`. Proyecto real en
`C:\Users\santi\Downloads\Sin-Frenos-main\Sin-Frenos-main` (no es repo git).

## Corregido y verificado (P0-04 · P1-05 · P2-11 · P3-13 · P4-14 · P0-01)

### P0-04 — `dimensiones` como objeto en 25 fichas EV (CRÍTICO)
- 25 vehículos eléctricos (Tesla, BYD, Hyundai/Kia, NIO, Nissan Leaf, Porsche
  Taycan, Renault, Smart, MG4, Chevrolet Bolt, VW ID.4, Wuling Mini EV,
  Xiaomi SU7) guardaban `dimensiones` como `{ largo, ancho, alto,
  distancia_ejes }` → `VehicleSchema` exige `z.string()` → `safeParseVehicle`
  las rechazaba → `entities.ts` las descartaba en build time → ni siquiera
  aparecían en `generateStaticParams` (25 páginas de detalle perdidas) y la
  home contaba 225 en vez de 250 (P2-09, consecuencia directa).
- Remedio: `scripts/normalize-dimensiones.mjs` (preexistente) convierte el
  objeto a string etiquetado: `"4719 mm largo x 1849 mm ancho x 1440 mm alto
  (2875 mm entre ejes)"`, conservando `distancia_ejes` entre paréntesis.
  Aplicado a las 25 fichas.
- **Verificación**:
  - Scan de runtime: 0 objetos restantes, 250 strings, 0 violaciones del
    constraints `z.string().nullable().optional()`.
  - `npx tsx` valida las 250 fichas contra `VehicleSchema`: **250/250 pasan**.
  - `next build` (static export) prerenderiza `/[entityType]/[slug]` con 341
    rutas (vs 316 antes); los 25 EV pages existen en `out/vehiculos/` (25/25).
  - La home vuelve a contar 250 (`totalVehicleCount = allVehicles.length`).

### P2-11 — Nav sin "Noticias"
- `Header.tsx` `NAV_LINKS` no incluía `/noticias` (3 artículos existían).
- Agregado `{ href: \`/${EntityType.NEWS}\`, label: 'Noticias' }` (EntityType
  importado ya).

### P3-13 — Código REF crudo en ficha de entidad
- `[entityType]/[slug]/page.tsx:226-228` mostraba `{type}/{entity.slug}` en un
  `<code>`. Reemplazado por `REF: {entity.slug.slice(0, 8).toUpperCase()}`,
  alineado con la convención de `EntityCard.tsx:407` y
  `VehicleArchiveIndex.tsx:89`.

### P4-14 — `text-gradient-vice` definido cero veces (CSS roto)
- Clase usada en 13 componentes pero **no definida** en `globals.css` → no-op
  silencioso (texto sin gradiente de marca).
- Añadida la utilidad en `globals.css` (junto a `.logo-mark`) con el gradiente
  de marca `oxide-red → archive-green` vía `background-clip: text`.

### P1-05 — Links de fabricante a anclas inexistentes
- `ManufacturerArchive.tsx:66` enlazaba a `/fabricantes#<kebab>` pero la
  grilla destino no tenía `id`. `ManufacturerCardV2.tsx` ahora expone
  `id={entity.title.toLowerCase().replace(/\s+/g, '-')}` en su root `<div>`,
  coincidiendo transformación por transformación con el origen del link.

### P0-01 — README con infra/despliegue obsoletos
- Link "Sitio en vivo" `gta-6-codex.vercel.app` → `https://hnk375561-lab.github.io/Sin-Frenos`.
- Tabla `| Deploy | Vercel |` → `| Deploy | GitHub Pages |`.
- Bullet sobre `vercel.json` (no existe en el repo) reemplazado por la
  referencia correcta a `.github/workflows/deploy-pages.yml`.

## Corrección incidental (latente, hallada al correr P0-04)
- El guardia `import.meta.url === \`file://${process.argv[1]}\`` de ambos
  scripts `scripts/normalize-*.mjs` era un **no-op silencioso en Windows**
  (el prefijo de disco `file:///C:/...` nunca coincide con `'file://C:\...'`).
- Reemplazado por la comparación canónica cross-platform:
  `import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href`.
  Esto es lo que permitió correr `normalize-dimensiones` en este sandbox.
- Aplicado también a `normalize-generacion.mjs` (misma defensa) → su
  `npm run normalize:generacion:selftest` ahora ejecuta (11 casos, OK) en vez
  de retornar exit 0 sin hacer nada.

## Gates de calidad (todos pasados)
- `npm run verify:min-count` → OK (250 vehículos, 3 noticias, 13 guías parsean).
- `npm run type-check` (`tsc --noEmit`) → exit 0.
- `npm run lint` (`eslint .`) → exit 0.
- `npm test` (`vitest run`) → 27 archivos / 456 tests, OK.
- `npx next build` (static export) → exit 0, 1326 páginas estáticas.

## Pendientes (no abordados — requieren scope de contenido/modelo)
- **P1-06** — artículos editoriales modelados como vehículos (modelo de datos).
- **P2-12** — `/mapa` es un stub (está etiquetado como "en construcción").
