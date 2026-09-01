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
`"publicidad-directa"`, `"otro"`.

Después de editar el archivo: `git add`, `git commit`, `git push` a `main`.
El dashboard se actualiza solo en el próximo deploy (automático en Vercel).
