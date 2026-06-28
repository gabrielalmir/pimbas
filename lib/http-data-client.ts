import { apiFetch, fetchMe } from "./auth";
import type { DataClient } from "./data-client";
import type {
  CreateFriendlyInput,
  CreateTournamentInput,
  Group,
  Match,
  PairStats,
  PlayerProfile,
  RankingEntry,
  TeamPair,
  Tournament,
  User,
} from "./domain";

function playerIdByPosition(pair: TeamPair, position: "goalkeeper" | "attacker"): string {
  const player = pair.players.find((item) => item.position === position);
  if (!player) throw new Error(`Dupla sem ${position}`);
  return player.playerId;
}

function isNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const status = "status" in error ? error.status : undefined;
  return status === 404 || error.message.includes("404");
}

async function getOrUndefined<T>(promise: Promise<T>): Promise<T | undefined> {
  try {
    return await promise;
  } catch (error: unknown) {
    if (isNotFoundError(error)) return undefined;
    throw error;
  }
}

export const httpDataClient: DataClient = {
  async getCurrentPlayerId() {
    const { playerProfile } = await fetchMe();
    if (!playerProfile) throw new Error("Crie sua ficha de jogador antes de continuar.");
    return playerProfile.id;
  },

  async getGroups() {
    return (await apiFetch<{ groups: Group[] }>("/api/v1/groups")).groups;
  },

  async getCurrentGroup(groupId: string) {
    return (await apiFetch<{ group: Group }>(`/api/v1/groups/${groupId}`)).group;
  },

  async getPlayers(groupId?: string) {
    const path = groupId
      ? `/api/v1/players?groupId=${encodeURIComponent(groupId)}`
      : "/api/v1/players";
    return (await apiFetch<{ players: PlayerProfile[] }>(path)).players;
  },

  async getMatches(groupId: string) {
    return (await apiFetch<{ matches: Match[] }>(`/api/v1/groups/${groupId}/matches`)).matches;
  },

  async getLiveMatch(groupId: string) {
    const { match } = await apiFetch<{ match: Match | null }>(
      `/api/v1/groups/${groupId}/matches/live`,
    );
    return match ?? undefined;
  },

  async getMatch(matchId: string) {
    return getOrUndefined(
      apiFetch<{ match: Match }>(`/api/v1/matches/${matchId}`).then((res) => res.match),
    );
  },

  async createFriendly(input: CreateFriendlyInput) {
    return (
      await apiFetch<{ match: Match }>("/api/v1/matches", {
        method: "POST",
        body: JSON.stringify({
          groupId: input.groupId,
          pairAName: input.pairA.name,
          pairBName: input.pairB.name,
          pairAGoalkeeperId: playerIdByPosition(input.pairA, "goalkeeper"),
          pairAAttackerId: playerIdByPosition(input.pairA, "attacker"),
          pairBGoalkeeperId: playerIdByPosition(input.pairB, "goalkeeper"),
          pairBAttackerId: playerIdByPosition(input.pairB, "attacker"),
          settings: input.settings,
        }),
      })
    ).match;
  },

  async registerGoal(matchId: string, playerId: string, ownGoal = false) {
    return (
      await apiFetch<{ match: Match }>(`/api/v1/matches/${matchId}/goals`, {
        method: "POST",
        body: JSON.stringify({ playerId, ownGoal }),
      })
    ).match;
  },

  async undoGoal(matchId: string, goalId: string) {
    return (
      await apiFetch<{ match: Match }>(`/api/v1/matches/${matchId}/goals/${goalId}`, {
        method: "DELETE",
      })
    ).match;
  },

  async finishMatch(matchId: string) {
    return (
      await apiFetch<{ match: Match }>(`/api/v1/matches/${matchId}/finish`, {
        method: "POST",
      })
    ).match;
  },

  async getRanking(groupId: string) {
    return (await apiFetch<{ ranking: RankingEntry[] }>(`/api/v1/groups/${groupId}/ranking`))
      .ranking;
  },

  async getPairStats(groupId: string) {
    return (await apiFetch<{ pairStats: PairStats[] }>(`/api/v1/groups/${groupId}/pair-stats`))
      .pairStats;
  },

  async getTournaments(groupId: string) {
    return (await apiFetch<{ tournaments: Tournament[] }>(`/api/v1/groups/${groupId}/tournaments`))
      .tournaments;
  },

  async getTournament(tournamentId: string) {
    return getOrUndefined(
      apiFetch<{ tournament: Tournament }>(`/api/v1/tournaments/${tournamentId}`).then(
        (res) => res.tournament,
      ),
    );
  },

  async createTournament(input: CreateTournamentInput) {
    return (
      await apiFetch<{ tournament: Tournament }>(`/api/v1/groups/${input.groupId}/tournaments`, {
        method: "POST",
        body: JSON.stringify(input),
      })
    ).tournament;
  },

  async startTournamentMatch(tournamentId: string, matchupId: string) {
    return (
      await apiFetch<{ match: Match }>(
        `/api/v1/tournaments/${tournamentId}/matchups/${matchupId}/start`,
        { method: "POST" },
      )
    ).match;
  },

  async updateGroup(groupId: string, patch) {
    return (
      await apiFetch<{ group: Group }>(`/api/v1/groups/${groupId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      })
    ).group;
  },

  async updateMe(patch) {
    return (
      await apiFetch<{ user: User }>("/api/v1/me", {
        method: "PATCH",
        body: JSON.stringify(patch),
      })
    ).user;
  },

  async updatePlayerProfile(patch) {
    return (
      await apiFetch<{ playerProfile: PlayerProfile }>("/api/v1/players/me", {
        method: "PATCH",
        body: JSON.stringify(patch),
      })
    ).playerProfile;
  },
};
