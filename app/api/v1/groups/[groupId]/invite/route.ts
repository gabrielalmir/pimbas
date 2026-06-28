import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { requireGroupAdmin } from "@/lib/server/group-authz";
import { withDbUser } from "@/lib/server/prisma";

interface Context {
  params: Promise<{ groupId: string }>;
}

export async function GET(request: Request, { params }: Context) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const { groupId } = await params;

  return withDbUser(auth.authUser.id, async (db) => {
    const authz = await requireGroupAdmin(db, groupId, auth.authUser.id);
    if ("response" in authz) return authz.response;

    const group = await db.group.findUniqueOrThrow({ where: { id: groupId } });
    return NextResponse.json({
      inviteCode: group.inviteCode,
      inviteLink: `/groups/join?code=${group.inviteCode}`,
    });
  });
}
