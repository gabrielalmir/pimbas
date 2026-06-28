import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { notFound } from "@/lib/server/errors";
import { requireGroupMember } from "@/lib/server/group-authz";
import { withDbUser } from "@/lib/server/prisma";
import { serializeTournament } from "../serialize";

interface Context {
  params: Promise<{ tournamentId: string }>;
}

export async function GET(request: Request, { params }: Context) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const { tournamentId } = await params;

  return withDbUser(auth.authUser.id, async (db) => {
    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) return notFound("Tournament not found");

    const authz = await requireGroupMember(db, tournament.groupId, auth.authUser.id);
    if ("response" in authz) return authz.response;

    return NextResponse.json({ tournament: serializeTournament(tournament) });
  });
}
