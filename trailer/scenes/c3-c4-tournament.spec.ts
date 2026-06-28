import { expect, test } from "@playwright/test";
import { seedCredentials, seedGroup, seedPlayers } from "../../e2e/fixtures/seed";
import { loginAs } from "../../e2e/helpers/auth";
import { openGroup } from "../../e2e/helpers/groups";
import { finalizeClip } from "../helpers/clip";
import {
  createMinimalTournament,
  openTournamentsTab,
  startFirstReadyMatchup,
} from "../helpers/navigation";

const allFour = [
  seedPlayers.goalkeeperA,
  seedPlayers.attackerA,
  seedPlayers.goalkeeperB,
  seedPlayers.attackerB,
];

test.describe("trailer scenes — tournament", () => {
  test("c3 — bracket reveal", async ({ page }) => {
    await loginAs(page, seedCredentials.admin);
    await openGroup(page, seedGroup.name);
    await openTournamentsTab(page);
    await createMinimalTournament(page, "Copa Trailer C3", allFour);

    await page.waitForTimeout(1_500);
    // Com 4 jogadores o mata-mata nasce direto na final; ainda assim mostra o
    // troféu, os conectores SVG e o card da partida pronta para começar.
    await page.mouse.wheel(150, 0);
    await page.waitForTimeout(1_500);

    await finalizeClip(page, "c3-tournament-bracket");
  });

  test("c4 — champion banner", async ({ page }) => {
    await loginAs(page, seedCredentials.admin);
    await openGroup(page, seedGroup.name);
    await openTournamentsTab(page);
    await createMinimalTournament(page, "Copa Trailer C4", allFour, { goals: 1 });

    const tournamentUrl = page.url();
    await startFirstReadyMatchup(page);

    await page.waitForTimeout(800);
    await page.getByTestId(`goal-button-${seedPlayers.attackerA}`).click();
    await expect(
      page.getByRole("link", { name: /voltar para o grupo/i }),
      "expected the tournament matchup to finish after the decisive goal",
    ).toBeVisible();

    await page.goto(tournamentUrl);
    await expect(
      page.getByText(/campe(a|ã)o do torneio/i),
      "expected the champion banner once the only matchup is decided",
    ).toBeVisible();
    await page.waitForTimeout(2_500);

    await finalizeClip(page, "c4-tournament-champion");
  });
});
