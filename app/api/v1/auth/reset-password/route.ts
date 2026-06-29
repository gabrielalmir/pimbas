import { NextResponse } from "next/server";
import { badRequest, tooManyRequests, validationError } from "@/lib/server/errors";
import { hashPassword } from "@/lib/server/hash";
import { getDb } from "@/lib/server/prisma";
import { isRateLimited } from "@/lib/server/rate-limit";
import { resetPasswordSchema } from "../schemas";

export async function POST(request: Request) {
  if (isRateLimited(request, "auth:reset-password", 5, 60_000)) return tooManyRequests();

  const parsed = resetPasswordSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return validationError(parsed.error);

  const db = getDb();
  const { token, password } = parsed.data;

  const tokenRecord = await db.passwordResetToken.findUnique({ where: { token } });

  if (!tokenRecord) return badRequest("Invalid or expired reset token.");
  if (tokenRecord.expiresAt < new Date()) return badRequest("Invalid or expired reset token.");
  if (tokenRecord.usedAt !== null) return badRequest("Invalid or expired reset token.");

  const newHash = await hashPassword(password);

  await db.user.update({
    where: { id: tokenRecord.userId },
    data: {
      passwordHash: newHash,
      tokenVersion: { increment: 1 },
    },
  });

  await db.passwordResetToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  return NextResponse.json({ message: "Password reset successfully." });
}
