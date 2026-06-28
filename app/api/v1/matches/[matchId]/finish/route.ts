import { NextResponse } from "next/server";
import { enterGoldenGoalIfTied, finishMatch, getScore } from "@/domain";
import { requireAuth } from "@/lib/server/auth";
import { forbidden, notFound } from "@/lib/server/errors";
import { withDbUser } from "@/lib/server/prisma";
import { getMatchOr404, persistMatchState, serializeMatch } from "../../serialize";

interface Context {
  params: Promise<{ matchId: string }>;
}

export async function POST(request: Request, { params }: Context) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const { matchId } = await params;

  return withDbUser(auth.authUser.id, async (db) => {
    const matchRow = await getMatchOr404(db, matchId);
    if (!matchRow) return notFound("Match not found");
    const membership = await db.groupMember.findFirst({
      where: { groupId: matchRow.groupId, userId: auth.authUser.id },
    });
    if (!membership) return forbidden("Group access denied");

    const current = serializeMatch(matchRow);
    const [scoreA, scoreB] = getScore(current);
    const updated =
      scoreA === scoreB && current.settings.goldenGoal && current.status !== "finished"
        ? enterGoldenGoalIfTied(current)
        : finishMatch(current);
    const persisted = await persistMatchState(db, matchRow.id, updated);
    return NextResponse.json({ match: serializeMatch(persisted) });
  });
}
