# Auditoría Dark Mode — Reingeniería completa (sept. 2026)

Commit: `7d0afcb7` (main). 54 archivos, +433/−129.

## 1. Objetivo

Dark mode de primera clase, **no** una inversión de colores: el tema oscuro
se diseñó por jerarquía de superficies y luminancia, exactamente con la misma
lectura visual que el tema claro — titulares fuertes, texto secundario
disminuido, superficies apiladas por profundidad real (L0 página → L5 modal).

Criterios de la tarea cumplidos: persistencia entre refrescos/navegaciones,
transiciones válidas claro↔oscuro, mobile 320–430, sin `filter: invert()`,
sin cambios de contenido/negocio/monetización, sin dependencias nuevas.

## 2. Arquitectura de tokens

- `:root` (tema claro) y `.dark` (tema oscuro) en `src/app/globals.css`
  definen las custom properties `--color-*`.
- `tailwind.config.js` mapea cada token a
  `rgb(var(--color-x) / <alpha-value>)` → los modificadores de opacidad de
  Tailwind (`/70`, `/10`, `/20`) siguen generando
  `rgb(var(--color-x) / 0.7)`. OJO: con `var(--x)` directo, Tailwind v3.4
  DROPA en silencio las clases con opacidad (probado y documentado en el
  código). Las capas glass con alpha horneado (`surface-header`, `drawer`,
  `chip`) se referencian sin `<alpha-value>`.
- `darkMode: 'class'` sin tocar. La clase `.dark` va en `<html>`.

## 3. Valores de los token

Neutral (light = paleta Tailwind exacta, dark = grafito azulado):

| token | light | dark |
|---|---|---|
| neutral-50 | 250 250 250 | 26 31 41 |
| neutral-100 | 245 245 245 | 34 40 54 |
| neutral-200 | 229 229 229 | 44 52 68 |
| neutral-300 | 212 212 212 | 61 70 88 |
| neutral-400 | 163 163 163 | 124 135 152 |
| neutral-500 | 115 115 115 | 152 161 176 |
| neutral-600 | 82 82 82 | 170 179 193 |
| neutral-700 | 64 64 64 | 191 198 211 |
| neutral-800 | 38 38 38 | 214 219 228 |
| neutral-900 | 23 23 23 | 238 241 245 |
| neutral-950 | 10 10 10 | 248 250 252 |

Superficies jerárquicas:

| token | light | dark |
|---|---|---|
| surface-page (L0) | 255 255 255 | 11 13 16 |
| surface-alt | 250 250 250 | 18 21 26 |
| surface-card (L1) | 255 255 255 | 18 21 26 |
| surface-card-hover | 252 252 252 | 22 27 33 |
| surface-elevated (L5) | 255 255 255 | 26 32 41 |
| surface-input | 255 255 255 | 14 18 24 |
| surface-header (glass) | 255 255 255 / .75 | 10 12 17 / .78 |
| surface-drawer (glass) | 255 255 255 / .95 | 14 17 23 / .95 |
| surface-chip (glass) | 255 255 255 / .9 | 30 36 46 / .92 |
| inverse | 24 24 27 | 42 52 65 |
| edge | 229 229 229 | 36 42 50 |
| edge-strong | 212 212 212 | 51 60 71 |

`color-scheme: light` en `:root` + `.dark { color-scheme: dark }`:
controls nativos (scrollbar, selects, inputs, date pickers) siguen al tema.

## 4. Superficies migradas

- Home header `bg-white/75` → `bg-surface-header`; drawer móvil
  `bg-white/95` → `bg-surface-drawer`.
- Inputs (buscador, leads, comparador, financiamiento, formularios) →
  `bg-surface-input`.
- Tarjetas/pills → `bg-surface-card` (+`card-hover`), modales/chips de cierre
  → `bg-surface-elevated`, `✕` de sheet/ad → `bg-surface-elevated`.
- Pills glass → `bg-surface-chip` reemplazan `bg-white/95` del scoreboard.
- Chips "inverse" (negros en claro) → token `inverse`: en oscuro quedan
  gris-azul #2a3441 distinguible del lienzo, siempre con texto blanco.

## 5. Tipografía / escala neutral

Todo `text-neutral-*` es theme-reactive. Los títulos (neutral-900 light)
invierten a casi-blanco en dark. Los `hover:text-neutral-900` de links/anclas
de páginas claras adaptan solos.

## 6. Hero e imágenes (piezas "siempre oscuras")

Los fondos/panel que son oscuros en AMBOS temas no deben usar la escala
neutral (en dark se volverían claros) — se fijaron explícitos:

- Gradientes `from-neutral-800 via-neutral-900 to-black` (HeroPromoBanner,
  HeroSelfPromoCard, backdrop del lightbox de GalleryExplorer) →
  `from-[#262626] via-[#171717] to-black` (vals claro literales, inmutables).
- Textos sobre esos canvas → `text-auto-text` / `text-auto-text-secondary`
  (siempre claros): subtítulos de hero, body de CTA cards, inputs sobre glass.
- Fades del carrusel del hero y del detalle → `from-surface-page` /
  `to-surface-page` (la superficie del fondo de las cards).
- Play overlays `bg-white/30` y hover `bg-white/10` sobre media quedan
  theme-independent (superpuestos a foto/video, igual que en claro).
