# Mejoras a `src/lib` — GTA6-CODEX

## Cómo aplicar

Descomprimí y copiá la carpeta `src/` sobre la raíz de tu repo (sobrescribiendo
archivos existentes, agregando los nuevos). Después:

```bash
git add src/lib src/types/media.ts src/components/media
git commit -m "fix: agrega módulo media.ts faltante + caché + mejoras en src/lib"
git push
```

Validado end-to-end contra tu repo real: `npm install && npm run build`
compila las **147 páginas estáticas sin errores** (antes, el build fallaba).

## 🔴 Bug crítico que arreglé (esto rompía el build)

`src/lib/gallery.ts`, `src/app/page.tsx` y `src/types/index.ts` ya importaban
`@/lib/media` y `@/types/media` (`getMediaAssets`, `resolveMediaRender`,
`getMediaForEntity`, `MediaAsset`, etc.) — pero **esos archivos nunca existían
en el repo**, ni en el historial de git. `next build` fallaba directo con
`Cannot find module`. Del mismo modo faltaban tres componentes de UI que ya
se importaban: `TrailerPlayer`, `MediaCarousel`, `YouTubeEmbed`.

Reconstruí los cinco, respetando el contrato exacto que ya esperaban los
archivos existentes (lo inferí de cómo los llamaban) y sin inventar datos:
el video de cada trailer sale de `Trailer.officialUrl`, campo que ya existe
en tu contenido — no agregué ninguna fuente de datos nueva.

- `src/types/media.ts` — tipos (`MediaAsset`, `RenderableMedia`, etc.)
- `src/lib/media.ts` — `getMediaAssets`, `resolveMediaRender`, `getMediaForEntity`
- `src/components/media/YouTubeEmbed.tsx` — embed "facade" (miniatura +
  play, el iframe real solo se monta al hacer click, para no pagar el costo
  de YouTube en cada card de galería que nadie reproduce)
- `src/components/media/MediaCarousel.tsx` — el carrusel de "Contenido
  relacionado" en la ficha de cada entidad
- `src/components/media/TrailerPlayer.tsx` — el reproductor principal en la
  ficha de un trailer

## ⚡ Rendimiento: caché en memoria (`entities.ts`, `images.ts`)

Antes, cada llamada a `getEntity`/`getEntitiesByType`/`getAllEntities` volvía
a leer y re-parsear los `.json` de `src/content/` desde disco — y funciones
que recorren todo el contenido (`getBidirectionalRelations`, la galería, el
sitemap) terminaban re-leyendo el árbol completo una vez por cada entidad
existente. Con ~150 entidades eso es I/O real durante el build.

Agregué una caché en memoria (`Map`) que se activa **solo en producción/build**
(`NODE_ENV === 'production'`). En `next dev` el comportamiento es idéntico al
original — siempre lee de disco — para no romper el flujo de "edito un JSON y
lo veo reflejado sin reiniciar" que ya describía tu propio README.

Mismo criterio en `images.ts`: en vez de hasta 5 `fs.existsSync` por entidad
(uno por extensión candidata) en cada render, se lista el directorio una vez
por categoría y se cachea como `Set`.

## 🧹 Otros arreglos

- **`entities.ts`**: se agregó un core síncrono (`getEntitiesByTypeSync`,
  reutilizado por `media.ts`) — antes las funciones eran `async` solo de
  nombre, envolviendo `fs.readFileSync` (ya síncrono). `normalizeSlug` ahora
  normaliza acentos y `ñ` correctamente (`"Lucía Caminos"` → `lucia-caminos`),
  antes se perdían silenciosamente.
- **`seo.ts`**: el mapa de labels por tipo estaba **duplicado** contra
  `entity-labels.ts` (dos fuentes de verdad que podían desincronizarse) — lo
  saqué y reutiliza `ENTITY_TYPE_LABELS`. El JSON-LD ahora usa el `@type` de
  Schema.org específico por categoría (`Person`, `Vehicle`, `Place`,
  `Organization`, `VideoObject`...) en vez de un genérico `Thing` para todo
  el sitio — mejor elegibilidad para rich snippets.
- **`gallery.ts`, `relations.ts`, `entity-labels.ts`, `utils.ts`, hooks,
  `webgl/`**: revisados a fondo; ya estaban muy sólidos (buena separación de
  responsabilidades, disposal correcto en el motor WebGL, memoización donde
  hacía falta). Se incluyen sin cambios porque no encontré nada real que
  arreglar sin inventar trabajo — no quise tocar código que ya funciona bien
  solo para simular actividad.

## Lo que NO alcancé a hacer (fuera de `src/lib`, quedó honesto)

`MediaCarousel`/`TrailerPlayer`/`YouTubeEmbed` son funcionales y con estilo
del proyecto (paleta `gta-*`, mismos componentes `Card`/`Badge`), pero son
nuevos — no hay diseño original de referencia para compararlos. Si tenías en
mente un layout específico para el carrusel o el reproductor, decime y lo
ajusto.
