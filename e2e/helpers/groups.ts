import { expect, type Page } from "@playwright/test";

export async function openGroup(page: Page, groupName: string) {
  await page.getByRole("link", { name: new RegExp(groupName, "i") }).click();
  await expect(
    page.getByRole("heading", { name: new RegExp(groupName, "i") }),
    "expected selected group home to be visible after opening the group card",
  ).toBeVisible();
}
