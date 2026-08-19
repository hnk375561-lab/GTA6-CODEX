# Sourcing de imágenes — vehículos en placeholder

Generado: 18 ago 2026. Sesión de investigación de fuentes (no descarga de
binarios — ver limitación técnica al final).

## Corrección al conteo previo

El total real de vehículos en placeholder es **37**, no 36. Verificación
imagen por imagen (no solo por tamaño de archivo) del rango de bytes
19390–23942 en `public/images/entities/vehiculos/`:

- **Corte real confirmado**: ≤23820 bytes = placeholder genérico (template
  "GTA6-ZONA · VEHÍCULO" con silueta de auto). ≥23942 bytes = imagen real
  (incluye `bravado-buffalo-stx.webp`, un frame de trailer borroso que por
  tamaño casi cae en el rango de placeholder — caso borde verificado
  visualmente, no por heurística de tamaño).
- **Faltaba en el conteo anterior**: `vapid-stanier-le` (23356 bytes,
  "Vapid Stanier LE (Police Cruiser)") — mismo template de placeholder,
  confirmado visualmente. No estaba en la lista de 36 del usuario.

## Error de datos encontrado (no relacionado a imágenes)

`src/content/vehiculos/nagasaki-double-t.json` asigna el vehículo al
fabricante **Nagasaki**. Según GTA Wiki (fuente primaria usada en todo el
catálogo), el Double-T es un vehículo **Dinka**, no Nagasaki — aparece
listado como "Dinka Double-T" y bajo la categoría Dinka en
`gta.fandom.com/wiki/Vehicles_in_GTA_VI`. Pendiente de corrección:
renombrar slug a `dinka-double-t`, actualizar `manufacturer` y `title`.
No se tocó el archivo en esta sesión — queda para el batch de correcciones
junto con las imágenes.

## Resultado por vehículo (35 investigados esta ronda)

Evidence level sigue la convención del proyecto (A=máxima, D/E=débil, ver
`CANDIDATES_PENDING.md`). Todos los siguientes calificarían **A/B** —
corroborados por GTA Wiki y/o GTA Base con cita de trailer o screenshot
oficial. Ninguno requiere pasar a `CANDIDATES_PENDING.md`.

### Vapid (6/6 confirmados)
| Vehículo | Fuente / evidencia |
|---|---|
| `vapid-stanier-le` | GTA Boom + GTA Wiki: Trailer 1 (~1:00), Leonard County Sheriff |
| `vapid-rumpo` | GTA Base + GTA Boom + GTA-Xtreme: Trailer 1, timestamp 1:04 "Dine and Dash" |
| `vapid-police-suv` | GTA Wiki (artículo dedicado): Trailer 1 (1:00) y Trailer 2 (1:58) |
| `vapid-speedo` | GTA Wiki + GTA Boom: Trailer 1, tráfico de apertura |
| `vapid-bobcat-xl` | GTA Wiki: Trailer 1 (0:02 remolcando bote, 0:31 estacionado) |
| `vapid-sandking-xl` | GTA Wiki + GTA Boom: Trailer 1, escena policial en Leonard County |

### Buckingham (5/5 confirmados)
| Vehículo | Fuente / evidencia |
|---|---|
| `buckingham-jet` | Avión comercial estilo 747, fondos aéreos Trailer 2 (fuente ya en ficha) |
| `buckingham-shamal` | GTA Wiki: Trailer 1, sobrevolando Vice Beach |
| `buckingham-nimbus` | GTA Wiki: Trailer 1 (0:21), sobre Vice Beach |
| `buckingham-supervolito` | GTA Wiki: Trailer 1 (0:22), cielos de Vice Beach |
| `buckingham-police-maverick` | **Cerrado (ronda 2, 18 ago 2026)**: GTA Wiki (ES): "También apareció en el primer tráiler" + GTA Wiki (EN): "Another Vice-Dale Police Department Police Maverick seen in the second trailer" — confirmado en ambos trailers |

### Nagasaki (4/4 confirmados, 1 con nota de fabricante)
| Vehículo | Fuente / evidencia |
|---|---|
| `nagasaki-blazer` | GTA Wiki: Trailer 1 (1:06), grupo de motociclistas en La Perle |
| `nagasaki-outlaw` | GTA Boom: Trailer 1 |
| `nagasaki-carbon-rs` | GTA Wiki: Trailer 1 (0:33), Shore Drive Vice Beach |
| `nagasaki-double-t` | GTA Wiki: Trailer 1 (0:33) — **pero es Dinka, no Nagasaki** (ver corrección arriba) |

### Declasse (3/3 confirmados)
| Vehículo | Fuente / evidencia |
|---|---|
| `declasse-burrito` | GTA Wiki: Trailer 1 (0:03) y Trailer 2 (0:35), variante shuttle bus |
| `declasse-tulip-m100` | GTA Wiki + GTA Boom: Trailer 1 (0:27/0:28), variante donk |
| `declasse-granger-3600lx` | GTA Wiki: mencionado junto al Tulip M-100 en Trailer 1 |

