import { NextResponse } from "next/server";
import { getMatchOr404, persistMatchState, serializeMatch } from "@/app/api/v1/matches/serialize";
import { undoGoal } from "@/domain";
import { requireAuth } from "@/lib/server/auth";
import { forbidden, notFound } from "@/lib/server/errors";
import { withDbUser } from "@/lib/server/prisma";

interface Context {
  params: Promise<{ matchId: string; goalId: string }>;
}

export async function DELETE(request: Request, { params }: Context) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const { matchId, goalId } = await params;

  return withDbUser(auth.authUser.id, async (db) => {
    const matchRow = await getMatchOr404(db, matchId);
    if (!matchRow) return notFound("Match not found");
    const membership = await db.groupMember.findFirst({
      where: { groupId: matchRow.groupId, userId: auth.authUser.id },
    });
    if (!membership) return forbidden("Group access denied");

    try {
      const updated = undoGoal(serializeMatch(matchRow), goalId);
      await db.goal.delete({ where: { id: goalId } });
      const persisted = await persistMatchState(db, matchId, updated);
      return NextResponse.json({ match: serializeMatch(persisted) });
    } catch (error) {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Invalid undo",
        },
        { status: 400 },
      );
    }
  });
}
