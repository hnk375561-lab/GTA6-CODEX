#!/usr/bin/env node
/**
 * enrich-vehiculos-v2.mjs
 *
 * Reemplazo de enrich-vehiculos.mjs que NO depende de "Google Search
 * grounding" en la API de Gemini. Se saca esa dependencia a propósito:
 * desde fines de 2025 el free tier de grounding quedó roto/recortado
 * (choca contra una cuota mínima tipo 20/día en vez de la cuota de
 * grounding anunciada), que es exactamente lo que muestra
 * enrichment-log.jsonl: 493 intentos, 0 éxitos, todo 429/404.
 *
 * Estrategia nueva (100% gratis, sin tarjeta):
 *   1. Wikipedia REST API (gratis, sin key, sin rate-limit práctico) para
 *      traer contexto factual real de cada vehículo (español, con
 *      fallback a inglés).
 *   2. Gemini en modo generateContent NORMAL (sin la tool de búsqueda),
 *      que tiene cuota diaria mucho más generosa (cientos/día en
 *      flash-lite) y no pisa el bug de grounding.
 *   3. Cada URL que el modelo devuelva como fuente se valida con un
 *      fetch real (HEAD, fallback GET) antes de aceptarla. Si no
 *      responde 200-399, se descarta y se usa como fallback el link de
 *      Wikipedia (evidence.level baja a "respaldado" en ese caso).
 *
 * USO (idéntico al script viejo):
 *   GEMINI_API_KEY=tu_key node enrich-vehiculos-v2.mjs
 *   LIMIT=5 GEMINI_API_KEY=tu_key node enrich-vehiculos-v2.mjs
 *   ONLY=needsBoth GEMINI_API_KEY=tu_key node enrich-vehiculos-v2.mjs
 *
 * Reanudable: si se corta, se vuelve a correr y solo procesa lo que
 * sigue faltando.
 */

import fs from "node:fs/promises";
import path from "node:path";

const VEHICULOS_DIR = "src/content/vehiculos";
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : Infinity;
const ONLY = process.env.ONLY || "all"; // "all" | "needsBoth" | "needsContentOnly"
const DELAY_MS = 4500;
const LOG_FILE = "enrichment-log.jsonl";

