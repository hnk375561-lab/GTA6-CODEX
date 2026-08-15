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

## Ronda 8 (14 ago 2026) — 2 imágenes de ficha INTEGRADAS + 2 fondos de hero

El usuario aportó directamente capturas de Real Dimez (dúo, 4 variantes de
recorte) y Boobie Ike (6 variantes de recorte), más el key art oficial de
portada de GTA VI ("Jason y Lucia", 3 variantes) y el material promocional
oficial "Visit Leonida" de Port Gellhorn (postal, 4 variantes). Se procesó
todo con el pipeline existente, sin tocar su arquitectura.

**Fichas de personaje (arquitectura mono-imagen, vía `incoming-images/` +
`npm run process-images:apply`):**

| Slug | Archivo fuente elegido | Criterio de selección | Otras variantes recibidas (no integradas, arquitectura mono-imagen) |
|---|---|---|---|
| real-dimez | `Real_Dimez_ultrawide.jpg` | Dúo completo (Bae-Luxe y Roxy) con el neón del hotel de fondo — composición más ancha y cinemática, ambas figuras completas en cuadro | `_tablet` (recorte cuadrado), `_square`, `_portrait` |
| boobie-ike | `Boobie_Ike_landscape.jpg` | Retrato solo en su club, copa en mano, cadenas y campera Versace — imagen "postal" del personaje consistente con el resto de fichas (16:9, sujeto centrado) | `_ultrawide`, `_tablet`, `_square`, `_portrait`, `_phone` |

Procesadas automáticamente por `scripts/process-images.mjs --apply`: WebP
calidad 82, redimensionadas a 1600×900 (lado mayor tope 1600px). Archivos
finales:

```
public/images/entities/personajes/real-dimez.webp   ~144 KB
public/images/entities/personajes/boobie-ike.webp    ~172 KB
```

**Fondos del hero de la home (misma convención que Ronda 7: `sharp`, WebP
calidad 92, sin redimensionar, resolución nativa):**

| Archivo agregado | Fuente | Criterio de selección |
|---|---|---|
| `hero-gta6-boxart-sunset.webp` | `Jason_and_Lucia_01_With_Logos_landscape.jpg` | Key art oficial de portada de GTA VI — la pieza más reconocible de todo el proyecto, formato 16:9 nativo, sin recorte |
| `hero-port-gellhorn-postcard.webp` | `Port_Gellhorn_Postcard_ultrawide.jpg` | Material "Visit Leonida" panorámico de Port Gellhorn, sin personajes en primer plano, funciona bien como fondo de página completa |

La rotación del hero pasó de 4 a 6 fondos (`RotatingHeroBackground.tsx`).
Se dejó fuera el resto de variantes de recorte (`_tablet`, `_square`,
`_portrait`, `_phone`) del key art y de la postal por ser recortes del
mismo material, no piezas panorámicas distintas.

**Originales preservados sin comprimir** (fuera de `public/`, no se sirven
al navegador) en `assets-originals/personajes/` y `assets-originals/heroes/`,
con la variante de mayor resolución recibida para cada pieza.

## Ronda 7 (14 ago 2026) — fondos del hero de la home (fuera del catálogo de entidades)

A diferencia de las rondas anteriores, esta no suma imágenes de ficha de
entidad: el usuario aportó 12 capturas del key art oficial del **Vintage
Vice City Pack** para usarlas como fondo. No se procesaron con
`scripts/process-images.mjs` (ese pipeline es para `public/images/entities/`)
sino que se integraron directamente en `RotatingHeroBackground.tsx`, el
componente que ya rotaba fondos panorámicos en la home.

De las 12, se seleccionaron **2** por ser composiciones panorámicas tipo
"postal" (pareja + vehículo en escena completa, sin recorte); se descartó el
resto por ser primeros planos de personajes o detalles de vehículo/armas que
no funcionan como fondo de página completa:

| Archivo agregado | Fuente | Criterio de selección |
|---|---|---|
| `hero-vintage-dock-sunset.webp` | `VINTAGE_VICE_CITY_PACK_02.jpg` | Pareja junto al Stanier en el muelle al atardecer — composición ancha, key art clásico |
| `hero-vintage-hotel-neon.webp` | `VINTAGE_VICE_CITY_PACK_01.jpg` | Pareja frente al neón del Ocean View Hotel — buen contraste de noche para el overlay del hero |

