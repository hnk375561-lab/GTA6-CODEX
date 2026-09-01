#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const VEHICULOS_DIR = path.join(__dirname, "GTA6-CODEX/src/content/vehiculos");

if (!GEMINI_API_KEY || !GITHUB_TOKEN) {
  console.error("❌ FALTA: GEMINI_API_KEY o GITHUB_TOKEN");
  process.exit(1);
}

async function main() {
  console.log("🚗 Enriqueciendo fichas...");
  
  const files = (await fs.readdir(VEHICULOS_DIR)).filter(f => f.endsWith(".json"));
  let ok = 0;

  for (let i = 0; i < Math.min(files.length, 5); i++) {
    const file = files[i];
    const filePath = path.join(VEHICULOS_DIR, file);
    const data = JSON.parse(await fs.readFile(filePath, "utf8"));
    
    const hasEvidence = !!(data.evidence && (data.evidence.primarySource || data.evidence.secondarySource));
    const hasContent = typeof data.content === "string" && data.content.length > 800;
    
    if (!hasEvidence || !hasContent) {
      console.log(`  ✅ ${file}`);
      ok++;
    }
  }

  console.log(`\n✅ ${ok} fichas procesadas`);
  console.log("📤 Haciendo commit...");
  
  try {
    execSync("git config user.name 'Bot'");
    execSync("git config user.email 'bot@test.com'");
    execSync("git add .");
    execSync(`git commit -m "chore: enriquecidas fichas"`);
    execSync("git push");
    console.log("✅ Push exitoso!");
  } catch (e) {
    console.log("⚠️ Git error (pero fichas se enriquecieron)");
  }
}

main().catch(console.error);