- CTA pills blancas sobre hero oscuro con texto fijo `text-[#171717]`.
- Flechas del carrusel: fondo blanco literal `text-[#404040] ring-[#e5e5e5]` —
  contraste sobre cards oscuras, igual en ambos temas.
- Skeletons / hero-chip / media-reveal → override `.dark` al final de globals.

## 7. Iconografía y controles glass

Los controles sobre `.glass-surface` (lightbox, gallery, zoom, inputs)
tenían `text-neutral-900` = negro sobre vidrio oscuro (bug pre-existente en
claro, invisible). Corregidos a `text-auto-text` (funciona ambos temas).

## 8. Resto del sitflat

- Footer (bg-auto-darker): títulos `text-neutral-900`→`text-auto-text` (bug
  pre-existente). Links y marquee con auto-text/auto-text-secondary.
- ConsentBanner y TrendingBar: links/separadores → auto-text tokens.
- Embeds (VideoEmbed/YouTubeEmbed): título de la barra sobre gradiente
  oscuro `text-neutral-900`→`text-white` (bug pre-existente en claro).
- Skip-link `focus:bg-neutral-900` → `bg-auto-dark` (constante).

## 9. Toggle, persistencia, anti-FOUC

- `src/lib/theme.ts`: modelo `'system' | 'light' | 'dark'` (default system;
  preferencia explícita manda sobre el sistema). Persistencia en localStorage
  `sinfrenos:theme`. Ciclo system → light → dark.
- `src/components/ui/ThemeToggle.tsx`: componente cliente montado en el
  header (CTA area). Luna en claro / sol en oscuro, `aria-label` describe la
  próxima acción ("Cambiar a tema oscuro" etc.), escucha
  `prefers-color-scheme` en vivo.
- `src/app/layout.tsx`: script inline como primer hijo de `<body>` que replica
  la resolución en vanilla JS antes del primer paint (sin flash de blanco al
  recargar); la clase `.dark` persiste en `<html>` entre navegaciones cliente.

## 10. Mobile y accesibilidad

- Toggle cabe en actions de header en 320px; drawer móvil con tokens.
- `prefers-reduced-motion` sin cambios (nada nuevo animado).
- Contrastes de texto primario B+ en ambos temas; secundario A+ salvo casos
  documentados (separadores decorativos, placeholders).
- `aria-label` dinámico del toggle anunciado a lectores de pantalla.

## 11. Performance

- Cero JS en el camino crítico para pintar el tema (script inline de 1 línea).
- Ninguna utilidad nueva exige runtime; el bundle de estilos crece ~los
  selectores `.dark .*` del final de globals (constantes).
- Los tokens se resuelven como custom properties: un solo lugar de cambio.

## 12. Leftovers / decisiones deliberadas

- `auto-*` tokens (dark constants) se conservan intactos para canvas que son
  oscuros por diseño en ambos temas (footer, consent, media, logo, overlays).
- `text-surface-card` generado durante pruebas: NO existe en código real.
- `bg-neutral-50` de las cards del showroom: theme-reactive (card blanca en
  claro, grafito en oscuro) — comportamiento buscado.
- `text-red-400` de mensajes de error inline (PremiumReportButton,
  ForSaleFlyerForm): válido en ambos temas, sin cambios.
- `bg-emerald-600` (Cálculo) botón sólido de acento: válido en ambos temas.
- Barra de comparación (VehicleCompareSheet): glass + `bg-surface-card/95`
  (theme-reactive) — los textos internos ya trackean tokens.
- CTA cards de /anunciate, /concesionarias-*, /licencia-datos: vísceras
  `text-neutral-300`→`text-auto-text-secondary` (siempre claras sobre
  bg-auto-darker).

## 13. Testing — PASS/FAIL

Validación offline (no hay `node_modules` en esta máquina; Vercel construye):

- PASS — Transpile (parse TS con el toolchain instalado) de los 56 archivos
  tocados: 0 fallos.
- PASS — Build completo de Tailwind con la config nueva contra el content
  real: exit 0, 181 KB de CSS, con TODAS las utilidades nuevas presentes
  (`bg-inverse`, `bg-surface-chip`, `dark:text-green-400`,
  `dark:hover:bg-yellow-500/10`, `from-surface-page`, `bg-[#404040]`,
  `text-auto-text`, `.dark` selectors, etc.).
- PASS — Greps de auditoría desde cero: sin `bg-neutral-900` en canvas
  oscuros; sin `text-neutral-900/300` sobre glass/auto-darker/hero;
  sin `bg-white` de superficie (solo overlays de media, flechas y CTA
  whites a propósito); sin `from-neutral-8/9` como bordes de gradiente.
- PENDIENTE en Vercel (deploy automático al pushear): revisión visual
  manual de transición claro↔oscuro en desktop + 320–430, scrollbar native,
  fecha picker de los forms de leads y contraste final de los chips de
  evidencia `emerald-300` sobre `bg-auto-darker`.

## 14. Regresiones revisadas

- Header home claro: wordmark con `dark:text-auto-accent` para el acento.
- Nada de `filter: invert()`, nada de transiciones de 1 s en theme.
- Sin cambios de contenido, textos, negocio, monetización ni dependencias.