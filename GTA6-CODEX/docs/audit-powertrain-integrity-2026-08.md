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
- Verificar variante puntual de transmisión de cada moto contra ficha
  oficial (el fix aplicó un default correcto por categoría, no el dato
  exacto del modelo).

## Ronda 2 — cierre de brecha de evidencia (agosto 2026, cont.)

De las 111 fichas con `evidence.level` pero sin `primarySource`/
`secondarySource` detectadas por `npm run audit:evidence`, se cerraron 6 en
esta ronda con fuente oficial del fabricante verificada por búsqueda (no
inventada): `bmw-r1250gs`, `bmw-s1000rr`, `ducati-monster`,
`ducati-panigale-v4`, `chevrolet-corvette`, `toyota-camry`. En los 6 casos
se subió `level` de `"respaldado"` a `"oficial-nombrado"` porque la fuente
agregada es la ficha técnica propia del fabricante, y se dejó nota en
`evidence.limitations` avisando que conviene revalidar la URL si el
fabricante reestructura su sitio.

**Resultado, `npm run audit:evidence`:** 139/250 → **145/250** (58%) con
evidencia sólida.

Quedan **105** fichas en la cola, listadas en
[`docs/evidence-gap-queue.txt`](./evidence-gap-queue.txt) (un slug por
línea, generado con `node scripts/audit-evidence-coverage.mjs --json`).
Es trabajo de investigación real vehículo por vehículo — no automatizable
sin arriesgar inventar una fuente — así que se sigue resolviendo en lotes
en próximas rondas en vez de en una sola tanda.

## Ronda 3 — cierre de brecha de evidencia (agosto 2026, cont.)

Segundo lote: `byd-atto-3`, `chery-tiggo-4`, `citroen-c4`, `cupra-leon`,
`dacia-duster`, `ferrari-296-gtb`, `fiat-panda`, `ford-explorer`,
`ford-focus`, `chevrolet-equinox`. Misma metodología que la ronda 2 (fuente
oficial verificada por búsqueda, `level` subido a `oficial-nombrado`, nota
en `limitations`). Caso particular: `ford-focus` está discontinuado en
Europa desde noviembre de 2025 (ver Wikipedia); la fuente oficial usada es
la ficha técnica de Ford Europe vigente al momento de discontinuación, no
un lanzamiento 2026 — hay cobertura de baja calidad circulando sobre un
supuesto "regreso" del Focus a EE.UU. en 2026 que no se usó como fuente
por no ser un comunicado oficial de Ford.

**Resultado, `npm run audit:evidence`:** 145/250 → **155/250** (62%) con
evidencia sólida.

Quedan **95** fichas en la cola (`docs/evidence-gap-queue.txt`,
actualizado).

## Ronda 4 — reconciliación docs↔datos + cierre de brecha de evidencia (ago 2026, cont.)

**Hallazgo importante:** las Rondas 2 y 3 (arriba) y el fix de integridad de
powertrain (sección "Fix aplicado" al inicio de este documento) se habían
documentado como aplicados, pero **los cambios nunca llegaron a los 250 JSON
reales** — solo se escribió la documentación. Causa raíz: el repo tiene
carpetas `GTA6-CODEX` y `docs/` duplicadas por el historial de exports/zips
(`GTA6-CODEX-main/src/content/vehiculos` y `GTA6-CODEX-main/docs/`, una copia
vieja y ya no desplegada, conviven con la copia real y activa en
`GTA6-CODEX-main/GTA6-CODEX/src/content/vehiculos` y
`GTA6-CODEX-main/GTA6-CODEX/docs/`, donde vive el resto del proyecto —
`package.json`, `README.md`, `scripts/` activos). El script
`scripts/fix-powertrain-integrity.mjs` resuelve su directorio de contenido
de forma relativa a su propia ubicación (`__dirname`); en una sesión
anterior se copió/corrió y este mismo documento se escribió contra/en la
copia vieja, así que el reporte de "71 archivos modificados, 288 cambios"
era real pero **no tocó la carpeta que usa la app en producción**, y este
documento tampoco vivía donde vive el resto de la documentación activa.

**Fix aplicado en esta ronda:**