Procesadas con `sharp`, WebP calidad 92, **sin redimensionar** (resolución
nativa 3840×2160) — misma convención que las dos imágenes de hero
preexistentes (`hero-vice-sunset.webp`, `hero-vi-logo.webp`), distinta de la
política de resize a 1600px que usa el pipeline de imágenes de entidad.

La rotación del hero pasó de 2 a 4 fondos. Las 10 capturas restantes del
pack (primeros planos de personajes, detalle de carrocería, patrón de
armas, interior con dinero) no se integraron — no corresponden a ninguna
entidad del catálogo (`vapid-stanier-55` sigue en `DOWNLOAD_PENDING`, ya que
estas son imágenes de key art del pack, no screenshots individuales del
vehículo) ni sirven como fondo panorámico.

## Ronda 6 (14 ago 2026) — 2 imágenes DESCARGADAS e INTEGRADAS

El usuario aportó 4 capturas oficiales de Brian Heder y 4 de Cal Hampton
(mismas entidades ya listadas `SOURCE_VERIFIED` en la Ronda 1). Se
seleccionó **una sola imagen por personaje** como hero (arquitectura
mono-imagen, sin cambios):

| Slug | Archivo fuente elegido | Criterio de selección | Otras capturas recibidas (no integradas, arquitectura mono-imagen) |
|---|---|---|---|
| brian-heder | `Brian_Heder_02.jpg` | Retrato solo de noche, apoyado en una baranda con ambiente tropical — atmosférico y sin otros personajes en primer plano | `_01` (asomado por ventanilla de auto, con otro personaje atrás), `_03` (entregando un paquete, con otro personaje), `_04` (confrontación con arma, junto a dos personajes más) |
| cal-hampton | `Cal_Hampton_01.jpg` | Retrato solo en cancha de minigolf, sonriendo a cámara — la más nítida y reconocible como "postal" del personaje | `_02` (mesa de pool, grupo), `_03` (flotador de pileta, solo pero sin rostro tan protagónico), `_04` (caminando de noche junto a otro personaje) |

Procesadas con `npm run process-images:apply`: WebP calidad 82, redimensionadas
a 1600×900 (lado mayor tope 1600px, sin upscaling). Archivos finales:

```
public/images/entities/personajes/brian-heder.webp        ~88 KB
public/images/entities/personajes/cal-hampton.webp        ~115 KB
```

## Ronda 5 (14 ago 2026) — 2 imágenes DESCARGADAS e INTEGRADAS

El usuario aportó directamente 4 capturas oficiales de Dre'Quan Priest y 6 de
Jason Duval (mismas entidades ya listadas `SOURCE_VERIFIED` en la Ronda 1),
otra vez sorteando la limitación de red del entorno. Se seleccionó **una sola
imagen por personaje** como hero (arquitectura mono-imagen, sin cambios):

| Slug | Archivo fuente elegido | Criterio de selección | Otras capturas recibidas (no integradas, arquitectura mono-imagen) |
|---|---|---|---|
| drequan-priest | `DreQuan_Priest_03.jpg` | Retrato solo en discoteca, brazos cruzados, luz púrpura — foco claro en el personaje, resto de la gente desenfocada de fondo | `_01` (grupo en discoteca, dos personajes más en primer plano), `_02` (fiesta junto a pileta con copa), `_04` (estudio de grabación, junto a otro personaje, de perfil) |
| jason-duval | `Jason_Duval_04.jpg` | Retrato apoyado en un árbol de noche con Vice City iluminada de fondo, celular en mano — la más serena y cinemática, sin arma en primer plano | `_01` (en moto con arma), `_02` (perfil en auto de día), `_03` (pesca en bote, con otro personaje), `_05` (apuntando rifle de asalto), `_06` (bar con otros personajes) |

Procesadas con `npm run process-images:apply`: WebP calidad 82, redimensionadas
a 1600×900 (lado mayor tope 1600px, sin upscaling). Archivos finales:

