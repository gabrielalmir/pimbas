import { expect, type Page } from "@playwright/test";

export async function createFriendly(page: Page, playerInitials: string[]) {
  await page.getByRole("link", { name: /amistoso/i }).click();
  await expect(
    page.getByRole("heading", { name: /montar 2v2/i }),
    "expected friendly builder screen to open from the group home",
  ).toBeVisible();

  for (const initials of playerInitials) {
    await page.getByTestId(`friendly-player-${initials}`).click();
  }

  await page.getByLabel("Gols").fill("1");
  await page.getByTestId("friendly-start-match").click();
  await expect(
    page.getByTestId("live-match-status"),
    "expected browser to navigate to the live match screen after creating a friendly",
  ).toBeVisible();
}
