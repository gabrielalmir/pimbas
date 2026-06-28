import { expect, type Page } from "@playwright/test";

export async function loginAs(
  page: Page,
  params: {
    email: string;
    password: string;
  },
) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(params.email);
  await page.getByLabel("Senha").fill(params.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(
    page.getByRole("heading", { name: "Seus grupos" }),
    "expected authenticated user to land on groups after login",
  ).toBeVisible();
}
