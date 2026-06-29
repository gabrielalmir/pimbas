import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/server/email";
import { tooManyRequests, validationError } from "@/lib/server/errors";
import { getDb } from "@/lib/server/prisma";
import { isRateLimited } from "@/lib/server/rate-limit";
import { forgotPasswordSchema } from "../schemas";

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  if (isRateLimited(request, "auth:forgot-password", 5, 60_000)) return tooManyRequests();

  const parsed = forgotPasswordSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return validationError(parsed.error);

  const db = getDb();
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });

  // Always return 200 to avoid user enumeration.
  if (!user || user.passwordHash === null) {
    return NextResponse.json({
      message: "If that email is registered, you will receive a reset link.",
    });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

  await db.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt, usedAt: null },
  });

  await sendPasswordResetEmail(user, token);

  return NextResponse.json({
    message: "If that email is registered, you will receive a reset link.",
  });
}
