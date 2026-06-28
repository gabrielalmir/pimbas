import { NextResponse } from "next/server";
import { goalSchema } from "@/app/api/v1/matches/schemas";
import { getMatchOr404, persistMatchState, serializeMatch } from "@/app/api/v1/matches/serialize";
import { enterGoldenGoalIfTied, hasMatchTimeExpired, registerGoal } from "@/domain";
import { requireAuth } from "@/lib/server/auth";
import { forbidden, notFound, validationError } from "@/lib/server/errors";
import { withDbUser } from "@/lib/server/prisma";

interface Context {
  params: Promise<{ matchId: string }>;
}

export async function POST(request: Request, { params }: Context) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const parsed = goalSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return validationError(parsed.error);
  const { matchId } = await params;

  return withDbUser(auth.authUser.id, async (db) => {
    const matchRow = await getMatchOr404(db, matchId);
    if (!matchRow) return notFound("Match not found");
    const membership = await db.groupMember.findFirst({
      where: { groupId: matchRow.groupId, userId: auth.authUser.id },
    });
    if (!membership) return forbidden("Group access denied");

    try {
      const current = serializeMatch(matchRow);
      const timed = hasMatchTimeExpired(current) ? enterGoldenGoalIfTied(current) : current;
      const updated = registerGoal(timed, parsed.data.playerId, new Date(), parsed.data.ownGoal);
      const createdGoal = updated.goals.at(-1);
      const persisted = await persistMatchState(db, matchRow.id, updated, createdGoal);
      return NextResponse.json({ match: serializeMatch(persisted) });
    } catch (error) {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Invalid goal",
        },
        { status: 400 },
      );
    }
  });
}
