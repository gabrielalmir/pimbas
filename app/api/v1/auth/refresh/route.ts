import { NextResponse } from "next/server";
import { unauthorized, validationError } from "@/lib/server/errors";
import { signAuthTokens, verifyRefreshToken } from "@/lib/server/jwt";
import { getDb } from "@/lib/server/prisma";
import { refreshSchema } from "../schemas";

export async function POST(request: Request) {
  const parsed = refreshSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return validationError(parsed.error);
  const db = getDb();

  try {
    const payload = await verifyRefreshToken(parsed.data.refreshToken);
    if (payload.kind !== "refresh") return unauthorized();
    const user = await db.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.tokenVersion !== payload.tokenVersion) return unauthorized();
    const updated = await db.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
    });
    const tokens = await signAuthTokens(updated.id, updated.tokenVersion);
    return NextResponse.json(tokens);
  } catch {
    return unauthorized();
  }
}
