import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { notFound, validationError } from "@/lib/server/errors";
import { withDbUser } from "@/lib/server/prisma";
import { playerProfileSchema } from "../schemas";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const parsed = playerProfileSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return validationError(parsed.error);
  return withDbUser(auth.authUser.id, async (db) => {
    const profile = await db.playerProfile.create({
      data: { ...parsed.data, userId: auth.authUser.id, isAnonymous: false },
    });
    return NextResponse.json({ playerProfile: profile }, { status: 201 });
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const parsed = playerProfileSchema
    .partial()
    .safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return validationError(parsed.error);
  return withDbUser(auth.authUser.id, async (db) => {
    const existing = await db.playerProfile.findUnique({
      where: { userId: auth.authUser.id },
    });
    if (!existing) return notFound("Player profile not found");
    const profile = await db.playerProfile.update({
      where: { userId: auth.authUser.id },
      data: parsed.data,
    });
    return NextResponse.json({ playerProfile: profile });
  });
}