```
public/images/entities/personajes/drequan-priest.webp     ~45 KB
public/images/entities/personajes/jason-duval.webp        ~100 KB
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
| jason-duval | Jason Duval | true | **INTEGRATED** | `Jason_Duval_04.jpg` → `jason-duval.webp` | Ver Ronda 5 — resto de screenshots ×5 + artwork ensemble sin integrar (arquitectura mono-imagen) |
| lucia-caminos | Lucia Caminos | true | **INTEGRATED** | `Lucia_Caminos_03.jpg` → `lucia-caminos.webp` | Ver Ronda 4 — resto de screenshots ×5 + artwork sin integrar (arquitectura mono-imagen) |
| cal-hampton | Cal Hampton | false | **INTEGRATED** | `Cal_Hampton_01.jpg` → `cal-hampton.webp` | Ver Ronda 6 — resto de screenshots ×3 + artwork retrato sin integrar (arquitectura mono-imagen) |
| boobie-ike | Boobie Ike | false | SOURCE_VERIFIED | Screenshots ×4 + Artwork retrato ×1 | |
| drequan-priest | Dre'Quan Priest | false | **INTEGRATED** | `DreQuan_Priest_03.jpg` → `drequan-priest.webp` | Ver Ronda 5 — resto de screenshots ×3 + artwork retrato sin integrar (arquitectura mono-imagen) |
| real-dimez | Real Dimez | false | SOURCE_VERIFIED | Screenshots ×4 + Artwork retrato ×1 | |
| raul-bautista | Raul Bautista | false | **INTEGRATED** | `Raul_Bautista_03.jpg` → `raul-bautista.webp` | Ver Ronda 4 — resto de screenshots ×3 + artwork sin integrar (arquitectura mono-imagen) |
| brian-heder | Brian Heder | false | **INTEGRATED** | `Brian_Heder_02.jpg` → `brian-heder.webp` | Ver Ronda 6 — resto de screenshots ×3 + artwork retrato sin integrar (arquitectura mono-imagen) |
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
TOTAL DESCARGADAS:           12  (grassrivers, ambrosia, leonida-keys, mount-kalaga —
                                   Ronda 2; vice-city, port-gellhorn — Ronda 3;
                                   lucia-caminos, raul-bautista — Ronda 4;
                                   jason-duval, drequan-priest — Ronda 5;
                                   brian-heder, cal-hampton — Ronda 6.
                                   Todas aportadas por el usuario)
TOTAL INTEGRADAS:            12  (mismas 12 — archivo real en public/, servido
                                   automáticamente por resolveEntityImage())
TOTAL DOWNLOAD_PENDING:       9  (resto de SOURCE_VERIFIED sin bytes en el repo:
                                   boobie-ike, real-dimez, grotti-cheetah-95,
                                   vapid-stanier-55, vapid-dominator-buggy-67,
                                   squalo, dinka-enduro, crest-kayak, vapid-ganado)
COBERTURA POTENCIAL ACTUAL:  21/102 = 20.6%  (si se descargaran las 9
                                               SOURCE_VERIFIED restantes)
COBERTURA REAL HOY:          12/102 = 11.8%  (12 archivos reales en el repo)
```

## Ronda 9 (15 ago 2026) — Lote 1 de imágenes del usuario (20 archivos, material "Ultimate Edition")

El usuario aportó 20 capturas locales de trabajo, todas con prefijo
`ULTIMATE_EDITION_*`, para asociar contra entidades reales del repo.
Resultado: **1 integrada**, **19 sin integrar** (ninguna corresponde a
una entidad existente, y por regla explícita del proceso no se crean
entidades nuevas solo por una imagen — ver `CANDIDATES_PENDING.md` y la
nota de la Ronda 8 sobre negocios de la Ultimate Edition sin
contrapartida en `src/content/negocios/`).

### Integrada

| Slug | Tipo | Archivo fuente | Archivo final | Criterio de selección |
|---|---|---|---|---|
| grotti-cheetah-95 | vehiculos | `ULTIMATE_EDITION_GROTTI_CHEETAH_01.jpg` | `public/images/entities/vehiculos/grotti-cheetah-95.webp` (158 KB) | Toma "postal" del auto completo (blanco/rojo, inspirado en Ferrari Testarossa) frente a Pegassi Residences, atardecer, sin personas — coincide con la entidad ya documentada como `SOURCE_VERIFIED`/`DOWNLOAD_PENDING` desde Ronda 8. Otras 3 capturas recibidas (`_02` faro, `_03` trasera/logo, `_04` interior) son planos de detalle, no integradas por arquitectura mono-imagen. |

Procesada con `npm run process-images:apply` (pipeline existente, sin
modificar `src/lib/images.ts` ni ningún componente): WebP calidad 82,
redimensionada a 1600×900. Detectada automáticamente por
`resolveEntityImage()` vía convención de nombre de archivo — no hizo
falta tocar contenido ni código.