if (!API_KEY) {
  console.error("Falta GEMINI_API_KEY. Generá una gratis en https://aistudio.google.com/apikey");
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function log(entry) {
  await fs.appendFile(LOG_FILE, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
}

// --- 0. Contexto factual gratis desde Wikipedia --------------------------

async function fetchWithTimeout(url, opts = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

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
      extract: data.extract,
      url: data.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(foundTitle)}`,
      title: data.title,
    };
  } catch {
    return null;
  }
}

async function fetchWikiContext(vehicleTitle, manufacturer) {
  const query = `${manufacturer || ""} ${vehicleTitle}`.trim();
  return (await wikipediaSummary(query, "es")) || (await wikipediaSummary(query, "en"));
}

// --- 0b. Validar que una URL realmente exista ----------------------------

async function urlIsReachable(url) {
  if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) return false;
  try {
    let res = await fetchWithTimeout(url, { method: "HEAD", redirect: "follow" }, 7000);
    if (res.status === 405 || res.status === 501) {
      // Algunos servidores no soportan HEAD: reintentar con GET.
      res = await fetchWithTimeout(url, { method: "GET", redirect: "follow" }, 7000);
    }
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  }
}

// --- 1. Escanear qué le falta a cada ficha (igual que el script viejo) --

async function scanQueue() {
  const files = (await fs.readdir(VEHICULOS_DIR)).filter((f) => f.endsWith(".json"));
  const needsBoth = [];
  const needsContentOnly = [];
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
    if (!hasSource) needsBoth.push(f);
    else if (!hasContent) needsContentOnly.push(f);
  }
  return { needsBoth, needsContentOnly };
}

// --- 2. Prompt para Gemini (sin grounding, con contexto de Wikipedia) ---

function buildPrompt(vehicleData, wikiContext) {
  const contextBlock = wikiContext
    ? `Contexto factual verificado (extracto de Wikipedia, usalo como base confiable):\n"""\n${wikiContext.extract}\n"""\nURL de este contexto: ${wikiContext.url}\n`
    : `No se encontró contexto de Wikipedia para este vehículo. Usá SOLO datos que sepas con alta confianza de tu entrenamiento; si no estás seguro de un dato, poné null en vez de inventarlo.\n`;

  return `Sos un investigador automotriz que arma fichas técnicas para un catálogo web en español (Argentina, tono neutro/rioplatense pero profesional).

Tenés esta ficha JSON de un vehículo REAL (no de ficción), con datos placeholder/genéricos que hay que reemplazar por datos verificados:

${JSON.stringify(vehicleData, null, 2)}

${contextBlock}

IMPORTANTE sobre fuentes: NO tenés acceso a búsqueda web en este momento. NUNCA inventes una URL de fuente que no te haya sido dada explícitamente arriba. Si conocés con certeza la URL oficial del fabricante para este modelo (porque es un patrón estable y conocido, ej. la home del modelo en el sitio del fabricante), podés incluirla como primarySource, pero si tenés cualquier duda de que exista o esté bien escrita, dejala en null. Como secondarySource podés usar la URL de Wikipedia dada arriba si la hay.

Devolvé EXCLUSIVAMENTE un objeto JSON (sin markdown, sin \`\`\`json, sin texto antes o después) con esta forma exacta:

{
  "power": "string, ej: '409 hp' o '800 CV / 588 kW combinados'",
  "price": "string con precio MSRP de referencia y mercado, ej: 'USD 107.950 (MSRP EE.UU.)'",
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
    "primarySource": "URL real y verificable, o null",
    "secondarySource": "URL real y verificable (ej. la de Wikipedia dada arriba), o null",
    "note": "string explicando qué se verificó y de dónde salió cada dato",
    "limitations": ["array de strings con limitaciones reales de los datos"]
  },
  "content": "string en Markdown, 600-900 palabras, con headers ## : Historia del modelo, un hito o generación relevante, curiosidades, y competencia/posicionamiento. Sin inventar datos - todo lo factual debe salir del contexto dado o de conocimiento de alta confianza."
}

Reglas estrictas:
- NUNCA inventes URLs. Ante la duda, null.
- NUNCA inventes cifras. Si no estás seguro de un dato específico, usá null o "no publicado oficialmente".
- El campo "content" debe estar reescrito con tus propias palabras, no copiado de ninguna fuente.
- Devolvé SOLO el JSON, nada más.`;
}

// --- 3. Llamada a Gemini SIN tools (evita el bug de grounding) ----------

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
      // El nombre del modelo puede quedar obsoleto; no reintentar en loop,
      // pero dejar el error bien claro para que se actualice GEMINI_MODEL.
      throw new Error(`Gemini API 404 (¿modelo "${MODEL}" descontinuado? probá con GEMINI_MODEL=gemini-3.5-flash): ${text.slice(0, 300)}`);
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
  return JSON.parse(cleaned.slice(start, end + 1));
}

// --- 4. Validar fuentes antes de aceptarlas ------------------------------

async function validateEvidence(evidence, wikiContext) {
  if (!evidence) return evidence;
  const out = { ...evidence };

  const primaryOk = await urlIsReachable(out.primarySource);
  if (!primaryOk) out.primarySource = undefined;

  const secondaryOk = await urlIsReachable(out.secondarySource);
  if (!secondaryOk) out.secondarySource = undefined;

  // Si no quedó ninguna fuente pero tenemos Wikipedia, usarla como respaldo
  // mínimo (ya sabemos que esa URL existe: la trajimos de la propia API).
  if (!out.primarySource && !out.secondarySource && wikiContext?.url) {
    out.secondarySource = wikiContext.url;
    out.note = (out.note ? out.note + " " : "") + "Fuente primaria del modelo no verificable; se usa Wikipedia como respaldo mínimo.";
  }

  out.level = out.primarySource ? (out.level || "oficial-nombrado") : "respaldado";
  return out;
}

// --- 5. Fusionar la respuesta en el JSON existente ----------------------

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

// --- 6. Loop principal ----------------------------------------------------

async function main() {
  console.log("Escaneando fichas...");
  const { needsBoth, needsContentOnly } = await scanQueue();
  console.log(`  ${needsBoth.length} necesitan evidencia (+contenido si también falta)`);
  console.log(`  ${needsContentOnly.length} necesitan solo contenido`);

  let queue = [];
  if (ONLY === "needsBoth") queue = needsBoth;
  else if (ONLY === "needsContentOnly") queue = needsContentOnly;
  else queue = [...needsBoth, ...needsContentOnly];

  queue = queue.slice(0, LIMIT);
  console.log(`Procesando ${queue.length} fichas (LIMIT=${LIMIT === Infinity ? "sin límite" : LIMIT})...\n`);

  let ok = 0, fail = 0;

  for (const [i, filename] of queue.entries()) {
    const full = path.join(VEHICULOS_DIR, filename);
    process.stdout.write(`[${i + 1}/${queue.length}] ${filename} ... `);
    try {
      const existing = JSON.parse(await fs.readFile(full, "utf8"));
      const wikiContext = await fetchWikiContext(existing.title, existing.manufacturer);
      const prompt = buildPrompt(existing, wikiContext);
      const rawResponse = await callGemini(prompt);
      const enrichment = extractJson(rawResponse);
      enrichment.evidence = await validateEvidence(enrichment.evidence, wikiContext);
      const merged = mergeIntoVehicle(existing, enrichment);

      const serialized = JSON.stringify(merged, null, 2);
      JSON.parse(serialized);

      await fs.writeFile(full, serialized + "\n", "utf8");
      console.log(wikiContext ? "✓ (con contexto wiki)" : "✓ (sin contexto wiki)");
      ok++;
      await log({ file: filename, status: "ok", hadWikiContext: !!wikiContext });
    } catch (err) {
      console.log("✗ " + err.message.slice(0, 150));
      fail++;
      await log({ file: filename, status: "error", error: String(err.message).slice(0, 500) });

      if (err.isDailyQuotaExhausted) {
        console.log(
          `\n⛔ Cuota diaria de Gemini agotada en el archivo ${i + 1}/${queue.length}. ` +
          `Abortando para no perder tiempo. Volvé a correr este workflow después del reset diario.`
        );
        break;
      }
    }

    if (i < queue.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nListo. OK: ${ok}  Errores: ${fail}`);
  console.log(`Log completo en ${LOG_FILE}`);
  console.log(`\nPróximo paso: node scripts/audit-evidence-coverage.mjs`);
  console.log(`             npm run verify:all`);
  console.log(`             git add -A && git commit -m "..." && git push`);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
