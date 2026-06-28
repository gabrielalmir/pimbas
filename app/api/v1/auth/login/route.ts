import { NextResponse } from "next/server";
import { tooManyRequests, unauthorized, validationError } from "@/lib/server/errors";
import { verifyPassword } from "@/lib/server/hash";
import { signAuthTokens } from "@/lib/server/jwt";
import { getDb } from "@/lib/server/prisma";
import { isRateLimited } from "@/lib/server/rate-limit";
import { loginSchema } from "../schemas";

export async function POST(request: Request) {
  if (isRateLimited(request, "auth:login", 10, 60_000)) return tooManyRequests();
  const parsed = loginSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return validationError(parsed.error);
  const db = getDb();

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, parsed.data.password))) {
    return unauthorized("Invalid credentials");
  }
  const tokens = await signAuthTokens(user.id, user.tokenVersion);
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl ?? undefined,
    },
    ...tokens,
  });
}
