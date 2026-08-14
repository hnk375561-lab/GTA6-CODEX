# IMAGE_CATALOG.md — GTA6 Codex

Generado: 2026-08-14. Ronda: Sistema Visual de Imágenes, primera pasada.

## Cómo leer este documento

Estados posibles:

- **SOURCE_VERIFIED** — se localizó la imagen en una página oficial de
  Rockstar Games que se **fetcheó y confirmó directamente** en esta sesión.
  Se registra la URL exacta del asset. Descarga física: pendiente (ver
  limitación técnica).
- **DISCOVERED** — se identificó que existe un candidato pero no se
  confirmó la URL exacta del asset individual.
- **UNVERIFIED** — no se buscó/encontró nada todavía para esta entidad
  en esta ronda. No es un rechazo, es trabajo pendiente.
- **REJECTED** — se investigó y se descartó explícitamente (con motivo).
- **DOWNLOAD_PENDING** — aplica a filas SOURCE_VERIFIED/DISCOVERED:
  la URL existe pero el archivo no está descargado al repo.
- **INTEGRATED** — el archivo real está en `public/images/entities/{tipo}/{slug}.webp`
  y el sitio lo sirve automáticamente vía `resolveEntityImage()`. Se
  documenta el nombre del archivo fuente original y el criterio de
  selección cuando había más de una captura disponible.

## Ronda 2 (14 ago 2026) — primeras 4 imágenes DESCARGADAS e INTEGRADAS

El usuario aportó directamente 20 capturas oficiales (las mismas que esta
sesión ya había identificado como `SOURCE_VERIFIED` en la Ronda 1, mismo
conteo exacto por ubicación: Grassrivers ×4, Ambrosia ×5, Leonida Keys ×5,
Mount Kalaga ×6), sorteando la limitación de red de este entorno. De cada
grupo se seleccionó **una sola imagen** como hero (la arquitectura actual
de `src/lib/images.ts` resuelve una imagen por entidad por convención de
nombre de archivo, no una galería — no se modificó esa arquitectura por
estar fuera del alcance de esta misión):

| Slug | Archivo fuente elegido | Criterio de selección | Otras capturas recibidas (no integradas, arquitectura mono-imagen) |
|---|---|---|---|
| grassrivers | `Grassrivers_02.jpg` | Toma aérea del asentamiento sobre el agua con skyline de fondo — mejor "postal" del lugar, sin personajes en primer plano | `_01` (airboat con personajes), `_03` (aéreo pantano), `_04` (persecución) |
| ambrosia | `Ambrosia_04.jpg` | Paisaje panorámico atardecer con torres de alta tensión e incendio — la más cinemática y menos dependiente de personajes | `_01` (motociclistas), `_02` (skyline industrial nocturno), `_03` (retrato pareja), `_05` (lavadero de autos) |
| leonida-keys | `Leonida_Keys_01.jpg` | Vista aérea del puente sobre cayos turquesa con hidroavión — imagen "postal" más reconocible del archipiélago | `_02` (calle con gente), `_03` (bar The Rusty Anchor), `_04` (buceo), `_05` (fiesta de yates) |
| mount-kalaga | `Mount_Kalaga_National_Park_05.jpg` | Fauna del parque (puma y ciervos junto a un arroyo) sin presencia humana — la que mejor comunica "parque nacional" | `_01` (motocross en zona industrial), `_02` (helicóptero de noticias), `_03` (cazadores), `_04` (cañón con ruta), `_06` (kayak) |

Procesadas con `npm run process-images:apply`: WebP calidad 82, redimensionadas
a 1600×900 (lado mayor tope 1600px, sin upscaling). Verificado: no rotas, no
duplicadas entre sí (hash de contenido distinto), no watermark, resolución
razonable, no confusión con GTA V. Archivos finales:

```
public/images/entities/ubicaciones/grassrivers.webp     184 KB
public/images/entities/ubicaciones/ambrosia.webp          69 KB
public/images/entities/ubicaciones/leonida-keys.webp     179 KB
public/images/entities/ubicaciones/mount-kalaga.webp     219 KB
```

