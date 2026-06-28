import { expect, type Page } from "@playwright/test";

/**
 * Variante de e2e/helpers/friendly.ts com regras configuráveis — o e2e original sempre
 * usa 1 gol para terminar a partida instantaneamente; o trailer precisa de placares
 * mais longos para mostrar o cronômetro, o "gol de ouro" e o placar subindo aos poucos.
 */
export async function createFriendlyWithSettings(
  page: Page,
  playerInitials: string[],
  settings: { goals: number; minutes: number },
) {
  await page.getByRole("link", { name: /amistoso/i }).click();
  await expect(
    page.getByRole("heading", { name: /montar 2v2/i }),
    "expected friendly builder screen to open from the group home",
  ).toBeVisible();

  for (const initials of playerInitials) {
    await page.getByTestId(`friendly-player-${initials}`).click();
  }

  await page.getByLabel("Gols").fill(String(settings.goals));
  await page.getByLabel("Minutos").fill(String(settings.minutes));
  await page.getByTestId("friendly-start-match").click();
  await expect(
    page.getByTestId("live-match-status"),
    "expected browser to navigate to the live match screen after creating a friendly",
  ).toBeVisible();
}
