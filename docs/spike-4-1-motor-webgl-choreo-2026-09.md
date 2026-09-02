# Spike 4.1 — Motor WebGL/choreography: ¿reconectar al Hero pineado o dar de baja?

**Fecha:** 2026-09-01
**Tipo:** spike de validación (no desarrollo comprometido), Fase 4 del roadmap.
**Alcance:** solo lectura/análisis estático del código actual. No se tocó
ningún archivo de producto en este spike.

## 1. Qué se pedía validar

Si tiene sentido conectar `RotatingHeroBackground` /
`src/lib/webgl/engine.ts` al nuevo Hero pineado (`PinnedScrollStages`,
panel 1 de la home) con la paleta real de AutoFicha (dorado/naranja/azul),
y en particular si **dos sistemas de "progreso de scroll" — el de
`PinnedScrollStages` y el de `ChoreoTelemetryBridge` — pueden coexistir
sin pisarse.**

## 2. Método

Relevamiento estático de todo el subárbol relacionado (`src/lib/webgl/`,
`src/lib/scroll/scroll-telemetry.tsx`, `src/components/webgl/*`,
`RotatingHeroBackground.tsx`) y de sus puntos de montaje reales: se buscó
cada componente como elemento JSX (`<Nombre` / `<Nombre.../>`) en todo
`src/`, no solo como import o mención en comentarios, para distinguir
"existe en el repo" de "se renderiza en producción hoy".

## 3. Hallazgo principal

**El sistema completo ya está desconectado del árbol de render — no desde
este spike, sino de antes.** Ningún componente de la capa WebGL/choreo se
monta hoy en ningún layout ni página:

| Componente / módulo | ¿Se renderiza en algún lado de `src/app`? | Nota |
|---|---|---|
| `WebGLBackground` (monta el motor) | **No** — cero usos como `<WebGLBackground` en todo `src/` | `layout.tsx` monta `Header`, `TrendingBar`, `Footer`, `PageTransitionBridge`, `ScrollRestorationBridge`, `ConsentBanner`, `Analytics` — no este componente |
| `ScrollTelemetryProvider` (alimenta la velocidad de scroll al bus) | **No** — cero usos como `<ScrollTelemetryProvider` | Sin esto, `webglSceneBus.setScrollProgress` nunca se llama en producción |
| `ChoreoTelemetryBridge` (fases de scroll de página completa: `awakening`/`presentation`/`immersion`/`invitation`) | **No** — cero usos como `<ChoreoTelemetryBridge` | Es el sistema al que se refiere el riesgo a validar; está muerto, no vivo |
| `SceneAmbientBridge` | **No** — cero usos como `<SceneAmbientBridge` | Sin esto, nada consume `publishAmbient()` del motor aunque el motor corriera |
| `ScrollTelemetryBridge` | **No** — cero usos como `<ScrollTelemetryBridge` | Ídem, del lado de scroll |
| `RotatingHeroBackground` | **No** — cero usos como `<RotatingHeroBackground` | El hero real usa `HeroSceneSVG` a través de `GalleryHero` (galería) y el hero de home usa `HeroVehicleShowcase`, sin relación con este componente |
| `SceneSection` | **Sí** — en `[entityType]/[slug]/page.tsx` (header y content de la ficha) | Ver §4 — vivo, pero como wrapper semántico plano, sin efecto visual del motor |
| `src/lib/webgl/engine.ts` (`SinFrenosWebGLEngine`) | Solo se importa dinámicamente dentro de `WebGLBackground` | Nunca se ejecuta porque `WebGLBackground` nunca se monta |

Dato adicional relevante para el pedido original: `engine.ts` **ya no es
WebGL** pese al nombre de la clase (`SinFrenosWebGLEngine`) y al nombre de
carpeta (`src/lib/webgl/`) — su propio docstring documenta que reemplazó
por completo a Three.js/shaders por Canvas 2D nativo ("Horizonte vivo"),
igual que ya reemplazó a `RotatingHeroBackground` en su día. No hay
dependencia de Three.js en `package.json`. O sea que aunque se decidiera
reconectar algo, no habría "motor WebGL" que reconectar en sentido
literal — sería reconectar un motor Canvas 2D con nombre heredado.

## 4. Sobre el riesgo específico a validar (coexistencia de dos sistemas de scroll)

**El riesgo no se puede materializar hoy porque solo hay un sistema
vivo.** `PinnedScrollStages` no importa ni referencia `webglSceneBus` en
ningún punto (se verificó por búsqueda directa en su código fuente) — es
un sistema de progreso de scroll autocontenido, con su propio estado de
React, sin acoplamiento al bus del motor. `ChoreoTelemetryBridge` calcula
fase a partir de `window.scrollY` sobre el alto total del documento
completo, un modelo de "una sola coreografía para toda la página" que ya
no corresponde al sitio actual (estático, con el pineo acotado al Hero de
la home) — y, como se muestra en §3, ni siquiera se monta.

