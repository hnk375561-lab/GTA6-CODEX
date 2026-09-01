#!/usr/bin/env node
/**
 * scripts/check-evidence-links.mjs
 * ============================================================
 * Recorre src/content/vehiculos/*.json y verifica que
 * evidence.primarySource / evidence.secondarySource sigan
 * respondiendo (HTTP 2xx/3xx). Las fuentes se validan al momento
 * de escribirlas (ver enrich-vehiculos-v3.mjs), pero con el tiempo
 * un sitio puede caerse, cambiar de URL, o borrar el articulo.
 *
 * Pensado para correr en un cron mensual (ver
 * .github/workflows/check-evidence-links.yml): si encuentra links
 * rotos, escribe un reporte en broken-links-report.json y termina
 * con exit code 1 para que el workflow abra un Issue automatico.
 *
 * USO:
 *   node scripts/check-evidence-links.mjs
 *   node scripts/check-evidence-links.mjs --json   (solo imprime JSON, sin logs)
 *   node scripts/check-evidence-links.mjs --fix    (ver abajo)
 *
 * --fix (auto-sanación):
 *   Además de reportar, BORRA primarySource/secondarySource de las
 *   fichas cuya URL está rota (dejando evidence.note con un rastro de
 *   por qué se limpió). Esto hace que esas fichas vuelvan a contar
 *   como "needsBoth" para enrich-vehiculos-v3.mjs en su próxima
 *   corrida — o sea, deja el terreno listo para que el workflow de
 *   enriquecimiento las vuelva a completar solo, sin que nadie tenga
 *   que borrar el campo a mano. Ver .github/workflows/check-evidence-links.yml,
 *   que corre esto y despues dispara enrich-vehiculos.yml automáticamente.
 */

import fs from "node:fs/promises";
import path from "node:path";

const VEHICULOS_DIR = "src/content/vehiculos";
const REPORT_FILE = "broken-links-report.json";
const CONCURRENCY = 8;
const TIMEOUT_MS = 10000;
const JSON_ONLY = process.argv.includes("--json");
const FIX = process.argv.includes("--fix");

function log(...args) {
  if (!JSON_ONLY) console.log(...args);
}

async function fetchWithTimeout(url, opts = {}, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function checkUrl(url) {
  if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) {
    return { url, ok: false, reason: "url-invalida" };
  }
  try {
    let res = await fetchWithTimeout(
      url,
      {
        method: "HEAD",
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AutoFichaLinkChecker/1.0)" },
      }
    );
    if (res.status === 405 || res.status === 501 || res.status === 403) {
      res = await fetchWithTimeout(url, {
        method: "GET",
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AutoFichaLinkChecker/1.0)" },
      });
    }
    if (res.status >= 200 && res.status < 400) return { url, ok: true, status: res.status };
    return { url, ok: false, status: res.status, reason: `http-${res.status}` };
  } catch (err) {
    return { url, ok: false, reason: err.name === "AbortError" ? "timeout" : String(err.message).slice(0, 120) };
  }
}

// Pool simple de concurrencia
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  const files = (await fs.readdir(VEHICULOS_DIR)).filter((f) => f.endsWith(".json"));
  log(`Revisando evidence de ${files.length} fichas...\n`);

  // Juntar todas las URLs a chequear, deduplicadas (varias fichas pueden
  // compartir la misma fuente), guardando en que ficha(s) aparece cada una.
  const urlToFiles = new Map();
  for (const f of files) {
    const raw = await fs.readFile(path.join(VEHICULOS_DIR, f), "utf8");
    let d;
    try {
      d = JSON.parse(raw);
    } catch {
      continue;
    }
    for (const field of ["primarySource", "secondarySource"]) {
      const url = d.evidence?.[field];
      if (url) {
        if (!urlToFiles.has(url)) urlToFiles.set(url, []);
        urlToFiles.get(url).push({ file: f, field });
      }
    }
  }

  const uniqueUrls = [...urlToFiles.keys()];
  log(`${uniqueUrls.length} URLs unicas a verificar (concurrencia=${CONCURRENCY})...\n`);

  const results = await mapWithConcurrency(uniqueUrls, CONCURRENCY, checkUrl);

  const broken = [];
  for (const r of results) {
    if (!r.ok) {
      broken.push({ ...r, affectedFiles: urlToFiles.get(r.url) });
      log(`✗ ${r.url} (${r.reason || r.status})`);
    }
  }

  let fixedFiles = [];
  if (FIX && broken.length > 0) {
    // Juntar, por archivo, qué campos (primarySource/secondarySource)
    // quedaron apuntando a una URL rota.
    const fieldsByFile = new Map();
    for (const b of broken) {
      for (const { file, field } of b.affectedFiles) {
        if (!fieldsByFile.has(file)) fieldsByFile.set(file, new Set());
        fieldsByFile.get(file).add(field);
      }
    }

    for (const [file, fields] of fieldsByFile) {
      const full = path.join(VEHICULOS_DIR, file);
      const d = JSON.parse(await fs.readFile(full, "utf8"));
      if (!d.evidence) continue;
      let changed = false;
      for (const field of fields) {
        if (d.evidence[field]) {
          delete d.evidence[field];
          changed = true;
        }
      }
      if (!changed) continue;
      d.evidence.note =
        (d.evidence.note ? d.evidence.note + " " : "") +
        `[auto-fix ${new Date().toISOString().slice(0, 10)}] fuente(s) rota(s) removida(s) por check-evidence-links.mjs --fix; pendiente re-enriquecimiento.`;
      await fs.writeFile(full, JSON.stringify(d, null, 2) + "\n", "utf8");
      fixedFiles.push(file);
      log(`  ↳ limpiada evidence en ${file} (${[...fields].join(", ")})`);
    }
  }

  const report = {
    ts: new Date().toISOString(),
    totalUrls: uniqueUrls.length,
    totalBroken: broken.length,
    broken,
    fixedFiles,
  };
  await fs.writeFile(REPORT_FILE, JSON.stringify(report, null, 2) + "\n", "utf8");

  log(`\n${"=".repeat(60)}`);
  log(`TOTAL: ${uniqueUrls.length - broken.length}/${uniqueUrls.length} URLs OK`);
  if (broken.length > 0) {
    log(`${broken.length} URLs rotas — ver ${REPORT_FILE}`);
    if (FIX) log(`${fixedFiles.length} fichas limpiadas y listas para re-enriquecimiento automático.`);
  }

  if (JSON_ONLY) {
    console.log(JSON.stringify(report));
  }

  process.exitCode = broken.length > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
