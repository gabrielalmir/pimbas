import { NextResponse } from "next/server";
import {
  getAuthorizedGroupMatches,
  type MatchRow,
  serializeMatch,
} from "@/app/api/v1/matches/serialize";
import { calculatePairStats, type Match } from "@/domain";
import { requireAuth } from "@/lib/server/auth";
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

    const matches = await getAuthorizedGroupMatches(db, groupId);
    const finishedMatches = (matches as MatchRow[])
      .map(serializeMatch)
      .filter((match: Match) => match.status === "finished");
    return NextResponse.json({
      pairStats: calculatePairStats(groupId, finishedMatches),
    });
  });
}