El único punto de contacto real hoy es `SceneSection`, usado en la ficha
de vehículo (no en la home) para instrumentar visibilidad de sección vía
`useSectionSceneFocus`, que sí escribe en `webglSceneBus.setSectionFocus`
en cada montaje. Pero como no hay ningún suscriptor vivo que traduzca esa
escritura en algo visible (`SceneAmbientBridge`/`ScrollTelemetryBridge`/el
motor mismo están todos desmontados), esa escritura es hoy un no-op desde
el punto de vista del usuario. El propio código de `SceneSection` deja
constancia de esto: donde antes había un efecto visual real ligado al
motor ("un orb que sigue al cursor y reacciona con bloom en el fondo
WebGL"), el comentario en `[slug]/page.tsx` documenta que se reemplazó
por un borde CSS sólido, sin JS del motor, "sin función real" el efecto
anterior. Es decir: el propio equipo del proyecto ya evaluó ese camino en
la ficha de vehículo y se alejó de él.

## 5. Qué costaría igual reconectarlo (opción a) — y por qué no se recomienda

Reconectar no sería "activar un interruptor": implicaría, como mínimo,
(1) montar `WebGLBackground` de nuevo pero acotado al panel Hero del
track pineado en vez de fijo a toda la ventana (el layout actual de
`PinnedScrollStages` no es compatible con un canvas full-page fijo detrás
de todo sin rediseñar el stacking), (2) recablear su fuente de progreso
para leer el 0–1 interno del panel Hero de `PinnedScrollStages` en vez
del scroll de página completa de `ChoreoTelemetryBridge`/
`ScrollTelemetryProvider`, ninguno de los cuales expone hoy esa señal, y
(3) recolorear la paleta del motor (hoy "Night Test Track", tonos grises/
blancos) a dorado/naranja/azul de AutoFicha. A esto se suma que el
sitio tiene una decisión de producto explícita y repetida, documentada en
el propio `CHANGELOG.md`, de ir hacia un **sitio estático** (se removieron
Lenis, el rebote elástico, el auto-snap y el parallax continuo de
`<Reveal>` por pedido explícito de "que la página no se mueva sola") —
reconectar un motor de fondo reactivo a velocidad de scroll rema en
contra de esa dirección ya tomada, no la continúa.

## 6. Decisión

**(b) — se documenta como legado. Remoción programada como limpieza
futura, fuera de este spike.**

No se ejecuta la remoción ahora (está fuera de alcance de un spike de
validación), pero queda registrado qué se puede borrar sin impacto visual
alguno en producción (nada de esto se renderiza hoy) cuando se programe
esa limpieza:

- `src/lib/webgl/engine.ts`
- `src/lib/webgl/scene-bus.ts`
- `src/components/webgl/WebGLBackground.tsx`
- `src/components/webgl/ChoreoTelemetryBridge.tsx`
- `src/components/webgl/SceneAmbientBridge.tsx`
- `src/components/webgl/ScrollTelemetryBridge.tsx`
- `src/components/layout/RotatingHeroBackground.tsx`
- `src/lib/scroll/scroll-telemetry.tsx` — **con matiz**: solo la función
  `ScrollTelemetryProvider` (nunca montada) es legado; `smoothScrollTo`,
  exportada del mismo archivo, sí está en uso real (`PageTransitionBridge`,
  `ScrollRestorationBridge`) y debe conservarse — habría que separarla a
  otro archivo antes de borrar el resto, no borrar el archivo entero.
- `src/lib/hooks/useSectionSceneFocus.ts` y las dos líneas de
  `webglSceneBus.setPointerIntent` en `src/components/ui/Card.tsx` —
  con el mismo matiz: viven mientras `SceneSection` los siga llamando.

**`SceneSection.tsx` NO entra en esta lista.** Está en uso real hoy en la
ficha de vehículo como wrapper semántico (`data-scene-section`,
`data-scene-engine-id`) y su prop `onFocusChange` es una API pública
válida aunque hoy nadie la pase — no depende de que el motor exista para
cumplir su función actual. Tocarlo es un cambio aparte, no consecuencia
de esta decisión.

## 7. Próximos pasos (no ejecutados en este spike)

1. Programar un ticket de limpieza dedicado (fuera de la Fase 4 actual)
   que: separe `smoothScrollTo` a un archivo propio, borre los ocho
   archivos/porciones listados en §6, y quite las dos líneas de
   `setPointerIntent` en `Card.tsx`.
2. Correr `npm run check:unused` (knip) después del borrado para
   confirmar que no queda ningún import huérfano apuntando a los archivos
   eliminados — es la validación automática más barata disponible para
   este tipo de cambio.
3. `npm run type-check`, `npm test` y `npm run build` en verde antes de
   mergear esa limpieza, mismo criterio que el resto del proyecto.

## 8. Criterio de aceptación

Decisión explícita registrada: **(b)**, con evidencia concreta de por qué
(el sistema ya está inactivo en producción, no es una preferencia
estética) y una lista accionable para cuando se programe la limpieza. No
queda código "en el limbo" sin resolución — el spike cierra la ambigüedad
que tenía este subárbol del repo.
