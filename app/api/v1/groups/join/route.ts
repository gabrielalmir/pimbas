import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { conflict, notFound, validationError } from "@/lib/server/errors";
import { withDbUser } from "@/lib/server/prisma";
import { joinGroupSchema } from "../schemas";
import { serializeGroup } from "../serialize";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const parsed = joinGroupSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return validationError(parsed.error);
  return withDbUser(auth.authUser.id, async (db) => {
    const group = await db.group.findUnique({
      where: { inviteCode: parsed.data.inviteCode },
    });
    if (!group) return notFound("Invite not found");
    const profile = await db.playerProfile.findUnique({
      where: { userId: auth.authUser.id },
    });
    if (!profile) return conflict("Create a player profile before joining groups");

    const existing = await db.groupMember.findFirst({
      where: { groupId: group.id, userId: auth.authUser.id },
    });
    if (!existing) {
      await db.groupMember.create({
        data: {
          groupId: group.id,
          playerId: profile.id,
          userId: auth.authUser.id,
          role: "member",
        },
      });
    }
    return NextResponse.json({ group: await serializeGroup(db, group) });
  });
}
