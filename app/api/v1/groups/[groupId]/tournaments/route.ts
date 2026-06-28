import { NextResponse } from "next/server";
import { serializeTournament, toJson, tournamentToRow } from "@/app/api/v1/tournaments/serialize";
import {
  createPair,
  createRandomPairs,
  createThirdPlaceMatchup,
  createTournamentInputSchema,
  generateBracket,
  resolveInitialByes,
  type Tournament,
} from "@/domain";
import { requireAuth } from "@/lib/server/auth";
import { validationError } from "@/lib/server/errors";
import { requireGroupMember } from "@/lib/server/group-authz";
import { withDbUser } from "@/lib/server/prisma";

interface Context {
  params: Promise<{ groupId: string }>;
}

export async function GET(request: Request, { params }: Context) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const { groupId } = await params;

  return withDbUser(auth.authUser.id, async (db) => {
    const authz = await requireGroupMember(db, groupId, auth.authUser.id);
    if ("response" in authz) return authz.response;

    const tournaments = await db.tournament.findMany({
      where: { groupId },
      orderBy: { id: "desc" },
    });
    return NextResponse.json({
      tournaments: tournaments.map(serializeTournament),
    });
  });
}

export async function POST(request: Request, { params }: Context) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const { groupId } = await params;
  const parsed = createTournamentInputSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return validationError(parsed.error);
  const input = parsed.data;

  return withDbUser(auth.authUser.id, async (db) => {
    const authz = await requireGroupMember(db, groupId, auth.authUser.id);
    if ("response" in authz) return authz.response;

    const pairs = input.manualPairs?.length
      ? input.manualPairs.map((pair, index) =>
          createPair(`pair-${index + 1}`, pair.name, pair.goalkeeperId, pair.attackerId),
        )
      : createRandomPairs(input.playerIds ?? []);

    const draft: Tournament = {
      id: "",
      groupId,
      name: input.name,
      status: "live",
      pairs,
      settings: input.settings,
      matchups: generateBracket(pairs),
      thirdPlaceMatchup: pairs.length >= 4 ? createThirdPlaceMatchup() : undefined,
    };
    const resolved = resolveInitialByes(draft);

    const created = await db.tournament.create({
      data: {
        groupId,
        name: input.name,
        settings: toJson(input.settings),
        ...tournamentToRow(resolved),
      },
    });
    return NextResponse.json({ tournament: serializeTournament(created) }, { status: 201 });
  });
}
