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
`"afiliado-seguro"`, `"afiliado-financiacion"`, `"publicidad-directa"`, `"otro"`.

Las dos fuentes nuevas (`afiliado-seguro`, `afiliado-financiacion`) corresponden
a los botones `InsuranceAffiliateButton` y `FinancingAffiliateButton`
(`src/components/monetization/`), agregados en fichas de vehículo y en guías
de compra. Hoy apuntan a comparaencasa.com con UTM propios (sin comisión
confirmada todavía) — en cuanto exista un acuerdo real, configurar
`NEXT_PUBLIC_SEGURO_AFFILIATE_URL` / `NEXT_PUBLIC_FINANCIACION_AFFILIATE_URL`
en Vercel apunta los botones a la URL de afiliado real sin tocar código.

Después de editar el archivo: `git add`, `git commit`, `git push` a `main`.
El dashboard se actualiza solo en el próximo deploy (automático en Vercel).
