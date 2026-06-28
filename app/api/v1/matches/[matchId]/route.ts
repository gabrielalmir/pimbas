import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { forbidden, notFound } from "@/lib/server/errors";
import { withDbUser } from "@/lib/server/prisma";
import { getMatchOr404, serializeMatch } from "../serialize";

interface Context {
  params: Promise<{ matchId: string }>;
}

export async function GET(request: Request, { params }: Context) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const { matchId } = await params;

  return withDbUser(auth.authUser.id, async (db) => {
    const match = await getMatchOr404(db, matchId);
    if (!match) return notFound("Match not found");
    const membership = await db.groupMember.findFirst({
      where: { groupId: match.groupId, userId: auth.authUser.id },
    });
    if (!membership) return forbidden("Group access denied");
    return NextResponse.json({ match: serializeMatch(match) });
  });
}
