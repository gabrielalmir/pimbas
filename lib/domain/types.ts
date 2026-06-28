export type PlayerPosition = "goalkeeper" | "attacker";
export type FavoritePosition = PlayerPosition | "versatile";
export type MatchKind = "friendly" | "tournament";
export type MatchStatus = "scheduled" | "live" | "golden_goal" | "finished";
export type MemberRole = "admin" | "member";
export type TournamentStatus = "draft" | "live" | "finished";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface PlayerProfile {
  id: string;
  userId?: string;
  displayName: string;
  initials: string;
  avatarUrl?: string;
  avatarPresetId?: string;
  shirtNumber: number;
  favoritePosition: FavoritePosition;
  style: string;
  nationality: string;
  bio: string;
  isAnonymous: boolean;
}

export interface GroupMember {
  id: string;
  groupId: string;
  playerId: string;
  role: MemberRole;
}

export interface MatchSettings {
  goalLimit: number;
  timeLimitMinutes: number;
  goldenGoal: boolean;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  logoPresetId?: string;
  inviteCode?: string;
  memberIds: string[];
  adminPlayerIds: string[];
  defaultMatchSettings: MatchSettings;
}

export interface PairPlayer {
  playerId: string;
  position: PlayerPosition;
}

export interface TeamPair {
  id: string;
  name: string;
  players: [PairPlayer, PairPlayer];
}

export interface Goal {
  id: string;
  matchId: string;
  pairId: string;
  playerId: string;
  position: PlayerPosition;
  ownGoal?: boolean;
  scoredAt: string;
}

export interface Match {
  id: string;
  groupId: string;
  tournamentId?: string;
  kind: MatchKind;
  status: MatchStatus;
  pairA: TeamPair;
  pairB: TeamPair;
  settings: MatchSettings;
  goals: Goal[];
  startedAt: string;
  finishedAt?: string;
  winnerPairId?: string;
}

export interface RankingEntry {
  playerId: string;
  points: number;
  position: number;
  stats: PlayerStats;
}

export interface PairStats {
  pairKey: string;
  groupId: string;
  playerIds: [string, string];
  matches: number;
  wins: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  titles: number;
}

export interface TournamentMatchup {
  id: string;
  round: number;
  label: string;
  pairAId?: string;
  pairBId?: string;
  winnerPairId?: string;
  status: "pending" | "bye" | "live" | "finished";
  matchId?: string;
  /** Para onde o vencedor avança (ausente na rodada final). */
  nextMatchupId?: string;
  nextSlot?: "pairAId" | "pairBId";
  /** Apenas semifinais: para onde o perdedor vai na disputa de 3o lugar. */
  thirdPlaceSlot?: "pairAId" | "pairBId";
}

export interface Tournament {
  id: string;
  groupId: string;
  name: string;
  status: TournamentStatus;
  settings: MatchSettings;
  pairs: TeamPair[];
  matchups: TournamentMatchup[];
  thirdPlaceMatchup?: TournamentMatchup;
  championPairId?: string;
}

export interface CreateFriendlyInput {
  groupId: string;
  pairA: TeamPair;
  pairB: TeamPair;
  settings: MatchSettings;
}

export interface ManualPairInput {
  name: string;
  goalkeeperId: string;
  attackerId: string;
}

export interface CreateTournamentInput {
  groupId: string;
  name: string;
  settings: MatchSettings;
  /** Sorteio automático: lista de jogadores para o sistema formar as duplas. */
  playerIds?: string[];
  /** Formação personalizada: duplas já montadas manualmente. */
  manualPairs?: ManualPairInput[];
}

export interface PlayerStats {
  playerId: string;
  groupId: string;
  matches: number;
  wins: number;
  losses: number;
  goals: number;
  goalkeeperGoals: number;
  attackerGoals: number;
  titles: number;
  runnerUps: number;
  thirdPlaces: number;
  currentStreak: number;
  bestStreak: number;
}
