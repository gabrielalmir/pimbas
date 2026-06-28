import { execSync } from "node:child_process";
import type { FullConfig } from "@playwright/test";

function bunCommand() {
  return process.platform === "win32" ? "bun.cmd" : "bun";
}

function run(command: string, args: string[]) {
  execSync([command, ...args].join(" "), {
    stdio: "inherit",
    env: process.env,
    shell: process.env.ComSpec ?? "cmd.exe",
  });
}

export default function globalSetup(_: FullConfig) {
  if (process.env.PIMBAS_E2E_SKIP_DB_SETUP === "1") return;

  const bun = bunCommand();
  run(bun, ["run", "db:deploy"]);
  run(bun, ["run", "db:seed"]);
}
