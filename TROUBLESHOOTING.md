# Troubleshooting

Common issues when developing or building this project, and how to fix them.

## Error 1027 de Cloudflare ("This website has been temporarily rate limited")

**Síntoma:** el sitio deja de responder para todo el mundo, con la página
de error propia de Cloudflare ("Please check back later — Error 1027 —
This website has been temporarily rate limited"), y el dashboard de
Workers & Pages → Metrics muestra un número de "Invocations"/"Asset
requests" desproporcionado para el tráfico real que el sitio recibe.

**Cómo confirmar que es esto y no tráfico real:** en el dashboard, panel
"Top asset hostnames" — si `assets.local` tiene un volumen muchísimo
mayor que el hostname público (`*.workers.dev` o el dominio propio), no
es tráfico de usuarios. `assets.local` es el binding interno de assets
del Worker; un volumen alto ahí con tráfico público bajo es la firma de
este bug específico, no de un pico de visitas.

**Causa raíz (confirmada, 09/09/2026):** `next/link` sin `prefetch={false}`
en un `<Link>` que se repite dentro de un `.map()` — típicamente una card
de listado (`EntityCard.tsx` en `/vehiculos`). Con
`enableCacheInterception: true` activo en `open-next.config.ts` (ver
comentario en ese archivo — está ahí para arreglar otro bug distinto de
hidratación en `/fabricantes`, no es opcional), cada `<Link>` sin ese
guard dispara un fetch interno de precarga por cada card que entra en el
viewport. En una grilla de varias columnas con decenas de ítems por
página, eso amplifica las invocations reales del sitio por un factor de
~100-140x. Detectado por primera vez el 08/09/2026 (478.97k invocations
"fantasma" vs. 3.49k requests reales al hostname público) y corregido en
el commit `d03717eb`. Se volvió a perder sin que nadie lo notara unas
horas después, cuando `EntityCard.tsx` se reescribió por completo en un
rediseño puramente visual (`f18d4ae8`) — el nuevo markup no llevaba la
prop, y ni `tsc`, ni `eslint`, ni la suite de tests de ese momento lo
detectaban, porque compilar/lintear/pasar tests funcionales no dice nada
sobre si falta una prop de comportamiento de Next.js. El bug quedó
"dormido" (sin manifestarse en errores visibles) hasta que suficiente
tráfico de navegación normal — sin ningún ataque ni bot — volvió a agotar
el cupo del plan, el 09/09/2026, tumbando el sitio otra vez.

**Fix:**
1. Agregar `prefetch={false}` a todos los `<Link>` que se rendericen
   dentro de un loop de card (ver la regla completa y el detalle en la
   sección [Cloudflare: qué NO hacer](./README.md#️-cloudflare-qué-no-hacer-error-1027--rate-limit)
   del README).
2. Correr `npm run test` — `src/components/entities/EntityCard.test.tsx`
   es un test de regresión específico para esto: falla en rojo si algún
   `<Link>` de `EntityCard` (cualquiera de sus layouts) pierde la prop.
3. Pushear el fix a `main` (dispara un nuevo build/deploy vía Cloudflare
   Workers Builds, integración git nativa — no hace falta ningún paso
   manual de deploy).

**Importante — lo que el fix de código NO arregla al instante:** el
bloqueo del Error 1027 es un cupo de plan ya consumido, visible en el
panel "Last 24 hours" del dashboard como una ventana móvil. Aunque el
código ya esté arreglado y deployado, el sitio puede seguir bloqueado
hasta que:
- pase suficiente tiempo para que el pico de tráfico viejo salga de la
  ventana de 24hs (los planes free suelen resetear a medianoche UTC), o
- se suba de plan manualmente desde `dash.cloudflare.com` → Workers &
  Pages → (proyecto) → **Workers plans**.

Ninguna de las dos cosas se puede hacer con un push de código ni con un
token de API de GitHub — son acciones de cuenta/facturación de
Cloudflare, las tiene que hacer el dueño de la cuenta desde el
dashboard.
