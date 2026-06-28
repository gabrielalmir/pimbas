import { test } from "@playwright/test";
import { seedCredentials, seedGroup, seedPlayers } from "../../e2e/fixtures/seed";
import { loginAs } from "../../e2e/helpers/auth";
import { openGroup } from "../../e2e/helpers/groups";
import { finalizeClip } from "../helpers/clip";
import { createFriendlyWithSettings } from "../helpers/friendly";

const allFour = [
  seedPlayers.goalkeeperA,
  seedPlayers.attackerA,
  seedPlayers.goalkeeperB,
  seedPlayers.attackerB,
];

test.describe("trailer scenes — live match", () => {
  test("c1 — one-tap goal scoring with timer running", async ({ page }) => {
    await loginAs(page, seedCredentials.admin);
    await openGroup(page, seedGroup.name);
    await createFriendlyWithSettings(page, allFour, { goals: 5, minutes: 5 });

    await page.waitForTimeout(1_500);
    await page.getByTestId(`goal-button-${seedPlayers.attackerA}`).click();
    await page.waitForTimeout(1_200);
    await page.getByTestId(`goal-button-${seedPlayers.attackerB}`).click();
    await page.waitForTimeout(1_200);
    await page.getByTestId(`goal-button-${seedPlayers.attackerA}`).click();
    await page.waitForTimeout(2_000);

    await finalizeClip(page, "c1-live-scoring");
  });

  test("c2 — tied score triggers golden goal", async ({ page }) => {
    await loginAs(page, seedCredentials.admin);
    await openGroup(page, seedGroup.name);
    await createFriendlyWithSettings(page, allFour, { goals: 2, minutes: 5 });

    await page.getByTestId(`goal-button-${seedPlayers.attackerA}`).click();
    await page.waitForTimeout(800);
    await page.getByTestId(`goal-button-${seedPlayers.attackerB}`).click();
    await page.waitForTimeout(800);

    // Tied at 1-1 with the goal limit at 2: "Encerrar" becomes "Ativar gol de ouro".
    await page.getByTestId("finish-match").click();
    await page.waitForTimeout(2_500);

    await finalizeClip(page, "c2-golden-goal");
  });
});
