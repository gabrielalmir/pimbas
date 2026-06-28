import { NextResponse } from "next/server";
import { conflict, tooManyRequests, validationError } from "@/lib/server/errors";
import { hashPassword } from "@/lib/server/hash";
import { signAuthTokens } from "@/lib/server/jwt";
import { getDb } from "@/lib/server/prisma";
import { isRateLimited } from "@/lib/server/rate-limit";
import { signupSchema } from "../schemas";

export async function POST(request: Request) {
  if (isRateLimited(request, "auth:signup", 5, 60_000)) return tooManyRequests();
  const parsed = signupSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return validationError(parsed.error);
  const { email, password, name } = parsed.data;
  const db = getDb();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return conflict("Unable to create account");

  const user = await db.user.create({
    data: { email, name, passwordHash: await hashPassword(password) },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      tokenVersion: true,
    },
  });
  const tokens = await signAuthTokens(user.id, user.tokenVersion);
  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl ?? undefined,
      },
      ...tokens,
    },
    { status: 201 },
  );
}
