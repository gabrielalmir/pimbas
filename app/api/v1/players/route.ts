import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { validationError } from "@/lib/server/errors";
import { requireGroupMember } from "@/lib/server/group-authz";
import { withDbUser } from "@/lib/server/prisma";
import { playersQuerySchema } from "./schemas";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;

  const searchParams = new URL(request.url).searchParams;
  const parsedQuery = playersQuerySchema.safeParse({
    groupId: searchParams.get("groupId") ?? undefined,
  });
  if (!parsedQuery.success) return validationError(parsedQuery.error);

  return withDbUser(auth.authUser.id, async (db) => {
    const groupId = parsedQuery.data.groupId;
    let groupIds: string[];

    if (groupId) {
      const authz = await requireGroupMember(db, groupId, auth.authUser.id);
      if ("response" in authz) return authz.response;
      groupIds = [groupId];
    } else {
      const memberships = await db.groupMember.findMany({
        where: { userId: auth.authUser.id },
        orderBy: { id: "asc" },
      });
      groupIds = memberships.map((membership: { groupId: string }) => membership.groupId);
    }

    if (groupIds.length === 0) {
      return NextResponse.json({ players: [] });
    }

    const groupMembers = await Promise.all(
      groupIds.map((groupId) =>
        db.groupMember.findMany({
          where: { groupId },
          orderBy: { id: "asc" },
        }),
      ),
    );
    const playerIds = new Set(
      groupMembers.flat().map((member: { playerId: string }) => member.playerId),
    );
    const players = (
      await db.playerProfile.findMany({
        orderBy: { displayName: "asc" },
      })
    ).filter((player: { id: string }) => playerIds.has(player.id));

    return NextResponse.json({ players });
  });
}
