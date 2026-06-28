import { requireAuth } from "@/lib/server/auth";
import { notFound } from "@/lib/server/errors";
import { requireGroupAdmin } from "@/lib/server/group-authz";
import { withDbUser } from "@/lib/server/prisma";

interface Context {
  params: Promise<{ groupId: string; memberId: string }>;
}

export async function DELETE(request: Request, { params }: Context) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const { groupId, memberId } = await params;

  return withDbUser(auth.authUser.id, async (db) => {
    const authz = await requireGroupAdmin(db, groupId, auth.authUser.id);
    if ("response" in authz) return authz.response;

    const member = await db.groupMember.findFirst({
      where: { id: memberId, groupId },
    });
    if (!member) return notFound("Member not found");
    await db.groupMember.delete({ where: { id: member.id } });
    return new Response(null, { status: 204 });
  });
}
