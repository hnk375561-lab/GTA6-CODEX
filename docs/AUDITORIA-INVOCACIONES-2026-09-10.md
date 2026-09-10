# Auditoría de invocaciones/cuota — 10/09/2026

## Contexto del incidente

Plan gratuito de Cloudflare Workers: **100.000 requests/día**. El sitio venía
consumiendo ~800.000/día (8x el límite) con un uso declarado de solo 4-5
visitas del propio dueño, sin dominio propio conectado (sirviendo 100% desde
`sinfrenos.<cuenta>.workers.dev`).

Métricas del momento del incidente (dashboard de Cloudflare, ventana 24hs):
- Invocations: ~809.000
- Asset requests: ~814.000 (808.87k de ellos contra `assets.local`, el
  hostname interno con el que el Worker sirve sus propios assets estáticos)
- Invocations ≈ Asset requests casi 1:1

Esa proporción 1:1 es la pista clave: indica que **cada asset estático
individual** (JS, CSS, imágenes, fuentes) que carga el navegador **reinvoca
el Worker completo**, en vez de servirse desde una caché de borde. Con una
app Next.js moderna cargando decenas de assets por página, eso multiplica
cualquier visita real por un factor muy alto.

## Causas identificadas y estado de cada una

### 1. Prefetch automático de Next.js sin límite (RESUELTO — sesión previa)
`<Link>` de Next.js hace prefetch automático de cualquier link visible en
pantalla, sin click. En un catálogo con cientos/miles de tarjetas de
vehículo, cada scroll disparaba un prefetch por tarjeta.

**Fix**: `prefetch={false}` agregado en todos los `<Link>` que se repiten
dentro de un `.map()` (tarjetas de vehículo/fabricante, resultados de
búsqueda, nav del header, apariciones en tráiler, filas de ranking). Los
`<Link>` únicos (logo, CTAs sueltos) se dejaron con el default: son un solo
link por render, no un multiplicador.

Archivos tocados: `EntityCard.tsx`, `VehicleCardV2.tsx`,
`ManufacturerCardV2.tsx`, `Header.tsx`, `Footer.tsx`, `SearchClient.tsx`,
`MediaCarousel.tsx`, `RankingsLeaderboardTabs.tsx`, `GalleryExplorer.tsx`.

### 2. Sin rate limiting ni bloqueo de bots (RESUELTO — sesión previa)
No existía ningún límite: un mismo cliente sostuvo ~9 req/s por 24hs sin que
nada lo frenara.

**Fix** en `middleware.ts`:
- Lista de user-agents bloqueados (scrapers, crawlers de IA, herramientas de
  línea de comandos: `curl`, `wget`, `python-requests`, etc.) → 403.
- Rate limiting real vía Cloudflare Rate Limiting API (binding nativo,
  contador compartido a nivel de cuenta, no por isolate): 300 req/min en
  rutas sensibles (`/api`, `/dashboard`, o cualquier método no-GET/HEAD),
  400 req/min en navegación normal → 429 al superarlo.
- Fallback en memoria (`Map`) para contextos sin el binding (dev local,
  tests).

**Límite importante de este fix, documentado en el propio código**: bloquear
o rate-limitear *dentro* del Worker **no baja el conteo de Invocations** —
Cloudflare ya contó la invocación en el momento en que el request llegó al
Worker, sea cual sea la respuesta que el código decida devolver después. Lo
único que esto logra es no gastar CPU/subrequests de más una vez adentro.

### 3. Sin `Cache-Control` en el catálogo estático (RESUELTO, con matiz — sesión previa)
Todo el catálogo se genera 100% estático en build. Sin `Cache-Control`,
Cloudflare trata cada request como no-cacheable y reenvía el 100% del
tráfico al Worker — la causa directa del 1:1 Invocations/Asset requests.

**Fix** en `next.config.js`: `Cache-Control: public, s-maxage=3600,
stale-while-revalidate=86400` en todo lo que no sea `/api`, `/dashboard`,
`/_next`, `/favicon.ico` (y ahora `/images`, `/logos` — ver punto 5).

