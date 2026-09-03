# Plan de monetización — Sin Frenos

Este documento es el mapa completo de todos los canales de monetización del
sitio: qué está activo, qué está construido pero esperando un acuerdo
comercial, y qué falta para activar cada uno. Se referenciaba desde
`SupportButton.tsx` sin existir todavía; esta versión lo cierra y agrega
los canales nuevos de la ronda de 03/09/2026 (incluyendo el primero que
cobra directo a la persona usuaria, no a un negocio: el reporte
comparativo premium, sección 2.13).

Última actualización: 03/09/2026 (tercera ronda del mismo día: secciones
2.14 a 2.19 — las tres primeras ya estaban en el código sin tener su
párrafo acá, esta ronda cierra ese hueco de documentación y agrega tres
canales nuevos: 2.17 fintech, 2.18 anuncio ancla, 2.19 lead de trámites).

## 1. Cómo leer este documento

Cada canal tiene un estado:

- 🟢 **Activo** — genera o puede generar ingresos hoy mismo, sin trabajo de código pendiente.
- 🟡 **Construido, sin acuerdo comercial** — el código y la UI están listos; falta cerrar un acuerdo real (comisión de afiliado, sponsor, cliente) para que empiece a facturar.
- 🔵 **Nuevo (03/09/2026)** — agregado en esta ronda, mismo criterio que 🟡 salvo que se indique lo contrario.

Todo ingreso real se carga a mano en `src/content/monetizacion/revenue-log.json`
(ver `README.md` en esa carpeta) y se ve reflejado en `/dashboard`.

## 2. Canales

### 2.1 Google AdSense — 🟡

`AdUnit.tsx`, 4 unidades en producción (home, ficha, comparador,
fabricantes) con slot IDs reales. Publisher `pub-8424604961377300`
(`public/ads.txt`). Activar: configurar `NEXT_PUBLIC_ADSENSE_CLIENT_ID`
y esperar la aprobación de Google (si no está aprobado todavía).

### 2.2 Afiliado Mercado Libre — 🟡

`MercadoLibreAffiliateButton.tsx`, en las 250 fichas de vehículo.
Activar: `NEXT_PUBLIC_MELI_AFFILIATE_TAG` (programa gratuito, alta en
mercadolibre.com.ar/afiliados).

### 2.3 Afiliado seguro / financiación — 🟡

`InsuranceAffiliateButton.tsx` / `FinancingAffiliateButton.tsx`, hoy
apuntan a comparaencasa.com con UTM propios (sin comisión confirmada).
Activar: `NEXT_PUBLIC_SEGURO_AFFILIATE_URL` /
`NEXT_PUBLIC_FINANCIACION_AFFILIATE_URL` cuando exista acuerdo real (con
comparaencasa.com u otro corredor/banco/fintech local).

### 2.4 Calculadora de financiamiento (lead vía WhatsApp) — 🟢

`FinancingCalculator.tsx` (`/financiamiento` y en fichas). Ya funciona
sin configuración: el lead sale por WhatsApp directo a
`uruspotcdu@gmail.com`/número de contacto. No requiere acuerdo comercial
para operar — el ingreso viene de vender ese contacto a una financiera
o de derivarlo a un partner (canal 2.3) manualmente.

### 2.5 Lead de COMPRA (`LeadQuoteForm`) — 🟢 / 🟡

Formulario en cada ficha de vehículo. Funciona con mailto: sin
configuración (🟢). Para que caiga en una planilla de Google Sheets en
vez de la bandeja de entrada, configurar `NEXT_PUBLIC_LEADS_GFORM_*`
(🟡, ver `.env.example`). Modelo de negocio: vender el lead individual o
dar acceso de lectura filtrado por vehículo a una concesionaria
patrocinadora (fee mensual fijo).

### 2.6 Lead de VENTA/tasación (`SellVehicleLeadForm`) — 🔵 🟢 / 🟡