## Ronda 4 (14 ago 2026) — 2 imágenes DESCARGADAS e INTEGRADAS

El usuario aportó directamente 6 capturas oficiales de Lucia Caminos y 4 de
Raúl Bautista (mismas entidades ya listadas `SOURCE_VERIFIED` en la Ronda 1),
sorteando otra vez la limitación de red de este entorno. Se seleccionó **una
sola imagen por personaje** como hero (arquitectura mono-imagen, sin cambios):

| Slug | Archivo fuente elegido | Criterio de selección | Otras capturas recibidas (no integradas, arquitectura mono-imagen) |
|---|---|---|---|
| lucia-caminos | `Lucia_Caminos_03.jpg` | Retrato en moto frente a un bar de neón — imagen "postal" nítida y cinemática del personaje, sin depender de otros personajes en cuadro | `_01` (boxeo en gimnasio), `_02` (borde de pileta), `_04` (primer plano con arma), `_05` (uniforme naranja de reclusa), `_06` (discoteca) |
| raul-bautista | `Raul_Bautista_03.jpg` | Retrato sereno en yate al atardecer con skyline de Vice City de fondo — buena "tarjeta de presentación" del personaje, bien iluminado | `_01` (llamada telefónica), `_02` (conduciendo con arma y dinero), `_04` (fiesta nocturna, traje) |

Procesadas con `npm run process-images:apply`: WebP calidad 82, redimensionadas
a 1600×900 (lado mayor tope 1600px, sin upscaling). Archivos finales:

```
public/images/entities/personajes/lucia-caminos.webp     ~90 KB
public/images/entities/personajes/raul-bautista.webp     ~95 KB
```

## Limitación técnica (léase antes de todo lo demás)

El entorno de ejecución de esta sesión tiene el egress de red restringido a
una lista fija de dominios (npm, PyPI, GitHub, crates.io, etc.). No incluye
`rockstargames.com` ni `media.rockstargames.com`. Esto significa:

- **Sí pude** buscar en la web y hacer `fetch` del HTML de las páginas
  oficiales de Rockstar para confirmar qué assets existen y bajo qué URL.
- **No pude** descargar los bytes de esas imágenes al filesystem del repo.

Todo lo marcado `SOURCE_VERIFIED` es real y verificado por mí en esta
sesión (no es una suposición ni un dato de memoria/entrenamiento), pero
sigue en estado `DOWNLOAD_PENDING` hasta que alguien con acceso de red a
`rockstargames.com` (el usuario, o una sesión futura con otra config de
red) baje los archivos y los suelte en `incoming-images/` para que
`npm run process-images:apply` los procese e integre.

## Fuente principal utilizada

Página oficial de medios de **Rockstar Games** para GTA VI, fetcheada
directamente en esta sesión:

- `https://www.rockstargames.com/VI/media/screenshots` — 70 capturas
  estándar + 51 de Ultimate Edition + 12 del Vintage Vice City Pack = 133
  capturas oficiales, cada una con nombre de archivo legible.
- `https://www.rockstargames.com/VI/media/artwork-wallpapers` — 22
  artworks/postcards oficiales (versiones de estudio de los mismos
  personajes/ubicaciones que en screenshots, mejor calidad para retrato).

Todas las URLs de assets abajo son del CDN propio de Rockstar
(`rockstargames.com/VI/_next/static/media/...`), extraídas del HTML real
de esas dos páginas, no inventadas ni recordadas de memoria.

---

## PERSONAJES (17 total — 8 con candidato oficial verificado)

