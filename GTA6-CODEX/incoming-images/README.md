# incoming-images/

Carpeta de entrada para el pipeline de imágenes. Nada de lo que pongas acá
se procesa automáticamente — corré el script cuando quieras.

## Cómo usarla

Dos formas de nombrar los archivos, elegí la que te resulte más cómoda:

**Opción A — nombre = slug de la entidad**
```
incoming-images/lucia-caminos.jpg
incoming-images/grotti-cheetah-95.jpg
incoming-images/vice-city.jpg
```

**Opción B — dentro de una subcarpeta de categoría, nombre = título o slug**
```
incoming-images/personajes/Lucia Caminos 01.jpg
incoming-images/vehiculos/grotti-cheetah-95.jpg
incoming-images/ubicaciones/Vice City.jpg
```
Categorías válidas como subcarpeta: `personajes`, `vehiculos`, `ubicaciones`,
`organizaciones`, `negocios`.

Si el nombre no coincide con ningún slug/título real del catálogo
(`src/content/**.json`), el archivo NO se mueve: queda en
`_sin-identificar/` para que lo renombres a mano.

Si la entidad ya tiene imagen en `public/images/entities/`, el archivo
nuevo tampoco se sobreescribe solo: queda en `_duplicados-posibles/`.
Usá `--overwrite` si de verdad querés reemplazar la existente.

## Comandos

```bash
npm run process-images          # dry-run: muestra qué haría, no mueve nada
npm run process-images:apply    # ejecuta de verdad: optimiza y mueve
node scripts/process-images.mjs --apply --overwrite   # + permite reemplazar
```

## Qué hace el procesamiento

- Convierte todo a WebP (calidad 82)
- Redimensiona si el lado mayor supera 1600px (nunca agranda una imagen chica)
- Detecta duplicados exactos por hash de contenido, aunque tengan nombres distintos
- Mueve el resultado final a `public/images/entities/{categoría}/{slug}.webp`

Después de correr `--apply`, el sitio recoge las imágenes nuevas
automáticamente en el próximo `npm run build` (o al recargar en `npm run dev`)
— no hace falta tocar ningún componente ni archivo de contenido.
