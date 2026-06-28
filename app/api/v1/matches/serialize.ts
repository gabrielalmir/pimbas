import { serializeTournament, tournamentToRow } from "@/app/api/v1/tournaments/serialize";
import {
  applyMatchResultToTournament,
  type Match,
  type PairPlayer,
  type PlayerProfile,
  type TeamPair,
} from "@/domain";
import type { DatabaseClient } from "@/lib/server/prisma";

export type MatchRow = Record<string, unknown> & {
  id: string;
  groupId: string;
  tournamentId?: string | null;
  kind: string;
  status: string;
  settings: unknown;
  startedAt: Date | string;
  finishedAt?: Date | string | null;
  winnerPairId?: string | null;
  pairs?: Array<
    Record<string, unknown> & {
      id: string;
      slot: string;
      name: string;
      players?: Array<Record<string, unknown> & { playerId: string; position: string }>;
    }
  >;
  goals?: Array<
    Record<string, unknown> & {
      id: string;
      matchPairId: string;
      playerId: string;
      position: string;
      ownGoal?: boolean | null;
      scoredAt: Date | string;
    }
  >;
};

export const matchInclude = {
  pairs: { include: { players: true }, orderBy: { slot: "asc" as const } },
  goals: { orderBy: { scoredAt: "asc" as const } },
};

function toIso(value: Date | string | null | undefined) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

function serializePair(pair: NonNullable<MatchRow["pairs"]>[number]): TeamPair {
  const players = (pair.players ?? []).map((player) => ({
    playerId: player.playerId,
    position: player.position as PairPlayer["position"],
  })) as [PairPlayer, PairPlayer];
  return { id: pair.id, name: pair.name, players };
}

export function serializeMatch(row: MatchRow): Match {
  const pairs = row.pairs ?? [];
  const pairA = pairs.find((pair) => pair.slot === "A");
  const pairB = pairs.find((pair) => pair.slot === "B");
  if (!pairA || !pairB) throw new Error("Match pair data is incomplete");
  return {
    id: row.id,
    groupId: row.groupId,
    tournamentId: row.tournamentId ?? undefined,
    kind: row.kind as Match["kind"],
    status: row.status as Match["status"],
    pairA: serializePair(pairA),
    pairB: serializePair(pairB),
    settings: row.settings as Match["settings"],
    goals: (row.goals ?? []).map((goal) => ({
      id: goal.id,
      matchId: row.id,
      pairId: goal.matchPairId,
      playerId: goal.playerId,
      position: goal.position as PairPlayer["position"],
      ownGoal: goal.ownGoal ?? false,
      scoredAt: toIso(goal.scoredAt) ?? new Date(0).toISOString(),
    })),
    startedAt: toIso(row.startedAt) ?? new Date(0).toISOString(),
    finishedAt: toIso(row.finishedAt),
    winnerPairId: row.winnerPairId ?? undefined,
  };
}

export function serializePlayerProfile(row: Record<string, unknown>): PlayerProfile {
  return {
    id: row.id as string,
    userId: row.userId as string | undefined,
    displayName: row.displayName as string,
    initials: row.initials as string,
    shirtNumber: Number(row.shirtNumber ?? 0),
    favoritePosition: row.favoritePosition as PlayerProfile["favoritePosition"],
    style: String(row.style ?? ""),
    nationality: String(row.nationality ?? ""),
    bio: String(row.bio ?? ""),
    avatarUrl: row.avatarUrl as string | undefined,
    avatarPresetId: row.avatarPresetId as string | undefined,
    isAnonymous: Boolean(row.isAnonymous),
  };
}

export async function getMatchOr404(db: DatabaseClient, matchId: string) {
  return db.match.findUnique({ where: { id: matchId }, include: matchInclude });
}

export async function getAuthorizedGroupMatches(db: DatabaseClient, groupId: string) {
  return db.match.findMany({
    where: { groupId },
    include: matchInclude,
    orderBy: { startedAt: "desc" },
  });
}

export async function persistMatchState(
  db: DatabaseClient,
  matchId: string,
  updated: Match,
  createdGoal?: Match["goals"][number],
) {
  const data = {
    status: updated.status,
    finishedAt: updated.finishedAt ? new Date(updated.finishedAt) : null,
    winnerPairId: updated.winnerPairId ?? null,
  };
  if (createdGoal) {
    await db.goal.create({
      data: {
        id: createdGoal.id,
        matchId,
        matchPairId: createdGoal.pairId,
        playerId: createdGoal.playerId,
        position: createdGoal.position,
        ownGoal: createdGoal.ownGoal ?? false,
        scoredAt: new Date(createdGoal.scoredAt),
      },
    });
  }
  const persisted = await db.match.update({
    where: { id: matchId },
    data,
    include: matchInclude,
  });

  if (persisted.tournamentId && persisted.status === "finished") {
    const tournamentRow = await db.tournament.findUnique({
      where: { id: persisted.tournamentId },
    });
    if (tournamentRow) {
      const updatedTournament = applyMatchResultToTournament(
        serializeTournament(tournamentRow),
        serializeMatch(persisted),
      );
      await db.tournament.update({
        where: { id: persisted.tournamentId },
        data: tournamentToRow(updatedTournament),
      });
    }
  }

  return persisted;
}
