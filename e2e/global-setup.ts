import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { FullConfig } from "@playwright/test";

const root = path.join(__dirname, "..");

function resolveBunExecutable(): string {
  const exeName = process.platform === "win32" ? "bun.exe" : "bun";
  const candidates = [
    process.env.BUN_INSTALL && path.join(process.env.BUN_INSTALL, "bin", exeName),
    path.join(os.homedir(), ".bun", "bin", exeName),
  ].filter((candidate): candidate is string => Boolean(candidate));

  const found = candidates.find((candidate) => existsSync(candidate));
  if (found) return found;
  return "bun";
}

function run(bunExecutable: string, args: string[]) {
  execSync([`"${bunExecutable}"`, ...args].join(" "), {
    stdio: "inherit",
    cwd: root,
    env: process.env,
  });
}

export default function globalSetup(_: FullConfig) {
  if (process.env.PIMBAS_E2E_SKIP_DB_SETUP === "1") return;

  const bunExecutable = resolveBunExecutable();
  run(bunExecutable, ["run", "db:deploy"]);
  run(bunExecutable, ["run", "db:seed"]);
}
