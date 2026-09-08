import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
  // El proyecto no tiene KV/R2 configurado en wrangler.toml. Sin este
  // override, OpenNext usa por defecto un caché que espera un binding
  // de KV inexistente: cada request queda esperando una tarea en
  // background (ctx.waitUntil) que nunca resuelve y Cloudflare termina
  // cancelando por timeout — eso era lo que colgaba el sitio.
  //
  // staticAssetsIncrementalCache sirve las páginas ISR pregeneradas en
  // build directamente desde los assets estáticos del Worker, sin
  // necesitar ningún binding adicional. Las revalidaciones en caliente
  // (ISR on-demand) quedan como no-op: el contenido se actualiza en el
  // próximo deploy/build, lo cual es apropiado para un catálogo que se
  // reconstruye en cada deploy.
  incrementalCache: staticAssetsIncrementalCache,
});