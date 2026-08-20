# Auditoría de performance/bundle — agosto 2026

Alcance: análisis estático (`next build`, inspección de `.next/static/chunks`,
lectura de código). **No incluye Lighthouse ni ninguna métrica de campo**
(LCP/CLS/INP reales) — eso necesita un navegador real corriendo contra el
sitio, que quedó fuera del alcance de esta sesión (ver ítem 3 del plan
original: screenshots/render real, a cargo del usuario).

## 1. Hallazgo con fix aplicado: Zod viajando al bundle de cliente

`lib/entity-fields.ts` derivaba `RESERVED_ENTITY_KEYS` en runtime desde
`BaseEntitySchema.keyof().options` (Zod). Ese archivo lo importa
`EntityCard.tsx` (`'use client'`), que se renderiza en:

- la home,
- las 12 páginas `/[entityType]` (incluida `/vehiculos`, la señalada como
  más pesada),
- `/vehiculos/fabricante/[manufacturer]`.

Resultado: toda la librería Zod (~64 KB minificados, chunk `416-*.js`)
viajaba al cliente en esas rutas para obtener, en runtime, una lista de 15
strings que no cambia salvo edición manual del schema.

**Fix aplicado**: `RESERVED_ENTITY_KEYS` pasa a ser una constante plana
(`src/lib/entity-fields.ts`). Se agrega `scripts/verify-reserved-entity-keys.mjs`
(`npm run verify:reserved-keys`) que parsea `BaseEntitySchema` del source y
falla si la constante se desincroniza — mismo nivel de seguridad que tenía
la versión con Zod, sin el costo de bundle.

**Medido, build antes/después (`next build`, First Load JS reportado por Next)**:

| Ruta | Antes | Después | Diferencia |
|---|---|---|---|
| `/` (home) | 151 kB | 133 kB | −18 kB |
| `/[entityType]` (incl. `/vehiculos`) | 163 kB | 144 kB | −19 kB |
| `/vehiculos/fabricante/[manufacturer]` | 148 kB | 129 kB | −19 kB |
| `/[entityType]/[slug]` (ficha) | 124 kB | 124 kB | sin cambio (no renderiza `EntityCard`) |

No es un cambio enorme en términos absolutos, pero es gratis (cero riesgo,
cero pérdida de funcionalidad) y pega justo en las rutas de más tráfico,
`/vehiculos` entre ellas.

## 2. Ya está bien resuelto (verificado, no solo asumido)

- **Three.js (motor WebGL ambiental)**: NO viaja en el bundle inicial de
  ninguna ruta. `WebGLBackground.tsx` lo carga con `import()` dinámico
  dentro de un `useEffect`, solo en cliente, respetando
  `prefers-reduced-motion`. Los ~550 KB minificados de Three.js quedan en
  chunks separados (`b536a0f1-*.js`, `bd904a5c-*.js`) que se piden después
  del mount, no cuentan para First Load JS. Bien hecho tal como está.
- **Tilt 3D de las cards**: es CSS transform + un handler de mousemove en
  `EntityCard.tsx`, sin librería. Costo de bundle: ~cero.
- **Clips de video ambiental**: `preload="none"`, sin `autoPlay`, se
  descargan recién al primer `mouseEnter` de esa card puntual — ya
  documentado así en el propio código (Fase 8, punto 14). Ninguna card
  visible dispara descarga de video por sí sola.
- **`<img>` sin optimizar**: los únicos 2 casos (`EntityImage.tsx`,
  `GalleryExplorer.tsx`) son miniaturas de YouTube (`img.youtube.com`),
  dominio externo fuera de `next.config.js` a propósito — no es un
  descuido, ya está señalado con comentario + `eslint-disable` explícito.
- **Formatos de imagen**: `next.config.js` ya pide AVIF/WebP con
  `deviceSizes`/`imageSizes` bien poblados.

## 3. Riesgo sin confirmar — necesita medición real, no código

`EntityImage.tsx` decidió deliberadamente no usar `priority` en ninguna
variante, con el razonamiento de que "la primera pintura relevante del
sitio sigue siendo el hero animado de texto, no una foto de entidad". Ese
razonamiento vale para la **home** (hay un hero de texto grande antes de
Destacados). Pero en `/[entityType]` (ej. `/vehiculos`) el `<h1>` del
título es corto y el grid de 62 cards empieza inmediatamente después —
en viewports angostos es bastante plausible que el LCP real ahí sea la
imagen de la primera card, no el `<h1>`, y esa imagen no tiene `priority`
ni `fetchPriority="high"`.

No lo marco como bug porque no lo medí — es exactamente el tipo de cosa
que un Lighthouse real (o el Performance panel de Chrome) contesta en 30
segundos y que ninguna lectura de código puede confirmar con certeza. Si
cuando hagas el ítem 3 (`npm run dev` + mirar) el LCP de `/vehiculos`
resulta ser esa primera imagen, la solución es puntual: pasar
`priority` a la primera card del grid en `EntityListExplorer`/`EntityCard`
(o `fetchPriority="high"` sin `priority` si no querés que next/image la
excluya de lazy-loading global).

## 4. Fuera de este análisis estático

- Bundle real gzip/brotli servido (Next reporta un tamaño ya comprimido
  aproximado, pero el número real depende del hosting/CDN).
- CLS real del tilt/clip ambiental en pantallas angostas — es visual, no
  de bundle (overlap con ítem 3).
- Cualquier métrica de campo (CrUX, Web Vitals reales de usuarios).
