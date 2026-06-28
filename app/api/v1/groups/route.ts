import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { conflict, validationError } from "@/lib/server/errors";
import { withDbUser } from "@/lib/server/prisma";
import { groupSchema } from "./schemas";
import { generateInviteCode, serializeGroup } from "./serialize";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  return withDbUser(auth.authUser.id, async (db) => {
    const memberships = await db.groupMember.findMany({
      where: { userId: auth.authUser.id },
      include: { group: true },
      orderBy: { id: "asc" },
    });
    const groups = await Promise.all(
      memberships.map((membership: { group: Record<string, unknown>; role?: string }) =>
        serializeGroup(db, membership.group ?? {}, {
          includeInviteCode: membership.role === "admin",
        }),
      ),
    );
    return NextResponse.json({ groups });
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const parsed = groupSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return validationError(parsed.error);
  return withDbUser(auth.authUser.id, async (db) => {
    const profile = await db.playerProfile.findUnique({
      where: { userId: auth.authUser.id },
    });
    if (!profile) return conflict("Create a player profile before creating groups");

    const group = await db.group.create({
      data: {
        ...parsed.data,
        inviteCode: await generateInviteCode(db),
        members: {
          create: {
            playerId: profile.id,
            userId: auth.authUser.id,
            role: "admin",
          },
        },
      },
    });
    return NextResponse.json(
      { group: await serializeGroup(db, group, { includeInviteCode: true }) },
      { status: 201 },
    );
  });
}