**Matiz crítico que este fix por sí solo NO resuelve**: `s-maxage` solo le
habla a *caches compartidos* (el CDN de Cloudflare). Y **el subdominio
`*.workers.dev` está explícitamente excluido del cacheo de borde de
Cloudflare** — es un dominio pensado para testing, no para producción con
CDN. Sin un dominio propio conectado (pestaña *Domains* del dashboard), este
header no tiene ningún efecto real todavía; queda listo y funcionando el día
que se conecte un dominio, sin tocar una línea más de código.

### 4. Crawlers "normales" sin bloquear (RESUELTO — sesión de hoy)
`robots.ts` y el blocklist de `middleware.ts` solo bloqueaban bots de
entrenamiento de IA (GPTBot, CCBot, etc.). Googlebot, Bingbot, Yandex y el
resto de crawlers "legítimos" estaban explícitamente permitidos — algo
razonable para un sitio que quiere indexarse, pero que en un sitio nuevo,
sin dominio propio, sin caché de borde posible, y en uso exclusivo del
dueño, genera un crawl inicial agresivo: cada página rastreada reinvoca el
Worker y arrastra decenas de assets con ella.

**Fix**:
- `robots.ts`: `disallow: '/'` para `userAgent: '*'` (bloqueo total,
  temporal).
- `middleware.ts`: se agregó al blocklist Googlebot, bingbot, Yandex,
  Baidu, Applebot, y los bots de preview de redes sociales (Facebook,
  Twitter, LinkedIn, Discord, Telegram, WhatsApp, Reddit, Pinterest).

**⚠️ Revertir esto cuando el sitio esté listo para salir a producción real**
(ver sección "Cómo revertir" más abajo) — mientras esté activo, el sitio no
se indexa en ningún buscador ni genera previews en redes sociales.

### 5. Imágenes sin `max-age` para el navegador (RESUELTO — sesión de hoy)
La regla de `Cache-Control` del punto 3 solo traía `s-maxage` (sin
`max-age`). `s-maxage` lo ignora el navegador — necesita `max-age` explícito
para cachear localmente. Las imágenes de vehículos pesan hasta ~2.4MB cada
una (287MB en total la carpeta `public/images/entities/vehiculos/`).

**Resultado real de este bug**: cada vez que el propio dueño volvía a
entrar a una ficha ya vista, o iba y volvía con el botón atrás, el
navegador **re-descargaba la imagen completa** en vez de servirla desde su
caché local — un viaje de ida y vuelta (y una invocación al Worker) por
cada imagen, en cada visita repetida. Esto por sí solo explica una porción
grande del volumen sin necesitar ningún bot: **con pocas fichas de
vehículo visitadas varias veces, alcanza para acumular cientos de miles
de invocaciones**, ya que cada imagen de 1-2.5MB nunca se quedaba cacheada.

**Fix** en `next.config.js`: regla separada para `/images/:path*` y
`/logos/:path*` con `public, max-age=604800, s-maxage=2592000,
stale-while-revalidate=2592000, immutable`. `immutable` es seguro acá
porque `scripts/pregenerate-image-variants.mjs` regenera el archivo
completo en cada build (no hay edición in-place del mismo nombre entre
deploys).

## Cosas auditadas y descartadas (no son la causa)

Para que quede registro de lo que SÍ se revisó y no mostró problemas:

- `setInterval`/`setTimeout` en el código: solo animaciones de UI puramente
  client-side (`WordRotate`, `HeroShowroom`, `QuickSearchForm`,
  `EvidenceShowcase`) — ninguno hace `fetch`.
- Sin `service worker` / PWA registrado (nada de sincronización en segundo
  plano).
- `useSyncedSearchParams` (filtros de listado): usa `router.replace` sobre
  un componente 100% client-side — no dispara re-fetch al servidor por cada
  cambio de filtro.
- `/api/buscar`: cachea el índice Fuse a nivel de módulo (una sola carga por
  instancia "caliente"), y solo se llama cuando el usuario efectivamente
  tipea en el buscador (debounce de 200ms) — no es un polling.
- Analytics (`analytics-events.ts`): todo vía `gtag()` a Google Analytics,
  ningún endpoint propio de por medio.
- A/B testing (`useAbTest`): 100% `localStorage`, sin red.
- `wishlist`, `ConsentBanner`: sin `fetch`.
- Dashboard (`/dashboard`), único page con `export const dynamic`: de uso
  exclusivo del dueño vía Basic Auth, sin auto-refresh en el código.
