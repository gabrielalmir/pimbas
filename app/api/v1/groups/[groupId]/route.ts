import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { validationError } from "@/lib/server/errors";
import { requireGroupAdmin, requireGroupMember } from "@/lib/server/group-authz";
import { withDbUser } from "@/lib/server/prisma";
import { groupSchema } from "../schemas";
import { serializeGroup } from "../serialize";

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

    const group = await db.group.findUniqueOrThrow({ where: { id: groupId } });
    return NextResponse.json({
      group: await serializeGroup(db, group, {
        includeInviteCode: authz.membership.role === "admin",
      }),
    });
  });
}

export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const { groupId } = await params;
  const parsed = groupSchema.partial().safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return validationError(parsed.error);

  return withDbUser(auth.authUser.id, async (db) => {
    const authz = await requireGroupAdmin(db, groupId, auth.authUser.id);
    if ("response" in authz) return authz.response;

    const group = await db.group.update({
      where: { id: groupId },
      data: parsed.data,
    });
    return NextResponse.json({
      group: await serializeGroup(db, group, { includeInviteCode: true }),
    });
  });
}