**Nuevo.** Formulario en `/vender-tu-auto` y en la guía
`como-tasar-auto-usado-antes-de-vender` (solo si sus `tags` incluyen
`venta` o `tasacion`). Mismo mecanismo que 2.5 (mailto por defecto,
`NEXT_PUBLIC_VENTA_GFORM_*` para planilla separada). Por qué es un
canal aparte y no "más de lo mismo": antes de esta ronda, el sitio
capturaba intención de COMPRA pero no de VENTA — alguien con un auto
para vender o entregar como parte de pago no tenía dónde dejar sus
datos, a pesar de que ya existía una guía completa explicando cómo
tasarlo. El comprador de este lead (concesionaria que necesita stock de
usados) puede ser distinto del comprador de un lead de compra, así que
se vende como producto separado en `/anunciate`
("Leads de venta de usados (trade-in)").

### 2.7 Ficha destacada / patrocinio real (`sponsorships.ts`) — 🔵 🟡

**Nuevo.** Antes de esta ronda, "Ficha destacada (patrocinio de
marca/modelo)" ya se vendía en `/anunciate` y en el media kit
(ARS 1500-3000/mes) pero no existía ninguna forma de entregarlo — activarlo
para un cliente real era código a mano. Ahora:

- `src/content/monetizacion/patrocinios.json` — fuente de datos, vacía a
  propósito (no se inventan patrocinadores).
- `src/lib/sponsorships.ts` — resuelve el patrocinio activo de una
  ficha (por vehículo puntual o por fabricante entero).
- `SponsoredListingBanner.tsx` — banner "Patrocinado por [nombre]" con
  CTA de WhatsApp, se renderiza automáticamente cuando hay match.

**Activar un patrocinio real:** agregar un objeto a `patrocinios.json`
con `activo: true`. No hace falta tocar ningún componente ni redeployar
lógica — ver los comentarios de `sponsorships.ts` para el formato
completo.

### 2.8 Publicidad directa (`/anunciate`) — 🟡

Banners en artículo/homepage/ficha. Página comercial ya escrita, lee
`prospeccion/media-kit-data.json` (una sola fuente para precios, tanto
acá como en el PDF del media kit). Activar: cerrar un cliente y
codificar su banner a mano (bajo volumen esperado, no justifica un CMS).

### 2.9 Directorio local (`/concesionarias-concepcion-del-uruguay`) — 🟡

Concesionarias, talleres, seguros, repuestos, **gomerías/neumáticos y
gestorías/trámites** (dos rubros nuevos de esta ronda — amplía el
mercado direccionable del mismo canal ya construido, sin trabajo de
código adicional por rubro). `LISTINGS` vacío a propósito — se completa
con cada negocio que confirme y pague.

### 2.10 Licencia de datos B2B (`/licencia-datos`) — 🟡

Vender el dataset de 250 fichas verificadas (export puntual, actualización
mensual, o API a demanda) a aseguradoras, tasadoras u otros medios del
rubro. Delivery manual (CSV/JSON por mail) hasta que haya demanda real.

### 2.11 Newsletter (`NewsletterSignupForm`) — 🟢

Captura de emails en el footer, mailto: a la bandeja de contacto (sin
infraestructura nueva). Cuando el volumen lo justifique, migrar a un ESP
real (Mailchimp/Brevo) es el único cambio necesario, contenido dentro de
`handleSubmit`. Un ESP real también habilita vender un slot de sponsor
dentro del newsletter — canal a futuro, no construido todavía.

### 2.12 Donaciones (`SupportButton` / Cafecito) — 🟡

Botón "Invitame un cafecito" en el footer. Activar: crear cuenta en
cafecito.app y configurar `NEXT_PUBLIC_CAFECITO_USERNAME`.

### 2.13 Reporte comparativo premium (`/api/premium-report/*`) — 🔵 🟡

**Nuevo (03/09/2026).** Primer canal que cobra directo a la persona
usuaria en vez de a un negocio — hasta esta ronda, todo lo demás era
afiliado, lead o patrocinio B2B. Desde `/comparar` (comparador libre) y
`/comparar/[pair]` (comparaciones fijas SEO), con 2 a 5 vehículos
seleccionados, `PremiumReportButton.tsx` ofrece descargar un PDF con la
ficha técnica completa + evidencia citada de cada vehículo comparado
(ARS 990, precio editable en `src/lib/premium-report.ts`).

Cómo funciona (sin base de datos ni backend propio, mismo criterio que
el resto del sitio):