| Slug | Título | Featured | Estado | Fuente | Notas |
|---|---|---|---|---|---|
| jason-duval | Jason Duval | true | SOURCE_VERIFIED | Screenshots ×6 (`Jason_Duval_01..06.jpg`) + Artwork ensemble (`Jason_and_Lucia_*.jpg`) | Protagonista, mejor cobertura del catálogo |
| lucia-caminos | Lucia Caminos | true | **INTEGRATED** | `Lucia_Caminos_03.jpg` → `lucia-caminos.webp` | Ver Ronda 4 — resto de screenshots ×5 + artwork sin integrar (arquitectura mono-imagen) |
| cal-hampton | Cal Hampton | false | SOURCE_VERIFIED | Screenshots ×4 + Artwork retrato ×1 (`Cal_Hampton_landscape.jpg`) | |
| boobie-ike | Boobie Ike | false | SOURCE_VERIFIED | Screenshots ×4 + Artwork retrato ×1 | |
| drequan-priest | Dre'Quan Priest | false | SOURCE_VERIFIED | Screenshots ×4 (`DreQuan_Priest_*.jpg`) + Artwork retrato ×1 | |
| real-dimez | Real Dimez | false | SOURCE_VERIFIED | Screenshots ×4 + Artwork retrato ×1 | |
| raul-bautista | Raul Bautista | false | **INTEGRATED** | `Raul_Bautista_03.jpg` → `raul-bautista.webp` | Ver Ronda 4 — resto de screenshots ×3 + artwork sin integrar (arquitectura mono-imagen) |
| brian-heder | Brian Heder | false | SOURCE_VERIFIED | Screenshots ×4 + Artwork retrato ×1 | |
| bae-luxe | Bae-Luxe | false | UNVERIFIED | — | Sin asset individual en el media kit oficial actual |
| lori-heder | Lori Heder | false | UNVERIFIED | — | ídem |
| phil | Phil | false | UNVERIFIED | — | ídem |
| roxy | Roxy | false | UNVERIFIED | — | ídem |
| rudi | Rudi | false | UNVERIFIED | — | ídem |
| shanese | Shanese | false | UNVERIFIED | — | ídem |
| stefanie | Stefanie | false | UNVERIFIED | — | ídem |
| wyman | Wyman | false | UNVERIFIED | — | Aparece indirectamente en "Classic Car Collection" (Ultimate Ed.) pero sin retrato propio del personaje |

## UBICACIONES (17 total — 6 con candidato oficial verificado)

| Slug | Título | Featured | Estado | Fuente | Notas |
|---|---|---|---|---|---|
| vice-city | Vice City | true | **INTEGRATED** | `Vice_City_01.jpg` → `vice-city.webp` | Ver Ronda 3 — resto de screenshots ×8 + artwork sin integrar (arquitectura mono-imagen) |
| leonida-keys | Leonida Keys | true | **INTEGRATED** | `Leonida_Keys_01.jpg` → `leonida-keys.webp` | Ver Ronda 2 |
| port-gellhorn | Port Gellhorn | true | **INTEGRATED** | `Port_Gellhorn_01.jpg` → `port-gellhorn.webp` | Ver Ronda 3 — resto de screenshots ×4 + artwork sin integrar (arquitectura mono-imagen) |
| ambrosia | Ambrosia | false | **INTEGRATED** | `Ambrosia_04.jpg` → `ambrosia.webp` | Ver Ronda 2 |
| grassrivers | Grassrivers | true | **INTEGRATED** | `Grassrivers_02.jpg` → `grassrivers.webp` | Ver Ronda 2 |
| mount-kalaga | Mount Kalaga National Park | false | **INTEGRATED** | `Mount_Kalaga_National_Park_05.jpg` → `mount-kalaga.webp` | Ver Ronda 2 |
| leonida | Leonida | true | UNVERIFIED | — | Es el estado completo, no un lugar puntual; ninguna captura individual lo representa mejor que el resto — requiere criterio editorial, no solo búsqueda |
| downtown-vice-city | Downtown Vice City | false | UNVERIFIED | — | Podría solaparse con `Vice_City_0X.jpg` genéricas, pero no hay etiqueta oficial que distinga "Downtown" del resto |
| kelly-county | Kelly County | false | UNVERIFIED | — | |
| la-perle | La Perle | false | UNVERIFIED | — | |
| little-cuba | Little Cuba | false | UNVERIFIED | — | |
| ocean-beach | Ocean Beach | false | UNVERIFIED | — | |
| southside-vice-city | Southside Vice City | false | UNVERIFIED | — | |
| stockyard | Stockyard | false | UNVERIFIED | — | |
| tequesta | Tequesta | false | UNVERIFIED | — | |
| tisha-wocka | Tisha-Wocka Flea Market | false | UNVERIFIED | — | |
| vice-city-port | VC Port (Vice City Port) | false | UNVERIFIED | — | |

