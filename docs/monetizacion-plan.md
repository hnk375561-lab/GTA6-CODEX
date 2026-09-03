# Plan de monetización — Sin Frenos

Este documento es el mapa completo de todos los canales de monetización del
sitio: qué está activo, qué está construido pero esperando un acuerdo
comercial, y qué falta para activar cada uno. Se referenciaba desde
`SupportButton.tsx` sin existir todavía; esta versión lo cierra y agrega
los canales nuevos de la ronda de 03/09/2026 (incluyendo el primero que
cobra directo a la persona usuaria, no a un negocio: el reporte
comparativo premium, sección 2.13).

Última actualización: 03/09/2026.

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
