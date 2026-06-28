import { test } from "@playwright/test";
import { seedCredentials, seedGroup } from "../../e2e/fixtures/seed";
import { loginAs } from "../../e2e/helpers/auth";
import { openGroup } from "../../e2e/helpers/groups";
import { finalizeClip } from "../helpers/clip";
import { openPlayerProfile, openRanking } from "../helpers/navigation";

test.describe("trailer scenes — ranking and player profile", () => {
  test("c5 — podium and leaderboard", async ({ page }) => {
    await loginAs(page, seedCredentials.admin);
    await openGroup(page, seedGroup.name);
    await openRanking(page, seedGroup.name);

    await page.waitForTimeout(2_000);
    await finalizeClip(page, "c5-ranking-podium");
  });

  test("c6 — player profile card", async ({ page }) => {
    await loginAs(page, seedCredentials.admin);
    await openGroup(page, seedGroup.name);
    await openRanking(page, seedGroup.name);
    await openPlayerProfile(page, "Zé Trovão");

    await page.waitForTimeout(2_500);
    await finalizeClip(page, "c6-player-profile");
  });
});
