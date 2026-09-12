#!/usr/bin/env node
/**
 * enrich-fabricantes.mjs
 *
 * Completa `evidence` y reemplaza el `content` boilerplate ("X es un
 * fabricante de vehículos documentado en Sin Frenos.") en
 * src/content/fabricantes/*.json, con el MISMO estándar de evidencia
 * citada que ya tienen las 250 fichas de vehículo — hoy 75/75
 * fabricantes tienen `evidence` ausente, lo cual además hace fallar
 * `npm run audit:evidence` en CI (ver .github/workflows/ci.yml, step
 * "Audit evidence coverage").
 *
 * Reutiliza el mismo patrón de contexto factual (Wikipedia + Tavily
 * opcional) y llamado a Gemini que enrich-vehiculos-v3.mjs, pero con un
 * prompt propio: para un fabricante, "content" es historia/identidad de
 * marca, no ficha técnica de un modelo puntual.
 *
 * USO:
 *   GEMINI_API_KEY=tu_key TAVILY_API_KEY=tu_key node enrich-fabricantes.mjs
 *   LIMIT=10 GEMINI_API_KEY=... node enrich-fabricantes.mjs
 *
 * Requiere GEMINI_API_KEY. TAVILY_API_KEY es opcional (mejora cobertura
 * en fabricantes de nicho/regionales sin artículo completo en Wikipedia).
 */

import fs from "node:fs/promises";
import path from "node:path";

const FABRICANTES_DIR = "src/content/fabricantes";
const API_KEY = process.env.GEMINI_API_KEY;
const TAVILY_KEY = process.env.TAVILY_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : Infinity;
const DELAY_MS = 4500;
const LOG_FILE = "enrichment-fabricantes-log.jsonl";
const BOILERPLATE_RE = /^.+ es un fabricante de vehículos documentado en (AutoFicha|Sin Frenos)\.$/;