## VEHÍCULOS (57 total — 7 con candidato oficial verificado)

| Slug | Título | Featured | Estado | Fuente | Notas |
|---|---|---|---|---|---|
| grotti-cheetah-95 | '95 Grotti Cheetah | true | SOURCE_VERIFIED | Ultimate Ed. screenshots ×4 (`ULTIMATE_EDITION_GROTTI_CHEETAH_01..04.jpg`) | |
| vapid-stanier-55 | Vapid Stanier '55 | false | SOURCE_VERIFIED | Vintage Pack screenshots ×4 (`VINTAGE_VICE_CITY_PACK_VAPID_STANIER_01..04.jpg`) | |
| vapid-dominator-buggy-67 | '67 Vapid Dominator Buggy | false | SOURCE_VERIFIED | Ultimate Ed. screenshots ×4 (`ULTIMATE_EDITION_VAPID_BUGGY_01..04.jpg`) | |
| squalo | Shitzu Squalo | false | SOURCE_VERIFIED | Ultimate Ed. screenshots ×4 (`ULTIMATE_EDITION_SQUALO_01..04.jpg`) | |
| dinka-enduro | Dinka Enduro | false | SOURCE_VERIFIED | Ultimate Ed. screenshot ×1 (parte de "Jason's Safehouse Vehicles") | Aparece etiquetada como "Dinka Enduro Motorcycle" |
| crest-kayak | Crest Kayak | false | SOURCE_VERIFIED | Ultimate Ed. screenshot ×1 (parte de "Jason's Safehouse Vehicles") | |
| vapid-ganado | Vapid Ganado | false | SOURCE_VERIFIED | Ultimate Ed. screenshot ×1 (`ULTIMATE_EDITION_VAPID_GANADO_RETRO_BUILD_01.jpg`) | Es la variante "Retro Build" del Ganado — mismo vehículo base |
| bravado-buffalo-stx | Bravado Buffalo STX | **true** | UNVERIFIED | — | **Featured en el sitio pero sin asset individual en el media kit oficial actual — revisar en rondas futuras del site oficial o trailers** |
| bravado-gauntlet-hellfire | Bravado Gauntlet Hellfire | **true** | UNVERIFIED | — | **Ídem: featured sin cobertura oficial confirmada todavía** |
| *(resto: 48 vehículos)* | — | false | UNVERIFIED | — | No investigados individualmente en esta ronda — ver "Regla de oro" abajo |

<details>
<summary>Lista completa de los 48 vehículos restantes sin investigar (UNVERIFIED)</summary>

albany-buccaneer-custom, benefactor-schafter-v12, bravado-banshee, bravado-bison,
bravado-buffalo, brute-police-riot, buckingham-jet, buckingham-nimbus,
buckingham-police-maverick, buckingham-shamal, buckingham-supervolito,
declasse-burrito, declasse-granger-3600lx, declasse-tulip-m100, dinka-verus,
dundreary-landstalker-xl, emperor-vectre, gallivanter-baller-st,
grotti-carbonizzare, grotti-furia, invetero-coquette-d10, invetero-coquette,
karin-futo, karin-intruder, maibatsu-penumbra, maibatsu-sanchez, mammoth-dodo,
manchez, nagasaki-blazer, nagasaki-carbon-rs, nagasaki-double-t,
nagasaki-outlaw, obey-8f-drafter, pfister-comet-s2-cabrio, pfister-growler,
shitzu-tropic, speedophile-seashark, vapid-bobcat-xl, vapid-caracara-4x4,
vapid-police-suv, vapid-rumpo, vapid-sandking-xl, vapid-speedo,
vapid-stanier-le, vapid-taxi, western-company-duster, western-nightblade,
western-zombie-chopper

</details>

## ORGANIZACIONES (6 total — 0 con candidato oficial verificado)

