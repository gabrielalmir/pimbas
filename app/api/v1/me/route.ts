import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { badRequest, tooManyRequests, unauthorized, validationError } from "@/lib/server/errors";
import { withDbUser } from "@/lib/server/prisma";
import { isRateLimited } from "@/lib/server/rate-limit";
import { patchMeSchema } from "./schemas";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  return withDbUser(auth.authUser.id, async (db) => {
    const user = await db.user.findUnique({
      where: { id: auth.authUser.id },
      include: { profile: true },
    });
    if (!user) return unauthorized();
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl ?? undefined,
      },
      playerProfile: user.profile,
    });
  });
}

export async function PATCH(request: Request) {
  if (isRateLimited(request, "patch-me", 10, 60_000)) return tooManyRequests();

  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;

  const parsed = patchMeSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return validationError(parsed.error);

  // Build data field-by-field to prevent mass-assignment
  const data: { name?: string; avatarUrl?: string } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.avatarUrl !== undefined) data.avatarUrl = parsed.data.avatarUrl;

  if (Object.keys(data).length === 0) {
    return badRequest("At least one field must be provided");
  }

  return withDbUser(auth.authUser.id, async (db) => {
    // The WHERE clause always uses auth.authUser.id — never from the request body
    const updated = await db.user.update({
      where: { id: auth.authUser.id },
      data,
    });
    return NextResponse.json({
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        avatarUrl: updated.avatarUrl ?? undefined,
      },
    });
  });
}