1. Se copió `fix-powertrain-integrity.mjs` a
   `GTA6-CODEX-main/GTA6-CODEX/scripts/` (junto al resto de los scripts
   activos) y se corrió `--dry-run` primero, luego en modo real contra la
   carpeta correcta de 250 archivos. Resultado idéntico al reportado
   originalmente — **71 archivos modificados, 288 cambios** — pero esta vez
   sí persistido en los datos reales. Incluye la corrección de la cadena
   corrupta `power: "halted 340 hp"` en `nio-et5.json` → `"340 hp"`.
2. Se re-aplicaron, con fuente oficial verificada por búsqueda en esta misma
   ronda (no reciclada de las Rondas 2/3, que no habían llegado a los
   datos), las 16 fichas que esas rondas decían haber cerrado:
   `bmw-r1250gs`, `bmw-s1000rr`, `ducati-monster`, `ducati-panigale-v4`,
   `chevrolet-corvette`, `toyota-camry`, `byd-atto-3`, `chery-tiggo-4`,
   `citroen-c4`, `cupra-leon`, `dacia-duster`, `ferrari-296-gtb`,
   `fiat-panda`, `ford-explorer`, `ford-focus`, `chevrolet-equinox`. Todas
   subieron de `respaldado` a `oficial-nombrado` con `primarySource` a la
   página oficial del fabricante/modelo (BMW Motorrad, Ducati, Ferrari,
   Toyota, Ford, Chevrolet, BYD, Chery, Citroën, Cupra, Dacia, Fiat) y una
   nota en `evidence.limitations` marcada como "Ronda 4".
   - Caso particular: `ford-focus` fue descontinuado por Ford en Europa en
     noviembre de 2025 (planta de Saarlouis), tras un anuncio previo de
     2022; la nota de evidencia lo aclara y usa como fuente la propia
     página de Ford confirmando el retiro del modelo.
   - Caso particular: `fiat-panda` — desde octubre de 2025 Fiat renombró
     oficialmente el modelo a "Pandina" para diferenciarlo del nuevo Grande
     Panda; la ficha y la nota de evidencia lo reflejan.
   - `chery-tiggo-4` usa como fuente el sitio oficial regional
     `chery.com.ar` (Chery no tiene un dominio corporativo global único con
     ficha pública unificada por modelo).
3. Se copió este mismo documento y `docs/evidence-gap-queue.txt` a
   `GTA6-CODEX-main/GTA6-CODEX/docs/` (la ubicación correcta, junto al
   resto de la documentación activa) para que dejen de vivir solo en la
   copia vieja del repo.

**Verificado después de esta ronda:**

- Los 250 JSON parsean como JSON válido (`json.load` sobre cada uno).
- `npm run verify:min-count` → OK, 250/250.
- `npm run verify:reserved-keys` → OK, sin cambios.
- `npm run verify:relations` (`verify-relations-integrity.mjs`) → OK, todas
  las relaciones apuntan a entidades existentes.
- `npm run audit:evidence` → **139/250 → 155/250 (62%)** con evidencia
  sólida (subió por las 16 fichas de esta ronda; las Rondas 2/3 nunca
  habían llegado a contarse porque no estaban en los datos).
- `npm run verify:content` (build completo de Next) no se pudo correr en
  este entorno por falta de `node_modules`/acceso de red completo — se
  recomienda correrlo localmente antes de mergear, igual que en la ronda
  anterior.

Quedan **95** fichas en la cola de evidencia (`docs/evidence-gap-queue.txt`,
regenerado con `node scripts/audit-evidence-coverage.mjs --json` contra los
datos reales de esta ronda — no arrastra la cifra de rondas anteriores).

**Recomendación para evitar que esto se repita:** el repo tiene al menos
tres niveles de carpetas `GTA6-CODEX` anidadas
(`GTA6-CODEX-main/`, `GTA6-CODEX-main/GTA6-CODEX/`,
`GTA6-CODEX-main/GTA6-CODEX/GTA6-CODEX/`), residuo de exports/zips
sucesivos, y al menos dos carpetas `docs/` con contenido distinto. Antes de
la próxima ronda conviene confirmar cuál es la carpeta que realmente
despliega Vercel (según `vercel.json` y la raíz del repo en GitHub) y borrar
las copias viejas, o al menos documentarlo en el propio README para que
ningún script — ni ninguna sesión de edición — vuelva a correr o escribir
contra una copia muerta sin que nadie lo note.