**Trazabilidad:**
- source: archivo local de trabajo aportado por el usuario
- sourceUrl: desconocida (no se pudo determinar la URL exacta del asset original de Rockstar; el usuario indicó que es material de la Ultimate Edition)
- sourceType: usuario-archivo-local
- verified: parcial — la **entidad** `grotti-cheetah-95` está `SOURCE_VERIFIED` contra prensa oficial de Rockstar desde una ronda anterior (ver ficha), pero el **archivo de imagen específico** entregado en este lote no fue re-verificado contra una URL oficial en esta sesión
- rightsNote: posible material promocional de Rockstar Games / Take-Two Interactive; no se asume titularidad ni licencia de uso; uso ilustrativo/informativo en un sitio de fans no oficial

### No integradas — sin entidad correspondiente en el repo (19 imágenes)

Verificado explícitamente contra `src/content/negocios/`, `src/content/armas/`,
`src/content/personajes/` y `src/content/vehiculos/`: ninguno de estos
nombres tiene una entidad real en el catálogo. Por regla del proceso, no
se crean entidades nuevas a partir de una imagen — queda como candidato
para una revisión de contenido futura (no es tarea de imágenes).

| Nombre visto en archivo | Qué muestra | Entidad buscada | Resultado de la búsqueda |
|---|---|---|---|
| `ONE_EYED_WILLIE_01/02/03` | Pickup Canis todoterreno verde, taller de personalización | negocio "One-Eyed Willie's Mod Shop" | No existe en `src/content/negocios/` (ya señalado como discrepancia en Ronda 8) |
| `PTT_STORE_01` | Escena callejera con personajes, motos, grafiti "PTT" | negocio "PTT YOUNGIN$ Illegal Goods Store" | No existe en `src/content/negocios/` |
| `RIDEOUT_CUSTOMS_01/02/03` | Lowrider Albany dorado/verde, taller mecánico | negocio "Rideout Customs" | No existe en `src/content/negocios/` |
| `ELECTRIC_FANG_01/02/03/04` | Local de tatuajes, cartel neón, interior | negocio "Electric Fang Tattoo" | No existe en `src/content/negocios/` |
| `GOODTIME_GEAR_01` | Remeras/gorras con branding "Vice City" | negocio "Goodtime Gear" (tienda de ropa) | No existe en `src/content/negocios/` |
| `HAWK_AND_LITTLE_MORGAN_REVOLVERS_01/02` | Revólveres grabados "J.DUVAL" y "L.CAMINOS" (posible ítem coleccionable físico de la edición Ultimate, no necesariamente un arma jugable) | arma "revolver"/"Hawk & Little Morgan" | No existe en `src/content/armas/` (solo hay `pistola.json`, genérica, sin modelo específico) |
| `ULTIMATE_EDITION_01/02` | Jason Duval y Lucia Caminos en pose de pareja (key art) | — | `jason-duval` y `lucia-caminos` ya tienen imagen individual asignada (arquitectura mono-imagen); no se sobreescribió por no ser claramente superior y por mezclar a ambos personajes en una sola imagen. No se tocó el sistema de fondos de hero (`public/images/heroes/`) por estar cableado directamente en código WebGL, fuera del alcance de esta misión de imágenes. |

Estas 19 imágenes **no se eliminaron** — siguen en
`/mnt/user-data/uploads/` tal como las subió el usuario, listas para
usarse si en un lote futuro se decide dar de alta las entidades de
negocio/arma correspondientes en `src/content/`.

## Ronda 10 (15 ago 2026) — Lote 2 de imágenes del usuario (20 archivos, "Ultimate Edition")

Segundo lote, mismo criterio que la Ronda 9. Resultado: **6 integradas**
(5 vehículos + 1 ubicación), **14 sin integrar**.

### Integradas

