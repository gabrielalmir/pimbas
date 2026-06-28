#!/usr/bin/env node
// Trilha instrumental procedural (percussiva, clima "boteco") gerada por síntese —
// original e royalty-free por construção, sem depender de bibliotecas externas com licença.
// Para trocar por uma faixa licenciada de uma biblioteca real, veja trailer/README.md.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeBuffer, SAMPLE_RATE, toWav } from "./wav.mjs";

const OUT_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "remotion",
  "public",
  "audio",
);
const DURATION_SECONDS = 16;
const BPM = 112;
const BEAT_SECONDS = 60 / BPM;

function addEnvelopeTone(out, startSeconds, durationSeconds, frequency, volume, type = "sine") {
  const startSample = Math.floor(startSeconds * SAMPLE_RATE);
  const lengthSamples = Math.floor(durationSeconds * SAMPLE_RATE);
  for (let i = 0; i < lengthSamples; i++) {
    const sampleIndex = startSample + i;
    if (sampleIndex >= out.length) break;
    const t = i / SAMPLE_RATE;
    const envelope = Math.exp(-t * 9) * volume;
    const wave =
      type === "sine"
        ? Math.sin(2 * Math.PI * frequency * t)
        : Math.sign(Math.sin(2 * Math.PI * frequency * t));
    out[sampleIndex] += wave * envelope;
  }
}

function addKick(out, startSeconds) {
  const startSample = Math.floor(startSeconds * SAMPLE_RATE);
  const lengthSamples = Math.floor(0.18 * SAMPLE_RATE);
  for (let i = 0; i < lengthSamples; i++) {
    const sampleIndex = startSample + i;
    if (sampleIndex >= out.length) break;
    const t = i / SAMPLE_RATE;
    const frequency = 120 * Math.exp(-t * 18);
    const envelope = Math.exp(-t * 14) * 0.85;
    out[sampleIndex] += Math.sin(2 * Math.PI * frequency * t) * envelope;
  }
}

function addClap(out, startSeconds) {
  const startSample = Math.floor(startSeconds * SAMPLE_RATE);
  const lengthSamples = Math.floor(0.12 * SAMPLE_RATE);
  for (let i = 0; i < lengthSamples; i++) {
    const sampleIndex = startSample + i;
    if (sampleIndex >= out.length) break;
    const t = i / SAMPLE_RATE;
    const envelope = Math.exp(-t * 22) * 0.45;
    out[sampleIndex] += (Math.random() * 2 - 1) * envelope;
  }
}

function main() {
  const out = makeBuffer(DURATION_SECONDS);
  const totalBeats = Math.floor(DURATION_SECONDS / BEAT_SECONDS);
  // Progressão simples em Sol menor, clima percussivo/festivo de boteco.
  const bassNotes = [98, 110, 87.31, 98];

  for (let beat = 0; beat < totalBeats; beat++) {
    const timeSeconds = beat * BEAT_SECONDS;
    const barBeat = beat % 4;
    const bar = Math.floor(beat / 4) % bassNotes.length;

    if (barBeat === 0 || barBeat === 2) addKick(out, timeSeconds);
    if (barBeat === 1 || barBeat === 3) addClap(out, timeSeconds);
    if (barBeat === 0)
      addEnvelopeTone(out, timeSeconds, BEAT_SECONDS * 2, bassNotes[bar], 0.35, "square");

    // Contratempo agudo a cada meio tempo, dá a sensação de samba/funk leve.
    addEnvelopeTone(out, timeSeconds + BEAT_SECONDS / 2, BEAT_SECONDS / 2, 880, 0.05, "sine");
  }

  // Build-up crescente nos últimos 3s para casar com a virada do "campeão".
  const buildStart = DURATION_SECONDS - 3;
  for (let beat = 0; beat < 12; beat++) {
    const t = buildStart + beat * 0.25;
    if (t >= DURATION_SECONDS) break;
    addEnvelopeTone(out, t, 0.2, 660 + beat * 40, 0.12 + beat * 0.01, "square");
  }

  return out;
}

async function run() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const samples = main();
  await fs.writeFile(path.join(OUT_DIR, "trilha.wav"), toWav(samples));
  console.log("gerado trilha.wav");
}

run();
