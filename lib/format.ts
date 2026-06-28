import type { PlayerProfile, TeamPair } from "@/lib/domain";

export function playerName(players: PlayerProfile[], playerId: string): string {
  return players.find((player) => player.id === playerId)?.displayName ?? "Jogador";
}

export function pairLine(pair: TeamPair, players: PlayerProfile[]): string {
  return pair.players.map((entry) => playerName(players, entry.playerId)).join(" + ");
}

export function percent(value: number): string {
  return `${Math.round(value)}%`;
}

export function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
