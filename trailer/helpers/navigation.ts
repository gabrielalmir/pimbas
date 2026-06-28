import { expect, type Page } from "@playwright/test";

/** Navega para a aba de torneios do grupo a partir do card de ação na home do grupo. */
export async function openTournamentsTab(page: Page) {
  await page.getByRole("link", { name: /torneio mata-mata/i }).click();
  await expect(
    page.getByRole("heading", { name: /mata-mata do grupo/i }),
    "expected tournament builder screen to open from the group home",
  ).toBeVisible();
}

/**
 * Cria um torneio mínimo (2 duplas, modo aleatório) a partir dos 4 jogadores seed
 * e navega até o bracket recém-criado.
 */
export async function createMinimalTournament(
  page: Page,
  name: string,
  playerInitials: string[],
  settings?: { goals?: number; minutes?: number },
) {
  await page.getByLabel("Nome").fill(name);
  for (const initials of playerInitials) {
    await page.getByTestId(`tournament-player-${initials}`).click();
  }
  if (settings?.goals !== undefined) {
    await page.getByLabel("Gols").fill(String(settings.goals));
  }
  if (settings?.minutes !== undefined) {
    await page.getByLabel("Minutos").fill(String(settings.minutes));
  }
  await page.getByRole("button", { name: "Gerar chaveamento" }).click();
  await expect(
    page.getByRole("heading", { name }),
    "expected navigation to the tournament bracket after creating it",
  ).toBeVisible();
}

/** A partir do bracket, inicia a primeira partida pronta para começar. */
export async function startFirstReadyMatchup(page: Page) {
  await page.getByRole("button", { name: "Iniciar partida" }).first().click();
  await expect(
    page.getByTestId("live-match-status"),
    "expected navigation to the live match screen after starting a tournament matchup",
  ).toBeVisible();
}

export async function openRanking(page: Page, groupName: string) {
  await page.getByRole("link", { name: "Ver completo" }).click();
  await expect(
    page.getByRole("heading", { name: new RegExp(groupName, "i") }),
    "expected ranking page to open with the group name in the header",
  ).toBeVisible();
}

export async function openGroupSettings(page: Page) {
  await page.getByRole("link", { name: /abrir configura(c|ç)(o|õ)es do grupo/i }).click();
}

export async function openPlayerProfile(page: Page, displayName: string) {
  await page
    .getByRole("link", { name: new RegExp(displayName, "i") })
    .first()
    .click();
}