| Slug | Tipo | Archivo fuente | Criterio de selección |
|---|---|---|---|
| squalo | vehiculos | `ULTIMATE_EDITION_SQUALO_01.jpg` | Lancha completa de perfil, degradado rosa/azul característico, skyline de Vice City de noche — coincide exacto con la descripción ya documentada de la entidad ("acabado degradado rosa y azul, Washington Beach"). Otras 3 capturas (`_02` detalle de logo, `_03` gente/delfines, `_04` aérea con 3 embarcaciones) quedan fuera por arquitectura mono-imagen. |
| crest-kayak | vehiculos | `ULTIMATE_EDITION_SAFEHOUSE_VEHICLES_03.jpg` | Único plano del kayak naranja con logo "Crest" visible, en uso — coincide con la entidad ya documentada. |
| dinka-enduro | vehiculos | `ULTIMATE_EDITION_SAFEHOUSE_VEHICLES_02.jpg` | Motocicleta scrambler verde con placa "DINKA" visible en el tanque — coincide con la entidad ya documentada ("acabado inspirado en uniformes militares"). |
| vapid-dominator-buggy-67 | vehiculos | `ULTIMATE_EDITION_VAPID_BUGGY_01.jpg` | Todoterreno tipo "Mud Club" en pleno pantano, toma de 3/4 dinámica que muestra el vehículo completo — coincide con la descripción ("pensado para los pantanos de Mount Kalaga"). Otras 3 capturas (`_02` parrilla, `_03` interior/volante, `_04` frente estático) quedan fuera por arquitectura mono-imagen. |
| vapid-ganado | vehiculos | `ULTIMATE_EDITION_VAPID_GANADO_RETRO_BUILD_01.jpg` | Única toma de la pickup estilo El Camino con script "Cianado" en la carrocería, costanera de fondo — coincide con "Retro Build" de Jason. |
| stockyard | ubicaciones | `ULTIMATE_EDITION_STOCK_305_03.jpg` | Cartel "STOCK 305" en primer plano contra el mural de arte urbano del distrito, sin personas — identifica el distrito Stockyard mejor que las otras 3 capturas del mismo grupo (`_01` y `_02` tienen personajes en primer plano, `_04` es interior de una tienda). La entidad `stockyard` es la ubicación/distrito (confirmada por Rockstar), no el comercio "Stock 305" en sí — ese comercio específico no tiene entidad propia en `src/content/negocios/` (ver nota abajo). |

Procesadas con `npm run process-images:apply`, mismo pipeline (WebP q82,
1600×900 tope), detectadas automáticamente por `resolveEntityImage()` /
`getCategoryPreviewImage()` sin tocar código ni contenido.

**Trazabilidad (las 6):**
- source: archivo local de trabajo aportado por el usuario
- sourceUrl: desconocida
- sourceType: usuario-archivo-local
- verified: parcial — las 5 entidades de vehículo y la de ubicación ya estaban `SOURCE_VERIFIED`/`DOWNLOAD_PENDING` contra prensa oficial de Rockstar de una ronda anterior; el archivo de imagen específico de este lote no fue re-verificado contra una URL oficial en esta sesión
- rightsNote: posible material promocional de Rockstar Games / Take-Two Interactive; uso ilustrativo/informativo en sitio de fans no oficial, sin asumir titularidad

### No integradas (14 imágenes)

| Nombre visto en archivo | Qué muestra | Entidad buscada | Resultado |
|---|---|---|---|
| `SARAS_SALON_01/02/03` (3 img) | Salón de belleza/uñas, letrero "Sara's Unisex Salon" | negocio "Sara's Unisex Salon" | No existe en `src/content/negocios/` — mismo negocio ya señalado como discrepancia en Ronda 8 |
| `STOCK_305_01/02/04` (3 img) | Personas posando junto al distrito/mural, interior de tienda de ropa | negocio "Stock 305" (la tienda, no el distrito) | El **distrito** `stockyard` sí existe y ya se integró con `_03`; la tienda "Stock 305" en sí sigue sin entidad propia en `src/content/negocios/` |
| `SAFEHOUSE_VEHICLES_01` | Casa de playa con pickup, moto y kayak, sin foco en un solo vehículo | — | Escena compuesta, no hay entidad de "refugio/safehouse" en `src/content/ubicaciones/`; los vehículos individuales de esta escena sí se cubrieron vía `_02` (dinka-enduro) y `_03` (crest-kayak) |
| `VICE_CITY_STYLE_01` | Jason y Lucia en pose de pareja (key art), junto a fuente | — | Mismo caso que Ronda 9: ambos personajes ya tienen imagen individual asignada; no se sobreescribe por arquitectura mono-imagen |

Estas 14 imágenes tampoco se eliminaron — siguen en
`/mnt/user-data/uploads/`.

### Totales acumulados (Rondas 9+10)

```
LOTES PROCESADOS:      2 (40 imágenes)
INTEGRADAS:             7  (grotti-cheetah-95, squalo, crest-kayak,
                             dinka-enduro, vapid-dominator-buggy-67,
                             vapid-ganado, stockyard)
SIN INTEGRAR:          33  (sin entidad correspondiente en el repo)
```
