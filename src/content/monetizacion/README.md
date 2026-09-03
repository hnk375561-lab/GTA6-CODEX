# Registro de ingresos — cómo cargar un dato nuevo

`revenue-log.json` alimenta `/dashboard`. Es 100% manual a propósito: conectar
la API de Google AdSense (Management API, requiere OAuth + verificación de
Google) o la API de Google Analytics Data requiere credenciales que hoy no
existen y un review de Google que puede tardar semanas — mientras tanto,
cargar 3 números a mano una vez por semana toma 1 minuto y ya te deja ver
todo en un solo lugar.

Para agregar un ingreso, sumá un objeto al array en `revenue-log.json`:

```json
{
  "fecha": "2026-09-07",
  "fuente": "adsense",
  "montoArs": 850,
  "nota": "Primera semana con AdSense aprobado"
}
```

`fuente` acepta: `"adsense"`, `"afiliado-olx"`, `"afiliado-meli"`,
`"afiliado-seguro"`, `"afiliado-financiacion"`, `"publicidad-directa"`,
`"lead-cotizacion"`, `"lead-venta-usado"`, `"ficha-destacada"`,
`"licencia-datos"`, `"otro"`.

Las dos fuentes nuevas (`afiliado-seguro`, `afiliado-financiacion`) corresponden
a los botones `InsuranceAffiliateButton` y `FinancingAffiliateButton`
(`src/components/monetization/`), agregados en fichas de vehículo y en guías
de compra. Hoy apuntan a comparaencasa.com con UTM propios (sin comisión
confirmada todavía) — en cuanto exista un acuerdo real, configurar
`NEXT_PUBLIC_SEGURO_AFFILIATE_URL` / `NEXT_PUBLIC_FINANCIACION_AFFILIATE_URL`
en Vercel apunta los botones a la URL de afiliado real sin tocar código.

`lead-venta-usado` corresponde a `SellVehicleLeadForm.tsx` (formulario en
`/vender-tu-auto` y en la guía de tasación) — leads de gente que quiere
VENDER o entregar su usado, distinto de `lead-cotizacion` (gente que
quiere COMPRAR). Se vende como producto separado en `/anunciate` porque
el comprador típico de cada uno puede ser distinto (una concesionaria que
necesita stock de usados paga por `lead-venta-usado` aunque no le
interese pagar por `lead-cotizacion`, y viceversa).

`ficha-destacada` corresponde al sistema de patrocinio real de
`src/lib/sponsorships.ts` + `patrocinios.json` (mismo directorio que este
archivo) + `SponsoredListingBanner.tsx`. Para activar un patrocinio real:
agregar un objeto a `patrocinios.json` con `activo: true` — no hace falta
tocar ningún componente. Ver los comentarios en `sponsorships.ts` para el
formato completo (alcance por vehículo puntual o por fabricante entero).

Después de editar el archivo: `git add`, `git commit`, `git push` a `main`.
El dashboard se actualiza solo en el próximo deploy (automático en Vercel).
