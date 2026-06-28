import { test } from "@playwright/test";
import { seedCredentials, seedGroup } from "../../e2e/fixtures/seed";
import { loginAs } from "../../e2e/helpers/auth";
import { openGroup } from "../../e2e/helpers/groups";
import { finalizeClip } from "../helpers/clip";
import { openGroupSettings } from "../helpers/navigation";

test.describe("trailer scenes — group settings", () => {
  test("c7 — invite code and members", async ({ page }) => {
    await loginAs(page, seedCredentials.admin);
    await openGroup(page, seedGroup.name);
    await openGroupSettings(page);

    await page.waitForTimeout(1_500);
    await finalizeClip(page, "c7-group-settings");
  });
});
