import { expect, test } from "@playwright/test";
import { seedCredentials } from "../fixtures/seed";

const FORGOT_PASSWORD_URL = "/forgot-password";
const LOGIN_URL = "/login";

test.describe("reset de senha", () => {
  test("página forgot-password existe e tem formulário de e-mail", async ({ page }) => {
    await page.goto(FORGOT_PASSWORD_URL);

    await expect(page.getByRole("heading", { name: /recuperar|redefinir|esqueceu/i })).toBeVisible();
    await expect(page.getByLabel(/e-?mail/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /enviar|solicitar/i })).toBeVisible();
  });

  test("exibe mensagem de sucesso após submeter e-mail válido", async ({ page }) => {
    await page.goto(FORGOT_PASSWORD_URL);
    await page.getByLabel(/e-?mail/i).fill(seedCredentials.admin.email);
    await page.getByRole("button", { name: /enviar|solicitar/i }).click();

    await expect(page.getByText(/e-?mail|verifique|enviado/i)).toBeVisible();
  });

  test("exibe mensagem de sucesso mesmo para e-mail desconhecido (sem enumeração)", async ({
    page,
  }) => {
    await page.goto(FORGOT_PASSWORD_URL);
    await page.getByLabel(/e-?mail/i).fill("nao-existe@example.com");
    await page.getByRole("button", { name: /enviar|solicitar/i }).click();

    await expect(page.getByText(/e-?mail|verifique|enviado/i)).toBeVisible();
  });

  test("exibe erro de validação para e-mail inválido", async ({ page }) => {
    await page.goto(FORGOT_PASSWORD_URL);
    await page.getByLabel(/e-?mail/i).fill("invalido");
    await page.getByRole("button", { name: /enviar|solicitar/i }).click();

    await expect(page.getByText(/e-?mail|inválido|invalid/i)).toBeVisible();
  });

  test("página reset-password com token inválido exibe erro", async ({ page }) => {
    await page.goto("/reset-password?token=token-invalido-qualquer");

    await expect(
      page.getByText(/inválido|expirado|invalid|expired|não encontrado/i),
    ).toBeVisible();
  });

  test("página reset-password sem token redireciona ou exibe erro", async ({ page }) => {
    await page.goto("/reset-password");

    const isError = await page
      .getByText(/inválido|expirado|token|missing/i)
      .isVisible()
      .catch(() => false);
    const isRedirected = page.url().includes(LOGIN_URL) || page.url().includes(FORGOT_PASSWORD_URL);

    expect(isError || isRedirected).toBe(true);
  });

  test("link 'Esqueceu a senha?' existe na página de login", async ({ page }) => {
    await page.goto(LOGIN_URL);

    await expect(page.getByRole("link", { name: /esqueceu|recuperar|redefinir/i })).toBeVisible();
  });

  test("link na página de login navega para forgot-password", async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.getByRole("link", { name: /esqueceu|recuperar|redefinir/i }).click();

    await expect(page).toHaveURL(new RegExp(FORGOT_PASSWORD_URL));
  });
});
