# Divulgación de riesgo legal — Assets visuales

**Fecha:** 21 de agosto de 2026
**Ámbito:** `public/images/entities/`, `public/images/heroes/` (~55 MB en total, 197 archivos)

Este documento debe leerse **antes** de la transferencia de este repositorio/sitio a
cualquier comprador. Su propósito es dejar constancia explícita de un riesgo conocido
y no resuelto, para que sea el comprador — con conocimiento pleno — quien decida cómo
proceder después de la adquisición.

---

## 1. Naturaleza del riesgo

El sitio sirve en producción un conjunto de imágenes (fichas de personajes, vehículos,
ubicaciones y elementos "hero" de portada) cuyo origen, según el propio catálogo interno
del proyecto (`docs/internal/IMAGE_CATALOG.md`), es material promocional oficial de
**Rockstar Games / Take-Two Interactive** (assets de marketing, capturas oficiales y
material de la Ultimate Edition / Vintage Vice City Pack), sin que exista una licencia
de uso comercial otorgada por el titular de los derechos.

El propio catálogo documenta esto de forma explícita, entidad por entidad, con la nota:

> "GTA es marca registrada de Rockstar Games / Take-Two Interactive. Uso editorial no
> comercial en un wiki de fans."

En varios lotes, el catálogo además marca el campo `verified: false` o `verified: parcial`,
es decir, ni siquiera hay confirmación independiente completa de la fuente exacta de
cada archivo individual.

## 2. Por qué esto importa específicamente para este proyecto

- El repositorio incluye `public/ads.txt`, preparado para monetización vía Google AdSense.
  Servir material no licenciado de un tercero **junto con** publicidad monetizada eleva
  el perfil de riesgo respecto de un uso puramente editorial/no comercial.
- Take-Two Interactive tiene un historial documentado de emisión de notificaciones DMCA
  contra proyectos de fans que exceden el uso editorial razonable.
- No existe (a la fecha de este documento) ninguna licencia, permiso o acuerdo escrito
  con Rockstar Games / Take-Two Interactive que cubra el uso de este material.

## 3. Alcance de lo NO resuelto

- Las ~197 imágenes en `public/images/entities/` y `public/images/heroes/` **no han sido
  reemplazadas** por arte original, contenido con licencia explícita, o placeholders
  editoriales.
- `docs/internal/IMAGE_CATALOG.md` permanece en el repositorio como registro de
  trazabilidad — es, a la vez, la documentación más completa de sourcing y la evidencia
  escrita más directa de que el origen de estas imágenes no está licenciado.

## 4. Decisión tomada

Con fecha 21 de agosto de 2026, el propietario del proyecto (DSA) decidió **documentar
este riesgo por escrito en lugar de reemplazar las imágenes antes de la venta**, y
transferir el activo en su estado actual. Esta decisión implica que:

- El riesgo legal descrito en este documento **se transfiere al comprador** junto con
  el repositorio, salvo que se acuerde explícitamente lo contrario por escrito en el
  contrato de compraventa.
- Cualquier acción de mitigación (reemplazo de imágenes, obtención de licencia,
  eliminación de AdSense, etc.) queda a criterio y cargo del comprador tras la
  adquisición.

## 5. Mitigaciones posibles (no aplicadas, a considerar por el comprador)

- Reemplazar las imágenes oficiales por arte original encargado, fan-art con licencia
  explícita, o placeholders editoriales (paletas de color, tipografía, iconografía).
- Remover o pausar la integración de AdSense mientras el sitio use material no licenciado.
- Gestionar una licencia formal de uso de marca/imagen con Take-Two Interactive.
- Limitar el uso a fines estrictamente editoriales/no comerciales, sin publicidad asociada.

---

**Nota:** este documento es una divulgación de hechos y no constituye asesoramiento
legal. Se recomienda que tanto vendedor como comprador consulten con un abogado
especializado en propiedad intelectual antes de cerrar cualquier operación sobre este
activo.
