import type { Tournament, TournamentMatchup } from "@/domain";
import { Prisma } from "@/generated/prisma/client";

type TournamentRow = Record<string, unknown> & {
  id: string;
  groupId: string;
  name: string;
  status: string;
  settings: unknown;
  pairs: unknown;
  matchups: unknown;
  thirdPlaceMatchup?: unknown;
  championPairId?: string | null;
};

export function serializeTournament(row: TournamentRow): Tournament {
  return {
    id: row.id,
    groupId: row.groupId,
    name: row.name,
    status: row.status as Tournament["status"],
    settings: row.settings as Tournament["settings"],
    pairs: row.pairs as Tournament["pairs"],
    matchups: row.matchups as TournamentMatchup[],
    thirdPlaceMatchup: (row.thirdPlaceMatchup as TournamentMatchup | null) ?? undefined,
    championPairId: row.championPairId ?? undefined,
  };
}

/** Prisma's `Json` columns want plain JSON values; structurally-typed domain interfaces
 * (optional fields, no index signature) don't satisfy that check statically, so we
 * round-trip through JSON and type the result as `Prisma.InputJsonValue` for the Json columns. */
export function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function tournamentToRow(tournament: Tournament) {
  return {
    status: tournament.status,
    pairs: toJson(tournament.pairs),
    matchups: toJson(tournament.matchups),
    thirdPlaceMatchup: tournament.thirdPlaceMatchup
      ? toJson(tournament.thirdPlaceMatchup)
      : Prisma.JsonNull,
    championPairId: tournament.championPairId ?? null,
  };
}
