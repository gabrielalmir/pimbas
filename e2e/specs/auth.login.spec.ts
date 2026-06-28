import { expect, test } from "@playwright/test";
import { seedCredentials, seedGroup } from "../fixtures/seed";
import { loginAs } from "../helpers/auth";

test.describe("auth login", () => {
  test("shows the seeded groups after valid credentials", async ({ page }) => {
    await loginAs(page, seedCredentials.admin);

    await expect(
      page.getByRole("link", { name: new RegExp(seedGroup.name, "i") }),
      "expected seeded group to be listed for the authenticated seed admin",
    ).toBeVisible();
  });
});