if (!API_KEY) {
  console.error("Falta GEMINI_API_KEY. Generá una gratis en https://aistudio.google.com/apikey");
  process.exit(1);
}
if (!TAVILY_KEY) {
  console.warn("⚠ Falta TAVILY_API_KEY: se sigue solo con contexto de Wikipedia. Conseguí una gratis en https://tavily.com para mejor cobertura en marcas de nicho.");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function log(entry) {
  await fs.appendFile(LOG_FILE, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
}

async function fetchWithTimeout(url, opts = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

// --- Contexto factual: Wikipedia (siempre) ---------------------------

async function wikipediaSummary(title, lang) {
  try {
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(title)}&limit=1&namespace=0&format=json`;
    const searchRes = await fetchWithTimeout(searchUrl);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const foundTitle = searchData?.[1]?.[0];
    if (!foundTitle) return null;

    const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(foundTitle)}`;
    const summaryRes = await fetchWithTimeout(summaryUrl);
    if (!summaryRes.ok) return null;
    const data = await summaryRes.json();
    if (!data.extract) return null;
    return {
      source: "wikipedia",
      extract: data.extract,
      url: data.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(foundTitle)}`,
      title: data.title,
    };
  } catch {
    return null;
  }
}

// --- Contexto factual: Tavily (búsqueda real, opcional) ---------------

async function tavilySearch(query) {
  if (!TAVILY_KEY) return [];
  try {
    const res = await fetchWithTimeout(
      "https://api.tavily.com/search",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: TAVILY_KEY,
          query,
          search_depth: "basic",
          max_results: 4,
          include_answer: false,
        }),
      },
      12000
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r) => ({
      source: "tavily",
      url: r.url,
      title: r.title,
      extract: (r.content || "").slice(0, 800),
    }));
  } catch {
    return [];
  }
}

async function fetchAllContext(officialName, title) {
  const query = (officialName || title || "").trim();
  const wiki = (await wikipediaSummary(query, "es")) || (await wikipediaSummary(query, "en"));

  let tavilyResults = [];
  if (TAVILY_KEY) {
    tavilyResults = await tavilySearch(`${query} fabricante de automóviles historia fundación`);
  }

  const sources = [];
  if (wiki) sources.push(wiki);
  sources.push(...tavilyResults);
  return sources;
}

async function urlIsReachable(url) {
  if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) return false;
  try {
    let res = await fetchWithTimeout(url, { method: "HEAD", redirect: "follow" }, 7000);
    if (res.status === 405 || res.status === 501) {
      res = await fetchWithTimeout(url, { method: "GET", redirect: "follow" }, 7000);
    }
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  }
}

// --- Escanear cola --------------------------------------------------------

async function scanQueue() {
  const files = (await fs.readdir(FABRICANTES_DIR)).filter((f) => f.endsWith(".json") && f !== "README.md");
  const queue = [];
  for (const f of files) {
    const full = path.join(FABRICANTES_DIR, f);
    const raw = await fs.readFile(full, "utf8");
    let d;
    try {
      d = JSON.parse(raw);
    } catch {
      console.warn(`⚠ ${f}: JSON inválido, se salta`);
      continue;
    }
    const hasEvidence = !!(d.evidence && (d.evidence.primarySource || d.evidence.secondarySource));
    const hasRealContent = typeof d.content === "string" && !BOILERPLATE_RE.test(d.content.trim());
    if (!hasEvidence || !hasRealContent) queue.push(f);
  }
  return queue;
}

// --- Prompt -----------------------------------------------------------

function buildPrompt(fabricanteData, sources) {
  let contextBlock;
  if (sources.length > 0) {
    const blocks = sources
      .map((s, i) => `[Fuente ${i + 1} - ${s.source}]\nURL: ${s.url}\nExtracto: ${s.extract}`)
      .join("\n\n");
    contextBlock = `Contexto factual recuperado de fuentes reales (usalo como base confiable, y para citar evidence.primarySource/secondarySource SOLO con URLs de esta lista):\n\n${blocks}\n`;
  } else {
    contextBlock = `No se encontró contexto externo para este fabricante. Usá SOLO datos que sepas con alta confianza; si no estás seguro de un dato, poné null en vez de inventarlo. NO inventes ninguna URL.\n`;
  }

  return `Sos un investigador automotriz que arma perfiles de marca para un catálogo web en español (Argentina, tono neutro/rioplatense pero profesional).

Fabricante: ${fabricanteData.officialName || fabricanteData.title}
País (dato ya verificado, no lo repitas como si fuera nuevo): ${fabricanteData.country || "desconocido"}
Año de fundación (ya verificado): ${fabricanteData.foundedYear || "desconocido"}

${contextBlock}

IMPORTANTE sobre fuentes: NUNCA inventes una URL que no esté en la lista de fuentes de arriba (si hay lista). Si no hay lista y no conocés con TOTAL certeza una URL oficial estable, dejá primarySource/secondarySource en null.

Devolvé EXCLUSIVAMENTE un objeto JSON (sin markdown, sin \`\`\`json, sin texto antes o después) con esta forma exacta:

{
  "evidence": {
    "level": "oficial-nombrado" o "respaldado",
    "primarySource": "URL de la lista de fuentes, o null",
    "secondarySource": "URL de la lista de fuentes, o null",
    "note": "string explicando qué se verificó y de dónde salió",
    "limitations": ["array de strings con limitaciones reales del dato"]
  },
  "content": "string en Markdown, 300-500 palabras, con headers ##: identidad de marca, historia real (fundación, hitos), posicionamiento actual. Reescrito con tus propias palabras, NO copiado de la fuente. Si el fabricante es una marca de nicho sin mucha historia pública documentada, escribí lo que sí es verificable y sé honesto sobre lo que no se encontró — NO rellenes con generalidades vacías tipo 'es reconocida por su calidad y diseño'."
}

Reglas estrictas:
- NUNCA inventes URLs fuera de la lista dada.
- NUNCA inventes cifras ni hitos históricos. Ante la duda, omitilo del content en vez de inventarlo.
- Devolvé SOLO el JSON, nada más.`;
}

// --- Gemini -----------------------------------------------------------

async function callGemini(prompt, attempt = 1) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3 },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) {
      const isDailyQuota = /exceeded your current quota|RESOURCE_EXHAUSTED|per day|RPD/i.test(text);
      if (isDailyQuota) {
        const err = new Error(`QUOTA_DIARIA_AGOTADA: Gemini API 429: ${text.slice(0, 300)}`);
        err.isDailyQuotaExhausted = true;
        throw err;
      }
      if (attempt < 3) {
        await sleep(8000 * attempt);
        return callGemini(prompt, attempt + 1);
      }
    }
    if (res.status === 404 && attempt === 1) {
      throw new Error(`Gemini API 404 (¿modelo "${MODEL}" descontinuado? probá GEMINI_MODEL=gemini-3.5-flash): ${text.slice(0, 300)}`);
    }
    throw new Error(`Gemini API ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p) => p.text || "").join("");
  if (!text) throw new Error("Respuesta vacía de Gemini: " + JSON.stringify(data).slice(0, 500));
  return text;
}

function extractJson(text) {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No se encontró un objeto JSON en la respuesta");
  let jsonSlice = cleaned.slice(start, end + 1);
  // Gemini a veces devuelve escapes inválidos (ej. \' dentro de un string,
  // que no es un escape JSON válido) o caracteres de control literales
  // (saltos de línea sin escapar dentro de un string). JSON.parse es
  // estricto y tira "Bad escaped character" / "Unexpected token" ante
  // esto — se repara antes de parsear en vez de descartar la respuesta
  // entera (que ya costó una llamada real a Gemini).
  jsonSlice = jsonSlice.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
  return JSON.parse(jsonSlice);
}

async function validateEvidence(evidence, sources) {
  if (!evidence) evidence = {};
  const out = { ...evidence };
  const sourceUrls = new Set(sources.map((s) => s.url));

  const checkUrl = async (u) => {
    if (!u) return undefined;
    if (sources.length > 0 && !sourceUrls.has(u)) return undefined;
    const ok = await urlIsReachable(u);
    return ok ? u : undefined;
  };

  out.primarySource = await checkUrl(out.primarySource);
  out.secondarySource = await checkUrl(out.secondarySource);

  if (!out.primarySource && !out.secondarySource && sources.length > 0) {
    out.secondarySource = sources[0].url;
    out.note = (out.note ? out.note + " " : "") + "Fuente del fabricante no verificable puntualmente; se usa la primera fuente recuperada como respaldo.";
  }

  out.level = out.primarySource ? (out.level || "oficial-nombrado") : "respaldado";
  return out;
}

// --- Merge --------------------------------------------------------------

function mergeIntoFabricante(existing, enrichment) {
  const merged = { ...existing };

  if (enrichment.evidence) {
    merged.evidence = {
      level: enrichment.evidence.level || merged.evidence?.level || "respaldado",
      primarySource: enrichment.evidence.primarySource || undefined,
      secondarySource: enrichment.evidence.secondarySource || undefined,
      note: enrichment.evidence.note || merged.evidence?.note,
      limitations: enrichment.evidence.limitations || merged.evidence?.limitations || [],
    };
    Object.keys(merged.evidence).forEach((k) => merged.evidence[k] === undefined && delete merged.evidence[k]);
  }

  if (enrichment.content && enrichment.content.length > 150 && !BOILERPLATE_RE.test(enrichment.content.trim())) {
    merged.content = enrichment.content;
  }

  merged.updatedAt = new Date().toISOString();
  return merged;
}

// --- Loop principal ---------------------------------------------------------

async function main() {
  console.log("Escaneando fabricantes...");
  const queue = (await scanQueue()).slice(0, LIMIT);
  console.log(`  ${queue.length} fabricantes necesitan evidence y/o content real`);
  console.log(`  Tavily: ${TAVILY_KEY ? "activado" : "desactivado (sin TAVILY_API_KEY)"}\n`);

  let ok = 0, fail = 0, withSource = 0;

  for (const [i, filename] of queue.entries()) {
    const full = path.join(FABRICANTES_DIR, filename);
    process.stdout.write(`[${i + 1}/${queue.length}] ${filename} ... `);
    try {
      const existing = JSON.parse(await fs.readFile(full, "utf8"));
      const sources = await fetchAllContext(existing.officialName, existing.title);
      const prompt = buildPrompt(existing, sources);
      const rawResponse = await callGemini(prompt);
      const enrichment = extractJson(rawResponse);
      enrichment.evidence = await validateEvidence(enrichment.evidence, sources);
      const merged = mergeIntoFabricante(existing, enrichment);

      const serialized = JSON.stringify(merged, null, 2);
      JSON.parse(serialized);

      await fs.writeFile(full, serialized + "\n", "utf8");
      const gotSource = !!(merged.evidence?.primarySource || merged.evidence?.secondarySource);
      if (gotSource) withSource++;
      console.log(`✓ (${sources.length} fuentes encontradas${gotSource ? ", evidence OK" : ", sin evidence"})`);
      ok++;
      await log({ file: filename, status: "ok", sourcesFound: sources.length, gotEvidence: gotSource });
    } catch (err) {
      console.log("✗ " + err.message.slice(0, 150));
      fail++;
      await log({ file: filename, status: "error", error: String(err.message).slice(0, 500) });

      if (err.isDailyQuotaExhausted) {
        console.log(`\n⛔ Cuota diaria de Gemini agotada en el archivo ${i + 1}/${queue.length}. Abortando.`);
        break;
      }
    }

    if (i < queue.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nListo. OK: ${ok}  Con evidencia real: ${withSource}  Errores: ${fail}`);
  console.log(`Log completo en ${LOG_FILE}`);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
