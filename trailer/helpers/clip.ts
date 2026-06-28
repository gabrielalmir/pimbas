import fs from "node:fs/promises";
import path from "node:path";
import type { Page } from "@playwright/test";

const RAW_DIR = path.join(__dirname, "..", "raw");

/**
 * Encerra a página, recupera o .webm gravado pelo Playwright e copia para
 * trailer/raw/<name>.webm — nome estável consumido pelas composições do Remotion.
 */
export async function finalizeClip(page: Page, name: string) {
  const video = page.video();
  if (!video) throw new Error("video recording is not enabled for this page");
  const dest = path.join(RAW_DIR, `${name}.webm`);
  await fs.mkdir(RAW_DIR, { recursive: true });
  await page.close();
  await video.saveAs(dest);
}
