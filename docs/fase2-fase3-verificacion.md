# Fase 2 y Fase 3 — verificación de cierre (13/09/2026)

Este documento registra qué se auditó contra el repo real (no contra lo
que el documento maestro *asumía* que faltaba) al pedir "termina fase 2 y
termina fase 3".

## Fase 2 — Auth (magic link) + políticas RLS base

**Ya estaba 100% implementada.** No se agregó código nuevo para esta
fase, solo se verificó contra los tres criterios del plan (sección 19):

- Login/logout client-side: `src/app/ingresar/page.tsx` (magic link vía
  `signInWithOtp`) + `src/lib/hooks/useAuth.ts` (sesión + `signOut`) +
  botón de logout ya cableado en `src/components/layout/Header.tsx`.
- Tabla poblada automáticamente al primer login: trigger
  `on_auth_user_created` -> `handle_new_user()` en
  `supabase/migrations/001_initial_schema.sql`.
- Políticas RLS mínimas de la sección 4.15, escritas y testeadas: 
  `003_rls_policies.sql` + el fix de leak de teléfono en
  `004_fix_profile_rls_leak.sql`, con test explícito de bloqueo
  cross-usuario en `scripts/test-rls.mjs` (8 checks: draft ajeno,
  publicado ajeno, hijack de listing, spoof de `seller_id`, hijack de
  perfil, favoritos ajenos, y el leak de `phone` por SELECT directo vs.
  la vista `public_profiles`).

Nada quedó pendiente de esta fase.

## Fase 3 — Modelo Listing con datos semilla (solo lectura)

El esquema y la página de lectura (`src/app/listings/ver/page.tsx`) ya
estaban completos y manejaban correctamente `condition_details` y
`vehicle_model_slug = null`. Lo único que faltaba, y es lo que agrega
este cambio:

- `scripts/seed-listings-fase3.mjs`: crea 3 vendedores demo (vía Admin
  API, mismo patrón que `test-rls.mjs`) y 16 listings de prueba —
  cubriendo autos y motos, y prácticamente toda `vehicle_conditions`
  (nuevo, usado, chocado, siniestrado, no_arranca, motor_roto, caja_rota,
  para_repuestos, desarmado, restauración, clásico, competición,
  inundado, incendiado, otro), con al menos un caso de
  `vehicle_model_slug` matcheado al catálogo real y varios en `null`.
  Incluye una foto placeholder por listing en `listing_media`.
- `package.json`: se agregaron `sync:vehicle-models` (el script
  `scripts/sync-vehicle-models.mjs` ya existía pero nunca se había
  registrado como comando npm — hallazgo de esta revisión, no algo que
  pidiera el plan explícitamente), `seed:listings-fase3` y
  `seed:listings-fase3:cleanup`.

### Cómo aplicar esto en Supabase

Orden recomendado, con `.env.local` configurado
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`):

```bash
npm run sync:vehicle-models      # puebla vehicle_models desde el catálogo JSON
npm run seed:listings-fase3      # carga los 16 listings de prueba
```

El script imprime al final las URLs directas (`/listings/ver?id=...`)
para los dos casos del criterio de aceptación: uno con condición
`chocado` y uno con `vehicle_model_slug = null`.

Para deshacer todo lo que carga el seed (borra los 3 vendedores demo; el
`ON DELETE CASCADE` de `seller_id` se lleva sus listings, medios y
favoritos con ellos):

```bash
npm run seed:listings-fase3:cleanup
```

### Qué sigue sin tocar (correcto, es de otra fase)

- `/publicar`, `/mis-publicaciones`, formulario de publicación real:
  Fase 4.
- Búsqueda/filtros de `/listings`: Fase 5.
- Mensajería y favoritos ligados a cuenta: Fase 6.
- Moderación real: Fase 7.
