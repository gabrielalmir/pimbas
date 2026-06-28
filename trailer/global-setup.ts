import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { FullConfig } from "@playwright/test";

/**
 * Setup de banco dedicado ao trailer — roda `bun run db:deploy`/`db:seed` (scripts que
 * usam a sintaxe e o runtime TS do bun, ex. "bun run prisma/seed.ts").
 *
 * Não dá para assumir quem está executando este arquivo: `bun run trailer:capture` chama
 * `npx playwright`, e o `npx` roda sob Node — então `process.execPath` aqui é node.exe, não
 * bun.exe, e "node.exe run db:deploy" não existe. Também não dá para confiar em "bun"/
 * "bun.cmd" via PATH: o cmd.exe aninhado que o execSync abre no Windows não resolve esse
 * shim em alguns shells (reproduzido neste repo até com Node instalado). Por isso resolvemos
 * o executável do bun por caminho conhecido, sem depender de quem está rodando este script.
 */
const root = path.join(__dirname, "..");

function resolveBunExecutable(): string {
  const exeName = process.platform === "win32" ? "bun.exe" : "bun";
  const candidates = [
    process.env.BUN_INSTALL && path.join(process.env.BUN_INSTALL, "bin", exeName),
    path.join(os.homedir(), ".bun", "bin", exeName),
  ].filter((candidate): candidate is string => Boolean(candidate));

  const found = candidates.find((candidate) => existsSync(candidate));
  if (found) return found;
  // último recurso: espera que "bun" esteja resolvível no PATH do shell padrão.
  return "bun";
}

function run(bunExecutable: string, args: string[]) {
  execSync([`"${bunExecutable}"`, ...args].join(" "), {
    stdio: "inherit",
    cwd: root,
    env: process.env,
  });
}

export default function trailerGlobalSetup(_: FullConfig) {
  if (process.env.PIMBAS_E2E_SKIP_DB_SETUP === "1") return;
  const bunExecutable = resolveBunExecutable();
  run(bunExecutable, ["run", "db:deploy"]);
  run(bunExecutable, ["run", "db:seed"]);
}