1. El botón llama a `POST /api/premium-report/create-preference`, que
   crea una preferencia de **Mercado Pago Checkout Pro** (API REST
   directa, sin el SDK oficial — ver comentario en `src/lib/mercadopago.ts`)
   y redirige al checkout hosteado por Mercado Pago.
2. Mercado Pago vuelve a `/reporte-premium/descargar` con el resultado.
3. Esa página linkea a `GET /api/premium-report/pdf`, que **vuelve a
   verificar el pago contra la API de Mercado Pago** (nunca confía en el
   query param que vuelve en la URL del navegador) y solo si está
   `approved` y corresponde exactamente a los vehículos pedidos, genera
   el PDF al vuelo con `pdfkit` (mismo estilo visual que
   `scripts/generate-media-kit.mjs`) y lo devuelve para descargar.

**Activar:** configurar `MERCADOPAGO_ACCESS_TOKEN` (credencial de
producción, ver `.env.example`) en Vercel. Sin esa variable, el botón
muestra "todavía no está activo" (fail-closed, no rompe para quien
visita el sitio). No requiere cuenta de terceros nueva más allá de
Mercado Pago, que el sitio ya usa indirectamente vía el afiliado de
Mercado Libre.

**Nota de infraestructura:** esta es la primera funcionalidad del sitio
que agrega Route Handlers (`route.ts`) — hasta ahora todo el sitio era
100% estático. Son 2 Serverless Functions nuevas (`create-preference` y
`pdf`), lejos del tope de 12 del plan Hobby de Vercel (ver el comentario
ya existente sobre esto en `next.config.js`), pero cualquier ronda
futura que siga sumando rutas nuevas debería revisar ese conteo antes de
desplegar.

### 2.14 Cross-sell de accesorios (`AccessoriesAffiliateWidget`) — 🟢

En cada ficha de vehículo, debajo de los botones de seguro/financiación.
Vende lo que se compra DESPUÉS de decidirse por el vehículo (cubre-asientos,
baulera, cascos, GPS, etc.), no el vehículo en sí — no compite con
`MercadoLibreAffiliateButton.tsx` por el mismo click. Reutiliza el mismo
tag de Afiliados y Creadores de Mercado Libre que ya usa ese botón, así
que arranca activo sin ningún acuerdo comercial nuevo.

### 2.15 Anuncios nativos / contenido recomendado (`NativeAdUnit`) — 🟡

En cada ficha de vehículo, debajo del `AdUnit` de AdSense. Inventario y
CPM de una red distinta a AdSense (Taboola/Outbrain/MGID/RevContent) —
por eso es un componente aparte y no se apila dentro del mismo bloque de
AdSense (mezclarlos violaría las políticas de ambas redes). Activar:
elegir una red, conseguir su aprobación (suele ser rápida) y completar
`NEXT_PUBLIC_NATIVE_ADS_SCRIPT_SRC` / `NEXT_PUBLIC_NATIVE_ADS_CONTAINER_ID`.

### 2.16 Cartel de venta en PDF (`/vender-tu-auto/cartel`) — 🔵 🟡

Segundo canal que cobra directo a la persona usuaria (no a un negocio),
mismo mecanismo que el reporte comparativo premium (2.13): Mercado Pago
Checkout Pro server-side, verificación del pago contra la API de Mercado
Pago antes de generar el PDF (nunca se confía en el query param de vuelta
del navegador), sin base de datos propia (los datos del cartel viajan
codificados en la propia URL). Precio: ARS 690 (`FLYER_PRICE_ARS` en
`src/lib/for-sale-flyer.ts`). Quien deja el lead gratis en
`SellVehicleLeadForm.tsx` puede además comprar un cartel prolijo (marca,
modelo, precio grande, contacto) para el parabrisas o para compartir en
grupos de WhatsApp/redes. Activar: mismo `MERCADOPAGO_ACCESS_TOKEN` que
2.13 (ya lo habilita a los dos canales a la vez).

### 2.17 Afiliado fintech (`FintechAffiliateButton`) — 🔵 🟡

