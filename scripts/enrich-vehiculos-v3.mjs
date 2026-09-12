#!/usr/bin/env node
/**
 * enrich-vehiculos-v3.mjs
 *
 * Igual que v2, pero suma una fuente más de contexto factual gratis:
 * Tavily Search API (https://tavily.com, free tier: 1000 búsquedas/mes,
 * sin tarjeta). Esto ayuda sobre todo con vehículos de nicho/regionales
 * que no tienen artículo en Wikipedia (motos chicas, marcas de mercados
 * emergentes, etc.) y por eso quedaban con evidence null en v2.
 *
 * Si no hay TAVILY_API_KEY configurada, el script funciona igual que v2
 * (solo con Wikipedia) — Tavily es un plus, no una dependencia dura.
 *
 * USO:
 *   GEMINI_API_KEY=tu_key TAVILY_API_KEY=tu_key node enrich-vehiculos-v3.mjs
 *   ONLY=needsBoth GEMINI_API_KEY=... TAVILY_API_KEY=... node enrich-vehiculos-v3.mjs
 *
 * ONLY=needsSafety: modo separado (audit #14) que SOLO busca y completa el
 * campo `safety` (euroNCAP/puntaje) en fichas que no lo tienen. No toca
 * evidence/content/specs. Si no encuentra un resultado real y específico
 * de Euro NCAP/Latin NCAP/IIHS/NHTSA para el modelo, deja la ficha sin
 * tocar en vez de estimar un puntaje (mismo estándar de evidencia citada
 * que el resto del dataset — ver bf468bc8, que retiró justamente el
 * relleno genérico sin fuente).
 *   ONLY=needsSafety GEMINI_API_KEY=... TAVILY_API_KEY=... node enrich-vehiculos-v3.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";

const VEHICULOS_DIR = "src/content/vehiculos";
const API_KEY = process.env.GEMINI_API_KEY;
const TAVILY_KEY = process.env.TAVILY_API_KEY; // opcional
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : Infinity;
const ONLY = process.env.ONLY || "all";
const DELAY_MS = 4500;
const LOG_FILE = "enrichment-log.jsonl";

if (!API_KEY) {
  console.error("Falta GEMINI_API_KEY. Generá una gratis en https://aistudio.google.com/apikey");
  process.exit(1);
}
if (!TAVILY_KEY) {
  console.warn("⚠ Falta TAVILY_API_KEY: se sigue solo con contexto de Wikipedia (como v2). Conseguí una gratis en https://tavily.com para mejor cobertura en vehículos de nicho.");
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

async function fetchAllContext(vehicleTitle, manufacturer) {
  const query = `${manufacturer || ""} ${vehicleTitle}`.trim();
  const wiki = (await wikipediaSummary(query, "es")) || (await wikipediaSummary(query, "en"));

  let tavilyResults = [];
  if (TAVILY_KEY) {
    tavilyResults = await tavilySearch(`${query} ficha técnica especificaciones oficial precio`);
  }

  const sources = [];
  if (wiki) sources.push(wiki);
  sources.push(...tavilyResults);
  return sources;
}

// --- Validar URLs antes de aceptarlas -----------------------------------

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

// --- Escanear cola (igual que v2) ---------------------------------------

async function scanQueue() {
  const files = (await fs.readdir(VEHICULOS_DIR)).filter((f) => f.endsWith(".json"));
  const needsBoth = [];
  const needsContentOnly = [];
  const needsSafety = [];
  for (const f of files) {
    const full = path.join(VEHICULOS_DIR, f);
    const raw = await fs.readFile(full, "utf8");
    let d;
    try {
      d = JSON.parse(raw);
    } catch {
      console.warn(`⚠ ${f}: JSON inválido, se salta`);
      continue;
    }
    const hasSource = !!(d.evidence && (d.evidence.primarySource || d.evidence.secondarySource));
    const hasContent = typeof d.content === "string" && d.content.length > 800;
    const hasSafety = !!(d.safety && (d.safety.euroNCAP || d.safety.puntaje));
    if (!hasSource) needsBoth.push(f);
    else if (!hasContent) needsContentOnly.push(f);
    if (!hasSafety) needsSafety.push(f);
  }
  return { needsBoth, needsContentOnly, needsSafety };
}

// --- Prompt ---------------------------------------------------------------

function buildPrompt(vehicleData, sources) {
  let contextBlock;
  if (sources.length > 0) {
    const blocks = sources
      .map((s, i) => `[Fuente ${i + 1} - ${s.source}]\nURL: ${s.url}\nExtracto: ${s.extract}`)
      .join("\n\n");
    contextBlock = `Contexto factual recuperado de fuentes reales (usalo como base confiable, y para citar evidence.primarySource/secondarySource SOLO con URLs de esta lista):\n\n${blocks}\n`;
  } else {
    contextBlock = `No se encontró contexto externo para este vehículo. Usá SOLO datos que sepas con alta confianza; si no estás seguro de un dato, poné null en vez de inventarlo. NO inventes ninguna URL.\n`;
  }

  return `Sos un investigador automotriz que arma fichas técnicas para un catálogo web en español (Argentina, tono neutro/rioplatense pero profesional).

Tenés esta ficha JSON de un vehículo REAL (no de ficción), con datos placeholder/genéricos que hay que reemplazar por datos verificados:

${JSON.stringify(vehicleData, null, 2)}

${contextBlock}

IMPORTANTE sobre fuentes: NUNCA inventes una URL que no esté en la lista de fuentes de arriba (si hay lista). Si no hay lista y no conocés con TOTAL certeza una URL oficial estable, dejá primarySource/secondarySource en null.

Devolvé EXCLUSIVAMENTE un objeto JSON (sin markdown, sin \`\`\`json, sin texto antes o después) con esta forma exacta:

{
  "power": "string, ej: '409 hp' o '800 CV / 588 kW combinados'",
  "price": "string con precio MSRP de referencia y mercado",
  "consumo": "string con consumo real",
  "dimensiones": "string 'largo x ancho x alto' en mm",
  "transmision": "string",
  "traccion": "string",
  "peso": "string con peso real en kg",
  "tipoMotor": "string",
  "potenciaKW": "string",
  "capacidadTanque": "string",
  "tiempoRecorrido": "string, 0-100km/h",
  "anoProduccion": "string",
  "cilindrada": "string o null",
  "asientos": number o null,
  "baul": number o null (litros),
  "generacion": "string o null",
  "anoLanzamiento": number o null,
  "evidence": {
    "level": "oficial-nombrado" o "respaldado",
    "primarySource": "URL de la lista de fuentes, o null",
    "secondarySource": "URL de la lista de fuentes, o null",
    "note": "string explicando qué se verificó y de dónde salió cada dato",
    "limitations": ["array de strings con limitaciones reales de los datos"]
  },
  "content": "string en Markdown, 600-900 palabras, con headers ## : Historia del modelo, un hito o generación relevante, curiosidades, y competencia/posicionamiento. Reescrito con tus propias palabras."
}

Reglas estrictas:
- NUNCA inventes URLs fuera de la lista dada.
- NUNCA inventes cifras. Ante la duda, null o "no publicado oficialmente".
- Devolvé SOLO el JSON, nada más.`;
}

// --- Prompt dedicado para safety (ONLY=needsSafety) ------------------------
//
// Deliberadamente separado de buildPrompt(): pedir `safety` junto con el
// resto de campos técnicos tienta a Gemini a completar el rating aunque no
// haya encontrado un test real (mismo problema que llevó a retirar
// seguridad_pasiva/sistemasInteligentes en bf468bc8 — relleno genérico sin
// fuente). Este prompt es explícito en que null es la respuesta correcta
// cuando no hay un resultado de Euro NCAP/Latin NCAP/IIHS real para ESTE
// modelo y mercado — no un promedio del segmento ni una estimación.

function buildSafetyPrompt(vehicleData, sources) {
  let contextBlock;
  if (sources.length > 0) {
    const blocks = sources
      .map((s, i) => `[Fuente ${i + 1} - ${s.source}]\nURL: ${s.url}\nExtracto: ${s.extract}`)
      .join("\n\n");
    contextBlock = `Contexto factual recuperado de fuentes reales:\n\n${blocks}\n`;
  } else {
    contextBlock = `No se encontró contexto externo para este vehículo.\n`;
  }

  return `Sos un investigador automotriz verificando datos de seguridad para un catálogo web en español.

Ficha del vehículo:
Título: ${vehicleData.title}
Fabricante: ${vehicleData.manufacturer || "desconocido"}
Clase: ${vehicleData.class || "desconocida"}
Mercados: ${JSON.stringify(vehicleData.mercados || [])}

${contextBlock}

Buscá específicamente si este modelo (año/generación indicados, mercado si aplica) tiene un resultado PUBLICADO de un programa real de evaluación de choque: Euro NCAP, Latin NCAP, IIHS o NHTSA.

REGLA ESTRICTA: si no encontrás con certeza un resultado real y específico para este modelo (no para "el segmento" ni "modelos similares"), devolvé null en ambos campos. NO estimes, NO promedies, NO inventes un puntaje "razonable". Un dato ausente (null) es preferible a un dato inventado.

Devolvé EXCLUSIVAMENTE un objeto JSON (sin markdown, sin texto extra) con esta forma:

{
  "euroNCAP": "string con el rating tal cual lo publica el organismo (ej: '★★★★★', '5 estrellas', 'Sin evaluar') o null si no hay dato real",
  "puntaje": number (0-100, score oficial del organismo si lo publica en esa escala) o null,
  "fuenteOrganismo": "string, nombre del organismo real (Euro NCAP / Latin NCAP / IIHS / NHTSA) o null",
  "evidenceUrl": "URL de la lista de fuentes de arriba que respalda el dato, o null — NUNCA inventada"
}`;
}

// --- Gemini (sin tools) ----------------------------------------------------

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
  // Ver comentario equivalente en enrich-fabricantes.mjs: repara escapes
  // inválidos (ej. \') que Gemini a veces devuelve dentro de un string,
  // en vez de descartar una respuesta que ya costó una llamada real.
  jsonSlice = jsonSlice.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
  return JSON.parse(jsonSlice);
}

// --- Validar evidence contra fuentes reales + fallback --------------------

async function validateEvidence(evidence, sources) {
  if (!evidence) evidence = {};
  const out = { ...evidence };
  const sourceUrls = new Set(sources.map((s) => s.url));

  // Solo aceptar URLs que efectivamente vinieron en la lista de fuentes
  // Y que además respondan (doble chequeo).
  const checkUrl = async (u) => {
    if (!u) return undefined;
    if (sources.length > 0 && !sourceUrls.has(u)) return undefined; // no estaba en la lista dada
    const ok = await urlIsReachable(u);
    return ok ? u : undefined;
  };

  out.primarySource = await checkUrl(out.primarySource);
  out.secondarySource = await checkUrl(out.secondarySource);

  // Fallback: si no quedó ninguna fuente, usar la primera de la lista real
  if (!out.primarySource && !out.secondarySource && sources.length > 0) {
    out.secondarySource = sources[0].url;
    out.note = (out.note ? out.note + " " : "") + "Fuente del modelo no verificable; se usa la primera fuente recuperada como respaldo.";
  }

  out.level = out.primarySource ? (out.level || "oficial-nombrado") : "respaldado";
  return out;
}

// --- Merge (igual que v2) --------------------------------------------------

function mergeIntoVehicle(existing, enrichment) {
  const merged = { ...existing };

  const directFields = [
    "power", "price", "consumo", "dimensiones", "transmision", "traccion",
    "peso", "tipoMotor", "potenciaKW", "capacidadTanque", "tiempoRecorrido",
    "anoProduccion", "cilindrada", "asientos", "baul", "generacion", "anoLanzamiento",
  ];
  for (const f of directFields) {
    if (enrichment[f] !== undefined && enrichment[f] !== null && enrichment[f] !== "") {
      merged[f] = enrichment[f];
    }
  }

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

  if (enrichment.content && enrichment.content.length > 400) {
    merged.content = enrichment.content;
  }

  merged.updatedAt = new Date().toISOString();

  if (merged.verified) {
    merged.verified = {
      ...merged.verified,
      source: merged.evidence?.level || merged.verified.source,
      lastChecked: new Date().toISOString(),
    };
  }

  return merged;
}

// --- Loop de safety (ONLY=needsSafety) --------------------------------------
//
// Separado del loop principal a propósito: solo escribe el campo `safety`
// (o lo deja intacto si Gemini no encontró un dato real), nunca toca
// evidence/content/specs. Así una corrida con ONLY=needsSafety no puede
// pisar por accidente datos ya verificados de otro campo.

async function runSafetyLoop(queue) {
  let ok = 0, fail = 0, withData = 0, leftNull = 0;

  for (const [i, filename] of queue.entries()) {
    const full = path.join(VEHICULOS_DIR, filename);
    process.stdout.write(`[${i + 1}/${queue.length}] ${filename} ... `);
    try {
      const existing = JSON.parse(await fs.readFile(full, "utf8"));
      const sources = await fetchAllContext(existing.title, existing.manufacturer);
      const prompt = buildSafetyPrompt(existing, sources);
      const rawResponse = await callGemini(prompt);
      const result = extractJson(rawResponse);

      const sourceUrls = new Set(sources.map((s) => s.url));
      const evidenceUrl = result.evidenceUrl && sourceUrls.has(result.evidenceUrl)
        ? result.evidenceUrl
        : null;
      const hasRealData = !!(result.euroNCAP || typeof result.puntaje === "number") && !!evidenceUrl;

      if (hasRealData) {
        const merged = { ...existing };
        merged.safety = {
          euroNCAP: result.euroNCAP || undefined,
          puntaje: typeof result.puntaje === "number" ? result.puntaje : undefined,
          fuenteOrganismo: result.fuenteOrganismo || undefined,
          evidenceUrl,
        };
        Object.keys(merged.safety).forEach((k) => merged.safety[k] === undefined && delete merged.safety[k]);
        merged.updatedAt = new Date().toISOString();

        const serialized = JSON.stringify(merged, null, 2);
        JSON.parse(serialized);
        await fs.writeFile(full, serialized + "\n", "utf8");
        withData++;
        console.log(`✓ safety real encontrado (${result.fuenteOrganismo || "?"})`);
        await log({ file: filename, status: "ok", mode: "safety", found: true });
      } else {
        leftNull++;
        console.log("— sin resultado real verificable, se deja sin tocar");
        await log({ file: filename, status: "ok", mode: "safety", found: false });
      }
      ok++;
    } catch (err) {
      console.log("✗ " + err.message.slice(0, 150));
      fail++;
      await log({ file: filename, status: "error", mode: "safety", error: String(err.message).slice(0, 500) });

      if (err.isDailyQuotaExhausted) {
        console.log(`\n⛔ Cuota diaria de Gemini agotada en el archivo ${i + 1}/${queue.length}. Abortando.`);
        break;
      }
    }

    if (i < queue.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nListo (safety). OK: ${ok}  Con dato real: ${withData}  Dejados en null: ${leftNull}  Errores: ${fail}`);
  console.log(`Log completo en ${LOG_FILE}`);
}

// --- Loop principal ---------------------------------------------------------

async function main() {
  console.log("Escaneando fichas...");
  const { needsBoth, needsContentOnly, needsSafety } = await scanQueue();
  console.log(`  ${needsBoth.length} necesitan evidencia (+contenido si también falta)`);
  console.log(`  ${needsContentOnly.length} necesitan solo contenido`);
  console.log(`  ${needsSafety.length} necesitan safety`);
  console.log(`  Tavily: ${TAVILY_KEY ? "activado" : "desactivado (sin TAVILY_API_KEY)"}\n`);

  if (ONLY === "needsSafety") {
    const queue = needsSafety.slice(0, LIMIT);
    console.log(`Procesando ${queue.length} fichas de safety (LIMIT=${LIMIT === Infinity ? "sin límite" : LIMIT})...\n`);
    await runSafetyLoop(queue);
    return;
  }

  let queue = [];
  if (ONLY === "needsBoth") queue = needsBoth;
  else if (ONLY === "needsContentOnly") queue = needsContentOnly;
  else queue = [...needsBoth, ...needsContentOnly];

  queue = queue.slice(0, LIMIT);
  console.log(`Procesando ${queue.length} fichas (LIMIT=${LIMIT === Infinity ? "sin límite" : LIMIT})...\n`);

  let ok = 0, fail = 0, withSource = 0;

  for (const [i, filename] of queue.entries()) {
    const full = path.join(VEHICULOS_DIR, filename);
    process.stdout.write(`[${i + 1}/${queue.length}] ${filename} ... `);
    try {
      const existing = JSON.parse(await fs.readFile(full, "utf8"));
      const sources = await fetchAllContext(existing.title, existing.manufacturer);
      const prompt = buildPrompt(existing, sources);
      const rawResponse = await callGemini(prompt);
      const enrichment = extractJson(rawResponse);
      enrichment.evidence = await validateEvidence(enrichment.evidence, sources);
      const merged = mergeIntoVehicle(existing, enrichment);

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
