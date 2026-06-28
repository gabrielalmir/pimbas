#!/usr/bin/env node
// Gera os SFX do trailer sintetizando exatamente as mesmas sequências de tom que
// lib/matchSounds.ts toca no app (start/goal/finish), além de um "whoosh" de transição.
// 100% original/offline — sem download de áudio de terceiros, sem questão de licença.
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

function oscillator(type, frequency, t) {
  const phase = frequency * t;
  switch (type) {
    case "square":
      return Math.sign(Math.sin(2 * Math.PI * phase)) || 0;
    case "triangle": {
      const x = phase - Math.floor(phase + 0.5);
      return 4 * Math.abs(x) - 1;
    }
    default:
      return Math.sin(2 * Math.PI * phase);
  }
}

function renderSteps(steps, volume) {
  const totalSeconds = steps.reduce((sum, step) => sum + step.durationMs / 1000, 0);
  const out = makeBuffer(totalSeconds + 0.05);
  let cursorSeconds = 0;

  for (const { frequency, durationMs, type } of steps) {
    const stepSeconds = durationMs / 1000;
    const startSample = Math.floor(cursorSeconds * SAMPLE_RATE);
    const stepSamples = Math.floor(stepSeconds * SAMPLE_RATE);
    const attackSamples = Math.floor(0.015 * SAMPLE_RATE);
    const releaseSamples = Math.floor(0.04 * SAMPLE_RATE);

    for (let i = 0; i < stepSamples; i++) {
      const t = i / SAMPLE_RATE;
      let envelope = volume;
      if (i < attackSamples) envelope = volume * (i / attackSamples);
      else if (i > stepSamples - releaseSamples)
        envelope = volume * Math.max(0, (stepSamples - i) / releaseSamples);
      out[startSample + i] += oscillator(type, frequency, t) * envelope;
    }
    cursorSeconds += stepSeconds;
  }
  return out;
}

const sounds = {
  start: () =>
    renderSteps(
      [440, 660, 880].map((frequency, index) => ({
        frequency,
        durationMs: 120,
        type: index % 2 === 0 ? "square" : "triangle",
      })),
      0.5,
    ),
  goal: () =>
    renderSteps(
      [523.25, 659.25, 783.99, 1046.5].map((frequency, index) => ({
        frequency,
        durationMs: 95,
        type: index % 2 === 0 ? "square" : "triangle",
      })),
      0.6,
    ),
  finish: () =>
    renderSteps(
      [
        { frequency: 2550, durationMs: 650, type: "square" },
        { frequency: 0.0001, durationMs: 120, type: "sine" },
        { frequency: 2550, durationMs: 650, type: "square" },
      ],
      0.55,
    ),
  whoosh: () => {
    const seconds = 0.45;
    const out = makeBuffer(seconds);
    for (let i = 0; i < out.length; i++) {
      const t = i / SAMPLE_RATE;
      const progress = t / seconds;
      const frequency = 1800 - 1600 * progress;
      const noise = (Math.random() * 2 - 1) * 0.18;
      const envelope = Math.sin(Math.PI * progress) * 0.5;
      out[i] = (oscillator("sine", frequency, t) * 0.7 + noise) * envelope;
    }
    return out;
  },
};

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  for (const [name, render] of Object.entries(sounds)) {
    const samples = render();
    await fs.writeFile(path.join(OUT_DIR, `${name}.wav`), toWav(samples));
    console.log(`gerado ${name}.wav`);
  }
}

main();