**Nuevo (03/09/2026, tercera ronda).** Botón en la ficha de vehículo (bloque
`MonetizationCtaGroup`, junto a seguro y financiación) para cuentas
digitales, tarjetas prepagas o billeteras virtuales (Ualá, Prex, Cuenta
DNI, Belo, etc.). Momento distinto al de seguro/financiación: esos son
"qué necesitás alrededor del vehículo", esto es "cómo movés la plata de
la operación" — pagar/cobrar una seña entre particulares sin efectivo, o
tener resguardo del pago. A diferencia de OLX (retirado del sitio en
septiembre porque no tiene programa de afiliados propio, ver el
comentario en `[entityType]/[slug]/page.tsx`), la mayoría de las fintechs
argentinas sí tienen programas de referidos reales — solo falta elegir
una y cerrarla.

100% fail-closed a propósito (a diferencia de seguro/financiación, que
arrancan con un fallback real a comparaencasa.com sin comisión
confirmada): no existe una fintech "neutral" para linkear sin implicar
una asociación que todavía no existe. Activar:
`NEXT_PUBLIC_FINTECH_AFFILIATE_URL` + `NEXT_PUBLIC_FINTECH_AFFILIATE_NAME`
(las dos, o no renderiza nada).

### 2.18 Anuncio ancla / sticky mobile (`StickyAdUnit`) — 🔵 🟡

**Nuevo (03/09/2026, tercera ronda).** Barra de AdSense fija al pie de
pantalla, solo en mobile (`md:hidden`), con botón para cerrarla (se
recuerda por `sessionStorage`, no persiste entre sesiones). Inventario
ADICIONAL: el formato ancla no cuenta contra el límite de anuncios por
pantalla de las políticas de AdSense, así que no le saca espacio a los
`AdUnit` in-page que ya existen en cada página — es ingreso incremental
real. Reutiliza `NEXT_PUBLIC_ADSENSE_CLIENT_ID` (no necesita variable de
entorno propia), pero **sí** necesita un slot de AdSense dedicado (In-page
→ Ancla): reemplazar el placeholder `STICKY_AD_SLOT_ID` en
`StickyAdUnit.tsx` por ese slot real antes de esperar que rellene con
anuncios de verdad.

### 2.19 Lead de trámites (`TramitesLeadForm`, `/tramites-vehiculo`) — 🔵 🟢 / 🟡

**Nuevo (03/09/2026, tercera ronda).** Mismo mecanismo que 2.5/2.6 (Google
Forms con fallback a mailto), pero para un rubro que el directorio local
ya lista (`gestoria` en `/concesionarias-concepcion-del-uruguay`, desde la
ronda anterior) y para el que no existía ninguna forma de capturar
intención: alguien que compró, vendió o heredó un vehículo y necesita
transferirlo o patentarlo. El comprador de este lead es una gestoría del
directorio, no una concesionaria — producto separado, sumado también a
`prospeccion/media-kit-data.json` para que `/anunciate` lo ofrezca.

Deliberadamente NO calcula aranceles ni costos de trámite (varían por
provincia/municipio y cambian seguido — un número desactualizado sería
peor que no mostrar nada): el formulario solo identifica el tipo de
trámite y captura el contacto. Además de la página propia, hay un link
de entrada desde la sección "Gestorías" del directorio y, en la ficha de
vehículo, un link corto dentro de `MonetizationCtaGroup`
(`showTramites`). Activar planilla propia (opcional, sin esto cae a
mailto:): `NEXT_PUBLIC_TRAMITES_GFORM_*`.

## 3. Qué falta (a futuro, no construido todavía)

Ideas evaluadas para esta ronda y descartadas por ahora (no por falta de
valor, sino porque agregarían infraestructura nueva — cuenta de
pagos, backend propio — que no se justifica al volumen actual; quedan
como próximo paso natural una vez que los canales de arriba tengan
tracción real):

- **Contenido patrocinado/advertorial declarado** en guías: la
  infraestructura de tags (`showGuideInsuranceCta`, etc.) ya soporta
  este patrón; falta solo escribir el contenido cuando haya un cliente
  real y agregar un badge "Nota patrocinada" (mismo criterio de
  transparencia que `SponsoredListingBanner.tsx`).
- **ESP real para el newsletter** (ver 2.11) — depende de que el
  volumen de suscriptores lo justifique.
