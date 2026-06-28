import type {
  CreateFriendlyInput,
  CreateTournamentInput,
  Group,
  Match,
  PairStats,
  PlayerProfile,
  RankingEntry,
  Tournament,
  User,
} from "@/lib/domain";

export type UpdateGroupInput = Partial<
  Pick<Group, "name" | "description" | "logoUrl" | "logoPresetId" | "defaultMatchSettings">
>;

export interface DataClient {
  getCurrentPlayerId(): Promise<string>;
  getGroups(): Promise<Group[]>;
  getCurrentGroup(groupId: string): Promise<Group>;
  getPlayers(groupId?: string): Promise<PlayerProfile[]>;
  getMatches(groupId: string): Promise<Match[]>;
  getLiveMatch(groupId: string): Promise<Match | undefined>;
  getMatch(matchId: string): Promise<Match | undefined>;
  createFriendly(input: CreateFriendlyInput): Promise<Match>;
  registerGoal(matchId: string, playerId: string, ownGoal?: boolean): Promise<Match>;
  undoGoal(matchId: string, goalId: string): Promise<Match>;
  finishMatch(matchId: string): Promise<Match>;
  getRanking(groupId: string): Promise<RankingEntry[]>;
  getPairStats(groupId: string): Promise<PairStats[]>;
  getTournaments(groupId: string): Promise<Tournament[]>;
  getTournament(tournamentId: string): Promise<Tournament | undefined>;
  createTournament(input: CreateTournamentInput): Promise<Tournament>;
  startTournamentMatch(tournamentId: string, matchupId: string): Promise<Match>;
  updateGroup(groupId: string, patch: UpdateGroupInput): Promise<Group>;
  updateMe(patch: Partial<Pick<User, "name" | "avatarUrl">>): Promise<User>;
  updatePlayerProfile(
    patch: Partial<
      Pick<
        PlayerProfile,
        | "displayName"
        | "initials"
        | "avatarUrl"
        | "shirtNumber"
        | "favoritePosition"
        | "style"
        | "nationality"
        | "bio"
      >
    >,
  ): Promise<PlayerProfile>;
}