### Invetero (2/2 confirmados)
| Vehículo | Fuente / evidencia |
|---|---|
| `invetero-coquette` | The Drive + GTA Bites: Trailer 2, autopista |
| `invetero-coquette-d10` | GTA Wiki: Trailer 1 (0:31), Shore Drive Vice Beach |

### Maibatsu (3/3 confirmados)
| Vehículo | Fuente / evidencia |
|---|---|
| `maibatsu-sanchez` | GTA Boom + GTA Wiki: Trailer 1, grupo de motociclistas |
| `manchez` | GTA Wiki + X/GTA Wiki oficial: screenshot oficial de Mount Kalaga National Park |
| `maibatsu-penumbra` | GTA Wiki: Trailer 1 (0:45), Crosstown Vice City |

### Western (3/3 confirmados)
| Vehículo | Fuente / evidencia |
|---|---|
| `western-nightblade` | Ya documentado en ficha (captura oficial, Electric Fang Tattoo) + corroborado por agregador 6cheats.com |
| `western-zombie-chopper` | GTA Wiki + GTA6 Bible: Trailer 2 (1:38) y screenshot oficial de Ambrosia |
| `western-company-duster` | Listado como avión Western confirmado en GTA Wiki (vehicle list) |

### Otros (9/9 confirmados)
| Vehículo | Fuente / evidencia |
|---|---|
| `dinka-verus` | **Cerrado (ronda 2, 18 ago 2026)**: GTA Wiki, caption directo "A Verus in the first trailer for Grand Theft Auto VI", más variante lifeguard documentada en Vice Beach |
| `shitzu-tropic` | GTA Base: Trailer 1 (una fuente marca Trailer 2 — hay discrepancia menor entre agregadores, sin GTA Wiki dedicado encontrado) |
| `karin-intruder` | GTA Wiki: Trailer 1, 3 apariciones distintas (0:44, 1:03, 1:07) |
| `mammoth-dodo` | GTA Wiki: Trailer 1, dos apariciones (0:13 remolcando banner NINE1NINE, 0:34 Leonida Keys) |
| `emperor-vectre` | GTA Wiki: Trailer 2, Ocean Drive |
| `obey-8f-drafter` | GTA Wiki: screenshot oficial de Ambrosia |
| `speedophile-seashark` | GTA Wiki: Trailer 2 (2:20) + screenshot oficial Leonida Keys |
| `dundreary-landstalker-xl` | GTA Wiki (vehicle list) + GTA-Xtreme + autoevolution: Trailer 1 (0:33) y Trailer 2 |
| `gallivanter-baller-st` | GTA-Xtreme + Retrogems + autoevolution: Trailer 1 (0:32) y Trailer 2 |

## Limitación técnica (bloquea el paso de imagen real)

Esta sesión **no tiene forma de descargar el binario de las imágenes**
encontradas:
- `web_fetch` rechaza explícitamente contenido de imagen ("Image content is
  not supported").
- El acceso de red de `bash_tool` está restringido a dominios de paquetes
  (github, npm, pypi, etc.), no a hosts de medios como `media.gtaboom.com`,
  `gta.fandom.com` o Rockstar.

Mismo bloqueo que documentó la sesión anterior en `IMAGE_CATALOG.md`
Ronda 9. **Los archivos de imagen real deben ser aportados por el usuario**
(como en rondas anteriores) para poder procesarlos e integrarlos con
`scripts/process-images.mjs --apply`.

## Ronda 2 (18 ago 2026) — cierre de pendientes de sourcing + fix de datos

- **`dinka-verus`**: sourcing cerrado, ver tabla arriba.
- **`buckingham-police-maverick`**: sourcing cerrado, ver tabla arriba.
- **Corrección aplicada**: `nagasaki-double-t` renombrado a
  `dinka-double-t` en `src/content/vehiculos/` y en
  `public/images/entities/vehiculos/` (slug, `manufacturer`, `title`,
  `content`, `seoTitle`/`seoDescription` actualizados; nota de auditoría
  agregada en `evidence.note`). Sin referencias cruzadas rotas — se
  verificó con `grep -r "nagasaki-double-t"` sobre todo `src/` antes del
  rename; el único resultado era el propio archivo.
- Verificación de integridad (`scripts/verify-content-integrity.mjs`)
  falla en este entorno por un problema preexistente de configuración
  Turbopack/webpack de Next.js 16, **no relacionado a este cambio**
  (confirmado corriendo el mismo script con `git stash` antes de aplicar
  la corrección: falla igual sin el cambio).

## Próximos pasos

1. Usuario aporta los 37 archivos de imagen (o los que tenga disponibles)
   — sigue siendo el único bloqueante real para pasar de placeholder a
   imagen definitiva.
2. Se procesan e integran con el pipeline existente (WebP 82, 1600×900).
3. Resolver el problema de build Turbopack/webpack de
   `scripts/verify-content-integrity.mjs` (preexistente, no introducido
   en esta sesión).
4. `shitzu-tropic` tiene una discrepancia menor entre agregadores sobre
   si aparece en Trailer 1 o Trailer 2 — no bloqueante, pero pendiente de
   precisar.
