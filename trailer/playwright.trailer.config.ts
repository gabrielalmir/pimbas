import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Captura em 9:16 com layout mobile do app (nav inferior, sem sidebar desktop).
 * 720×1280 fica abaixo do breakpoint lg (1024px); o Remotion upscale para 1080×1920.
 */
const port = Number(process.env.PLAYWRIGHT_PORT ?? 3002);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const root = path.join(__dirname, "..");
const CAPTURE_WIDTH = 720;
const CAPTURE_HEIGHT = 1280;
const mobile = devices["iPhone 14 Pro Max"];

export default defineConfig({
  testDir: path.join(__dirname, "scenes"),
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  globalSetup: path.join(__dirname, "global-setup.ts"),
  outputDir: path.join(__dirname, "raw/.playwright-artifacts"),
  use: {
    baseURL,
    ...mobile,
    viewport: { width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT },
    deviceScaleFactor: 2,
    video: { mode: "on", size: { width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT } },
    trace: "off",
    screenshot: "off",
    launchOptions: {
      slowMo: 120,
    },
  },
  webServer: {
    command: `bun run dev -- --hostname 127.0.0.1 --port ${port}`,
    cwd: root,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});