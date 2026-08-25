# Auditoría de integridad de datos por powertrain — agosto 2026

Alcance: los 250 JSON de `src/content/vehiculos/`. Chequeo estructural
(coherencia de campos según el tipo real de motor del vehículo), **no**
investigación de specs nuevas contra fuente primaria — eso queda para una
ronda posterior, priorizada aparte.

## Hallazgo

La carga masiva inicial completó varios campos técnicos con valores "de
relleno" pensados para motor a combustión (ICE), sin distinguir el
powertrain real de cada vehículo. Efecto: vehículos 100% eléctricos (Tesla,
BYD, Hyundai Ioniq 5, Porsche Taycan, etc.) mostraban en su ficha pública
`tipoMotor: "Gasolina/Diésel"` o `"Gasolina turbo"`, capacidad de tanque de
combustible, especificaciones de inyección/árbol de levas, y una caja
automática "8/9 velocidades con convertidor de par" — nada de eso existe en
un EV. También había una cadena corrupta (`nio-et5.json`: `power: "halted
340 hp"`) y transmisiones de moto sin diferenciar manual vs. automática
(scooters).

## Fix aplicado

Nuevo script `scripts/fix-powertrain-integrity.mjs` (auditable, corrido en
modo `--dry-run` antes de aplicar). Reglas, todas basadas en `tags`/`class`
existentes — no inventa specs nuevas, solo anula/corrige lo que es
estructuralmente incorrecto para el tipo de vehículo:

| Categoría | Detectado por | Corrección |
|---|---|---|
| Eléctricos (24 vehículos) | tag `electrico` sin `hibrido` | `tipoMotor` → `"Eléctrico"`; `capacidadTanque`, `consumoEtiqueta`, `especificacionesMotor` → `null`; `especificacionesTransmision` (tipo_automatico/velocidades/control_cambios) → valores genéricos correctos para EV (relación única, sin convertidor); `transmision` → `"Automática de relación única (motor eléctrico)"`; `mantenimientoPrograma.aceite` y `capacidadesAdicionales.capacidad_aceite` → no aplica/`null` |
| Híbridos (9 vehículos) | tag `hibrido`/`hibrido-enchufable` | `tipoMotor` de `"Gasolina/Diésel"` (ninguno tiene variante diésel real) → `"Gasolina + sistema híbrido"` (o `"...enchufable"`) |
| Motos/scooters (39 vehículos) | tag `moto`/`scooter` o `class` conteniendo "Scooter" | `transmision` de relleno `"Manual o Automática"` → `"Manual secuencial"` (motos) o `"Automática (CVT)"` (scooters) |
| Cualquiera | regex sobre `power` | limpia artefactos tipo `"halted 340 hp"` → `"340 hp"` |

Cada archivo tocado suma una nota en `evidence.limitations` explicando qué
se corrigió y qué sigue pendiente de verificar con fuente primaria (specs
reales de batería/autonomía/carga para EVs, arquitectura híbrida exacta,
variante puntual de transmisión de moto).

**Resultado de la corrida real** (no dry-run):

```
Archivos analizados: 250
Archivos modificados: 71
Cambios totales: 288
```

## Verificado después del fix

- Los 250 JSON siguen parseando como JSON válido (`json.load` sobre cada
  uno, sin excepciones).
- `npm run verify:min-count` → OK, 250/250 vehículos parsean.
- `npm run verify:reserved-keys` → OK, sin cambios (este fix no toca
  campos base del schema).
- `npm run audit:evidence` → sin cambios respecto a antes del fix
  (139/250 con evidencia sólida — esa brecha es preexistente y **no**
  es parte del alcance de esta ronda; ver ítem pendiente abajo).

`npm run verify:content` (el que corre `next build` completo) no se pudo
correr en este entorno por falta de `node_modules`/acceso de red completo
para instalar dependencias — se recomienda correrlo localmente antes de
mergear.

## Pendiente (fuera de alcance de esta ronda)

- Completar specs reales de batería/autonomía/tiempos de carga para los 24
  EVs (hoy quedan campos en `null` en vez de un dato inventado).
- 111 de las 250 fichas tienen `evidence.level` pero sin
  `primarySource`/`secondarySource` (detectado por
  `npm run audit:evidence`, preexistente a este fix).
- Verificar variante puntual de transmisión de cada moto contra ficha
  oficial (el fix aplicó un default correcto por categoría, no el dato
  exacto del modelo).
