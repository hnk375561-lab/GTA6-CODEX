#!/usr/bin/env node
/**
 * enrich-vehiculos.mjs
 *
 * Recorre src/content/vehiculos/*.json, detecta qué le falta a cada ficha
 * (evidencia con fuentes primarySource/secondarySource, y/o contenido
 * editorial largo), y usa la API gratuita de Gemini (con Google Search
 * grounding) para investigar y completar los campos faltantes.
 *
 * USO:
 *   1. Generá una API key gratis en https://aistudio.google.com/apikey
 *   2. GEMINI_API_KEY=tu_key node enrich-vehiculos.mjs
 *
 * Opcional:
 *   LIMIT=5 GEMINI_API_KEY=tu_key node enrich-vehiculos.mjs   # probar con 5 fichas primero
 *   ONLY=needsBoth GEMINI_API_KEY=tu_key node enrich-vehiculos.mjs  # solo las 48 con brecha de evidencia
 *
 * El script es reanudable: si lo cortás (Ctrl+C) o se cae a mitad de
 * camino, simplemente volvé a correrlo — re-escanea el estado real de
 * cada archivo y solo procesa lo que sigue faltando.
 *
 * Después de correrlo: revisá una muestra a mano, corré tu batería de
 * verify:all, y commiteá/pusheá vos mismo (o pedime que lo haga yo en
 * el chat, en lotes).
 */

import fs from "node:fs/promises";
import path from "node:path";

const VEHICULOS_DIR = "src/content/vehiculos";
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : Infinity;
const ONLY = process.env.ONLY || "all"; // "all" | "needsBoth" | "needsContentOnly"
const DELAY_MS = 4500; // ~13 req/min, seguro bajo el límite gratuito de 15 RPM
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

// --- 1. Escanear qué le falta a cada ficha ------------------------------

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
    if (!hasSource) {
      needsBoth.push(f);
    } else if (!hasContent) {
      needsContentOnly.push(f);
    }
  }
  return { needsBoth, needsContentOnly };
}

// --- 2. Prompt para Gemini ------------------------------------------------

function buildPrompt(vehicleData) {
  return `Sos un investigador automotriz que arma fichas técnicas para un catálogo web en español (Argentina, tono neutro/rioplatense pero profesional).

Tenés esta ficha JSON de un vehículo REAL (no de ficción), con datos placeholder/genéricos que hay que reemplazar por datos VERIFICADOS con fuentes reales:

${JSON.stringify(vehicleData, null, 2)}

Investigá este vehículo usando la búsqueda web (priorizá la web oficial del fabricante como fuente primaria, y un sitio de prensa especializada automotriz como Cars.com, Edmunds, Motor1, Autoevolution, etc. como fuente secundaria).

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
    "level": "oficial-nombrado",
    "primarySource": "URL real de la web oficial del fabricante",
    "secondarySource": "URL real de un sitio de prensa especializada",
    "note": "string explicando qué se verificó dónde",
    "limitations": ["array de strings con limitaciones reales de los datos, ej: precio varía por mercado, specs no publicadas oficialmente, etc."]
  },
  "content": "string en Markdown, 600-900 palabras, con headers ## : Historia del modelo, un hito o generación relevante, curiosidades, y competencia/posicionamiento. Sin inventar datos - todo lo factual debe salir de la búsqueda."
}

Reglas estrictas:
- NUNCA inventes URLs. Si no encontrás una fuente primaria oficial confiable, poné evidence.level: "respaldado" y dejá primarySource/secondarySource en null, explicando por qué en note.
- NUNCA inventes cifras. Si no encontrás un dato específico, usá null o "no publicado oficialmente" en vez de un número inventado.
- El campo "content" no debe reproducir texto copiado literal de ninguna fuente - debe estar reescrito con tus propias palabras.
- Devolvé SOLO el JSON, nada más.`;
}

// --- 3. Llamada a la API de Gemini con Google Search grounding -----------

async function callGemini(prompt, attempt = 1) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.3,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.status === 429 && attempt < 3) {
    // Backoff progresivo: puede ser un pico de RPM (recuperable) o RPD
    // agotado (no recuperable en el dia). Reintentamos un par de veces
    // por las dudas antes de rendirnos con este archivo puntual.
    const waitMs = 20000 * attempt;
    await sleep(waitMs);
    return callGemini(prompt, attempt + 1);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p) => p.text || "").join("");
  if (!text) throw new Error("Respuesta vacía de Gemini: " + JSON.stringify(data).slice(0, 500));
  return text;
}

function extractJson(text) {
  // Limpia fences de markdown si el modelo los agregó pese a la instrucción
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No se encontró un objeto JSON en la respuesta");
  return JSON.parse(cleaned.slice(start, end + 1));
}

// --- 4. Fusionar la respuesta en el JSON existente sin pisar de más -----

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
    // limpiar claves undefined
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

// --- 5. Loop principal -----------------------------------------------------

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
      const prompt = buildPrompt(existing);
      const rawResponse = await callGemini(prompt);
      const enrichment = extractJson(rawResponse);
      const merged = mergeIntoVehicle(existing, enrichment);

      // Validar que sigue siendo JSON válido antes de escribir
      const serialized = JSON.stringify(merged, null, 2);
      JSON.parse(serialized);

      await fs.writeFile(full, serialized + "\n", "utf8");
      console.log("✓");
      ok++;
      await log({ file: filename, status: "ok" });
    } catch (err) {
      console.log("✗ " + err.message.slice(0, 150));
      fail++;
      await log({ file: filename, status: "error", error: String(err.message).slice(0, 500) });
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
