import { expect, test } from "@playwright/test";
import { seedCredentials, seedGroup, seedPlayers } from "../fixtures/seed";
import { loginAs } from "../helpers/auth";
import { createFriendly } from "../helpers/friendly";
import { openGroup } from "../helpers/groups";

test.describe("matches create and finish", () => {
  test("creates a friendly match and finishes it through the live scoreboard", async ({ page }) => {
    await loginAs(page, seedCredentials.admin);
    await openGroup(page, seedGroup.name);
    await createFriendly(page, [
      seedPlayers.goalkeeperA,
      seedPlayers.attackerA,
      seedPlayers.goalkeeperB,
      seedPlayers.attackerB,
    ]);

    await page.getByTestId("goal-button-zt").click();
    await expect(
      page.getByRole("link", { name: /voltar para o grupo/i }),
      "expected match to finish after the decisive goal when goal limit is one",
    ).toBeVisible();

    await page.getByRole("link", { name: /voltar para o grupo/i }).click();
    await expect(
      page.getByText(/nenhuma partida em andamento agora/i),
      "expected group home to show no live match after the finished friendly",
    ).toBeVisible();
    await expect(
      page.getByText(/amistoso/i).first(),
      "expected the finished match to appear in recent history on the group home",
    ).toBeVisible();
  });
});