| Slug | Título | Featured | Estado | Fuente | Notas |
|---|---|---|---|---|---|
| final-chapter-mc | Final Chapter MC | false | UNVERIFIED | — | Sin logo/insignia oficial publicada por Rockstar |
| ldc | LDC (Leonida Department of Corrections) | false | UNVERIFIED | — | ídem |
| san4san | San4San | false | UNVERIFIED | — | ídem |
| vbpd | VBPD (Vice Beach Police Department) | false | UNVERIFIED | — | ídem |
| vcpd | VCPD (Vice City Police Department) | false | UNVERIFIED | — | ídem |
| vdpd | VDPD (Vice-Dale Police Department) | false | UNVERIFIED | — | ídem |

## NEGOCIOS (5 total — 0 con candidato oficial verificado)

| Slug | Título | Featured | Estado | Fuente | Notas |
|---|---|---|---|---|---|
| jack-of-hearts | Jack of Hearts | false | UNVERIFIED | — | No coincide con ningún negocio del media kit oficial |
| nine1nine | NINE1NINE | false | UNVERIFIED | — | ídem |
| only-raw-records | Only Raw Records | false | UNVERIFIED | — | ídem |
| peewees | Peewee's | false | UNVERIFIED | — | ídem |
| se-habla-espanol | Se Habla Español | false | UNVERIFIED | — | ídem |

**Nota importante:** el Ultimate Edition SÍ incluye capturas de varios
negocios/tiendas del juego (Sara's Unisex Salon, Stock 305, PTT YOUNGIN$
Illegal Goods Store, Rideout Customs, One-Eyed Willie's Mod Shop,
Goodtime Gear) — pero **ninguno de esos nombres coincide** con los 5
negocios documentados en `src/content/negocios/`. Verifiqué esto
explícitamente (comparé nombre por nombre) para no generar un falso
positivo. Puede ser que sean negocios distintos, o que el catálogo interno
use nombres/slugs distintos a los oficiales — vale la pena una revisión
de contenido en otra sesión, pero **no es una tarea de imágenes**, así que
no toqué nada de `src/content/`.

---

## REGLA DE ORO APLICADA

De 102 entidades, se investigaron individualmente contra la fuente
oficial **21** (los 6 "núcleos" de personajes + ubicaciones + vehículos
más probables por ser `featured` o protagonistas/ubicaciones centrales
de la trama). El resto (81 vehículos secundarios, todas las
organizaciones y negocios, personajes secundarios y ubicaciones
menores) queda `UNVERIFIED` — es decir, **trabajo pendiente real**, no
"sin imagen definitiva" disfrazado de cobertura.

No se marcó ninguna entidad como `REJECTED` en esta ronda: no se llegó a
evaluar ni descartar ningún candidato específico, así que no correspondía
ese estado todavía.

---

## TOTALES

```
TOTAL ENTIDADES:            102
TOTAL CON CANDIDATO:         21  (SOURCE_VERIFIED + INTEGRATED)
TOTAL VERIFICADAS:           21  (misma cifra — todo lo DISCOVERED se
                                   verificó directamente antes de listarse)
TOTAL PENDIENTES:            81  (UNVERIFIED)
TOTAL DESCARTADAS:            0  (REJECTED)
TOTAL DESCARGADAS:            8  (grassrivers, ambrosia, leonida-keys, mount-kalaga —
                                   Ronda 2; vice-city, port-gellhorn — Ronda 3;
                                   lucia-caminos, raul-bautista — Ronda 4.
                                   Todas aportadas por el usuario)
TOTAL INTEGRADAS:             8  (mismas 8 — archivo real en public/, servido
                                   automáticamente por resolveEntityImage())
TOTAL DOWNLOAD_PENDING:      13  (resto de SOURCE_VERIFIED sin bytes en el repo:
                                   jason-duval, cal-hampton,
                                   boobie-ike, drequan-priest, real-dimez,
                                   brian-heder, grotti-cheetah-95,
                                   vapid-stanier-55, vapid-dominator-buggy-67,
                                   squalo, dinka-enduro, crest-kayak, vapid-ganado)
COBERTURA POTENCIAL ACTUAL:  21/102 = 20.6%  (si se descargaran las 13
                                               SOURCE_VERIFIED restantes)
COBERTURA REAL HOY:           8/102 =  7.8%  (8 archivos reales en el repo)
```
