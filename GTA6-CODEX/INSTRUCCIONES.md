# Cambios para GTA6-CODEX — Fase 2 y 3 (contenido real + búsqueda)

Estos archivos implementan lo que tu propio README marcaba como "Fase 2: Contenido
Base" y "Fase 3: Relaciones y Navegación", que todavía no estaba hecho:

## Qué estaba roto / faltante

1. **`src/app/[entityType]/[slug]/page.tsx` estaba completamente vacío.**
   Aunque ya tenías 3 personajes en JSON, no había ninguna página que los mostrara.
2. **`src/lib/entities.ts` y `src/lib/relations.ts` eran stubs** — devolvían
   arrays vacíos siempre, sin leer el contenido real.
3. **No existía página de listado por categoría** (`/personajes`, `/vehiculos`, etc.).
4. **El contador del home estaba hardcodeado en "0"**.
5. **`fuse.js` está en tus dependencias pero nunca se usaba** — no había buscador.
6. **Los 3 JSON de personajes estaban en `src/content/personajes/` en la RAÍZ
   del repo**, fuera de la carpeta `GTA6-CODEX/` donde vive tu `package.json`.
   Como tu proyecto Vercel usa `GTA6-CODEX/` como root, el código en producción
   nunca iba a encontrar ese contenido — busca en `GTA6-CODEX/src/content/`.

## Qué se agregó/corrigió (archivos en este zip)

```
GTA6-CODEX/
├── src/
│   ├── lib/
│   │   ├── entities.ts          [REEMPLAZAR] lee JSON real de src/content/{type}/
│   │   └── relations.ts         [REEMPLAZAR] resuelve relaciones reales entre entidades
│   ├── app/
│   │   ├── page.tsx             [REEMPLAZAR] contador real + sección "Destacados"
│   │   ├── buscar/
│   │   │   └── page.tsx         [NUEVO] página de búsqueda
│   │   └── [entityType]/
│   │       ├── page.tsx         [NUEVO] listado por categoría
│   │       └── [slug]/
│   │           └── page.tsx     [REEMPLAZAR] estaba vacío, ahora renderiza la entidad
│   ├── components/
│   │   ├── layout/
│   │   │   └── Header.tsx       [REEMPLAZAR] agrega ícono de búsqueda
│   │   └── search/
│   │       └── SearchClient.tsx [NUEVO] buscador client-side con Fuse.js
│   └── content/
│       └── personajes/
│           ├── jason-michigander.json  [MOVER AQUÍ, desde la raíz del repo]
│           ├── lucia-lopez.json        [MOVER AQUÍ, desde la raíz del repo]
│           └── saira-shah.json         [MOVER AQUÍ, desde la raíz del repo]
```

## Pasos para aplicar (con tu propio git, sin compartir tokens en el chat)

```bash
git clone https://github.com/hnk375561-lab/GTA6-CODEX.git
cd GTA6-CODEX

# 1. Borrar la carpeta de contenido duplicada/mal ubicada en la raíz
rm -rf src/content

# 2. Copiar todos los archivos de este zip dentro de GTA6-CODEX/,
#    reemplazando donde corresponda (usa el mismo mapa de arriba)

# 3. Instalar dependencias y probar en local
cd GTA6-CODEX
npm install
npm run dev
# abrir http://localhost:3000 -> ver contador real, /personajes,
# /personajes/jason-michigander, y /buscar

# 4. Commit y push
git add -A
git commit -m "feat: implementar carga real de contenido, páginas de detalle/listado y búsqueda"
git push
```

Vercel va a buildear y deployar automáticamente al hacer push a `main`.

## Qué sigue (roadmap sugerido)

- Agregar contenido real para `vehiculos`, `ubicaciones`, `misiones`, `noticias`
  (mismo formato JSON, ver `GTA6-CODEX/src/content/README.md`).
- Sitemap dinámico y `robots.txt` generado desde `src/lib/seo.ts` (ya tenés las
  funciones `generateRobotsTxt`, falta conectarlas a una ruta `/sitemap.xml` y
  `/robots.txt` de Next.js).
- Reemplazar el placeholder de GA4 (`G-XXXXXXXXXX`) en `layout.tsx` con tu ID real.
- Sección de "Noticias" con contenido MDX si querés artículos más largos.