- Workflows de GitHub Actions (`post-deploy-smoke-test.yml`,
  `enrich-vehicles.yml`): apuntan a `https://sinfreno.com`, dominio que
  todavía no existe/no está conectado — no llegan a pegarle al Worker real.

## Qué falta para una solución permanente (no es código)

El límite real, no resoluble con más commits, es que **`workers.dev` no
cachea en el borde de Cloudflare bajo ninguna circunstancia**. Todo lo de
este documento reduce el volumen (bloqueo de bots/crawlers, cache de
navegador para imágenes), pero la solución de fondo — que el catálogo
estático se sirva desde el CDN sin invocar el Worker en absoluto — requiere
conectar un dominio propio en la pestaña *Domains* del dashboard de
Cloudflare. El `Cache-Control` del punto 3 ya está listo para ese momento,
no hace falta tocar nada más cuando eso pase.

## Cómo revertir el bloqueo total de crawlers (punto 4)

Cuando el sitio esté listo para indexarse de verdad:

1. En `src/app/robots.ts`, volver a la regla original: `allow: '/'` con
   `disallow: ['/.next/', '/api/', '/admin/']` para `userAgent: '*'`,
   dejando el bloqueo específico solo para bots de entrenamiento de IA
   (GPTBot, CCBot, anthropic-ai) si se quiere mantener esa política.
2. En `middleware.ts`, sacar del array `BLOCKED_USER_AGENTS` el bloque de
   "Buscadores normales" agregado el 10/09/2026 (Googlebot, bingbot, Slurp,
   DuckDuckBot, Baiduspider, YandexBot, Sogou, facebookexternalhit,
   ia_archiver, archive.org_bot, Applebot, LinkedInBot, TwitterBot,
   WhatsApp, SkypeUriPreview, Discordbot, TelegramBot, Pinterestbot,
   redditbot).
3. Idealmente, hacerlo en el mismo momento en que se conecta el dominio
   propio (punto pendiente de arriba) — así el sitio empieza a indexarse
   justo cuando ya puede cachear en el borde y no vuelve a repetirse el
   incidente.

## ⚠️ ADDENDUM (sesión posterior, mismo día): el fix del punto 5 no aplicaba

El punto 5 (`Cache-Control` con `max-age` para `/images/*` y `/logos/*` vía
`headers()` en `next.config.js`) quedó documentado como RESUELTO pero **no
tenía ningún efecto en producción**. Motivo, confirmado contra la
documentación oficial de OpenNext
(https://opennext.js.org/cloudflare/caching#static-assets-caching): en
Cloudflare Workers con Static Assets, el Worker no corre delante de los
archivos de `public/` (a menos que `run_worker_first: true`, que no está
seteado en `wrangler.toml` — y no conviene setearlo, porque eso sí
facturaría cada asset request como invocación, agravando el incidente
original). Como el Worker nunca procesa esos requests, `headers()` de
Next.js nunca se ejecuta para ellos: la regla quedaba escrita pero muerta.

**Fix real**: `public/_headers` (convención nativa de Cloudflare Workers
Static Assets, la misma que usa Cloudflare Pages), con las mismas reglas de
`Cache-Control` para `/images/*`, `/logos/*` y adicionalmente
`/_next/static/*` (que tenía el mismo problema, sin haber sido detectado
antes). `next.config.js` se dejó con un comentario corregido apuntando acá
para que no se vuelva a asumir que esa regla hace algo.

Esto no cambia el análisis de causa raíz del punto 5 (seguía siendo el
motivo real de las invocaciones repetidas por revisita) — solo corrige que
el fix aplicado no llegó a resolverlo hasta ahora.

## Cómo verificar que esto funcionó

En el dashboard de Cloudflare (Workers & Pages → sinfrenos → Metrics),
mirar la evolución de "Invocations" en las próximas horas/días — debería
caer marcadamente respecto al pico de ~809k/24hs. Si se quiere confirmar el
origen exacto en tiempo real: Observability → Events → agrupar por
`$metadata.clientIp` (no solo por `$metadata.account`) para ver si el
tráfico viene de una IP puntual (bot/monitor) o está distribuido.
