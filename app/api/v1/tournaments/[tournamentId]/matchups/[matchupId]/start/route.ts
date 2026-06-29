import { NextResponse } from "next/server";
import { matchInclude, serializeMatch } from "@/app/api/v1/matches/serialize";
import { serializeTournament, toJson, tournamentToRow } from "@/app/api/v1/tournaments/serialize";
import { isMatchupReadyToStart } from "@/domain";
import { requireAuth } from "@/lib/server/auth";
import { badRequest, notFound } from "@/lib/server/errors";
import { requireGroupMember } from "@/lib/server/group-authz";
import { withDbUser } from "@/lib/server/prisma";

interface Context {
  params: Promise<{ tournamentId: string; matchupId: string }>;
}

export async function POST(request: Request, { params }: Context) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const { tournamentId, matchupId } = await params;

  return withDbUser(auth.authUser.id, async (db) => {
    const tournamentRow = await db.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournamentRow) return notFound("Tournament not found");
    const tournament = serializeTournament(tournamentRow);

    const authz = await requireGroupMember(db, tournament.groupId, auth.authUser.id);
    if ("response" in authz) return authz.response;

    const isThirdPlace = matchupId === tournament.thirdPlaceMatchup?.id;
    const matchup = isThirdPlace
      ? tournament.thirdPlaceMatchup
      : tournament.matchups.find((item) => item.id === matchupId);
    if (!matchup?.pairAId || !matchup.pairBId) {
      return badRequest("Confronto ainda não tem as duas duplas definidas.");
    }
    if (!isMatchupReadyToStart(matchup)) {
      return badRequest("Confronto não está disponível para iniciar.");
    }

    const pairA = tournament.pairs.find((pair) => pair.id === matchup.pairAId);
    const pairB = tournament.pairs.find((pair) => pair.id === matchup.pairBId);
    if (!pairA || !pairB) return badRequest("Duplas do confronto não encontradas.");

    const match = await db.match.create({
      data: {
        groupId: tournament.groupId,
        tournamentId,
        kind: "tournament",
        status: "live",
        settings: toJson(tournament.settings),
        startedAt: new Date(),
        pairs: {
          create: [
            {
              slot: "A",
              name: pairA.name,
              players: {
                create: pairA.players.map((player) => ({
                  playerId: player.playerId,
                  position: player.position,
                })),
              },
            },
            {
              slot: "B",
              name: pairB.name,
              players: {
                create: pairB.players.map((player) => ({
                  playerId: player.playerId,
                  position: player.position,
                })),
              },
            },
          ],
        },
      },
      include: matchInclude,
    });

    const updatedMatchup = {
      ...matchup,
      status: "live" as const,
      matchId: match.id,
    };
    const updatedTournament = isThirdPlace
      ? { ...tournament, thirdPlaceMatchup: updatedMatchup }
      : {
          ...tournament,
          matchups: tournament.matchups.map((item) =>
            item.id === matchup.id ? updatedMatchup : item,
          ),
        };

    await db.tournament.update({
      where: { id: tournamentId },
      data: tournamentToRow(updatedTournament),
    });

    return NextResponse.json({ match: serializeMatch(match) }, { status: 201 });
  });
}
