#!/usr/bin/env node
// Copia os clipes brutos gravados pelo Playwright (trailer/raw/*.webm) para o
// public/ do projeto Remotion, de onde staticFile() consegue servi-los no render.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.join(ROOT, "..", "raw");
const DEST_DIR = path.join(ROOT, "..", "remotion", "public", "clips");

async function main() {
  await fs.mkdir(DEST_DIR, { recursive: true });
  const entries = await fs.readdir(RAW_DIR).catch(() => []);
  const clips = entries.filter((file) => file.endsWith(".webm"));
  if (clips.length === 0) {
    console.error("nenhum clipe encontrado em trailer/raw — rode a captura primeiro.");
    process.exit(1);
  }
  for (const file of clips) {
    await fs.copyFile(path.join(RAW_DIR, file), path.join(DEST_DIR, file));
    console.log(`copiado ${file}`);
  }
}

main();
